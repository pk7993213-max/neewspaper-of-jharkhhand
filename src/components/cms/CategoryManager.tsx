import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  getCategories,
  createCategory,
  deleteCategory,
  seedDefaultCategoriesIfEmpty,
} from '../../firebase/services/categories';
import { NewsCategory } from '../../types';
import { Layers, Plus, Trash2, Sparkles, Check, AlertCircle } from 'lucide-react';

export const CategoryManager: React.FC = () => {
  const { isAdmin, isEditor } = useAuth();
  const [categories, setCategories] = useState<NewsCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const list = await getCategories();
      setCategories(list || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const generatedSlug = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-') ||
                          name.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');

    try {
      await createCategory({
        name: name.trim(),
        slug: generatedSlug,
        description: description.trim(),
        order: categories.length + 1,
      });
      setName('');
      setSlug('');
      setDescription('');
      setMessage(`Category "${name}" created.`);
      await loadData();
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : 'Failed to create category');
    }
  };

  const handleDelete = async (id: string, catName: string) => {
    if (!window.confirm(`Delete category "${catName}"?`)) return;
    try {
      await deleteCategory(id);
      await loadData();
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : 'Failed to delete category');
    }
  };

  const handleSeed = async () => {
    setSeeding(true);
    setMessage(null);
    try {
      const res = await seedDefaultCategoriesIfEmpty();
      setCategories(res);
      setMessage('Default Indian newspaper beats seeded successfully!');
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : 'Failed to seed categories');
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-stone-200 gap-4">
        <div>
          <h1
            className="text-2xl sm:text-3xl font-serif font-black text-stone-900 tracking-tight flex items-center gap-2"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            <Layers className="w-7 h-7 text-[#800000]" />
            Newspaper Categories & Editorial Beats
          </h1>
          <p className="text-xs text-stone-600 mt-1 font-serif">
            Configure primary navigation sections and state/national reporting beats.
          </p>
        </div>

        <button
          onClick={handleSeed}
          disabled={seeding}
          className="bg-stone-900 hover:bg-black text-white text-xs font-semibold px-4 py-2.5 rounded shadow flex items-center gap-1.5 transition-colors disabled:opacity-50 self-start sm:self-auto"
        >
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>{seeding ? 'Seeding...' : 'Seed Standard Indian Beats'}</span>
        </button>
      </div>

      {message && (
        <div className="p-3 bg-stone-100 border border-stone-300 text-stone-800 text-xs rounded flex items-center justify-between">
          <span>{message}</span>
          <button onClick={() => setMessage(null)} className="font-bold text-stone-600">×</button>
        </div>
      )}

      {/* Add New Category Form */}
      {(isAdmin || isEditor) && (
        <div className="bg-white p-6 rounded border border-stone-200 shadow-xs">
          <h2 className="font-serif font-bold text-base text-stone-900 mb-4 pb-2 border-b border-stone-100 flex items-center gap-2">
            <Plus className="w-4 h-4 text-red-700" />
            Add New Editorial Beat
          </h2>

          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => {
                    setName(e.target.value);
                    if (!slug) {
                      setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'));
                    }
                  }}
                  placeholder="e.g. Jharkhand & State"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#800000]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                  URL Slug
                </label>
                <input
                  type="text"
                  value={slug}
                  onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                  placeholder="e.g. jharkhand"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded text-xs font-mono focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                  Beat Scope / Description
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="e.g. Grassroots reportage from Ranchi, Dhanbad and Jamshedpur"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded text-xs focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              className="bg-[#800000] hover:bg-red-950 text-white font-semibold text-xs px-5 py-2 rounded shadow transition-colors"
            >
              Add Category
            </button>
          </form>
        </div>
      )}

      {/* Categories List */}
      <div className="bg-white rounded border border-stone-200 overflow-hidden shadow-xs">
        <div className="p-4 bg-stone-50 border-b border-stone-200 font-serif font-bold text-sm text-stone-900">
          Active Newspaper Sections ({categories.length})
        </div>

        {loading ? (
          <div className="p-6 space-y-3 animate-pulse">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-8 bg-stone-100 rounded"></div>
            ))}
          </div>
        ) : categories.length === 0 ? (
          <div className="p-8 text-center text-xs text-stone-500">
            No categories defined. Click "Seed Standard Indian Beats" above to initialize default sections.
          </div>
        ) : (
          <div className="divide-y divide-stone-100">
            {categories.map((c, idx) => (
              <div key={c.id || c.slug} className="p-4 flex items-center justify-between hover:bg-stone-50 transition-colors">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-stone-900">{c.name}</span>
                    <span className="text-[11px] font-mono text-stone-400 bg-stone-100 px-1.5 py-0.5 rounded">
                      /{c.slug}
                    </span>
                  </div>
                  {c.description && (
                    <div className="text-xs text-stone-500 mt-0.5">{c.description}</div>
                  )}
                </div>

                {isAdmin && (
                  <button
                    onClick={() => handleDelete(c.id, c.name)}
                    className="text-stone-400 hover:text-red-700 p-1"
                    title="Delete Category"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
