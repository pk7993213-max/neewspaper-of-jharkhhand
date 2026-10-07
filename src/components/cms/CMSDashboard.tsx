import React, { useState, useEffect } from 'react';
import { useRouter } from '../../context/RouterContext';
import { getAllArticlesForCMS } from '../../firebase/services/articles';
import { getAllVideosForCMS } from '../../firebase/services/videos';
import { getCategories, seedDefaultCategoriesIfEmpty } from '../../firebase/services/categories';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { Article, VideoItem, NewsCategory } from '../../types';
import { formatDate, formatTimeAgo } from '../../utils/format';
import {
  FileText,
  CheckCircle,
  Clock,
  Video,
  Layers,
  Eye,
  PlusCircle,
  Upload,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  Sparkles,
  Archive,
  Users,
} from 'lucide-react';

export const CMSDashboard: React.FC = () => {
  const { navigate } = useRouter();

  const [articles, setArticles] = useState<Article[]>([]);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [categories, setCategories] = useState<NewsCategory[]>([]);
  const [staffCount, setStaffCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function loadStats() {
      try {
        const [arts, vids, cats, usersSnap] = await Promise.all([
          getAllArticlesForCMS(),
          getAllVideosForCMS(),
          getCategories(),
          getDocs(collection(db, 'users')).catch(() => ({ size: 0 })),
        ]);
        if (mounted) {
          setArticles(arts || []);
          setVideos(vids || []);
          setCategories(cats || []);
          setStaffCount('size' in usersSnap ? usersSnap.size : 0);
        }
      } catch (err) {
        console.error('Failed to load dashboard metrics:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadStats();
    return () => {
      mounted = false;
    };
  }, []);

  const handleSeedCategories = async () => {
    setSeeding(true);
    setNotice(null);
    try {
      const seeded = await seedDefaultCategoriesIfEmpty();
      setCategories(seeded || []);
      setNotice('Default Indian newspaper beats (State/Jharkhand, National, Politics, Business, Sports, etc.) seeded successfully!');
    } catch (err: unknown) {
      setNotice(err instanceof Error ? err.message : 'Failed to seed categories');
    } finally {
      setSeeding(false);
    }
  };

  const totalArticles = articles.length;
  const publishedArticles = articles.filter(a => a.status === 'published').length;
  const draftArticles = articles.filter(a => a.status === 'draft').length;
  const archivedArticles = articles.filter(a => a.status === 'archived').length;
  const totalVideos = videos.length;
  const totalCategories = categories.length;
  const totalViews = articles.reduce((sum, a) => sum + (a.views || 0), 0) +
                     videos.reduce((sum, v) => sum + (v.views || 0), 0);

  const recentArticles = articles.slice(0, 5);
  const recentVideos = videos.slice(0, 4);

  return (
    <div className="space-y-8">
      {/* Top Welcome & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-stone-200 gap-4">
        <div>
          <h1
            className="text-2xl sm:text-3xl font-serif font-black text-stone-900 tracking-tight"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            Newsroom Desk Overview
          </h1>
          <p className="text-xs text-stone-600 mt-1 font-serif">
            Live editorial operations, publication status, and multimedia dispatch monitoring.
          </p>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <button
            onClick={() => navigate('/cms/articles/new')}
            className="bg-[#800000] hover:bg-red-950 text-white font-semibold text-xs px-4 py-2.5 rounded shadow flex items-center gap-1.5 transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Article</span>
          </button>

          <button
            onClick={() => navigate('/cms/videos')}
            className="bg-stone-900 hover:bg-black text-white font-semibold text-xs px-4 py-2.5 rounded shadow flex items-center gap-1.5 transition-colors"
          >
            <Upload className="w-4 h-4" />
            <span>Upload Video</span>
          </button>
        </div>
      </div>

      {notice && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs rounded flex items-center justify-between">
          <span>{notice}</span>
          <button onClick={() => setNotice(null)} className="text-emerald-700 font-bold ml-2">×</button>
        </div>
      )}

      {/* Zero categories banner recommendation */}
      {categories.length === 0 && !loading && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded text-xs text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-600 shrink-0" />
            <span>
              Your database currently has 0 categories configured. Seed standard newspaper sections (Jharkhand, National, Politics, Business, Sports, etc.) to organize stories.
            </span>
          </div>
          <button
            onClick={handleSeedCategories}
            disabled={seeding}
            className="bg-amber-800 hover:bg-amber-900 text-white font-semibold px-3 py-1.5 rounded shrink-0 transition-colors disabled:opacity-50"
          >
            {seeding ? 'Seeding...' : 'Seed Editorial Categories'}
          </button>
        </div>
      )}

      {/* Metrics Cards Grid - REAL DATA ONLY */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
        {/* Total Articles */}
        <div className="bg-white p-4 rounded border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total</span>
            <FileText className="w-4 h-4 text-stone-700" />
          </div>
          <div className="text-2xl font-bold font-serif text-stone-900">
            {loading ? '...' : totalArticles}
          </div>
        </div>

        {/* Published */}
        <div className="bg-white p-4 rounded border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between text-emerald-600 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Published</span>
            <CheckCircle className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold font-serif text-emerald-700">
            {loading ? '...' : publishedArticles}
          </div>
        </div>

        {/* Drafts */}
        <div className="bg-white p-4 rounded border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between text-amber-600 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Drafts</span>
            <Clock className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold font-serif text-amber-700">
            {loading ? '...' : draftArticles}
          </div>
        </div>

        {/* Archived */}
        <div className="bg-white p-4 rounded border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between text-stone-600 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Archived</span>
            <Archive className="w-4 h-4 text-stone-600" />
          </div>
          <div className="text-2xl font-bold font-serif text-stone-800">
            {loading ? '...' : archivedArticles}
          </div>
        </div>

        {/* Videos */}
        <div className="bg-white p-4 rounded border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between text-purple-600 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Videos</span>
            <Video className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold font-serif text-purple-800">
            {loading ? '...' : totalVideos}
          </div>
        </div>

        {/* Staff */}
        <div className="bg-white p-4 rounded border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between text-blue-600 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Staff</span>
            <Users className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold font-serif text-blue-800">
            {loading ? '...' : staffCount}
          </div>
        </div>

        {/* Readership / Views */}
        <div className="bg-white p-4 rounded border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between text-rose-600 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Reads</span>
            <Eye className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold font-serif text-rose-800">
            {loading ? '...' : totalViews}
          </div>
        </div>
      </div>

      {/* Main Two-Column Newsroom Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Recent Articles Table */}
        <div className="lg:col-span-8 bg-white rounded border border-stone-200 shadow-xs p-6">
          <div className="flex items-center justify-between pb-4 border-b border-stone-200 mb-4">
            <h3 className="font-serif font-bold text-lg text-stone-900">
              Recent Newsroom Filings
            </h3>
            <button
              onClick={() => navigate('/cms/articles')}
              className="text-xs font-semibold text-[#800000] hover:underline flex items-center gap-1"
            >
              <span>View All Articles</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {loading ? (
            <div className="space-y-3 animate-pulse">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-12 bg-stone-100 rounded"></div>
              ))}
            </div>
          ) : recentArticles.length === 0 ? (
            <div className="py-12 text-center">
              <FileText className="w-10 h-10 text-stone-300 mx-auto mb-2" />
              <div className="text-sm font-semibold text-stone-700">No Articles Filed Yet</div>
              <p className="text-xs text-stone-500 max-w-sm mx-auto mt-1 mb-4">
                Begin reporting by creating your first article draft or publishing a breaking headline.
              </p>
              <button
                onClick={() => navigate('/cms/articles/new')}
                className="bg-[#800000] text-white text-xs px-4 py-2 rounded font-semibold"
              >
                Create First Article
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-stone-200 text-stone-500 uppercase font-semibold">
                    <th className="pb-2">Headline</th>
                    <th className="pb-2">Beat</th>
                    <th className="pb-2">Status</th>
                    <th className="pb-2">Author</th>
                    <th className="pb-2">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {recentArticles.map(art => (
                    <tr key={art.id} className="hover:bg-stone-50 transition-colors">
                      <td className="py-3 pr-3 font-medium text-stone-900 max-w-xs truncate">
                        {art.title}
                      </td>
                      <td className="py-3 pr-2 text-stone-600">{art.category}</td>
                      <td className="py-3 pr-2">
                        {art.status === 'published' ? (
                          <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold text-[10px] uppercase">
                            Published
                          </span>
                        ) : (
                          <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-bold text-[10px] uppercase">
                            Draft
                          </span>
                        )}
                      </td>
                      <td className="py-3 pr-2 text-stone-600">{art.authorName}</td>
                      <td className="py-3">
                        <button
                          onClick={() => navigate(`/cms/articles/edit/${art.id}`)}
                          className="text-[#800000] font-semibold hover:underline"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Video Desk Rail */}
        <div className="lg:col-span-4 bg-white rounded border border-stone-200 shadow-xs p-6">
          <div className="flex items-center justify-between pb-4 border-b border-stone-200 mb-4">
            <h3 className="font-serif font-bold text-lg text-stone-900">
              Video Desk
            </h3>
            <button
              onClick={() => navigate('/cms/videos')}
              className="text-xs font-semibold text-[#800000] hover:underline flex items-center gap-1"
            >
              <span>Manage</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {loading ? (
            <div className="space-y-3 animate-pulse">
              {[1, 2].map(i => (
                <div key={i} className="h-20 bg-stone-100 rounded"></div>
              ))}
            </div>
          ) : recentVideos.length === 0 ? (
            <div className="py-8 text-center">
              <Video className="w-8 h-8 text-stone-300 mx-auto mb-2" />
              <div className="text-xs font-semibold text-stone-700">No Videos Uploaded</div>
              <p className="text-[11px] text-stone-500 mt-1 mb-3">
                Upload real MP4/WebM video files directly to Firebase Storage.
              </p>
              <button
                onClick={() => navigate('/cms/videos')}
                className="bg-stone-900 text-white text-xs px-3 py-1.5 rounded font-semibold"
              >
                Upload Video
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {recentVideos.map(vid => (
                <div key={vid.id} className="p-2.5 border border-stone-100 rounded bg-stone-50/60">
                  <div className="font-semibold text-stone-900 text-xs truncate mb-1">
                    {vid.title}
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-stone-500">
                    <span>{vid.category || 'General'}</span>
                    <span>{formatTimeAgo(vid.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
