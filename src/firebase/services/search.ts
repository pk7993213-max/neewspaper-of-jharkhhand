import { Article } from '../../types';

export interface SearchResultItem {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content?: string;
  category: string;
  subcategory?: string;
  authorName: string;
  featuredImage?: string;
  publishedAt?: string;
  readingTime?: number;
  highlightedTitle?: string;
  highlightedExcerpt?: string;
  tags?: string[];
}

export interface SearchResponse {
  results: SearchResultItem[];
  nbHits: number;
  facets: {
    categories: Record<string, number>;
    tags: Record<string, number>;
  };
  suggestions: string[];
}

export async function performAdvancedSearch(
  query: string,
  categoryFilter?: string,
  tagFilter?: string
): Promise<SearchResponse> {
  const params = new URLSearchParams();
  if (query) params.set('q', query);
  if (categoryFilter && categoryFilter !== 'all') params.set('category', categoryFilter);
  if (tagFilter) params.set('tag', tagFilter);

  try {
    const res = await fetch(`/api/search?${params.toString()}`);
    if (!res.ok) {
      throw new Error(`Search request returned status ${res.status}`);
    }
    const data: SearchResponse = await res.json();
    return data;
  } catch (err) {
    console.warn('Advanced search proxy fallback:', err);
    return {
      results: [],
      nbHits: 0,
      facets: { categories: {}, tags: {} },
      suggestions: [],
    };
  }
}

export async function fetchQuerySuggestions(query: string): Promise<string[]> {
  if (!query || query.trim().length < 2) return [];
  try {
    const res = await fetch(`/api/search/suggestions?q=${encodeURIComponent(query.trim())}`);
    if (res.ok) {
      const data = await res.json();
      return data.suggestions || [];
    }
    return [];
  } catch {
    return [];
  }
}

export async function syncArticleToAlgoliaIndex(article: Article, isDeleted = false): Promise<void> {
  try {
    await fetch('/api/search/sync-article', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        article,
        isDeleted: isDeleted || article.status !== 'published',
      }),
    });
  } catch (err) {
    console.warn('Algolia indexing sync error (non-fatal for Firestore):', err);
  }
}
