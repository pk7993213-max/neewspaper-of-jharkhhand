import express, { Request, Response } from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Algolia Configuration (Server-Side Secrets)
const ALGOLIA_APP_ID = process.env.ALGOLIA_APP_ID || process.env.VITE_ALGOLIA_APP_ID || '';
const ALGOLIA_ADMIN_KEY = process.env.ALGOLIA_ADMIN_KEY || '';
const ALGOLIA_INDEX_NAME = process.env.ALGOLIA_INDEX_NAME || 'articles';

let algoliaClient: any = null;

async function getAlgoliaClient() {
  if (algoliaClient) return algoliaClient;
  if (!ALGOLIA_APP_ID || !ALGOLIA_ADMIN_KEY) return null;

  try {
    const { algoliasearch } = await import('algoliasearch');
    algoliaClient = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_ADMIN_KEY);
    return algoliaClient;
  } catch (err) {
    console.warn('Algolia client init warning:', err);
    return null;
  }
}

// In-memory synced published search index cache for instantaneous fallback
const publicArticleCache = new Map<string, any>();

// 1. Sync Article to Search Index Endpoint
app.post('/api/search/sync-article', async (req: Request, res: Response) => {
  const { article, isDeleted } = req.body;
  if (!article || !article.id) {
    return res.status(400).json({ error: 'Missing article data or id' });
  }

  try {
    const isPublic = !isDeleted && article.status === 'published';

    if (isPublic) {
      const sanitizedRecord = {
        objectID: article.id,
        id: article.id,
        title: article.title,
        excerpt: article.excerpt || '',
        content: article.content ? article.content.substring(0, 10000) : '',
        category: article.category || 'General',
        subcategory: article.subcategory || '',
        tags: Array.isArray(article.tags) ? article.tags : [],
        authorName: article.authorName || 'Staff Reporter',
        slug: article.slug,
        featuredImage: article.featuredImage || '',
        publishedAt: article.publishedAt || article.createdAt,
        isBreaking: !!article.isBreaking,
        isFeatured: !!article.isFeatured,
        views: article.views || 0,
      };

      publicArticleCache.set(article.id, sanitizedRecord);

      const client = await getAlgoliaClient();
      if (client) {
        try {
          await client.saveObject({
            indexName: ALGOLIA_INDEX_NAME,
            body: sanitizedRecord,
          });
        } catch (algErr) {
          console.warn('Algolia indexing warning:', algErr);
        }
      }
    } else {
      // Remove from search index
      publicArticleCache.delete(article.id);

      const client = await getAlgoliaClient();
      if (client) {
        try {
          await client.deleteObject({
            indexName: ALGOLIA_INDEX_NAME,
            objectID: article.id,
          });
        } catch (algErr) {
          console.warn('Algolia deletion warning:', algErr);
        }
      }
    }

    return res.json({ success: true, indexed: isPublic });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Sync failed';
    console.error('Error syncing article to search index:', message);
    return res.status(500).json({ error: message });
  }
});

// 2. Advanced Search Query Endpoint
app.get('/api/search', async (req: Request, res: Response) => {
  const q = String(req.query.q || '').trim();
  const categoryFilter = String(req.query.category || '').trim();
  const tagFilter = String(req.query.tag || '').trim();

  try {
    const client = await getAlgoliaClient();

    if (client) {
      try {
        const filters: string[] = [];
        if (categoryFilter && categoryFilter !== 'all') {
          filters.push(`category:"${categoryFilter}"`);
        }
        if (tagFilter) {
          filters.push(`tags:"${tagFilter}"`);
        }

        const searchResponse = await client.searchSingleIndex({
          indexName: ALGOLIA_INDEX_NAME,
          searchParams: {
            query: q,
            filters: filters.join(' AND '),
            hitsPerPage: 20,
            attributesToHighlight: ['title', 'excerpt', 'content'],
            highlightPreTag: '<mark class="bg-amber-200 text-stone-900 rounded px-0.5 font-bold">',
            highlightPostTag: '</mark>',
          },
        });

        const hits = searchResponse.hits || [];
        const formatted = hits.map((hit: any) => ({
          id: hit.objectID || hit.id,
          title: hit.title,
          slug: hit.slug,
          excerpt: hit.excerpt,
          category: hit.category,
          subcategory: hit.subcategory,
          authorName: hit.authorName,
          featuredImage: hit.featuredImage,
          publishedAt: hit.publishedAt,
          tags: hit.tags,
          highlightedTitle: hit._highlightResult?.title?.value,
          highlightedExcerpt: hit._highlightResult?.excerpt?.value,
        }));

        return res.json({
          results: formatted,
          nbHits: searchResponse.nbHits || formatted.length,
          facets: {
            categories: searchResponse.facets?.category || {},
            tags: searchResponse.facets?.tags || {},
          },
          suggestions: [],
        });
      } catch (algoliaSearchErr) {
        console.warn('Algolia query failed, running resilient fallback:', algoliaSearchErr);
      }
    }

    // High-performance In-Memory Fallback
    const term = q.toLowerCase();
    const allPublic = Array.from(publicArticleCache.values());

    const filtered = allPublic.filter(art => {
      const matchCat = !categoryFilter || categoryFilter === 'all' || art.category?.toLowerCase() === categoryFilter.toLowerCase();
      const matchTag = !tagFilter || art.tags?.some((t: string) => t.toLowerCase() === tagFilter.toLowerCase());

      if (!matchCat || !matchTag) return false;
      if (!term) return true;

      return (
        art.title?.toLowerCase().includes(term) ||
        art.excerpt?.toLowerCase().includes(term) ||
        art.category?.toLowerCase().includes(term) ||
        art.authorName?.toLowerCase().includes(term) ||
        art.tags?.some((t: string) => t.toLowerCase().includes(term))
      );
    });

    // Generate highlight tags
    const results = filtered.map(art => {
      let highlightedTitle = art.title;
      let highlightedExcerpt = art.excerpt;

      if (term && term.length > 1) {
        const regex = new RegExp(`(${term})`, 'gi');
        highlightedTitle = art.title.replace(regex, '<mark class="bg-amber-200 text-stone-900 rounded px-0.5 font-bold">$1</mark>');
        if (art.excerpt) {
          highlightedExcerpt = art.excerpt.replace(regex, '<mark class="bg-amber-200 text-stone-900 rounded px-0.5 font-bold">$1</mark>');
        }
      }

      return {
        ...art,
        highlightedTitle,
        highlightedExcerpt,
      };
    });

    const categoryFacets: Record<string, number> = {};
    const tagFacets: Record<string, number> = {};

    filtered.forEach(art => {
      if (art.category) {
        categoryFacets[art.category] = (categoryFacets[art.category] || 0) + 1;
      }
      if (Array.isArray(art.tags)) {
        art.tags.forEach((t: string) => {
          tagFacets[t] = (tagFacets[t] || 0) + 1;
        });
      }
    });

    return res.json({
      results,
      nbHits: results.length,
      facets: { categories: categoryFacets, tags: tagFacets },
      suggestions: [],
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Search error';
    return res.status(500).json({ error: message, results: [], nbHits: 0 });
  }
});

// 3. Search Query Suggestions Endpoint
app.get('/api/search/suggestions', (req: Request, res: Response) => {
  const q = String(req.query.q || '').trim().toLowerCase();
  if (!q) return res.json({ suggestions: [] });

  const suggestions = new Set<string>();
  const articles = Array.from(publicArticleCache.values());

  for (const art of articles) {
    if (art.title && art.title.toLowerCase().includes(q)) {
      suggestions.add(art.title);
    }
    if (Array.isArray(art.tags)) {
      for (const tag of art.tags) {
        if (tag.toLowerCase().includes(q)) {
          suggestions.add(tag);
        }
      }
    }
    if (suggestions.size >= 6) break;
  }

  return res.json({ suggestions: Array.from(suggestions) });
});

// Mounting Vite in development or static assets in production
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});
