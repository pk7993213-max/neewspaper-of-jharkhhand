import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from '../../context/RouterContext';
import { useAuth } from '../../context/AuthContext';
import {
  createArticle,
  updateArticle,
  getArticleById,
  generateSlug,
  calculateReadingTime,
} from '../../firebase/services/articles';
import { getCategories } from '../../firebase/services/categories';
import { getAllVideosForCMS } from '../../firebase/services/videos';
import { uploadImageFile } from '../../firebase/services/storage';
import { Article, ArticleStatus, NewsCategory, VideoItem } from '../../types';
import {
  Save,
  Send,
  ArrowLeft,
  Image as ImageIcon,
  Video as VideoIcon,
  Eye,
  AlertCircle,
  CheckCircle,
  Plus,
  X,
  Upload,
  Sparkles,
} from 'lucide-react';

interface ArticleEditorProps {
  articleId?: string;
}

export const ArticleEditor: React.FC<ArticleEditorProps> = ({ articleId }) => {
  const { navigate } = useRouter();
  const { staffUser, isAdmin, isEditor } = useAuth();

  const [categories, setCategories] = useState<NewsCategory[]>([]);
  const [availableVideos, setAvailableVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(!!articleId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [slugManual, setSlugManual] = useState(false);
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [featuredImage, setFeaturedImage] = useState('');
  const [featuredImageCaption, setFeaturedImageCaption] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [selectedVideoId, setSelectedVideoId] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [status, setStatus] = useState<ArticleStatus>('draft');
  const [isBreaking, setIsBreaking] = useState(false);
  const [isFeatured, setIsFeatured] = useState(false);
  const [authorName, setAuthorName] = useState(staffUser?.displayName || 'Staff Correspondent');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Warn user before leaving unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // Load initial data
  useEffect(() => {
    let mounted = true;
    async function init() {
      try {
        const [cats, vids] = await Promise.all([
          getCategories(),
          getAllVideosForCMS(),
        ]);
        if (mounted) {
          setCategories(cats || []);
          if (cats && cats.length > 0 && !category) {
            setCategory(cats[0].slug);
          }
          setAvailableVideos(vids || []);
        }

        if (articleId) {
          const existing = await getArticleById(articleId);
          if (mounted && existing) {
            setTitle(existing.title);
            setSlug(existing.slug);
            setSlugManual(true);
            setExcerpt(existing.excerpt || '');
            setContent(existing.content);
            setCategory(existing.category);
            setSubcategory(existing.subcategory || '');
            setFeaturedImage(existing.featuredImage || '');
            setFeaturedImageCaption(existing.featuredImageCaption || '');
            setImages(existing.images || []);
            setSelectedVideoId(existing.videoId || '');
            setTags(existing.tags || []);
            setStatus(existing.status);
            setIsBreaking(!!existing.isBreaking);
            setIsFeatured(!!existing.isFeatured);
            setAuthorName(existing.authorName);
          }
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load article details');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    init();
    return () => {
      mounted = false;
    };
  }, [articleId]);

  // Auto-generate slug from headline if not manually customized
  const handleTitleChange = (val: string) => {
    setTitle(val);
    setIsDirty(true);
    if (!slugManual) {
      setSlug(generateSlug(val));
    }
  };

  const handleAddTag = () => {
    const trimmed = tagInput.trim().replace(/^#/, '');
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagInput('');
      setIsDirty(true);
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
    setIsDirty(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    setError(null);
    try {
      const { url } = await uploadImageFile(file, 'news-images');
      setFeaturedImage(url);
      setIsDirty(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Image upload failed');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSave = async (targetStatus: ArticleStatus) => {
    if (!title.trim()) {
      setError('Article headline is required.');
      return;
    }
    if (!content.trim()) {
      setError('Article content cannot be empty.');
      return;
    }
    if (!category.trim()) {
      setError('Please assign an editorial category/beat.');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    const chosenVideo = availableVideos.find(v => v.id === selectedVideoId);

    const articlePayload = {
      title: title.trim(),
      slug: slug.trim() || generateSlug(title),
      excerpt: excerpt.trim(),
      content: content.trim(),
      category: category.trim(),
      subcategory: subcategory.trim() || undefined,
      authorId: staffUser?.uid || 'staff',
      authorName: authorName.trim() || staffUser?.displayName || 'Staff Correspondent',
      authorEmail: staffUser?.email,
      featuredImage: featuredImage.trim() || undefined,
      featuredImageCaption: featuredImageCaption.trim() || undefined,
      images,
      videoId: chosenVideo ? chosenVideo.id : undefined,
      videoUrl: chosenVideo ? chosenVideo.videoUrl : undefined,
      tags,
      status: targetStatus,
      readingTime: calculateReadingTime(content),
      isBreaking,
      isFeatured,
      publishedAt: targetStatus === 'published' ? new Date().toISOString() : undefined,
    };

    try {
      if (articleId) {
        await updateArticle(articleId, articlePayload);
        setSuccess('Story updated successfully!');
      } else {
        const created = await createArticle(articlePayload);
        setSuccess('Story drafted successfully!');
        navigate(`/cms/articles/edit/${created.id}`, true);
      }
      setStatus(targetStatus);
      setIsDirty(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Save operation failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-12 text-center text-stone-500 animate-pulse">
        Loading story editor...
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-stone-200 gap-4">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => {
              if (isDirty && !window.confirm('You have unsaved changes. Discard and return to articles?')) {
                return;
              }
              navigate('/cms/articles');
            }}
            className="p-1.5 hover:bg-stone-200 rounded text-stone-600 transition-colors"
            title="Back to Articles"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1
              className="text-2xl font-serif font-black text-stone-900"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              {articleId ? 'Edit Article' : 'Compose News Article'}
            </h1>
            <div className="text-xs text-stone-500 flex items-center gap-2">
              <span>Status: <strong className="uppercase">{status}</strong></span>
              {isDirty && <span className="text-amber-600 font-medium">• Unsaved edits</span>}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setPreviewMode(!previewMode)}
            className="bg-stone-200 hover:bg-stone-300 text-stone-800 font-semibold px-3 py-2 rounded text-xs flex items-center gap-1.5 transition-colors"
          >
            <Eye className="w-4 h-4" />
            <span>{previewMode ? 'Back to Editor' : 'Preview Paper View'}</span>
          </button>

          <button
            type="button"
            onClick={() => handleSave('draft')}
            disabled={saving}
            className="bg-stone-800 hover:bg-stone-900 text-white font-semibold px-4 py-2 rounded text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>Save Draft</span>
          </button>

          {(isAdmin || isEditor) && (
            <button
              type="button"
              onClick={() => handleSave('published')}
              disabled={saving}
              className="bg-[#800000] hover:bg-red-900 text-white font-semibold px-5 py-2 rounded text-xs flex items-center gap-1.5 transition-colors shadow disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{status === 'published' ? 'Update & Keep Live' : 'Publish to Public'}</span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-300 text-red-800 text-xs rounded flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="font-bold text-red-600">×</button>
        </div>
      )}

      {success && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs rounded flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess(null)} className="font-bold text-emerald-600">×</button>
        </div>
      )}

      {previewMode ? (
        /* Preview Drawer */
        <div className="bg-white p-8 rounded-lg border border-stone-200 shadow-sm max-w-3xl mx-auto space-y-6">
          <div className="border-b pb-4 text-xs font-bold text-red-700 uppercase tracking-wider">
            PREVIEW: {category} {subcategory && `• ${subcategory}`}
          </div>
          <h1 className="text-3xl sm:text-4xl font-serif font-black text-stone-950 leading-tight">
            {title || 'Untitled Article'}
          </h1>
          {excerpt && (
            <p className="text-lg text-stone-700 font-serif italic border-l-4 border-red-800 pl-4">
              {excerpt}
            </p>
          )}
          {featuredImage && (
            <div className="rounded overflow-hidden">
              <img src={featuredImage} alt="" className="w-full h-80 object-cover" />
              {featuredImageCaption && (
                <div className="text-xs text-stone-500 mt-1 italic">{featuredImageCaption}</div>
              )}
            </div>
          )}
          <div className="font-serif text-stone-900 leading-relaxed space-y-4 whitespace-pre-line">
            {content}
          </div>
        </div>
      ) : (
        /* Main Writing Form */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Content Column */}
          <div className="lg:col-span-8 space-y-6 bg-white p-6 rounded border border-stone-200 shadow-xs">
            {/* Headline */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                Headline / Title *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={e => handleTitleChange(e.target.value)}
                placeholder="Enter compelling journalistic headline..."
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-300 rounded font-serif text-lg font-bold text-stone-900 focus:outline-none focus:ring-1 focus:ring-[#800000]"
              />
            </div>

            {/* Slug */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold uppercase tracking-wider text-stone-600">
                  SEO Slug URL
                </label>
                <span className="text-[11px] text-stone-400">
                  Preview: /news/{category || 'section'}/{slug || 'slug'}
                </span>
              </div>
              <input
                type="text"
                value={slug}
                onChange={e => {
                  setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'));
                  setSlugManual(true);
                  setIsDirty(true);
                }}
                className="w-full px-3 py-1.5 bg-stone-50 border border-stone-300 rounded text-xs font-mono text-stone-700 focus:outline-none"
              />
            </div>

            {/* Excerpt / Lead */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                Lead Paragraph / Summary
              </label>
              <textarea
                rows={3}
                value={excerpt}
                onChange={e => {
                  setExcerpt(e.target.value);
                  setIsDirty(true);
                }}
                placeholder="A concise synopsis introducing the breaking angle..."
                className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded text-xs leading-relaxed focus:outline-none focus:ring-1 focus:ring-[#800000]"
              />
            </div>

            {/* Article Content Body */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-stone-700">
                  Article Body Text *
                </label>
                <span className="text-[11px] text-stone-500">
                  ~{calculateReadingTime(content)} min read • {content.trim().split(/\s+/).filter(Boolean).length} words
                </span>
              </div>
              <textarea
                rows={16}
                required
                value={content}
                onChange={e => {
                  setContent(e.target.value);
                  setIsDirty(true);
                }}
                placeholder="Write full article body paragraphs here. Separate paragraphs with a blank line for clean newspaper typography..."
                className="w-full px-4 py-3 bg-stone-50 border border-stone-300 rounded font-serif text-sm leading-relaxed text-stone-900 focus:outline-none focus:ring-1 focus:ring-[#800000]"
              />
            </div>
          </div>

          {/* Right Editorial Sidebar */}
          <div className="lg:col-span-4 space-y-6">
            {/* Classification & Attribution */}
            <div className="bg-white p-5 rounded border border-stone-200 shadow-xs space-y-4">
              <h3 className="font-serif font-bold text-sm text-stone-900 pb-2 border-b border-stone-200">
                Editorial Classification
              </h3>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1">
                  Beat / Category *
                </label>
                <select
                  value={category}
                  onChange={e => {
                    setCategory(e.target.value);
                    setIsDirty(true);
                  }}
                  className="w-full p-2 bg-stone-50 border border-stone-300 rounded text-xs font-medium focus:outline-none"
                >
                  <option value="">Select News Desk</option>
                  {categories.map(c => (
                    <option key={c.id || c.slug} value={c.slug}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1">
                  Sub-Desk / City (e.g. Ranchi, Dhanbad)
                </label>
                <input
                  type="text"
                  value={subcategory}
                  onChange={e => {
                    setSubcategory(e.target.value);
                    setIsDirty(true);
                  }}
                  placeholder="e.g. Ranchi"
                  className="w-full px-3 py-1.5 bg-stone-50 border border-stone-300 rounded text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1">
                  Reporter / Byline
                </label>
                <input
                  type="text"
                  value={authorName}
                  onChange={e => {
                    setAuthorName(e.target.value);
                    setIsDirty(true);
                  }}
                  className="w-full px-3 py-1.5 bg-stone-50 border border-stone-300 rounded text-xs focus:outline-none"
                />
              </div>

              {/* Editorial Flags */}
              <div className="pt-2 border-t border-stone-100 space-y-2">
                <label className="flex items-center space-x-2 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isBreaking}
                    onChange={e => {
                      setIsBreaking(e.target.checked);
                      setIsDirty(true);
                    }}
                    className="rounded text-red-600 focus:ring-red-500"
                  />
                  <span className="font-semibold text-red-700">Feature on Breaking News Banner</span>
                </label>

                <label className="flex items-center space-x-2 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isFeatured}
                    onChange={e => {
                      setIsFeatured(e.target.checked);
                      setIsDirty(true);
                    }}
                    className="rounded text-stone-900 focus:ring-stone-800"
                  />
                  <span className="font-semibold text-stone-800">Lead Top Story on Homepage</span>
                </label>
              </div>
            </div>

            {/* Featured Image Box */}
            <div className="bg-white p-5 rounded border border-stone-200 shadow-xs space-y-3">
              <h3 className="font-serif font-bold text-sm text-stone-900 pb-2 border-b border-stone-200 flex items-center justify-between">
                <span>Featured Cover Image</span>
                <ImageIcon className="w-4 h-4 text-stone-400" />
              </h3>

              {featuredImage && (
                <div className="relative aspect-video rounded overflow-hidden bg-stone-100 border border-stone-300">
                  <img src={featuredImage} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => {
                      setFeaturedImage('');
                      setIsDirty(true);
                    }}
                    className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded-full text-xs shadow"
                    title="Remove image"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}

              {/* Upload to Firebase Storage */}
              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage}
                  className="w-full bg-stone-100 hover:bg-stone-200 text-stone-800 py-2 px-3 rounded text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-stone-300 disabled:opacity-50"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{uploadingImage ? 'Uploading to Storage...' : 'Upload Image File'}</span>
                </button>
              </div>

              <div>
                <label className="block text-[11px] text-stone-500 mb-1">
                  Or paste direct Image URL:
                </label>
                <input
                  type="text"
                  value={featuredImage}
                  onChange={e => {
                    setFeaturedImage(e.target.value);
                    setIsDirty(true);
                  }}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full px-2.5 py-1.5 bg-stone-50 border border-stone-300 rounded text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] text-stone-500 mb-1">
                  Image Caption / Photo Credit:
                </label>
                <input
                  type="text"
                  value={featuredImageCaption}
                  onChange={e => {
                    setFeaturedImageCaption(e.target.value);
                    setIsDirty(true);
                  }}
                  placeholder="e.g. PTI / State Bureau"
                  className="w-full px-2.5 py-1.5 bg-stone-50 border border-stone-300 rounded text-xs focus:outline-none"
                />
              </div>
            </div>

            {/* Video Attachment Box */}
            <div className="bg-white p-5 rounded border border-stone-200 shadow-xs space-y-3">
              <h3 className="font-serif font-bold text-sm text-stone-900 pb-2 border-b border-stone-200 flex items-center justify-between">
                <span>Attach Video Dispatch</span>
                <VideoIcon className="w-4 h-4 text-stone-400" />
              </h3>

              <p className="text-[11px] text-stone-500">
                Optionally link an editorial video uploaded to Firebase Storage.
              </p>

              <select
                value={selectedVideoId}
                onChange={e => {
                  setSelectedVideoId(e.target.value);
                  setIsDirty(true);
                }}
                className="w-full p-2 bg-stone-50 border border-stone-300 rounded text-xs font-medium focus:outline-none"
              >
                <option value="">No Video Attached</option>
                {availableVideos.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.title} ({v.category})
                  </option>
                ))}
              </select>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => navigate('/cms/videos')}
                  className="text-xs text-[#800000] hover:underline font-semibold flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Upload New Video First</span>
                </button>
              </div>
            </div>

            {/* Tags Input */}
            <div className="bg-white p-5 rounded border border-stone-200 shadow-xs space-y-3">
              <h3 className="font-serif font-bold text-sm text-stone-900 pb-2 border-b border-stone-200">
                SEO & Tags
              </h3>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  placeholder="Add tag and press Enter..."
                  className="flex-1 px-2.5 py-1.5 bg-stone-50 border border-stone-300 rounded text-xs focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  className="bg-stone-800 text-white px-3 py-1.5 rounded text-xs font-semibold"
                >
                  Add
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-1">
                {tags.map(t => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 bg-stone-100 text-stone-800 text-[11px] px-2 py-0.5 rounded font-medium"
                  >
                    <span>#{t}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(t)}
                      className="text-stone-400 hover:text-stone-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
