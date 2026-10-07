import React from 'react';
import { useRouter } from '../../context/RouterContext';
import { NewspaperLogo } from './NewspaperLogo';
import { ShieldCheck, BookOpen, Lock, Compass } from 'lucide-react';

export const Footer: React.FC = () => {
  const { navigate } = useRouter();

  return (
    <footer className="bg-[#111111] text-stone-300 border-t-4 border-[#800000] mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b border-stone-800">
          {/* Brand Info */}
          <div className="md:col-span-1 space-y-4">
            <NewspaperLogo variant="footer" onClick={() => navigate('/')} />
            <p className="text-xs text-stone-400 leading-relaxed">
              India's trusted digital daily delivering verified journalism, ground reporting from Jharkhand, in-depth national investigations, business analysis, and public-interest reportage.
            </p>
            <div className="flex items-center space-x-2 text-xs text-stone-500 pt-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Certified Editorial Standards • Press Council Code</span>
            </div>
          </div>

          {/* Editorial Desks */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-200 mb-4 flex items-center gap-1.5">
              <Compass className="w-4 h-4 text-red-500" />
              Editorial Desks
            </h3>
            <ul className="space-y-2 text-xs text-stone-400">
              <li>
                <button onClick={() => navigate('/category/jharkhand')} className="hover:text-white transition-colors">
                  Jharkhand & State Bureau
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/category/national')} className="hover:text-white transition-colors">
                  National Affairs & Parliament
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/category/politics')} className="hover:text-white transition-colors">
                  Politics & Governance
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/category/business')} className="hover:text-white transition-colors">
                  Business, Economy & Markets
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/category/sports')} className="hover:text-white transition-colors">
                  Sports & Cricket
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/category/technology')} className="hover:text-white transition-colors">
                  Technology & Cyber Desk
                </button>
              </li>
            </ul>
          </div>

          {/* Multimedia & Services */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-200 mb-4 flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-red-500" />
              Media & Features
            </h3>
            <ul className="space-y-2 text-xs text-stone-400">
              <li>
                <button onClick={() => navigate('/videos')} className="hover:text-white transition-colors">
                  Special Video Dispatches
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/search')} className="hover:text-white transition-colors">
                  Archive & Search
                </button>
              </li>
              <li>
                <span className="text-stone-500">E-Paper Edition (Daily 6 AM)</span>
              </li>
              <li>
                <span className="text-stone-500">Fact-Check Cell & Corrections</span>
              </li>
              <li>
                <span className="text-stone-500">Letters to the Editor</span>
              </li>
            </ul>
          </div>

          {/* Secure Newsroom Portal */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-200 mb-4 flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-red-500" />
              Newsroom Operations
            </h3>
            <p className="text-xs text-stone-400 mb-4 leading-relaxed">
              Authorized access only for verified reporters, sub-editors, bureau chiefs, and editorial staff.
            </p>
            <button
              onClick={() => navigate('/cms')}
              className="w-full bg-red-950/80 hover:bg-red-900 text-stone-200 hover:text-white py-2 px-3 rounded border border-red-800 text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-sm"
            >
              <ShieldCheck className="w-4 h-4 text-red-400" />
              <span>Staff Login / CMS</span>
            </button>
            <div className="mt-4 text-[11px] text-stone-500">
              Editorial Office: Harmu Bypass Road, Ranchi, Jharkhand - 834002
            </div>
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-stone-500 gap-4">
          <p>© {new Date().getFullYear()} The Bharat Chronicle Media Ltd. All rights reserved.</p>
          <div className="flex space-x-6 text-stone-400">
            <span>Privacy Policy</span>
            <span>Terms of Service</span>
            <span>Code of Ethics</span>
            <span>Grievance Officer</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
