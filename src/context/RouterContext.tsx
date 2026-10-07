import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export interface RouteMatch {
  view:
    | 'home'
    | 'article'
    | 'category'
    | 'videos'
    | 'video-detail'
    | 'search'
    | 'cms';
  params: Record<string, string>;
  searchParams: URLSearchParams;
  pathname: string;
}

interface RouterContextType {
  route: RouteMatch;
  navigate: (url: string, replace?: boolean) => void;
  isCMS: boolean;
}

const RouterContext = createContext<RouterContextType | undefined>(undefined);

function parseRoute(path: string, searchStr: string): RouteMatch {
  const cleanPath = path.replace(/\/+$/, '') || '/';
  const searchParams = new URLSearchParams(searchStr);

  if (cleanPath.startsWith('/cms')) {
    return {
      view: 'cms',
      params: { subpath: cleanPath.replace(/^\/cms/, '') || '/' },
      searchParams,
      pathname: cleanPath,
    };
  }

  if (cleanPath === '/' || cleanPath === '') {
    return {
      view: 'home',
      params: {},
      searchParams,
      pathname: '/',
    };
  }

  if (cleanPath === '/videos') {
    return {
      view: 'videos',
      params: {},
      searchParams,
      pathname: cleanPath,
    };
  }

  if (cleanPath.startsWith('/video/')) {
    const videoId = cleanPath.replace('/video/', '');
    return {
      view: 'video-detail',
      params: { videoId },
      searchParams,
      pathname: cleanPath,
    };
  }

  if (cleanPath === '/search') {
    return {
      view: 'search',
      params: {},
      searchParams,
      pathname: cleanPath,
    };
  }

  if (cleanPath.startsWith('/category/')) {
    const categorySlug = cleanPath.replace('/category/', '');
    return {
      view: 'category',
      params: { categorySlug },
      searchParams,
      pathname: cleanPath,
    };
  }

  if (cleanPath.startsWith('/news/')) {
    const parts = cleanPath.split('/').filter(Boolean); // ['news', 'category', 'slug'] or ['news', 'category', 'sub', 'slug']
    if (parts.length === 3) {
      return {
        view: 'article',
        params: {
          category: parts[1],
          slug: parts[2],
        },
        searchParams,
        pathname: cleanPath,
      };
    } else if (parts.length >= 4) {
      return {
        view: 'article',
        params: {
          category: parts[1],
          subcategory: parts[2],
          slug: parts[parts.length - 1],
        },
        searchParams,
        pathname: cleanPath,
      };
    } else if (parts.length === 2) {
      return {
        view: 'category',
        params: { categorySlug: parts[1] },
        searchParams,
        pathname: cleanPath,
      };
    }
  }

  // Fallback to home
  return {
    view: 'home',
    params: {},
    searchParams,
    pathname: cleanPath,
  };
}

export const RouterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [route, setRoute] = useState<RouteMatch>(() =>
    parseRoute(window.location.pathname, window.location.search)
  );

  useEffect(() => {
    const handlePopState = () => {
      setRoute(parseRoute(window.location.pathname, window.location.search));
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = useCallback((url: string, replace = false) => {
    if (replace) {
      window.history.replaceState({}, '', url);
    } else {
      window.history.pushState({}, '', url);
    }

    const [pathPart, queryPart] = url.split('?');
    setRoute(parseRoute(pathPart || '/', queryPart ? `?${queryPart}` : ''));

    // Smooth scroll back to top unless it's a hash jump
    if (!url.includes('#')) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  const isCMS = route.pathname.startsWith('/cms');

  return (
    <RouterContext.Provider value={{ route, navigate, isCMS }}>
      {children}
    </RouterContext.Provider>
  );
};

export function useRouter() {
  const context = useContext(RouterContext);
  if (!context) {
    throw new Error('useRouter must be used within a RouterProvider');
  }
  return context;
}
