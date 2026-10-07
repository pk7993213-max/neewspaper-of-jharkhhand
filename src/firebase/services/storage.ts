import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '../config';

export interface StorageUploadProgress {
  progress: number;
  bytesTransferred: number;
  totalBytes: number;
}

export async function uploadImageFile(
  file: File,
  folder = 'news-images',
  onProgress?: (info: StorageUploadProgress) => void
): Promise<{ url: string; storagePath: string }> {
  // Validate file type
  if (!file.type.startsWith('image/')) {
    throw new Error('Only image files (JPEG, PNG, WebP, GIF) are permitted.');
  }

  // Max 10MB for images
  const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
  if (file.size > MAX_IMAGE_SIZE) {
    throw new Error('Image file exceeds the 10 MB limit.');
  }

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const storagePath = `${folder}/${year}/${month}/${Date.now()}_${safeName}`;

  const storageRef = ref(storage, storagePath);
  const uploadTask = uploadBytesResumable(storageRef, file, {
    contentType: file.type,
  });

  return new Promise((resolve, reject) => {
    uploadTask.on(
      'state_changed',
      snapshot => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        if (onProgress) {
          onProgress({
            progress,
            bytesTransferred: snapshot.bytesTransferred,
            totalBytes: snapshot.totalBytes,
          });
        }
      },
      error => {
        reject(new Error(`Image upload failed: ${error.message}`));
      },
      async () => {
        try {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          resolve({ url: downloadUrl, storagePath });
        } catch (err) {
          reject(err);
        }
      }
    );
  });
}
