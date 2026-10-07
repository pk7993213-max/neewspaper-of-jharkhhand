import React, { useState, useEffect } from 'react';
import { useRouter } from '../../context/RouterContext';
import { getPublishedVideos, incrementVideoViews } from '../../firebase/services/videos';
import { VideoItem } from '../../types';
import { formatTimeAgo, formatDate, formatFileSize } from '../../utils/format';
import { PlayCircle, Eye, Calendar, User, Film, ChevronRight } from 'lucide-react';

export const VideosPage: React.FC = () => {
  const { route, navigate } = useRouter();
  const selectedVideoId = route.params.videoId;

  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [activeVideo, setActiveVideo] = useState<VideoItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function loadVideos() {
      try {
        const list = await getPublishedVideos(50);
        if (mounted && list) {
          setVideos(list);
          if (selectedVideoId) {
            const found = list.find(v => v.id === selectedVideoId);
            if (found) {
              setActiveVideo(found);
              incrementVideoViews(found.id);
            } else if (list.length > 0) {
              setActiveVideo(list[0]);
              incrementVideoViews(list[0].id);
            }
          } else if (list.length > 0) {
            setActiveVideo(list[0]);
            incrementVideoViews(list[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to load videos:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadVideos();
    return () => {
      mounted = false;
    };
  }, [selectedVideoId]);

  const handleSelectVideo = (vid: VideoItem) => {
    setActiveVideo(vid);
    incrementVideoViews(vid.id);
    navigate(`/video/${vid.id}`, false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-10 animate-pulse space-y-6">
        <div className="h-8 bg-stone-200 w-1/4 rounded"></div>
        <div className="aspect-video bg-stone-200 rounded max-w-4xl"></div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="aspect-video bg-stone-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8">
      {/* Header */}
      <div className="border-b-2 border-stone-900 pb-4 mb-8">
        <div className="flex items-center space-x-2 text-xs text-stone-500 mb-1 font-medium">
          <button onClick={() => navigate('/')} className="hover:text-stone-900">
            Home
          </button>
          <ChevronRight className="w-3.5 h-3.5 text-stone-400" />
          <span className="uppercase font-semibold text-[#800000]">Multimedia</span>
        </div>
        <h1
          className="text-3xl sm:text-4xl font-serif font-black text-stone-950 tracking-tight flex items-center gap-3"
          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
        >
          <Film className="w-8 h-8 text-[#800000]" />
          Video Dispatches & Editorial Broadcasts
        </h1>
        <p className="text-stone-600 text-sm mt-1 font-serif">
          Ground reportage, interviews, press conferences, and investigative visual journalism from our field correspondents.
        </p>
      </div>

      {videos.length === 0 ? (
        <div className="py-20 text-center max-w-md mx-auto">
          <div className="inline-flex p-4 bg-stone-100 rounded-full text-stone-400 mb-4">
            <Film className="w-10 h-10 text-stone-500" />
          </div>
          <h3 className="font-serif font-bold text-xl text-stone-900 mb-2">
            No Videos Published Yet
          </h3>
          <p className="text-xs text-stone-500 mb-6">
            Our video journalists are producing new dispatches. Check back shortly or browse our written news feed.
          </p>
          <button
            onClick={() => navigate('/')}
            className="text-xs font-semibold text-[#800000] hover:underline"
          >
            ← Return to Homepage
          </button>
        </div>
      ) : (
        <div className="space-y-12">
          {/* Main Featured Video Player */}
          {activeVideo && (
            <section className="bg-stone-950 text-white rounded-lg p-4 sm:p-8 shadow-xl border border-stone-800">
              <div className="aspect-video bg-black rounded-md overflow-hidden mb-6 shadow-2xl">
                <video
                  key={activeVideo.videoUrl}
                  src={activeVideo.videoUrl}
                  controls
                  autoPlay={false}
                  playsInline
                  className="w-full h-full object-contain"
                  poster=""
                >
                  Your browser does not support HTML5 video playback.
                </video>
              </div>

              <div className="max-w-4xl">
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-red-700 text-white text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded">
                    {activeVideo.category || 'Special Dispatch'}
                  </span>
                  <span className="text-xs text-stone-400">
                    File: {activeVideo.fileName} ({formatFileSize(activeVideo.fileSize)})
                  </span>
                </div>

                <h2
                  className="text-2xl sm:text-3xl font-serif font-bold text-white mb-3"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  {activeVideo.title}
                </h2>

                {activeVideo.description && (
                  <p className="text-stone-300 text-sm sm:text-base leading-relaxed mb-6 font-serif">
                    {activeVideo.description}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-6 pt-4 border-t border-stone-800 text-xs text-stone-400">
                  <span className="flex items-center gap-1.5 text-stone-200 font-medium">
                    <User className="w-3.5 h-3.5 text-red-500" />
                    Reported by: {activeVideo.authorName || 'Special Bureau'}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    {formatDate(activeVideo.createdAt)}
                  </span>
                  {activeVideo.views !== undefined && (
                    <span className="flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5" />
                      {activeVideo.views} views
                    </span>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* More Videos Grid */}
          <div>
            <h3 className="text-xl font-serif font-bold text-stone-900 mb-6 pb-2 border-b border-stone-300">
              All Video Dispatches ({videos.length})
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {videos.map(vid => (
                <div
                  key={vid.id}
                  onClick={() => handleSelectVideo(vid)}
                  className={`cursor-pointer group flex flex-col justify-between p-3 rounded border transition-all ${
                    activeVideo?.id === vid.id
                      ? 'border-[#800000] bg-red-50/40 shadow-sm'
                      : 'border-stone-200 bg-white hover:border-stone-400'
                  }`}
                >
                  <div>
                    <div className="relative aspect-video bg-stone-900 rounded overflow-hidden mb-3">
                      <video
                        src={vid.videoUrl}
                        className="w-full h-full object-cover opacity-85 group-hover:opacity-100 transition-opacity"
                        preload="metadata"
                      />
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center group-hover:bg-black/10 transition-colors">
                        <div className="p-2.5 bg-red-600/90 rounded-full text-white shadow transform group-hover:scale-110 transition-transform">
                          <PlayCircle className="w-6 h-6" />
                        </div>
                      </div>
                      {vid.category && (
                        <span className="absolute top-2 left-2 bg-black/80 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 text-white rounded">
                          {vid.category}
                        </span>
                      )}
                    </div>

                    <h4 className="font-serif font-bold text-base text-stone-900 group-hover:text-[#800000] transition-colors line-clamp-2 mb-1.5">
                      {vid.title}
                    </h4>

                    {vid.description && (
                      <p className="text-xs text-stone-600 line-clamp-2 mb-3">
                        {vid.description}
                      </p>
                    )}
                  </div>

                  <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-500">
                    <span>{vid.authorName}</span>
                    <span>{formatTimeAgo(vid.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
