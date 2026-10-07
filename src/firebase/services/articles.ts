import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  increment,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../config';
import { handleFirestoreError, OperationType } from '../errors';
import { Article, ArticleStatus } from '../../types';
import { syncArticleToAlgoliaIndex } from './search';

export function calculateReadingTime(text: string): number {
  if (!text) return 1;
  const words = text.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
}

export function generateSlug(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || `news-${Date.now().toString(36)}`;
}

export async function getPublishedArticles(options?: {
  category?: string;
  limitCount?: number;
  featuredOnly?: boolean;
  breakingOnly?: boolean;
}): Promise<Article[]> {
  const collPath = 'articles';
  try {
    let q = query(
      collection(db, collPath),
      where('status', '==', 'published'),
      orderBy('publishedAt', 'desc'),
      limit(options?.limitCount || 20)
    );

    if (options?.category && options.category.toLowerCase() !== 'all') {
      q = query(
        collection(db, collPath),
        where('status', '==', 'published'),
        where('category', '==', options.category),
        orderBy('publishedAt', 'desc'),
        limit(options?.limitCount || 20)
      );
    }

    const snapshot = await getDocs(q);
    let list: Article[] = snapshot.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Article, 'id'>) }));

    if (options?.featuredOnly) {
      list = list.filter(a => a.isFeatured);
    }
    if (options?.breakingOnly) {
      list = list.filter(a => a.isBreaking);
    }

    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, collPath);
  }
}

export async function getArticleBySlug(slug: string): Promise<Article | null> {
  const collPath = 'articles';
  try {
    const q = query(
      collection(db, collPath),
      where('slug', '==', slug),
      limit(1)
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    const docSnap = snapshot.docs[0];
    return { id: docSnap.id, ...(docSnap.data() as Omit<Article, 'id'>) };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, collPath);
  }
}

export async function getArticleById(id: string): Promise<Article | null> {
  const docPath = `articles/${id}`;
  try {
    const docSnap = await getDoc(doc(db, 'articles', id));
    if (!docSnap.exists()) return null;
    return { id: docSnap.id, ...(docSnap.data() as Omit<Article, 'id'>) };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, docPath);
  }
}

export async function getRelatedArticles(current: Article, limitCount = 4): Promise<Article[]> {
  const collPath = 'articles';
  try {
    const q = query(
      collection(db, collPath),
      where('status', '==', 'published'),
      where('category', '==', current.category),
      limit(limitCount + 1)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs
      .map(d => ({ id: d.id, ...(d.data() as Omit<Article, 'id'>) }))
      .filter(a => a.id !== current.id)
      .slice(0, limitCount);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, collPath);
  }
}

export async function incrementArticleViews(id: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'articles', id), {
      views: increment(1),
    });
  } catch {
    // Non-blocking counter
  }
}

export async function getAllArticlesForCMS(filterStatus?: ArticleStatus | 'all'): Promise<Article[]> {
  const collPath = 'articles';
  try {
    let q = query(collection(db, collPath), orderBy('createdAt', 'desc'));
    if (filterStatus && filterStatus !== 'all') {
      q = query(
        collection(db, collPath),
        where('status', '==', filterStatus),
        orderBy('createdAt', 'desc')
      );
    }
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Article, 'id'>) }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, collPath);
  }
}

export async function createArticle(
  data: Omit<Article, 'id' | 'createdAt' | 'updatedAt' | 'views'>
): Promise<Article> {
  const collPath = 'articles';
  try {
    const articleId = `art_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const readingTime = calculateReadingTime(data.content);

    const newArticle: Article = {
      id: articleId,
      ...data,
      readingTime: data.readingTime || readingTime,
      views: 0,
      publishedAt: data.status === 'published' ? (data.publishedAt || now) : '',
      createdAt: now,
      updatedAt: now,
    };

    const docRef = doc(db, collPath, articleId);
    await setDoc(docRef, newArticle);

    // Sync to Algolia search index (only published articles indexed)
    syncArticleToAlgoliaIndex(newArticle).catch(() => {});

    return newArticle;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, collPath);
  }
}

export async function updateArticle(
  id: string,
  data: Partial<Article>
): Promise<void> {
  const docPath = `articles/${id}`;
  try {
    const now = new Date().toISOString();
    const updates: Partial<Article> = {
      ...data,
      updatedAt: now,
    };
    if (data.content && !data.readingTime) {
      updates.readingTime = calculateReadingTime(data.content);
    }
    if (data.status === 'published' && !data.publishedAt) {
      updates.publishedAt = now;
    }

    await updateDoc(doc(db, 'articles', id), updates as any);

    // Fetch refreshed doc to sync to Algolia index
    getArticleById(id).then(refreshed => {
      if (refreshed) syncArticleToAlgoliaIndex(refreshed).catch(() => {});
    }).catch(() => {});
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, docPath);
  }
}

export async function deleteArticle(id: string): Promise<void> {
  const docPath = `articles/${id}`;
  try {
    await deleteDoc(doc(db, 'articles', id));
    // Remove from Algolia index
    syncArticleToAlgoliaIndex({ id, status: 'archived' } as any, true).catch(() => {});
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, docPath);
  }
}

export async function searchArticles(queryStr: string, categoryFilter?: string): Promise<Article[]> {
  const collPath = 'articles';
  try {
    const term = queryStr.trim().toLowerCase();
    // In Firestore, we query published articles ordered by publishedAt desc
    let q = query(
      collection(db, collPath),
      where('status', '==', 'published'),
      orderBy('publishedAt', 'desc'),
      limit(50)
    );
    if (categoryFilter && categoryFilter !== 'all') {
      q = query(
        collection(db, collPath),
        where('status', '==', 'published'),
        where('category', '==', categoryFilter),
        orderBy('publishedAt', 'desc'),
        limit(50)
      );
    }
    const snapshot = await getDocs(q);
    const articles = snapshot.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Article, 'id'>) }));

    if (!term) return articles;

    return articles.filter(a => {
      const matchTitle = a.title.toLowerCase().includes(term);
      const matchExcerpt = a.excerpt?.toLowerCase().includes(term);
      const matchAuthor = a.authorName?.toLowerCase().includes(term);
      const matchTag = a.tags?.some(t => t.toLowerCase().includes(term));
      const matchContent = a.content?.toLowerCase().includes(term);
      return matchTitle || matchExcerpt || matchAuthor || matchTag || matchContent;
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, collPath);
  }
}
