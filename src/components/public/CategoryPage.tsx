import React, { useState, useEffect } from 'react';
import { useRouter } from '../../context/RouterContext';
import { getPublishedArticles } from '../../firebase/services/articles';
import { getCategories } from '../../firebase/services/categories';
import { Article, NewsCategory } from '../../types';
import { formatTimeAgo, formatDate } from '../../utils/format';
import { ChevronRight, ArrowUpDown, Newspaper, Clock } from 'lucide-react';

export const CategoryPage: React.FC = () => {
  const { route, navigate } = useRouter();
  const { categorySlug } = route.params;

  const [articles, setArticles] = useState<Article[]>([]);
  const [categoryInfo, setCategoryInfo] = useState<NewsCategory | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'latest' | 'views'>('latest');

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    async function loadCategoryContent() {
      try {
        const [cats, arts] = await Promise.all([
          getCategories(),
          getPublishedArticles({ category: categorySlug, limitCount: 40 }),
        ]);

        if (mounted) {
          const matched = cats.find(
            c => c.slug.toLowerCase() === categorySlug?.toLowerCase() ||
                 c.name.toLowerCase() === categorySlug?.toLowerCase()
          );
          setCategoryInfo(matched || null);
          setArticles(arts || []);
        }
      } catch (err) {
        console.error('Failed to load category articles:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadCategoryContent();
    return () => {
      mounted = false;
    };
  }, [categorySlug]);

  const sortedArticles = [...articles].sort((a, b) => {
    if (sortBy === 'views') {
      return (b.views || 0) - (a.views || 0);
    }
    const dateA = new Date(a.publishedAt || a.createdAt).getTime();
    const dateB = new Date(b.publishedAt || b.createdAt).getTime();
    return dateB - dateA;
  });

  const getArticleUrl = (art: Article) => {
    return art.subcategory
      ? `/news/${art.category}/${art.subcategory}/${art.slug}`
      : `/news/${art.category}/${art.slug}`;
  };

  const displayName = categoryInfo?.name || categorySlug ? (categorySlug.charAt(0).toUpperCase() + categorySlug.slice(1)) : 'Category';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8">
      {/* Category Header */}
      <div className="border-b-2 border-stone-900 pb-6 mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs text-stone-500 mb-2 font-medium">
            <button onClick={() => navigate('/')} className="hover:text-stone-900">
              Home
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-stone-400" />
            <span className="uppercase font-semibold text-[#800000]">Desk</span>
          </div>
          <h1
            className="text-3xl sm:text-4xl font-serif font-black text-stone-950 tracking-tight"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            {displayName}
          </h1>
          {categoryInfo?.description && (
            <p className="text-stone-600 text-sm max-w-2xl mt-2 font-serif">
              {categoryInfo.description}
            </p>
          )}
        </div>

        {articles.length > 0 && (
          <div className="flex items-center gap-2 self-start md:self-auto text-xs">
            <span className="text-stone-500 flex items-center gap-1 font-medium">
              <ArrowUpDown className="w-3.5 h-3.5" />
              Sort:
            </span>
            <button
              onClick={() => setSortBy('latest')}
              className={`px-2.5 py-1 rounded font-semibold transition-colors ${
                sortBy === 'latest'
                  ? 'bg-stone-900 text-white'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              Latest First
            </button>
            <button
              onClick={() => setSortBy('views')}
              className={`px-2.5 py-1 rounded font-semibold transition-colors ${
                sortBy === 'views'
                  ? 'bg-stone-900 text-white'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              Most Viewed
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 animate-pulse">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="space-y-3">
              <div className="aspect-16/10 bg-stone-200 rounded"></div>
              <div className="h-5 bg-stone-200 rounded w-4/5"></div>
              <div className="h-3 bg-stone-100 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : articles.length === 0 ? (
        <div className="py-20 text-center max-w-md mx-auto">
          <div className="inline-flex p-4 bg-stone-100 rounded-full text-stone-400 mb-4">
            <Newspaper className="w-10 h-10 text-stone-500" />
          </div>
          <h3 className="font-serif font-bold text-xl text-stone-900 mb-2">
            No Published Articles in {displayName}
          </h3>
          <p className="text-xs text-stone-500 mb-6">
            Our editorial bureau has not filed stories under this beat yet. Check back soon for new dispatches.
          </p>
          <button
            onClick={() => navigate('/')}
            className="text-xs font-semibold text-[#800000] hover:underline"
          >
            ← Back to Homepage
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {sortedArticles.map(art => (
            <article
              key={art.id}
              onClick={() => navigate(getArticleUrl(art))}
              className="cursor-pointer group flex flex-col justify-between border-b border-stone-200 pb-6"
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
                  <span className="text-[11px] font-bold uppercase tracking-wider text-red-800 mb-1 inline-block">
                    {art.subcategory}
                  </span>
                )}
                <h2 className="font-serif font-bold text-lg text-stone-950 group-hover:text-[#800000] transition-colors leading-snug line-clamp-3 mb-2">
                  {art.title}
                </h2>
                {art.excerpt && (
                  <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed mb-3">
                    {art.excerpt}
                  </p>
                )}
              </div>

              <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-500">
                <span className="font-medium text-stone-700">{art.authorName}</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatTimeAgo(art.publishedAt || art.createdAt)}
                </span>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};
