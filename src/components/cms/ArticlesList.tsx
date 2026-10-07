import React, { useState, useEffect } from 'react';
import { useRouter } from '../../context/RouterContext';
import { useAuth } from '../../context/AuthContext';
import {
  getAllArticlesForCMS,
  updateArticle,
  deleteArticle,
} from '../../firebase/services/articles';
import { Article, ArticleStatus } from '../../types';
import { formatDate, formatTimeAgo } from '../../utils/format';
import {
  PlusCircle,
  Search,
  Filter,
  Edit3,
  Trash2,
  ExternalLink,
  Eye,
  CheckCircle,
  Clock,
  AlertTriangle,
} from 'lucide-react';

export const ArticlesList: React.FC = () => {
  const { navigate } = useRouter();
  const { staffUser, isAdmin, isEditor } = useAuth();

  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ArticleStatus>('all');
  const [actionError, setActionError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const list = await getAllArticlesForCMS();
      setArticles(list || []);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to fetch articles');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleTogglePublish = async (art: Article) => {
    const newStatus: ArticleStatus = art.status === 'published' ? 'draft' : 'published';
    try {
      await updateArticle(art.id, {
        status: newStatus,
        publishedAt: newStatus === 'published' ? (art.publishedAt || new Date().toISOString()) : art.publishedAt,
      });
      await loadData();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Permission denied or update failed');
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete the article:\n"${title}"?`)) {
      return;
    }
    try {
      await deleteArticle(id);
      await loadData();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to delete article');
    }
  };

  const filtered = articles.filter(a => {
    const matchStatus = statusFilter === 'all' || a.status === statusFilter;
    const matchSearch =
      !search ||
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.category.toLowerCase().includes(search.toLowerCase()) ||
      a.authorName.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-stone-200">
        <div>
          <h1
            className="text-2xl sm:text-3xl font-serif font-black text-stone-900 tracking-tight"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            Editorial Story Archive
          </h1>
          <p className="text-xs text-stone-600 mt-1 font-serif">
            Full inventory of drafts, scheduled stories, and live published reports.
          </p>
        </div>

        <button
          onClick={() => navigate('/cms/articles/new')}
          className="bg-[#800000] hover:bg-red-950 text-white font-semibold text-xs px-4 py-2.5 rounded shadow flex items-center gap-1.5 transition-colors self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Write New Article</span>
        </button>
      </div>

      {actionError && (
        <div className="p-3 bg-red-50 border border-red-300 text-red-800 text-xs rounded flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="font-bold text-red-600">×</button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded border border-stone-200 flex flex-col sm:flex-row gap-3 items-center justify-between shadow-xs">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            placeholder="Search headline, beat, or reporter..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#800000]"
          />
          <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-3" />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <span className="text-xs text-stone-500 font-semibold flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" />
            Status:
          </span>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            className="py-1.5 px-3 bg-stone-50 border border-stone-300 rounded text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#800000]"
          >
            <option value="all">All ({articles.length})</option>
            <option value="published">Published ({articles.filter(a => a.status === 'published').length})</option>
            <option value="draft">Drafts ({articles.filter(a => a.status === 'draft').length})</option>
            <option value="archived">Archived ({articles.filter(a => a.status === 'archived').length})</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded border border-stone-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-4 animate-pulse">
            {[1, 2, 3, 4].map(n => (
              <div key={n} className="h-10 bg-stone-100 rounded"></div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm font-semibold text-stone-700">No Articles Found</p>
            <p className="text-xs text-stone-500 mt-1">
              {articles.length === 0
                ? "No stories have been filed in the system yet. Click 'Write New Article' to create the first one."
                : 'No articles match your current search and filter criteria.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 uppercase font-semibold">
                <tr>
                  <th className="py-3 px-4">Headline</th>
                  <th className="py-3 px-3">Beat</th>
                  <th className="py-3 px-3">Author</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Reads</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filtered.map(art => {
                  const publicUrl = art.subcategory
                    ? `/news/${art.category}/${art.subcategory}/${art.slug}`
                    : `/news/${art.category}/${art.slug}`;

                  return (
                    <tr key={art.id} className="hover:bg-stone-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-stone-900 max-w-sm">
                        <div className="truncate">{art.title}</div>
                        <div className="text-[10px] text-stone-400 font-mono mt-0.5 truncate">
                          /{art.slug}
                        </div>
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="bg-stone-100 text-stone-800 font-medium px-2 py-0.5 rounded text-[10px]">
                          {art.category}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-stone-700 font-medium">
                        {art.authorName}
                      </td>
                      <td className="py-3.5 px-3">
                        {art.status === 'published' ? (
                          <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold text-[10px] uppercase inline-flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            Published
                          </span>
                        ) : (
                          <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-bold text-[10px] uppercase inline-flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Draft
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-3 text-stone-500 whitespace-nowrap">
                        {formatDate(art.publishedAt || art.createdAt)}
                      </td>
                      <td className="py-3.5 px-3 text-stone-600 font-medium">
                        {art.views || 0}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end space-x-2">
                          {art.status === 'published' && (
                            <button
                              onClick={() => navigate(publicUrl)}
                              className="p-1 text-stone-400 hover:text-stone-800"
                              title="View on Public Newspaper"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {(isAdmin || isEditor) && (
                            <button
                              onClick={() => handleTogglePublish(art)}
                              className={`px-2 py-1 rounded text-[11px] font-semibold transition-colors ${
                                art.status === 'published'
                                  ? 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                                  : 'bg-emerald-600 text-white hover:bg-emerald-700'
                              }`}
                            >
                              {art.status === 'published' ? 'Unpublish' : 'Publish'}
                            </button>
                          )}

                          <button
                            onClick={() => navigate(`/cms/articles/edit/${art.id}`)}
                            className="p-1 text-blue-600 hover:text-blue-800"
                            title="Edit Article"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {(isAdmin || isEditor || (art.authorId === staffUser?.uid && art.status === 'draft')) && (
                            <button
                              onClick={() => handleDelete(art.id, art.title)}
                              className="p-1 text-red-600 hover:text-red-800"
                              title="Delete Article"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
