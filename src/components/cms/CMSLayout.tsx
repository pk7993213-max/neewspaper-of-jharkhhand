import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from '../../context/RouterContext';
import { NewspaperLogo } from '../common/NewspaperLogo';
import {
  LayoutDashboard,
  FileText,
  PlusCircle,
  Video,
  Image,
  Layers,
  Users,
  LogOut,
  ExternalLink,
  Menu,
  X,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';

interface CMSLayoutProps {
  children: React.ReactNode;
  activeTab: string;
}

export const CMSLayout: React.FC<CMSLayoutProps> = ({ children, activeTab }) => {
  const { staffUser, logout, isAdmin, isEditor } = useAuth();
  const { navigate } = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Newsroom Dashboard', icon: LayoutDashboard, path: '/cms' },
    { id: 'articles', label: 'All Articles', icon: FileText, path: '/cms/articles' },
    { id: 'new-article', label: 'Write New Article', icon: PlusCircle, path: '/cms/articles/new' },
    { id: 'videos', label: 'Video Desk & Uploads', icon: Video, path: '/cms/videos' },
    { id: 'media', label: 'Media Library', icon: Image, path: '/cms/media' },
    { id: 'categories', label: 'Categories & Beats', icon: Layers, path: '/cms/categories' },
    { id: 'team', label: 'Staff & Roles', icon: Users, path: '/cms/team' },
    { id: 'branding', label: 'Official Logo & Brand', icon: Image, path: '/cms/branding' },
  ];

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'admin':
        return <span className="bg-red-900/80 text-red-200 text-[10px] font-bold px-2 py-0.5 rounded border border-red-700">ROOT ADMIN</span>;
      case 'editor':
        return <span className="bg-amber-900/80 text-amber-200 text-[10px] font-bold px-2 py-0.5 rounded border border-amber-700">DESK EDITOR</span>;
      default:
        return <span className="bg-blue-900/80 text-blue-200 text-[10px] font-bold px-2 py-0.5 rounded border border-blue-700">REPORTER</span>;
    }
  };

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col md:flex-row text-stone-900">
      {/* Mobile Top Header */}
      <div className="md:hidden bg-stone-900 text-white p-4 flex items-center justify-between border-b border-stone-800">
        <div className="flex items-center space-x-2">
          <ShieldCheck className="w-5 h-5 text-red-500" />
          <span className="font-serif font-black text-sm tracking-wide">BHARAT CHRONICLE CMS</span>
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-1.5 text-stone-300 hover:text-white"
        >
          {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar for Desktop / Mobile drawer */}
      <aside
        className={`${
          sidebarOpen ? 'block' : 'hidden'
        } md:block w-full md:w-64 bg-[#141414] text-stone-300 shrink-0 md:min-h-screen flex flex-col justify-between border-r border-stone-800 z-30`}
      >
        <div>
          {/* Newsroom Brand Header */}
          <div className="p-6 border-b border-stone-800/80">
            <div className="text-[10px] tracking-widest uppercase text-red-400 font-bold mb-2">
              EDITORIAL DESK
            </div>
            <NewspaperLogo variant="cms" onClick={() => navigate('/cms')} />
            <div className="text-xs text-stone-400 mt-2 flex items-center gap-1.5">
              <span>CMS Portal</span>
              <span>•</span>
              <span className="text-emerald-400 font-medium">Live System</span>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="p-4 space-y-1">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    navigate(item.path);
                    setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-[#800000] text-white font-semibold shadow'
                      : 'text-stone-300 hover:bg-stone-800/80 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* User Profile & Actions Footer */}
        <div className="p-4 border-t border-stone-800/80 bg-stone-950/40">
          <div className="flex items-center space-x-3 mb-4 px-1">
            <div className="w-8 h-8 rounded-full bg-stone-800 text-stone-200 border border-stone-700 flex items-center justify-center font-bold text-xs">
              {staffUser?.displayName?.charAt(0) || 'U'}
            </div>
            <div className="truncate flex-1">
              <div className="text-xs font-bold text-white truncate">
                {staffUser?.displayName || 'Staff Member'}
              </div>
              <div className="mt-0.5">{getRoleBadge(staffUser?.role)}</div>
            </div>
          </div>

          <div className="space-y-1.5">
            <button
              onClick={() => navigate('/')}
              className="w-full flex items-center justify-center space-x-2 py-2 px-3 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs rounded transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>View Public Newspaper</span>
            </button>

            <button
              onClick={logout}
              className="w-full flex items-center justify-center space-x-2 py-2 px-3 bg-red-950/40 hover:bg-red-900/60 text-red-300 text-xs rounded border border-red-900/50 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Pane */}
      <main className="flex-1 p-4 sm:p-8 md:p-10 overflow-y-auto max-w-7xl">
        {children}
      </main>
    </div>
  );
};
