/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { RouterProvider, useRouter } from './context/RouterContext';

// Common Public Components
import { Header } from './components/common/Header';
import { Footer } from './components/common/Footer';
import { BreakingBanner } from './components/common/BreakingBanner';

// Public Views
import { HomeFeed } from './components/public/HomeFeed';
import { ArticlePage } from './components/public/ArticlePage';
import { CategoryPage } from './components/public/CategoryPage';
import { VideosPage } from './components/public/VideosPage';
import { SearchPage } from './components/public/SearchPage';

// CMS Components
import { CMSLogin } from './components/cms/CMSLogin';
import { CMSLayout } from './components/cms/CMSLayout';
import { CMSDashboard } from './components/cms/CMSDashboard';
import { ArticlesList } from './components/cms/ArticlesList';
import { ArticleEditor } from './components/cms/ArticleEditor';
import { VideoManager } from './components/cms/VideoManager';
import { MediaLibrary } from './components/cms/MediaLibrary';
import { CategoryManager } from './components/cms/CategoryManager';
import { TeamManager } from './components/cms/TeamManager';
import { BrandingManager } from './components/cms/BrandingManager';

const AppContent: React.FC = () => {
  const { route, isCMS } = useRouter();
  const { firebaseUser, isLoading } = useAuth();

  // CMS Portal Routing
  if (isCMS) {
    if (isLoading) {
      return (
        <div className="min-h-screen bg-stone-900 flex flex-col items-center justify-center text-white">
          <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <div className="font-serif font-black tracking-wider text-sm uppercase">
            Loading Newsroom CMS...
          </div>
        </div>
      );
    }

    if (!firebaseUser) {
      return <CMSLogin />;
    }

    // Determine CMS View
    const subpath = route.pathname.replace(/^\/cms/, '') || '/';

    let activeTab = 'dashboard';
    let cmsView = <CMSDashboard />;

    if (subpath === '/articles') {
      activeTab = 'articles';
      cmsView = <ArticlesList />;
    } else if (subpath === '/articles/new') {
      activeTab = 'new-article';
      cmsView = <ArticleEditor />;
    } else if (subpath.startsWith('/articles/edit/')) {
      activeTab = 'articles';
      const id = subpath.replace('/articles/edit/', '');
      cmsView = <ArticleEditor articleId={id} />;
    } else if (subpath === '/videos') {
      activeTab = 'videos';
      cmsView = <VideoManager />;
    } else if (subpath === '/media') {
      activeTab = 'media';
      cmsView = <MediaLibrary />;
    } else if (subpath === '/categories') {
      activeTab = 'categories';
      cmsView = <CategoryManager />;
    } else if (subpath === '/team') {
      activeTab = 'team';
      cmsView = <TeamManager />;
    } else if (subpath === '/branding') {
      activeTab = 'branding';
      cmsView = <BrandingManager />;
    }

    return <CMSLayout activeTab={activeTab}>{cmsView}</CMSLayout>;
  }

  // Public Newspaper Experience
  return (
    <div className="min-h-screen flex flex-col bg-[#fdfdfd] text-[#1c1917]">
      <Header />
      <BreakingBanner />

      <main className="flex-1">
        {route.view === 'home' && <HomeFeed />}
        {route.view === 'article' && <ArticlePage />}
        {route.view === 'category' && <CategoryPage />}
        {(route.view === 'videos' || route.view === 'video-detail') && <VideosPage />}
        {route.view === 'search' && <SearchPage />}
      </main>

      <Footer />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider>
        <AppContent />
      </RouterProvider>
    </AuthProvider>
  );
}
