export type UserRole = 'admin' | 'editor' | 'reporter';

export interface StaffUser {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  photoURL?: string;
  createdAt?: string;
}

export type ArticleStatus = 'draft' | 'published' | 'archived';

export interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category: string;
  subcategory?: string;
  authorId: string;
  authorName: string;
  authorEmail?: string;
  featuredImage?: string;
  featuredImageCaption?: string;
  images?: string[];
  videoId?: string;
  videoUrl?: string;
  tags?: string[];
  status: ArticleStatus;
  readingTime?: number;
  isBreaking?: boolean;
  isFeatured?: boolean;
  views?: number;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface VideoItem {
  id: string;
  title: string;
  description?: string;
  videoUrl: string;
  storagePath: string;
  fileName: string;
  fileSize: number;
  contentType: string;
  category?: string;
  status: 'draft' | 'published';
  authorId: string;
  authorName?: string;
  views?: number;
  createdAt: string;
  updatedAt: string;
}

export interface NewsCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  order: number;
}
