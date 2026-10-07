import React, { useState, useEffect } from 'react';
import { useRouter } from '../../context/RouterContext';
import { useAuth } from '../../context/AuthContext';
import { getCategories } from '../../firebase/services/categories';
import { NewspaperLogo } from './NewspaperLogo';
import { NewsCategory } from '../../types';
import {
  Search,
  Menu,
  X,
  PlaySquare,
  ShieldCheck,
  TrendingUp,
  CloudSun,
  ChevronRight,
} from 'lucide-react';

export const Header: React.FC = () => {
  const { route, navigate } = useRouter();
  const { staffUser } = useAuth();
  const [categories, setCategories] = useState<NewsCategory[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    let mounted = true;
    getCategories()
      .then(cats => {
        if (mounted && cats) setCategories(cats);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 120);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
      setSearchQuery('');
    }
  };

  const currentDate = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <header className="w-full bg-white border-b border-stone-200">
      {/* Top Utility Ticker Bar */}
      <div className="bg-[#1a1a1a] text-stone-300 text-xs py-1.5 px-4 sm:px-8 border-b border-stone-800">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <span className="font-medium text-stone-200">{currentDate}</span>
            <span className="hidden md:inline text-stone-500">|</span>
            <span className="hidden md:flex items-center text-stone-300 gap-1">
              <CloudSun className="w-3.5 h-3.5 text-amber-400" />
              <span>Ranchi 28°C • AQI 62 (Good)</span>
            </span>
            <span className="hidden lg:inline text-stone-500">|</span>
            <span className="hidden lg:flex items-center text-stone-300 gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              <span>Sensex 82,140 <span className="text-emerald-400 font-semibold">+320.15</span></span>
            </span>
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/videos')}
              className="hover:text-red-400 flex items-center gap-1 transition-colors"
            >
              <PlaySquare className="w-3.5 h-3.5 text-red-500" />
              <span>Video Hub</span>
            </button>
            <button
              onClick={() => navigate('/cms')}
              className="flex items-center gap-1 text-stone-400 hover:text-white transition-colors bg-stone-800/80 px-2 py-0.5 rounded text-[11px] font-medium"
            >
              <ShieldCheck className="w-3 h-3 text-red-400" />
              <span>{staffUser ? 'Newsroom CMS' : 'Editorial Portal'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Grand Newspaper Masthead */}
      <div className="py-4 px-4 sm:px-8 bg-[#faf8f5] border-b border-stone-200">
        <div className="max-w-7xl mx-auto flex flex-col items-center justify-center text-center">
          <NewspaperLogo variant="masthead" onClick={() => navigate('/')} />
        </div>
      </div>

      {/* Main Sticky Navigation */}
      <div
        className={`w-full bg-[#800000] text-white transition-all duration-200 z-40 ${
          isScrolled ? 'sticky top-0 shadow-lg' : ''
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-8 flex items-center justify-between h-12">
          {/* Mobile hamburger button */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="md:hidden p-1.5 text-white hover:bg-red-950/40 rounded focus:outline-none"
            aria-label="Open navigation menu"
          >
            <Menu className="w-6 h-6" />
          </button>

          {/* Desktop Navbar Links */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-2 text-sm font-medium tracking-wide">
            <button
              onClick={() => navigate('/')}
              className={`px-3 py-1.5 rounded transition-colors ${
                route.view === 'home'
                  ? 'bg-red-950 text-white font-semibold'
                  : 'hover:bg-red-900/60 text-stone-100'
              }`}
            >
              Home
            </button>

            {categories.slice(0, 7).map(cat => {
              const isActive =
                route.view === 'category' && route.params.categorySlug === cat.slug;
              return (
                <button
                  key={cat.id || cat.slug}
                  onClick={() => navigate(`/category/${cat.slug}`)}
                  className={`px-3 py-1.5 rounded transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-red-950 text-white font-semibold'
                      : 'hover:bg-red-900/60 text-stone-100'
                  }`}
                >
                  {cat.name}
                </button>
              );
            })}

            <button
              onClick={() => navigate('/videos')}
              className={`px-3 py-1.5 rounded transition-colors flex items-center gap-1.5 ${
                route.view === 'videos'
                  ? 'bg-red-950 text-white font-semibold'
                  : 'hover:bg-red-900/60 text-amber-300 font-semibold'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-red-400 animate-ping inline-block" />
              Videos
            </button>
          </nav>

          {/* Search Trigger */}
          <div className="flex items-center space-x-2">
            {searchOpen ? (
              <form onSubmit={handleSearchSubmit} className="flex items-center">
                <input
                  type="text"
                  placeholder="Search news, topics, tags..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  autoFocus
                  className="bg-red-950 text-white text-xs px-3 py-1.5 rounded-l border border-red-800 placeholder-stone-400 focus:outline-none w-44 sm:w-64"
                />
                <button
                  type="submit"
                  className="bg-stone-900 hover:bg-black text-white px-2.5 py-1.5 text-xs font-semibold rounded-r"
                >
                  Go
                </button>
                <button
                  type="button"
                  onClick={() => setSearchOpen(false)}
                  className="p-1.5 ml-1 text-stone-300 hover:text-white"
                  title="Close search"
                >
                  <X className="w-4 h-4" />
                </button>
              </form>
            ) : (
              <button
                onClick={() => setSearchOpen(true)}
                className="p-1.5 hover:bg-red-950/60 rounded text-stone-100 flex items-center gap-1.5 text-xs font-medium"
                aria-label="Open search"
              >
                <Search className="w-4 h-4" />
                <span className="hidden sm:inline">Search</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-4/5 max-w-sm bg-stone-900 text-stone-100 h-full p-6 flex flex-col justify-between shadow-2xl z-10 overflow-y-auto">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-stone-800">
                <NewspaperLogo variant="compact" onClick={() => { navigate('/'); setMobileMenuOpen(false); }} />
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 text-stone-400 hover:text-white"
                  aria-label="Close menu"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="mt-4">
                <form onSubmit={handleSearchSubmit} className="flex items-center mb-6">
                  <input
                    type="text"
                    placeholder="Search articles..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full bg-stone-800 text-white text-sm px-3 py-2 rounded-l border border-stone-700 focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="bg-red-800 text-white px-3 py-2 rounded-r hover:bg-red-700"
                  >
                    <Search className="w-4 h-4" />
                  </button>
                </form>

                <div className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-2">
                  Sections
                </div>
                <div className="space-y-1">
                  <button
                    onClick={() => {
                      navigate('/');
                      setMobileMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded hover:bg-stone-800 text-stone-200 font-medium flex items-center justify-between"
                  >
                    <span>Home</span>
                    <ChevronRight className="w-4 h-4 text-stone-600" />
                  </button>
                  {categories.map(cat => (
                    <button
                      key={cat.id || cat.slug}
                      onClick={() => {
                        navigate(`/category/${cat.slug}`);
                        setMobileMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded hover:bg-stone-800 text-stone-200 font-medium flex items-center justify-between"
                    >
                      <span>{cat.name}</span>
                      <ChevronRight className="w-4 h-4 text-stone-600" />
                    </button>
                  ))}
                  <button
                    onClick={() => {
                      navigate('/videos');
                      setMobileMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded hover:bg-stone-800 text-amber-400 font-medium flex items-center justify-between"
                  >
                    <span>Video Hub</span>
                    <ChevronRight className="w-4 h-4 text-stone-600" />
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-stone-800 mt-6">
              <button
                onClick={() => {
                  navigate('/cms');
                  setMobileMenuOpen(false);
                }}
                className="w-full bg-red-900 hover:bg-red-800 text-white py-2.5 px-4 rounded font-medium text-sm flex items-center justify-center gap-2 shadow"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Go to Newsroom CMS</span>
              </button>
              <p className="text-[11px] text-stone-500 text-center mt-3">
                Digital Newspaper System © 2026 The Bharat Chronicle
              </p>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
