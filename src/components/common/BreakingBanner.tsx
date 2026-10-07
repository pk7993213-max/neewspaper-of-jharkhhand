import React, { useState, useEffect } from 'react';
import { useRouter } from '../../context/RouterContext';
import { getPublishedArticles } from '../../firebase/services/articles';
import { Article } from '../../types';
import { Zap, ChevronRight } from 'lucide-react';

export const BreakingBanner: React.FC = () => {
  const { navigate } = useRouter();
  const [breakingArticles, setBreakingArticles] = useState<Article[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    let mounted = true;
    getPublishedArticles({ breakingOnly: true, limitCount: 5 })
      .then(list => {
        if (mounted && list) {
          setBreakingArticles(list);
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (breakingArticles.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % breakingArticles.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [breakingArticles.length]);

  if (breakingArticles.length === 0) {
    return null; // Do not show when no real breaking news exists
  }

  const current = breakingArticles[currentIndex];

  return (
    <div className="bg-[#cc0000] text-white py-2 px-4 sm:px-8 border-b border-red-900 shadow-inner">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 text-xs sm:text-sm">
        <div className="flex items-center gap-2 font-bold tracking-wider uppercase shrink-0">
          <span className="flex h-2.5 w-2.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-yellow-300"></span>
          </span>
          <span className="flex items-center gap-1 text-yellow-300 font-extrabold text-xs">
            <Zap className="w-3.5 h-3.5 fill-yellow-300" />
            BREAKING
          </span>
        </div>

        <button
          onClick={() => {
            const path = current.subcategory
              ? `/news/${current.category}/${current.subcategory}/${current.slug}`
              : `/news/${current.category}/${current.slug}`;
            navigate(path);
          }}
          className="truncate text-left font-semibold hover:underline flex-1 text-stone-100 flex items-center gap-1"
        >
          <span className="truncate">{current.title}</span>
          <ChevronRight className="w-3.5 h-3.5 shrink-0 opacity-75" />
        </button>

        {breakingArticles.length > 1 && (
          <div className="hidden sm:flex items-center space-x-1 shrink-0 text-[11px] text-stone-200">
            <span>{currentIndex + 1} of {breakingArticles.length}</span>
          </div>
        )}
      </div>
    </div>
  );
};
