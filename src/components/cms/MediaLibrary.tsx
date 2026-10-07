import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getAllVideosForCMS } from '../../firebase/services/videos';
import { uploadImageFile } from '../../firebase/services/storage';
import { VideoItem } from '../../types';
import { formatFileSize, formatDate, formatTimeAgo } from '../../utils/format';
import {
  Image as ImageIcon,
  Video,
  Upload,
  Copy,
  Check,
  ExternalLink,
  Film,
  Sparkles,
} from 'lucide-react';

interface StoredImageRecord {
  url: string;
  storagePath: string;
  uploadedAt: string;
  name: string;
}

export const MediaLibrary: React.FC = () => {
  const { staffUser } = useAuth();
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [recentImages, setRecentImages] = useState<StoredImageRecord[]>(() => {
    try {
      const saved = localStorage.getItem('tbc_recent_images');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [activeTab, setActiveTab] = useState<'all' | 'images' | 'videos'>('all');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getAllVideosForCMS().then(vids => setVideos(vids || []));
  }, []);

  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    setError(null);
    try {
      const res = await uploadImageFile(file, 'news-images');
      const newRecord: StoredImageRecord = {
        url: res.url,
        storagePath: res.storagePath,
        uploadedAt: new Date().toISOString(),
        name: file.name,
      };

      const updated = [newRecord, ...recentImages.slice(0, 49)];
      setRecentImages(updated);
      localStorage.setItem('tbc_recent_images', JSON.stringify(updated));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Image upload failed');
    } finally {
      setUploadingImage(false);
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  };

  const handleCopy = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-stone-200 gap-4">
        <div>
          <h1
            className="text-2xl sm:text-3xl font-serif font-black text-stone-900 tracking-tight"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            Editorial Media Repository
          </h1>
          <p className="text-xs text-stone-600 mt-1 font-serif">
            High-resolution press photography and raw video assets uploaded to Firebase Storage.
          </p>
        </div>

        <div>
          <input
            type="file"
            ref={imageInputRef}
            accept="image/*"
            onChange={handleUploadImage}
            className="hidden"
          />
          <button
            onClick={() => imageInputRef.current?.click()}
            disabled={uploadingImage}
            className="bg-[#800000] hover:bg-red-950 text-white font-semibold text-xs px-4 py-2.5 rounded shadow flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <Upload className="w-4 h-4" />
            <span>{uploadingImage ? 'Uploading Image...' : 'Upload Press Photo'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-300 text-red-800 text-xs rounded">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-stone-200 space-x-4 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('all')}
          className={`pb-2 transition-colors ${
            activeTab === 'all'
              ? 'border-b-2 border-[#800000] text-[#800000]'
              : 'text-stone-500 hover:text-stone-800'
          }`}
        >
          All Assets ({recentImages.length + videos.length})
        </button>
        <button
          onClick={() => setActiveTab('images')}
          className={`pb-2 transition-colors ${
            activeTab === 'images'
              ? 'border-b-2 border-[#800000] text-[#800000]'
              : 'text-stone-500 hover:text-stone-800'
          }`}
        >
          Images ({recentImages.length})
        </button>
        <button
          onClick={() => setActiveTab('videos')}
          className={`pb-2 transition-colors ${
            activeTab === 'videos'
              ? 'border-b-2 border-[#800000] text-[#800000]'
              : 'text-stone-500 hover:text-stone-800'
          }`}
        >
          Videos ({videos.length})
        </button>
      </div>

      {/* Assets Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {/* Videos */}
        {(activeTab === 'all' || activeTab === 'videos') &&
          videos.map(vid => (
            <div key={vid.id} className="bg-white rounded border border-stone-200 overflow-hidden shadow-xs flex flex-col justify-between">
              <div className="relative aspect-video bg-black">
                <video src={vid.videoUrl} className="w-full h-full object-cover" preload="metadata" />
                <span className="absolute top-2 left-2 bg-black/80 text-white text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
                  <Film className="w-3 h-3 text-red-400" />
                  Video
                </span>
              </div>
              <div className="p-3">
                <div className="text-xs font-bold text-stone-900 truncate mb-1">{vid.title}</div>
                <div className="text-[11px] text-stone-500 flex items-center justify-between">
                  <span>{formatFileSize(vid.fileSize)}</span>
                  <span>{formatTimeAgo(vid.createdAt)}</span>
                </div>
              </div>
              <div className="px-3 pb-3 pt-1 border-t border-stone-100 flex items-center justify-between">
                <button
                  onClick={() => handleCopy(vid.videoUrl)}
                  className="text-[11px] font-semibold text-stone-700 hover:text-black flex items-center gap-1"
                >
                  {copiedUrl === vid.videoUrl ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedUrl === vid.videoUrl ? 'Copied' : 'Copy URL'}</span>
                </button>
                <a
                  href={vid.videoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-stone-400 hover:text-stone-700"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          ))}

        {/* Images */}
        {(activeTab === 'all' || activeTab === 'images') &&
          recentImages.map(img => (
            <div key={img.storagePath} className="bg-white rounded border border-stone-200 overflow-hidden shadow-xs flex flex-col justify-between">
              <div className="aspect-video bg-stone-100 overflow-hidden">
                <img src={img.url} alt="" className="w-full h-full object-cover" loading="lazy" />
              </div>
              <div className="p-3">
                <div className="text-xs font-bold text-stone-900 truncate mb-1">{img.name}</div>
                <div className="text-[11px] text-stone-500">
                  {formatDate(img.uploadedAt)}
                </div>
              </div>
              <div className="px-3 pb-3 pt-1 border-t border-stone-100 flex items-center justify-between">
                <button
                  onClick={() => handleCopy(img.url)}
                  className="text-[11px] font-semibold text-stone-700 hover:text-black flex items-center gap-1"
                >
                  {copiedUrl === img.url ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedUrl === img.url ? 'Copied' : 'Copy URL'}</span>
                </button>
                <a
                  href={img.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-stone-400 hover:text-stone-700"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          ))}
      </div>

      {videos.length === 0 && recentImages.length === 0 && (
        <div className="py-16 text-center text-stone-400">
          <ImageIcon className="w-10 h-10 mx-auto mb-2 text-stone-300" />
          <div className="text-sm font-semibold text-stone-700">Media Library Empty</div>
          <p className="text-xs text-stone-500 mt-1">
            Upload photos or editorial videos to build your newsroom asset repository.
          </p>
        </div>
      )}
    </div>
  );
};
