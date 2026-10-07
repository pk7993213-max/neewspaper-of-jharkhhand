import React, { useState, useEffect } from 'react';
import { useRouter } from '../../context/RouterContext';
import {
  getArticleBySlug,
  getArticleById,
  incrementArticleViews,
  getRelatedArticles,
  getPublishedArticles,
} from '../../firebase/services/articles';
import { Article } from '../../types';
import { formatDate, formatDateTime, formatTimeAgo } from '../../utils/format';
import {
  Clock,
  Eye,
  Share2,
  Bookmark,
  ChevronRight,
  ArrowLeft,
  Check,
  PlayCircle,
  MessageSquare,
  Printer,
  Sparkles,
} from 'lucide-react';

export const ArticlePage: React.FC = () => {
  const { route, navigate } = useRouter();
  const { slug, category, subcategory } = route.params;

  const [article, setArticle] = useState<Article | null>(null);
  const [related, setRelated] = useState<Article[]>([]);
  const [latestFeed, setLatestFeed] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [readingProgress, setReadingProgress] = useState(0);

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    async function loadArticle() {
      try {
        let art: Article | null = null;
        if (slug) {
          art = await getArticleBySlug(slug);
        }
        // Fallback check if slug happened to be an ID
        if (!art && slug) {
          art = await getArticleById(slug);
        }

        if (mounted && art) {
          setArticle(art);
          // Increment views
          incrementArticleViews(art.id);

          // Load related and latest
          const [rel, lat] = await Promise.all([
            getRelatedArticles(art, 4),
            getPublishedArticles({ limitCount: 6 }),
          ]);
          if (mounted) {
            setRelated(rel || []);
            setLatestFeed((lat || []).filter(l => l.id !== art.id));
          }
        }
      } catch (err) {
        console.error('Failed to load article:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadArticle();

    return () => {
      mounted = false;
    };
  }, [slug]);

  // Track reading progress
  useEffect(() => {
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (totalHeight > 0) {
        const progress = (window.scrollY / totalHeight) * 100;
        setReadingProgress(Math.min(100, Math.max(0, progress)));
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShareWhatsApp = () => {
    if (!article) return;
    const text = encodeURIComponent(`${article.title}\n\nRead more at: ${window.location.href}`);
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const handleShareTwitter = () => {
    if (!article) return;
    const text = encodeURIComponent(article.title);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(window.location.href)}`, '_blank');
  };

  const handleShareFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`, '_blank');
  };

  const handleNativeShare = async () => {
    if (navigator.share && article) {
      try {
        await navigator.share({
          title: article.title,
          text: article.excerpt || article.title,
          url: window.location.href,
        });
      } catch {
        handleCopyLink();
      }
    } else {
      handleCopyLink();
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 animate-pulse space-y-6">
        <div className="h-4 bg-stone-200 w-1/4 rounded"></div>
        <div className="h-10 bg-stone-200 w-3/4 rounded"></div>
        <div className="h-4 bg-stone-100 w-1/2 rounded"></div>
        <div className="h-96 bg-stone-200 rounded"></div>
        <div className="space-y-3 pt-6">
          <div className="h-4 bg-stone-200 rounded"></div>
          <div className="h-4 bg-stone-200 rounded"></div>
          <div className="h-4 bg-stone-200 w-5/6 rounded"></div>
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <h2 className="text-3xl font-serif font-bold text-stone-900 mb-4">
          Article Not Found
        </h2>
        <p className="text-stone-600 text-sm mb-6">
          The requested news article may have been moved, updated, or unpublished by the editorial team.
        </p>
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 bg-[#800000] text-white px-5 py-2.5 rounded font-semibold text-xs hover:bg-red-950 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Homepage</span>
        </button>
      </div>
    );
  }

  const getArticleUrl = (art: Article) => {
    return art.subcategory
      ? `/news/${art.category}/${art.subcategory}/${art.slug}`
      : `/news/${art.category}/${art.slug}`;
  };

  return (
    <div>
      {/* Reading Progress Indicator */}
      <div
        className="fixed top-0 left-0 h-1 bg-[#800000] z-50 transition-all duration-75"
        style={{ width: `${readingProgress}%` }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8">
        {/* Breadcrumbs */}
        <nav className="flex items-center space-x-2 text-xs text-stone-500 mb-6 font-medium">
          <button onClick={() => navigate('/')} className="hover:text-stone-900">
            Home
          </button>
          <ChevronRight className="w-3.5 h-3.5 text-stone-400" />
          <button
            onClick={() => navigate(`/category/${article.category}`)}
            className="hover:text-stone-900 uppercase font-semibold text-[#800000]"
          >
            {article.category}
          </button>
          {article.subcategory && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-stone-400" />
              <span className="text-stone-700">{article.subcategory}</span>
            </>
          )}
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Main Article Body Column */}
          <article className="lg:col-span-8">
            {/* Category Pill & Breaking Tag */}
            <div className="flex items-center gap-2 mb-3">
              <span className="bg-red-50 text-[#800000] font-bold text-xs uppercase px-2.5 py-1 rounded border border-red-200 tracking-wider">
                {article.category}
              </span>
              {article.isBreaking && (
                <span className="bg-red-600 text-white font-extrabold text-xs uppercase px-2.5 py-1 rounded tracking-wider animate-pulse">
                  Breaking News
                </span>
              )}
            </div>

            {/* Headline */}
            <h1
              className="text-3xl sm:text-4xl md:text-5xl font-serif font-black text-stone-950 leading-tight mb-4"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              {article.title}
            </h1>

            {/* Sub-headline / Excerpt */}
            {article.excerpt && (
              <p className="text-lg sm:text-xl text-stone-700 font-serif leading-relaxed mb-6 italic border-l-4 border-[#800000] pl-4">
                {article.excerpt}
              </p>
            )}

            {/* Byline and Publication Metadata */}
            <div className="flex flex-wrap items-center justify-between py-4 border-y border-stone-200 mb-6 gap-4 text-xs text-stone-600">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-full bg-stone-800 text-white flex items-center justify-center font-serif font-bold text-sm">
                  {article.authorName?.charAt(0) || 'R'}
                </div>
                <div>
                  <div className="font-bold text-stone-900 text-sm">{article.authorName}</div>
                  <div className="text-stone-500 text-[11px]">
                    Special Correspondent • {article.subcategory || 'National Bureau'}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <div>Published: {formatDate(article.publishedAt || article.createdAt)}</div>
                  {article.updatedAt && (
                    <div className="text-stone-400 text-[11px]">
                      Updated: {formatTimeAgo(article.updatedAt)}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 bg-stone-100 px-2 py-1 rounded text-stone-700 font-medium">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{article.readingTime || 3} min read</span>
                </div>
              </div>
            </div>

            {/* Social Share Toolbar */}
            <div className="flex items-center justify-between py-3 mb-6 bg-stone-50 px-4 rounded border border-stone-200">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-600 flex items-center gap-1.5">
                <Share2 className="w-3.5 h-3.5 text-[#800000]" />
                Share Story:
              </span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleShareWhatsApp}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white p-2 rounded text-xs font-semibold flex items-center gap-1 transition-colors"
                  title="Share on WhatsApp"
                >
                  WhatsApp
                </button>
                <button
                  onClick={handleShareTwitter}
                  className="bg-stone-900 hover:bg-black text-white p-2 rounded text-xs font-semibold flex items-center gap-1 transition-colors"
                  title="Share on X"
                >
                  X
                </button>
                <button
                  onClick={handleShareFacebook}
                  className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded text-xs font-semibold flex items-center gap-1 transition-colors"
                  title="Share on Facebook"
                >
                  Facebook
                </button>
                <button
                  onClick={handleNativeShare}
                  className="bg-stone-200 hover:bg-stone-300 text-stone-800 p-2 rounded text-xs font-semibold flex items-center gap-1 transition-colors"
                  title="Copy link or native share"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* Featured Image */}
            {article.featuredImage && (
              <figure className="mb-8">
                <div className="rounded overflow-hidden bg-stone-900 shadow">
                  <img
                    src={article.featuredImage}
                    alt={article.title}
                    className="w-full max-h-[500px] object-cover"
                  />
                </div>
                {article.featuredImageCaption && (
                  <figcaption className="text-xs text-stone-500 mt-2 italic px-1">
                    Photo Credit / Caption: {article.featuredImageCaption}
                  </figcaption>
                )}
              </figure>
            )}

            {/* Attached Video Player (If article has an attached video) */}
            {article.videoUrl && (
              <div className="mb-8 p-4 bg-stone-950 text-white rounded-md shadow-lg border border-stone-800">
                <div className="flex items-center gap-2 mb-3 text-red-400 font-bold text-xs uppercase tracking-wider">
                  <PlayCircle className="w-4 h-4 text-red-500" />
                  <span>Exclusive Video Dispatch Attached</span>
                </div>
                <div className="aspect-video bg-black rounded overflow-hidden">
                  <video
                    src={article.videoUrl}
                    controls
                    className="w-full h-full object-contain"
                    preload="metadata"
                  />
                </div>
              </div>
            )}

            {/* Article Content Body with Newspaper Typography */}
            <div
              className="article-content text-stone-900 leading-relaxed font-serif text-lg sm:text-xl space-y-6 pt-2"
              style={{ fontFamily: "'Merriweather', Georgia, serif" }}
            >
              {article.content.split('\n\n').map((para, idx) => {
                const trimmed = para.trim();
                if (!trimmed) return null;
                // Lead paragraph with drop cap style
                if (idx === 0) {
                  return (
                    <p key={idx} className="first-letter:text-5xl first-letter:font-bold first-letter:float-left first-letter:mr-3 first-letter:text-[#800000] first-letter:leading-none leading-relaxed">
                      {trimmed}
                    </p>
                  );
                }
                return (
                  <p key={idx} className="leading-relaxed text-stone-800">
                    {trimmed}
                  </p>
                );
              })}
            </div>

            {/* Additional Image Gallery if any */}
            {article.images && article.images.length > 0 && (
              <div className="mt-10 pt-8 border-t border-stone-200">
                <h3 className="font-serif font-bold text-xl text-stone-900 mb-4">
                  Story Gallery
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {article.images.map((imgUrl, i) => (
                    <div key={i} className="aspect-video bg-stone-100 rounded overflow-hidden shadow-sm">
                      <img src={imgUrl} alt="" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tags Cloud */}
            {article.tags && article.tags.length > 0 && (
              <div className="mt-8 pt-6 border-t border-stone-200 flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-500 mr-2">
                  Keywords:
                </span>
                {article.tags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => navigate(`/search?q=${encodeURIComponent(tag)}`)}
                    className="text-xs bg-stone-100 hover:bg-stone-200 text-stone-800 px-3 py-1 rounded-full font-medium transition-colors"
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            )}

            {/* Bottom Disclaimer */}
            <div className="mt-8 p-4 bg-stone-100 border-l-4 border-stone-400 text-xs text-stone-600 rounded-r">
              <p className="font-bold text-stone-800 mb-1">Editorial Policy & Corrections</p>
              <p>
                The Bharat Chronicle adheres to the highest journalistic ethics and accuracy. If you notice any factual discrepancy in this report, write to our editorial grievance desk at grievances@bharatchronicle.in.
              </p>
            </div>
          </article>

          {/* Right Rail: Related Stories & Latest News */}
          <aside className="lg:col-span-4 space-y-8">
            {/* Related Stories in Same Beat */}
            {related.length > 0 && (
              <div className="bg-stone-50 p-6 rounded border border-stone-200">
                <h3 className="font-serif font-bold text-lg text-stone-900 pb-3 border-b-2 border-[#800000] mb-4">
                  More in {article.category}
                </h3>
                <div className="space-y-4 divide-y divide-stone-200">
                  {related.map(item => (
                    <article
                      key={item.id}
                      onClick={() => navigate(getArticleUrl(item))}
                      className="pt-3 first:pt-0 cursor-pointer group"
                    >
                      <h4 className="font-serif font-bold text-sm text-stone-900 group-hover:text-[#800000] transition-colors leading-snug line-clamp-2 mb-1">
                        {item.title}
                      </h4>
                      <div className="text-[11px] text-stone-500 flex items-center justify-between">
                        <span>{item.authorName}</span>
                        <span>{formatTimeAgo(item.publishedAt || item.createdAt)}</span>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )}

            {/* Continuous News Wire */}
            {latestFeed.length > 0 && (
              <div className="border border-stone-200 p-6 rounded">
                <h3 className="font-serif font-bold text-lg text-stone-900 pb-3 border-b-2 border-stone-900 mb-4">
                  The News Wire
                </h3>
                <div className="space-y-4 divide-y divide-stone-100">
                  {latestFeed.map(feedItem => (
                    <article
                      key={feedItem.id}
                      onClick={() => navigate(getArticleUrl(feedItem))}
                      className="pt-3 first:pt-0 cursor-pointer group"
                    >
                      <span className="text-[10px] font-bold uppercase tracking-wider text-red-700 block mb-0.5">
                        {feedItem.category}
                      </span>
                      <h4 className="font-serif text-sm font-semibold text-stone-900 group-hover:text-[#800000] transition-colors leading-snug line-clamp-2">
                        {feedItem.title}
                      </h4>
                      <span className="text-[11px] text-stone-400 mt-1 block">
                        {formatTimeAgo(feedItem.publishedAt || feedItem.createdAt)}
                      </span>
                    </article>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
};
