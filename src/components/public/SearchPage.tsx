import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from '../../context/RouterContext';
import {
  performAdvancedSearch,
  fetchQuerySuggestions,
  SearchResultItem,
} from '../../firebase/services/search';
import { getCategories } from '../../firebase/services/categories';
import { NewsCategory } from '../../types';
import { formatTimeAgo, formatDate } from '../../utils/format';
import {
  Search,
  Filter,
  Tag,
  Clock,
  Newspaper,
  ArrowRight,
  Sparkles,
  X,
  Layers,
} from 'lucide-react';

export const SearchPage: React.FC = () => {
  const { route, navigate } = useRouter();
  const initialQuery = route.searchParams.get('q') || '';
  const initialCategory = route.searchParams.get('category') || 'all';
  const initialTag = route.searchParams.get('tag') || '';

  const [searchTerm, setSearchTerm] = useState(initialQuery);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [selectedTag, setSelectedTag] = useState(initialTag);
  const [categories, setCategories] = useState<NewsCategory[]>([]);
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [categoryFacets, setCategoryFacets] = useState<Record<string, number>>({});
  const [tagFacets, setTagFacets] = useState<Record<string, number>>({});
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    getCategories().then(cats => setCategories(cats || []));
  }, []);

  const executeSearch = async (term: string, cat: string, tag: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await performAdvancedSearch(term, cat, tag);
      setResults(data.results || []);
      setCategoryFacets(data.facets?.categories || {});
      setTagFacets(data.facets?.tags || {});
      setHasSearched(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Search request failed.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    executeSearch(searchTerm, selectedCategory, selectedTag);
  }, [selectedCategory, selectedTag]);

  // Debounced auto-search on input
  const handleInputChange = (val: string) => {
    setSearchTerm(val);

    if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);

    if (val.trim().length >= 2) {
      fetchQuerySuggestions(val).then(sug => {
        setSuggestions(sug);
        setShowSuggestions(sug.length > 0);
      });
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      executeSearch(val, selectedCategory, selectedTag);
      navigate(
        `/search?q=${encodeURIComponent(val)}&category=${encodeURIComponent(selectedCategory)}${selectedTag ? `&tag=${encodeURIComponent(selectedTag)}` : ''}`,
        true
      );
    }, 250);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowSuggestions(false);
    if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    executeSearch(searchTerm, selectedCategory, selectedTag);
    navigate(
      `/search?q=${encodeURIComponent(searchTerm)}&category=${encodeURIComponent(selectedCategory)}${selectedTag ? `&tag=${encodeURIComponent(selectedTag)}` : ''}`,
      false
    );
  };

  const getArticleUrl = (art: SearchResultItem) => {
    return art.subcategory
      ? `/news/${art.category}/${art.subcategory}/${art.slug}`
      : `/news/${art.category}/${art.slug}`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-8">
      {/* Search Header Bar */}
      <div className="bg-[#f5f2eb] p-6 sm:p-8 rounded-lg border border-stone-300 shadow-xs relative">
        <div className="text-[10px] tracking-widest uppercase text-stone-500 font-bold mb-1">
          EDITORIAL SEARCH ENGINE • POWERED BY INSTANT INDEXING
        </div>
        <h1
          className="text-2xl sm:text-3xl font-serif font-black text-stone-900 mb-2 tracking-tight"
          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
        >
          Search News Archive &amp; Ground Dispatches
        </h1>
        <p className="text-xs text-stone-600 mb-6 font-serif max-w-2xl">
          Fast, typo-tolerant full-text search across published headlines, verified field dispatches, bureau bylines, and tags.
        </p>

        <form onSubmit={handleFormSubmit} className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search news, topics, cities (e.g. Ranchi, high-speed rail, budget)..."
                value={searchTerm}
                onChange={e => handleInputChange(e.target.value)}
                onFocus={() => setShowSuggestions(suggestions.length > 0)}
                className="w-full pl-11 pr-10 py-3 bg-white text-stone-900 border border-stone-300 rounded shadow-xs text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]"
              />
              <Search className="w-5 h-5 text-stone-400 absolute left-3.5 top-3.5" />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    executeSearch('', selectedCategory, selectedTag);
                  }}
                  className="absolute right-3.5 top-3.5 text-stone-400 hover:text-stone-700"
                >
                  <X className="w-4 h-4" />
                </button>
              )}

              {/* Suggestions Dropdown */}
              {showSuggestions && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-stone-200 rounded shadow-xl z-30 divide-y divide-stone-100">
                  {suggestions.map((sug, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setSearchTerm(sug);
                        setShowSuggestions(false);
                        executeSearch(sug, selectedCategory, selectedTag);
                      }}
                      className="w-full text-left px-4 py-2.5 hover:bg-stone-50 text-xs font-medium text-stone-800 flex items-center gap-2"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>{sug}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="sm:w-64">
              <select
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                className="w-full py-3 px-3 bg-white text-stone-900 border border-stone-300 rounded shadow-xs text-sm focus:outline-none focus:ring-2 focus:ring-[#800000] font-medium"
              >
                <option value="all">All News Desks</option>
                {categories.map(c => (
                  <option key={c.id || c.slug} value={c.slug}>
                    {c.name} {categoryFacets[c.slug] ? `(${categoryFacets[c.slug]})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="bg-[#800000] hover:bg-red-950 text-white font-semibold px-6 py-3 rounded text-sm transition-colors shadow flex items-center justify-center gap-2 shrink-0 disabled:opacity-50"
            >
              <Search className="w-4 h-4" />
              <span>{loading ? 'Searching...' : 'Search'}</span>
            </button>
          </div>
        </form>

        {/* Active Filters / Tags Pill Bar */}
        {(selectedCategory !== 'all' || selectedTag) && (
          <div className="flex flex-wrap items-center gap-2 pt-4 mt-4 border-t border-stone-300 text-xs">
            <span className="text-stone-500 font-semibold">Filtered by:</span>
            {selectedCategory !== 'all' && (
              <span className="bg-[#800000] text-white px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                <span>Desk: {selectedCategory}</span>
                <button
                  onClick={() => setSelectedCategory('all')}
                  className="hover:opacity-75"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {selectedTag && (
              <span className="bg-stone-800 text-white px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                <span>#{selectedTag}</span>
                <button
                  onClick={() => setSelectedTag('')}
                  className="hover:opacity-75"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            <button
              onClick={() => {
                setSelectedCategory('all');
                setSelectedTag('');
              }}
              className="text-stone-600 hover:text-black underline font-semibold ml-2"
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>

      {/* Main Results View */}
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-stone-300 mb-6">
          <span className="text-sm font-bold text-stone-800">
            {loading ? 'Querying news index...' : `${results.length} published story match${results.length === 1 ? '' : 'es'}`}
          </span>
          {searchTerm && (
            <span className="text-xs text-stone-500">
              Keywords: <strong className="text-stone-800 font-semibold">"{searchTerm}"</strong>
            </span>
          )}
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-800 text-sm rounded mb-6">
            {error}
          </div>
        )}

        {loading ? (
          <div className="space-y-6 animate-pulse">
            {[1, 2, 3, 4].map(n => (
              <div key={n} className="p-4 border-b border-stone-200 space-y-2">
                <div className="h-5 bg-stone-200 w-3/4 rounded"></div>
                <div className="h-4 bg-stone-100 w-full rounded"></div>
                <div className="h-3 bg-stone-100 w-1/4 rounded"></div>
              </div>
            ))}
          </div>
        ) : results.length === 0 && hasSearched ? (
          <div className="py-16 text-center max-w-md mx-auto">
            <div className="inline-flex p-4 bg-stone-100 rounded-full text-stone-400 mb-4">
              <Newspaper className="w-8 h-8 text-stone-400" />
            </div>
            <h3 className="font-serif font-bold text-xl text-stone-900 mb-2">
              No Published Reports Found
            </h3>
            <p className="text-xs text-stone-500 mb-4 leading-relaxed">
              We couldn't locate any live editorial dispatches matching "{searchTerm}". Try a different city name, tag, or browse sections directly.
            </p>
          </div>
        ) : (
          <div className="space-y-6 divide-y divide-stone-200">
            {results.map(art => (
              <article
                key={art.id}
                onClick={() => navigate(getArticleUrl(art))}
                className="pt-6 first:pt-0 cursor-pointer group flex flex-col sm:flex-row gap-6 justify-between"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-red-800 mb-1">
                    <span>{art.category}</span>
                    {art.subcategory && (
                      <>
                        <span className="text-stone-400">•</span>
                        <span className="text-stone-600">{art.subcategory}</span>
                      </>
                    )}
                  </div>

                  <h2
                    className="text-xl sm:text-2xl font-serif font-bold text-stone-950 group-hover:text-[#800000] transition-colors leading-snug mb-2"
                    dangerouslySetInnerHTML={{
                      __html: art.highlightedTitle || art.title,
                    }}
                  />

                  {art.excerpt && (
                    <p
                      className="text-stone-600 text-sm font-serif line-clamp-2 leading-relaxed mb-3"
                      dangerouslySetInnerHTML={{
                        __html: art.highlightedExcerpt || art.excerpt,
                      }}
                    />
                  )}

                  <div className="flex items-center text-xs text-stone-500 space-x-4">
                    <span className="font-medium text-stone-700">By {art.authorName}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {formatTimeAgo(art.publishedAt)}
                    </span>
                    {art.readingTime && (
                      <>
                        <span>•</span>
                        <span>{art.readingTime} min read</span>
                      </>
                    )}
                  </div>
                </div>

                {art.featuredImage && (
                  <div className="sm:w-48 h-32 shrink-0 bg-stone-200 rounded overflow-hidden">
                    <img
                      src={art.featuredImage}
                      alt=""
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
