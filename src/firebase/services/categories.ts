import {
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from '../config';
import { handleFirestoreError, OperationType } from '../errors';
import { NewsCategory } from '../../types';

export const DEFAULT_CATEGORIES: Omit<NewsCategory, 'id'>[] = [
  { name: 'Jharkhand & State', slug: 'jharkhand', description: 'Local reporting from Ranchi, Jamshedpur, Dhanbad and across Jharkhand', order: 1 },
  { name: 'National', slug: 'national', description: 'Key news and affairs shaping the nation', order: 2 },
  { name: 'Politics', slug: 'politics', description: 'Parliament, elections, policy and governmental decisions', order: 3 },
  { name: 'Business & Economy', slug: 'business', description: 'Markets, finance, industries, startups and RBI updates', order: 4 },
  { name: 'Sports', slug: 'sports', description: 'Cricket, Olympics, football, badminton and athletics', order: 5 },
  { name: 'Entertainment', slug: 'entertainment', description: 'Cinema, OTT, celebrity features and culture', order: 6 },
  { name: 'Technology', slug: 'technology', description: 'AI, gadgets, cyber security and digital transformation', order: 7 },
  { name: 'Opinion & Editorial', slug: 'opinion', description: 'In-depth perspectives from eminent columnists', order: 8 },
];

export async function getCategories(): Promise<NewsCategory[]> {
  const collPath = 'categories';
  try {
    const q = query(collection(db, collPath), orderBy('order', 'asc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({
      id: d.id,
      ...(d.data() as Omit<NewsCategory, 'id'>),
    }));
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, collPath);
  }
}

export async function createCategory(cat: Omit<NewsCategory, 'id'>, customId?: string): Promise<NewsCategory> {
  const collPath = 'categories';
  try {
    const id = customId || cat.slug.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    const docRef = doc(db, collPath, id);
    await setDoc(docRef, cat, { merge: true });
    return { id, ...cat };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, collPath);
  }
}

export async function updateCategory(id: string, cat: Partial<NewsCategory>): Promise<void> {
  const docPath = `categories/${id}`;
  try {
    await setDoc(doc(db, 'categories', id), cat, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, docPath);
  }
}

export async function deleteCategory(id: string): Promise<void> {
  const docPath = `categories/${id}`;
  try {
    await deleteDoc(doc(db, 'categories', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, docPath);
  }
}

export async function seedDefaultCategoriesIfEmpty(): Promise<NewsCategory[]> {
  try {
    const current = await getCategories();
    if (current && current.length > 0) {
      return current;
    }
    const created: NewsCategory[] = [];
    for (const cat of DEFAULT_CATEGORIES) {
      const res = await createCategory(cat, cat.slug);
      created.push(res);
    }
    return created;
  } catch {
    return [];
  }
}
