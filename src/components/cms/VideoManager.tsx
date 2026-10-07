import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from '../../context/RouterContext';
import {
  startResumableVideoUpload,
  validateVideoFile,
  getAllVideosForCMS,
  deleteVideo,
  updateVideoStatus,
  getMaxVideoSizeMb,
  setMaxVideoSizeMb,
  detectVideoMimeType,
  VideoUploadProgressState,
  VideoUploadController,
} from '../../firebase/services/videos';
import { getCategories } from '../../firebase/services/categories';
import { VideoItem, NewsCategory } from '../../types';
import { formatFileSize, formatDate, formatTimeAgo } from '../../utils/format';
import {
  Upload,
  Video,
  PlayCircle,
  XCircle,
  Pause,
  Play,
  RotateCcw,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  FileCheck,
  Film,
  ExternalLink,
  Copy,
  Check,
  Settings2,
} from 'lucide-react';

export const VideoManager: React.FC = () => {
  const { staffUser, isAdmin, isEditor, permissions } = useAuth();
  const { navigate } = useRouter();

  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [categories, setCategories] = useState<NewsCategory[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  // Configurable size limit
  const [configuredLimitMb, setConfiguredLimitMb] = useState<number>(getMaxVideoSizeMb());
  const [showConfigLimit, setShowConfigLimit] = useState(false);

  // File selection & metadata form
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [videoTitle, setVideoTitle] = useState('');
  const [videoCategory, setVideoCategory] = useState('');
  const [videoDescription, setVideoDescription] = useState('');
  const [videoStatus, setVideoStatus] = useState<'published' | 'draft'>('draft');

  // Real upload state
  const [uploadState, setUploadState] = useState<VideoUploadProgressState>({
    progress: 0,
    bytesTransferred: 0,
    totalBytes: 0,
    status: 'idle',
  });

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const uploadControllerRef = useRef<VideoUploadController | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchVideos = async () => {
    setLoadingList(true);
    try {
      const [vids, cats] = await Promise.all([
        getAllVideosForCMS(),
        getCategories(),
      ]);
      setVideos(vids || []);
      setCategories(cats || []);
      if (cats && cats.length > 0 && !videoCategory) {
        setVideoCategory(cats[0].name);
      }
    } catch (err: unknown) {
      setListError(err instanceof Error ? err.message : 'Failed to fetch video catalog');
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    fetchVideos();
  }, []);

  // Default publishing status based on permissions
  useEffect(() => {
    if (permissions.canPublishVideos) {
      setVideoStatus('published');
    } else {
      setVideoStatus('draft');
    }
  }, [permissions.canPublishVideos]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateVideoFile(file, configuredLimitMb);
    if (!validation.valid) {
      setUploadState({
        progress: 0,
        bytesTransferred: 0,
        totalBytes: file.size,
        status: 'error',
        error: validation.error,
      });
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
    setUploadState({
      progress: 0,
      bytesTransferred: 0,
      totalBytes: file.size,
      status: 'idle',
    });

    if (!videoTitle) {
      const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
      setVideoTitle(cleanName);
    }
  };

  const handleStartUpload = () => {
    if (!selectedFile) {
      setUploadState(prev => ({ ...prev, status: 'error', error: 'Please select a video file.' }));
      return;
    }
    if (!videoTitle.trim()) {
      setUploadState(prev => ({ ...prev, status: 'error', error: 'Video headline is required.' }));
      return;
    }

    try {
      const controller = startResumableVideoUpload(
        selectedFile,
        {
          title: videoTitle.trim(),
          description: videoDescription.trim(),
          category: videoCategory || 'General',
          authorId: staffUser?.uid || 'staff',
          authorName: staffUser?.displayName || 'Editorial Bureau',
          status: permissions.canPublishVideos ? videoStatus : 'draft',
        },
        state => {
          setUploadState(state);
          if (state.status === 'success') {
            fetchVideos();
            setSelectedFile(null);
            setVideoTitle('');
            setVideoDescription('');
            if (fileInputRef.current) fileInputRef.current.value = '';
          }
        }
      );

      uploadControllerRef.current = controller;
    } catch (err: unknown) {
      setUploadState(prev => ({
        ...prev,
        status: 'error',
        error: err instanceof Error ? err.message : 'Failed to initiate video upload',
      }));
    }
  };

  const handleCancelUpload = () => {
    if (uploadControllerRef.current) {
      uploadControllerRef.current.cancel();
      uploadControllerRef.current = null;
    }
    setUploadState({
      progress: 0,
      bytesTransferred: 0,
      totalBytes: selectedFile?.size || 0,
      status: 'canceled',
      error: 'Upload was canceled.',
    });
  };

  const handlePauseResume = () => {
    if (!uploadControllerRef.current) return;
    if (uploadState.status === 'uploading') {
      uploadControllerRef.current.pause();
    } else if (uploadState.status === 'paused') {
      uploadControllerRef.current.resume();
    }
  };

  const handleRemoveSelection = () => {
    if (uploadState.status === 'uploading' && uploadControllerRef.current) {
      uploadControllerRef.current.cancel();
    }
    setSelectedFile(null);
    setUploadState({
      progress: 0,
      bytesTransferred: 0,
      totalBytes: 0,
      status: 'idle',
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDeleteVideo = async (vid: VideoItem) => {
    if (!permissions.canDeleteVideos && vid.authorId !== staffUser?.uid) {
      setListError('You do not have permission to delete this video dispatch.');
      return;
    }

    if (!window.confirm(`Permanently delete video "${vid.title}" and remove its Firebase Storage file?`)) {
      return;
    }
    try {
      await deleteVideo(vid);
      await fetchVideos();
    } catch (err: unknown) {
      setListError(err instanceof Error ? err.message : 'Failed to delete video');
    }
  };

  const handleToggleStatus = async (vid: VideoItem) => {
    if (!permissions.canPublishVideos) {
      setListError('Reporters cannot publish videos directly. Only Editors and Admins may publish dispatches.');
      return;
    }

    const nextStatus = vid.status === 'published' ? 'draft' : 'published';
    try {
      await updateVideoStatus(vid.id, nextStatus);
      await fetchVideos();
    } catch (err: unknown) {
      setListError(err instanceof Error ? err.message : 'Failed to update video status');
    }
  };

  const handleCopyUrl = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-4">
        <div>
          <h1
            className="text-2xl sm:text-3xl font-serif font-black text-stone-900 tracking-tight flex items-center gap-2.5"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            <Film className="w-7 h-7 text-[#800000]" />
            Video Desk &amp; Storage Pipeline
          </h1>
          <p className="text-xs text-stone-600 mt-1 font-serif">
            Select videos directly from your computer for resumable Firebase Storage upload and broadcast.
          </p>
        </div>

        {/* Configurable Limit Button */}
        {isAdmin && (
          <button
            onClick={() => setShowConfigLimit(!showConfigLimit)}
            className="self-start sm:self-auto text-xs text-stone-600 hover:text-stone-900 font-medium flex items-center gap-1.5 px-3 py-1.5 bg-white border border-stone-300 rounded shadow-xs"
          >
            <Settings2 className="w-3.5 h-3.5" />
            <span>Limit: {configuredLimitMb} MB</span>
          </button>
        )}
      </div>

      {showConfigLimit && isAdmin && (
        <div className="p-4 bg-stone-50 border border-stone-300 rounded-lg flex items-center gap-4 text-xs">
          <label className="font-bold text-stone-800">Max Upload Size (MB):</label>
          <input
            type="number"
            min="10"
            max="500"
            value={configuredLimitMb}
            onChange={e => {
              const val = Number(e.target.value) || 100;
              setConfiguredLimitMb(val);
              setMaxVideoSizeMb(val);
            }}
            className="w-24 px-2 py-1 bg-white border border-stone-300 rounded font-mono"
          />
          <span className="text-stone-500">Configurable ceiling for newsroom video files.</span>
        </div>
      )}

      {listError && (
        <div className="p-3 bg-red-50 border border-red-300 text-red-800 text-xs rounded flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{listError}</span>
          </div>
          <button onClick={() => setListError(null)} className="font-bold text-red-600">×</button>
        </div>
      )}

      {/* Upload Station Box */}
      <div className="bg-white rounded-lg border border-stone-200 p-6 shadow-xs space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-stone-200">
          <h2 className="font-serif font-bold text-base text-stone-900 flex items-center gap-2">
            <Upload className="w-4 h-4 text-red-700" />
            Upload Video from Computer
          </h2>
          <span className="text-[11px] text-stone-500 font-mono">
            Firebase Storage Resumable Upload • Limit: {configuredLimitMb} MB
          </span>
        </div>

        {/* File Picker Zone */}
        {!selectedFile ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-stone-300 hover:border-red-800 rounded-lg p-8 text-center cursor-pointer bg-stone-50/50 hover:bg-stone-50 transition-colors"
          >
            <input
              type="file"
              ref={fileInputRef}
              accept="video/mp4,video/webm,video/ogg,video/quicktime,video/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            <div className="inline-flex p-3 bg-red-50 rounded-full text-red-700 mb-3 border border-red-100">
              <Film className="w-8 h-8" />
            </div>
            <h3 className="font-serif font-bold text-stone-800 text-sm">
              Select local video file from your system
            </h3>
            <p className="text-xs text-stone-500 mt-1">
              Supports MP4, WebM, MOV up to {configuredLimitMb} MB. Resumable chunks upload safely without browser memory freeze.
            </p>
          </div>
        ) : (
          /* File Selected & Real Progress Card */
          <div className="space-y-5 bg-stone-50 p-5 rounded-lg border border-stone-200">
            {/* File Info Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-stone-200">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-stone-800 text-white rounded">
                  <Film className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-stone-900">{selectedFile.name}</div>
                  <div className="text-[11px] text-stone-500 font-mono">
                    Size: {formatFileSize(selectedFile.size)} • Type: {detectVideoMimeType(selectedFile)}
                  </div>
                </div>
              </div>

              {uploadState.status !== 'uploading' && (
                <button
                  type="button"
                  onClick={handleRemoveSelection}
                  className="text-xs text-stone-500 hover:text-red-700 flex items-center gap-1 font-semibold self-start sm:self-auto"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Remove Selection</span>
                </button>
              )}
            </div>

            {/* Metadata Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                  Video Headline / Title *
                </label>
                <input
                  type="text"
                  required
                  value={videoTitle}
                  onChange={e => setVideoTitle(e.target.value)}
                  disabled={uploadState.status === 'uploading'}
                  placeholder="e.g. Ground Report: High-Speed Rail Project in Ranchi..."
                  className="w-full px-3 py-2 bg-white border border-stone-300 rounded text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-[#800000]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                  Associated Beat / Desk
                </label>
                <select
                  value={videoCategory}
                  onChange={e => setVideoCategory(e.target.value)}
                  disabled={uploadState.status === 'uploading'}
                  className="w-full px-3 py-2 bg-white border border-stone-300 rounded text-xs text-stone-900 focus:outline-none"
                >
                  <option value="General">General News</option>
                  {categories.map(c => (
                    <option key={c.id || c.slug} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                  Description / Video Transcript Notes
                </label>
                <textarea
                  rows={2}
                  value={videoDescription}
                  onChange={e => setVideoDescription(e.target.value)}
                  disabled={uploadState.status === 'uploading'}
                  placeholder="Provide context, interviewees, and visual details..."
                  className="w-full px-3 py-2 bg-white border border-stone-300 rounded text-xs text-stone-900 focus:outline-none"
                />
              </div>

              {permissions.canPublishVideos && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                    Initial Publication State
                  </label>
                  <select
                    value={videoStatus}
                    onChange={e => setVideoStatus(e.target.value as any)}
                    disabled={uploadState.status === 'uploading'}
                    className="w-full px-3 py-2 bg-white border border-stone-300 rounded text-xs font-semibold focus:outline-none"
                  >
                    <option value="published">Publish Immediately</option>
                    <option value="draft">Save as Internal Draft</option>
                  </select>
                </div>
              )}
            </div>

            {/* REAL PROGRESS BAR & STATUS */}
            {(uploadState.status === 'uploading' ||
              uploadState.status === 'paused' ||
              uploadState.status === 'success' ||
              uploadState.status === 'error' ||
              uploadState.status === 'canceled') && (
              <div className="pt-2 space-y-2.5">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-stone-800">
                    {uploadState.status === 'uploading' && `Uploading: ${selectedFile.name}`}
                    {uploadState.status === 'paused' && 'Upload Paused'}
                    {uploadState.status === 'success' && 'Upload Complete! Saved to Firebase Storage.'}
                    {uploadState.status === 'error' && 'Upload Failed'}
                    {uploadState.status === 'canceled' && 'Upload Canceled'}
                  </span>
                  <span className="text-stone-700 font-mono">
                    {uploadState.progress}% ({formatFileSize(uploadState.bytesTransferred)} / {formatFileSize(uploadState.totalBytes)})
                  </span>
                </div>

                {/* Progress bar track */}
                <div className="w-full bg-stone-200 rounded-full h-3.5 overflow-hidden shadow-inner">
                  <div
                    className={`h-full transition-all duration-150 ${
                      uploadState.status === 'success'
                        ? 'bg-emerald-600'
                        : uploadState.status === 'error'
                        ? 'bg-red-600'
                        : uploadState.status === 'paused'
                        ? 'bg-amber-500'
                        : 'bg-[#800000]'
                    }`}
                    style={{ width: `${uploadState.progress}%` }}
                  />
                </div>

                {uploadState.error && (
                  <div className="text-xs text-red-700 font-medium pt-1 flex items-start gap-1.5 bg-red-50 p-2.5 rounded border border-red-200">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <span>{uploadState.error}</span>
                  </div>
                )}
              </div>
            )}

            {/* Control Buttons */}
            <div className="flex items-center space-x-3 pt-2">
              {uploadState.status === 'idle' && (
                <button
                  type="button"
                  onClick={handleStartUpload}
                  className="bg-[#800000] hover:bg-red-950 text-white font-semibold text-xs px-5 py-2.5 rounded shadow flex items-center gap-2 transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  <span>Start Resumable Upload</span>
                </button>
              )}

              {uploadState.status === 'uploading' && (
                <>
                  <button
                    type="button"
                    onClick={handlePauseResume}
                    className="bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs px-4 py-2 rounded flex items-center gap-1.5"
                  >
                    <Pause className="w-3.5 h-3.5" />
                    <span>Pause</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelUpload}
                    className="bg-stone-700 hover:bg-stone-800 text-white font-semibold text-xs px-4 py-2 rounded flex items-center gap-1.5"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Cancel</span>
                  </button>
                </>
              )}

              {uploadState.status === 'paused' && (
                <>
                  <button
                    type="button"
                    onClick={handlePauseResume}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-4 py-2 rounded flex items-center gap-1.5"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Resume</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelUpload}
                    className="bg-stone-700 hover:bg-stone-800 text-white font-semibold text-xs px-4 py-2 rounded"
                  >
                    <span>Cancel</span>
                  </button>
                </>
              )}

              {(uploadState.status === 'error' || uploadState.status === 'canceled') && (
                <button
                  type="button"
                  onClick={handleStartUpload}
                  className="bg-red-800 hover:bg-red-900 text-white font-semibold text-xs px-4 py-2 rounded flex items-center gap-1.5 shadow"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Retry Upload</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Catalog of Uploaded Videos */}
      <div className="bg-white rounded-lg border border-stone-200 p-6 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-stone-200 mb-6">
          <div>
            <h2 className="font-serif font-bold text-lg text-stone-900">
              Newsroom Video Library ({videos.length})
            </h2>
            <p className="text-xs text-stone-500 font-serif">
              Indexed in Firestore and hosted in Firebase Storage.
            </p>
          </div>
        </div>

        {loadingList ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 animate-pulse">
            {[1, 2, 3].map(i => (
              <div key={i} className="aspect-video bg-stone-100 rounded"></div>
            ))}
          </div>
        ) : videos.length === 0 ? (
          <div className="py-12 text-center max-w-sm mx-auto">
            <Video className="w-10 h-10 text-stone-300 mx-auto mb-2" />
            <div className="text-sm font-semibold text-stone-800">No Videos in Repository</div>
            <p className="text-xs text-stone-500 mt-1">
              Select and upload a video using the form above. The video will be available for public streaming and article embedding.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {videos.map(vid => (
              <div
                key={vid.id}
                className="border border-stone-200 rounded-lg p-3 bg-stone-50/60 flex flex-col justify-between"
              >
                <div>
                  <div className="relative aspect-video bg-stone-900 rounded overflow-hidden mb-3">
                    <video
                      src={vid.videoUrl}
                      controls
                      className="w-full h-full object-contain"
                      preload="metadata"
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-stone-500 mb-1">
                    <span className="font-bold uppercase tracking-wider text-red-700">
                      {vid.category || 'General'}
                    </span>
                    <span>{formatFileSize(vid.fileSize)}</span>
                  </div>

                  <h3 className="font-serif font-bold text-sm text-stone-900 line-clamp-2 mb-1">
                    {vid.title}
                  </h3>

                  {vid.description && (
                    <p className="text-xs text-stone-600 line-clamp-2 mb-3">
                      {vid.description}
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-stone-200 flex items-center justify-between text-xs">
                  {permissions.canPublishVideos ? (
                    <button
                      onClick={() => handleToggleStatus(vid)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-colors ${
                        vid.status === 'published'
                          ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                          : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                      }`}
                    >
                      {vid.status}
                    </button>
                  ) : (
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        vid.status === 'published'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {vid.status}
                    </span>
                  )}

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleCopyUrl(vid.videoUrl, vid.id)}
                      className="text-stone-500 hover:text-stone-900 p-1 flex items-center gap-0.5 text-[10px]"
                      title="Copy Public Video URL"
                    >
                      {copiedId === vid.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>

                    <span className="text-[11px] text-stone-500">
                      {formatTimeAgo(vid.createdAt)}
                    </span>

                    {(permissions.canDeleteVideos || vid.authorId === staffUser?.uid) && (
                      <button
                        onClick={() => handleDeleteVideo(vid)}
                        className="text-stone-400 hover:text-red-700 p-1"
                        title="Delete video & storage file"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
