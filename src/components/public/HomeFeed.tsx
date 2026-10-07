import React, { useState, useEffect } from 'react';
import { useRouter } from '../../context/RouterContext';
import { getPublishedArticles } from '../../firebase/services/articles';
import { getPublishedVideos } from '../../firebase/services/videos';
import { Article, VideoItem } from '../../types';
import { formatTimeAgo, formatDate } from '../../utils/format';
import {
  Clock,
  Flame,
  PlayCircle,
  Eye,
  Newspaper,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

export const HomeFeed: React.FC = () => {
  const { navigate } = useRouter();
  const [articles, setArticles] = useState<Article[]>([]);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function loadData() {
      try {
        const [arts, vids] = await Promise.all([
          getPublishedArticles({ limitCount: 40 }),
          getPublishedVideos(6),
        ]);
        if (mounted) {
          setArticles(arts || []);
          setVideos(vids || []);
        }
      } catch (err) {
        console.error('Failed to load homepage content:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadData();
    return () => {
      mounted = false;
    };
  }, []);

  const getArticleUrl = (art: Article) => {
    return art.subcategory
      ? `/news/${art.category}/${art.subcategory}/${art.slug}`
      : `/news/${art.category}/${art.slug}`;
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-10">
        {/* Newspaper Skeleton Loader */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-pulse">
          <div className="lg:col-span-8 space-y-4">
            <div className="h-96 bg-stone-200 rounded-sm"></div>
            <div className="h-8 bg-stone-200 w-3/4 rounded-sm"></div>
            <div className="h-4 bg-stone-200 w-full rounded-sm"></div>
            <div className="h-4 bg-stone-200 w-2/3 rounded-sm"></div>
          </div>
          <div className="lg:col-span-4 space-y-4">
            <div className="h-6 bg-stone-300 w-1/2 rounded-sm mb-4"></div>
            {[1, 2, 3, 4].map(n => (
              <div key={n} className="p-3 border-b border-stone-200 space-y-2">
                <div className="h-4 bg-stone-200 w-5/6 rounded-sm"></div>
                <div className="h-3 bg-stone-100 w-1/3 rounded-sm"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // If database currently has no published articles, display dignified empty state as instructed
  if (articles.length === 0 && videos.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <div className="inline-flex p-5 bg-stone-100 rounded-full text-stone-600 mb-6 border border-stone-300 shadow-inner">
          <Newspaper className="w-12 h-12 text-[#800000]" />
        </div>
        <h2
          className="text-3xl font-serif font-bold text-stone-900 mb-3"
          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
        >
          No Latest News Available
        </h2>
        <p className="text-stone-600 max-w-lg mx-auto text-sm leading-relaxed mb-8">
          The editorial desk is currently preparing stories. When articles or video dispatches are published in the CMS, they will appear here instantly.
        </p>
        <div className="p-6 bg-stone-50 border border-stone-200 rounded text-left max-w-md mx-auto shadow-sm">
          <div className="flex items-center gap-2 text-stone-900 font-semibold text-sm mb-2">
            <Sparkles className="w-4 h-4 text-amber-600" />
            <span>Are you an Editorial Staff Member?</span>
          </div>
          <p className="text-xs text-stone-600 mb-4">
            Sign in to the Newsroom CMS to publish breaking headlines, create Jharkhand reports, or upload video dispatches.
          </p>
          <button
            onClick={() => navigate('/cms')}
            className="w-full bg-[#800000] hover:bg-red-950 text-white text-xs font-semibold py-2 px-4 rounded transition-colors"
          >
            Open Newsroom CMS
          </button>
        </div>
      </div>
    );
  }

  // Segmenting actual published data
  const leadStory = articles.find(a => a.isFeatured) || articles[0];
  const sideArticles = articles.filter(a => a.id !== leadStory?.id).slice(0, 5);
  const remainingArticles = articles.filter(
    a => a.id !== leadStory?.id && !sideArticles.some(s => s.id === a.id)
  );

  // Group by beats (Only show categories with real published articles)
  const categoryGroups = remainingArticles.reduce<Record<string, Article[]>>((acc, art) => {
    const cat = art.category || 'General';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(art);
    return acc;
  }, {});

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-12">
      {/* Top Headline Section: Hero Lead + Top Stories Rail */}
      {leadStory && (
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 border-b border-stone-200 pb-10">
          {/* Main Lead Story */}
          <div className="lg:col-span-8 flex flex-col justify-between group">
            <div>
              {leadStory.featuredImage && (
                <div
                  onClick={() => navigate(getArticleUrl(leadStory))}
                  className="relative overflow-hidden mb-4 rounded-sm cursor-pointer aspect-video bg-stone-900 shadow-sm"
                >
                  <img
                    src={leadStory.featuredImage}
                    alt={leadStory.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="eager"
                  />
                  {leadStory.isBreaking && (
                    <span className="absolute top-3 left-3 bg-red-600 text-white text-xs font-black uppercase px-2.5 py-1 tracking-wider shadow">
                      Breaking
                    </span>
                  )}
                  {leadStory.videoUrl && (
                    <span className="absolute bottom-3 right-3 bg-black/80 text-white text-xs px-2 py-1 rounded flex items-center gap-1 font-semibold backdrop-blur-xs">
                      <PlayCircle className="w-3.5 h-3.5 text-red-400" />
                      Video Included
                    </span>
                  )}
                </div>
              )}

              <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-[#800000] mb-2">
                <span>{leadStory.category}</span>
                {leadStory.subcategory && (
                  <>
                    <span className="text-stone-400">•</span>
                    <span className="text-stone-600">{leadStory.subcategory}</span>
                  </>
                )}
              </div>

              <h2
                onClick={() => navigate(getArticleUrl(leadStory))}
                className="text-2xl sm:text-3xl md:text-4xl font-serif font-black text-stone-950 leading-tight mb-3 cursor-pointer group-hover:text-[#800000] transition-colors"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                {leadStory.title}
              </h2>

              {leadStory.excerpt && (
                <p className="text-stone-700 text-sm sm:text-base leading-relaxed mb-4 font-serif">
                  {leadStory.excerpt}
                </p>
              )}
            </div>

            <div className="flex items-center text-xs text-stone-500 space-x-4 pt-3 border-t border-stone-200">
              <span className="font-semibold text-stone-800">By {leadStory.authorName}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {formatTimeAgo(leadStory.publishedAt || leadStory.createdAt)}
              </span>
              {leadStory.readingTime && (
                <>
                  <span>•</span>
                  <span>{leadStory.readingTime} min read</span>
                </>
              )}
            </div>
          </div>

          {/* Top Stories Rail */}
          <div className="lg:col-span-4 flex flex-col justify-between border-t lg:border-t-0 lg:border-l border-stone-200 lg:pl-8 pt-6 lg:pt-0">
            <div>
              <div className="flex items-center justify-between pb-3 border-b-2 border-stone-900 mb-4">
                <h3 className="font-serif font-bold text-lg text-stone-900 tracking-tight flex items-center gap-2">
                  <Flame className="w-4 h-4 text-red-600" />
                  Top Stories
                </h3>
                <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">
                  Latest Feed
                </span>
              </div>

              <div className="space-y-4 divide-y divide-stone-100">
                {sideArticles.map((art, idx) => (
                  <article
                    key={art.id}
                    onClick={() => navigate(getArticleUrl(art))}
                    className="pt-3 first:pt-0 cursor-pointer group"
                  >
                    <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1">
                      <span className="text-red-700">{art.category}</span>
                      <span>•</span>
                      <span>{formatTimeAgo(art.publishedAt || art.createdAt)}</span>
                    </div>
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <h4 className="text-sm font-semibold font-serif text-stone-900 leading-snug group-hover:text-red-800 transition-colors line-clamp-2">
                          {art.title}
                        </h4>
                      </div>
                      {art.featuredImage && (
                        <div className="w-20 h-16 shrink-0 bg-stone-200 rounded-xs overflow-hidden">
                          <img
                            src={art.featuredImage}
                            alt=""
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        </div>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </div>

            {/* Quick stats / date footer */}
            <div className="mt-6 pt-4 border-t border-stone-200 text-xs text-stone-500 flex items-center justify-between">
              <span>Updated continuous feed</span>
              <span className="text-[#800000] font-semibold flex items-center gap-0.5">
                Ranchi Bureau <ChevronRight className="w-3 h-3" />
              </span>
            </div>
          </div>
        </section>
      )}

      {/* Video Dispatch Showcase (Only if real published videos exist) */}
      {videos.length > 0 && (
        <section className="bg-stone-950 text-white rounded p-6 sm:p-8">
          <div className="flex items-center justify-between pb-4 border-b border-stone-800 mb-6">
            <div className="flex items-center gap-2">
              <PlayCircle className="w-6 h-6 text-red-500" />
              <h3 className="font-serif text-xl sm:text-2xl font-bold tracking-tight">
                Video Dispatches & Special Reports
              </h3>
            </div>
            <button
              onClick={() => navigate('/videos')}
              className="text-xs text-stone-400 hover:text-white flex items-center gap-1 font-semibold uppercase tracking-wider"
            >
              <span>View All</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {videos.slice(0, 3).map(vid => (
              <div
                key={vid.id}
                onClick={() => navigate(`/video/${vid.id}`)}
                className="cursor-pointer group flex flex-col justify-between"
              >
                <div className="relative aspect-video bg-stone-900 rounded-sm overflow-hidden mb-3 border border-stone-800">
                  <video
                    src={vid.videoUrl}
                    className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                    preload="metadata"
                  />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-black/20 transition-colors">
                    <div className="p-3 bg-red-600/90 rounded-full text-white shadow-lg transform group-hover:scale-110 transition-transform">
                      <PlayCircle className="w-7 h-7" />
                    </div>
                  </div>
                  {vid.category && (
                    <span className="absolute top-2 left-2 bg-black/80 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 text-stone-200 rounded">
                      {vid.category}
                    </span>
                  )}
                </div>
                <div>
                  <h4 className="font-serif font-bold text-base text-stone-100 group-hover:text-red-400 transition-colors line-clamp-2 mb-1.5">
                    {vid.title}
                  </h4>
                  <div className="flex items-center text-xs text-stone-400 space-x-3">
                    <span>{vid.authorName || 'Special Bureau'}</span>
                    <span>•</span>
                    <span>{formatTimeAgo(vid.createdAt)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Category Beat Sections (Only show sections with real articles) */}
      {Object.entries(categoryGroups).map(([catName, catArticles]) => (
        <section key={catName} className="border-t-2 border-stone-900 pt-6">
          <div className="flex items-center justify-between mb-6 pb-2 border-b border-stone-200">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 bg-[#800000]"></span>
              <h3
                className="text-2xl font-serif font-bold text-stone-900 tracking-tight"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                {catName}
              </h3>
            </div>
            <button
              onClick={() => navigate(`/category/${catArticles[0]?.category || catName.toLowerCase()}`)}
              className="text-xs font-semibold text-[#800000] hover:text-black flex items-center gap-1 uppercase tracking-wider"
            >
              <span>Explore Section</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {catArticles.slice(0, 4).map(art => (
              <article
                key={art.id}
                onClick={() => navigate(getArticleUrl(art))}
                className="cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  {art.featuredImage && (
                    <div className="aspect-16/10 bg-stone-200 rounded-xs overflow-hidden mb-3">
                      <img
                        src={art.featuredImage}
                        alt=""
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    </div>
                  )}

                  {art.subcategory && (
                    <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1 inline-block">
                      {art.subcategory}
                    </span>
                  )}

                  <h4 className="font-serif font-bold text-base text-stone-900 group-hover:text-[#800000] transition-colors leading-snug line-clamp-3 mb-2">
                    {art.title}
                  </h4>

                  {art.excerpt && (
                    <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed mb-3">
                      {art.excerpt}
                    </p>
                  )}
                </div>

                <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-500">
                  <span>{art.authorName}</span>
                  <span>{formatTimeAgo(art.publishedAt || art.createdAt)}</span>
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
};
