import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  UploadTask,
} from 'firebase/storage';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  increment,
  updateDoc,
} from 'firebase/firestore';
import { db, storage } from '../config';
import { handleFirestoreError, OperationType } from '../errors';
import { VideoItem } from '../../types';

export let CONFIG_MAX_VIDEO_SIZE_MB = 100;

export function setMaxVideoSizeMb(sizeMb: number) {
  CONFIG_MAX_VIDEO_SIZE_MB = sizeMb;
}

export function getMaxVideoSizeMb(): number {
  return CONFIG_MAX_VIDEO_SIZE_MB;
}

export interface VideoUploadProgressState {
  progress: number;
  bytesTransferred: number;
  totalBytes: number;
  status: 'idle' | 'uploading' | 'paused' | 'success' | 'error' | 'canceled';
  error?: string;
  videoItem?: VideoItem;
}

export interface VideoUploadController {
  task: UploadTask;
  cancel: () => void;
  pause: () => void;
  resume: () => void;
}

export function detectVideoMimeType(file: File): string {
  if (file.type && file.type.startsWith('video/')) {
    return file.type;
  }
  const ext = file.name.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'mp4':
      return 'video/mp4';
    case 'webm':
      return 'video/webm';
    case 'ogg':
    case 'ogv':
      return 'video/ogg';
    case 'mov':
      return 'video/quicktime';
    case 'mkv':
      return 'video/x-matroska';
    default:
      return 'video/mp4';
  }
}

export function validateVideoFile(file: File, maxSizeMb = CONFIG_MAX_VIDEO_SIZE_MB): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: 'No video file selected.' };
  }

  const isVideoExt = /\.(mp4|webm|mov|mkv|ogv|ogg|m4v)$/i.test(file.name);
  const isVideoMime = file.type ? file.type.startsWith('video/') : false;

  if (!isVideoMime && !isVideoExt) {
    return {
      valid: false,
      error: `Unsupported file format "${file.type || file.name}". Please choose an MP4, WebM, or MOV video.`,
    };
  }

  const maxBytes = maxSizeMb * 1024 * 1024;
  if (file.size > maxBytes) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `File size (${sizeMb} MB) exceeds maximum permissible newsroom limit of ${maxSizeMb} MB.`,
    };
  }

  return { valid: true };
}

export function startResumableVideoUpload(
  file: File,
  metadata: {
    title: string;
    description?: string;
    category?: string;
    authorId: string;
    authorName?: string;
    status?: 'published' | 'draft';
  },
  onProgress: (state: VideoUploadProgressState) => void
): VideoUploadController {
  const validation = validateVideoFile(file);
  if (!validation.valid) {
    onProgress({
      progress: 0,
      bytesTransferred: 0,
      totalBytes: file?.size || 0,
      status: 'error',
      error: validation.error,
    });
    throw new Error(validation.error);
  }

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const uniqueId = `vid-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const storagePath = `news-videos/${year}/${month}/${uniqueId}-${safeName}`;

  const mimeType = detectVideoMimeType(file);
  const storageRef = ref(storage, storagePath);

  const uploadTask = uploadBytesResumable(storageRef, file, {
    contentType: mimeType,
    customMetadata: {
      originalName: file.name,
      uploadedBy: metadata.authorId,
      editorialDesk: metadata.category || 'General',
    },
  });

  onProgress({
    progress: 0,
    bytesTransferred: 0,
    totalBytes: file.size,
    status: 'uploading',
  });

  uploadTask.on(
    'state_changed',
    snapshot => {
      const progress = snapshot.totalBytes > 0
        ? (snapshot.bytesTransferred / snapshot.totalBytes) * 100
        : 0;

      onProgress({
        progress: Math.min(100, Math.round(progress)),
        bytesTransferred: snapshot.bytesTransferred,
        totalBytes: snapshot.totalBytes,
        status: snapshot.state === 'paused' ? 'paused' : 'uploading',
      });
    },
    error => {
      let friendlyError = 'Video upload failed. Please check your internet connection and try again.';
      if (error.code === 'storage/canceled') {
        onProgress({
          progress: 0,
          bytesTransferred: 0,
          totalBytes: file.size,
          status: 'canceled',
          error: 'Upload was canceled by user.',
        });
        return;
      } else if (error.code === 'storage/unauthorized') {
        friendlyError = 'Video upload failed because Firebase Storage permission was denied. Please ensure you are logged into the CMS with an authorized role.';
      } else if (error.code === 'storage/retry-limit-exceeded') {
        friendlyError = 'Upload timed out. Network connection interrupted. Please click Retry.';
      } else if (error.message) {
        friendlyError = `Upload error: ${error.message}`;
      }

      onProgress({
        progress: 0,
        bytesTransferred: 0,
        totalBytes: file.size,
        status: 'error',
        error: friendlyError,
      });
    },
    async () => {
      try {
        const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
        const videoId = uniqueId;
        const videoDoc: VideoItem = {
          id: videoId,
          title: metadata.title.trim(),
          description: metadata.description?.trim() || '',
          videoUrl: downloadUrl,
          storagePath,
          fileName: file.name,
          fileSize: file.size,
          contentType: mimeType,
          category: metadata.category || 'General',
          status: metadata.status || 'published',
          authorId: metadata.authorId,
          authorName: metadata.authorName || 'Editorial Bureau',
          views: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        const docRef = doc(db, 'videos', videoId);
        await setDoc(docRef, videoDoc);

        onProgress({
          progress: 100,
          bytesTransferred: file.size,
          totalBytes: file.size,
          status: 'success',
          videoItem: videoDoc,
        });
      } catch (err: unknown) {
        const errMessage = err instanceof Error
          ? err.message
          : 'Storage upload completed, but writing video document to Firestore failed.';

        onProgress({
          progress: 100,
          bytesTransferred: file.size,
          totalBytes: file.size,
          status: 'error',
          error: errMessage,
        });
      }
    }
  );

  return {
    task: uploadTask,
    cancel: () => uploadTask.cancel(),
    pause: () => uploadTask.pause(),
    resume: () => uploadTask.resume(),
  };
}

export async function getPublishedVideos(limitCount = 12): Promise<VideoItem[]> {
  const collPath = 'videos';
  try {
    const q = query(
      collection(db, collPath),
      where('status', '==', 'published'),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...(d.data() as Omit<VideoItem, 'id'>) }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, collPath);
  }
}

export async function getAllVideosForCMS(): Promise<VideoItem[]> {
  const collPath = 'videos';
  try {
    const q = query(collection(db, collPath), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...(d.data() as Omit<VideoItem, 'id'>) }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, collPath);
  }
}

export async function getVideoById(id: string): Promise<VideoItem | null> {
  const docPath = `videos/${id}`;
  try {
    const docSnap = await getDoc(doc(db, 'videos', id));
    if (!docSnap.exists()) return null;
    return { id: docSnap.id, ...(docSnap.data() as Omit<VideoItem, 'id'>) };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, docPath);
  }
}

export async function incrementVideoViews(id: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'videos', id), {
      views: increment(1),
    });
  } catch {
    // Non-blocking view increment
  }
}

export async function deleteVideo(video: VideoItem): Promise<void> {
  const docPath = `videos/${video.id}`;
  try {
    await deleteDoc(doc(db, 'videos', video.id));
    if (video.storagePath) {
      try {
        const fileRef = ref(storage, video.storagePath);
        await deleteObject(fileRef);
      } catch (storageErr) {
        console.warn('Storage file deletion error (non-fatal):', storageErr);
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, docPath);
  }
}

export async function updateVideoStatus(id: string, status: 'published' | 'draft'): Promise<void> {
  const docPath = `videos/${id}`;
  try {
    await updateDoc(doc(db, 'videos', id), {
      status,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, docPath);
  }
}
