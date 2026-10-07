import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  getNewspaperBranding,
  updateNewspaperBranding,
  uploadOfficialLogo,
  NewspaperBranding,
} from '../../firebase/services/branding';
import { NewspaperLogo } from '../common/NewspaperLogo';
import { Image as ImageIcon, Upload, Check, AlertCircle, Sparkles, RefreshCw } from 'lucide-react';

export const BrandingManager: React.FC = () => {
  const { isAdmin } = useAuth();
  const [branding, setBranding] = useState<NewspaperBranding>({
    logoUrl: '/assets/newspaper-logo.svg',
    name: 'THE BHARAT CHRONICLE',
    edition: 'Ranchi & National Daily',
    tagline: 'Truth • Integrity • Public Interest',
  });

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchBranding = async () => {
    setLoading(true);
    try {
      const data = await getNewspaperBranding();
      setBranding(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranding();
  }, []);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!isAdmin) {
      setError('Only Root Administrators have permission to update the official newspaper logo.');
      return;
    }

    setUploading(true);
    setError(null);
    setMessage(null);

    try {
      const newUrl = await uploadOfficialLogo(file);
      setBranding(prev => ({ ...prev, logoUrl: newUrl }));
      setMessage('Official newspaper logo successfully uploaded and applied to public masthead.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Logo upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleResetToDefault = async () => {
    if (!isAdmin) return;
    try {
      await updateNewspaperBranding({ logoUrl: '/assets/newspaper-logo.svg' });
      setBranding(prev => ({ ...prev, logoUrl: '/assets/newspaper-logo.svg' }));
      setMessage('Reset to official broadsheet masthead.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Reset failed');
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="border-b border-stone-200 pb-4">
        <h1
          className="text-2xl sm:text-3xl font-serif font-black text-stone-900 tracking-tight flex items-center gap-2"
          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
        >
          <ImageIcon className="w-7 h-7 text-[#800000]" />
          Official Masthead &amp; Newspaper Logo
        </h1>
        <p className="text-xs text-stone-600 mt-1 font-serif">
          Official newspaper identity asset. Rendered across the front page, sticky header, mobile drawer, and editorial CMS.
        </p>
      </div>

      {message && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs rounded flex items-center justify-between">
          <span>{message}</span>
          <button onClick={() => setMessage(null)} className="font-bold text-emerald-600">×</button>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 border border-red-300 text-red-800 text-xs rounded flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="font-bold text-red-600">×</button>
        </div>
      )}

      {/* Live Masthead Preview */}
      <div className="bg-white p-6 rounded-lg border border-stone-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-stone-200 text-xs font-bold text-stone-800">
          <span>Current Masthead Logo Asset</span>
          <span className="text-stone-400 font-mono text-[11px] truncate max-w-xs">{branding.logoUrl}</span>
        </div>

        <div className="py-8 px-4 bg-[#faf8f5] border border-stone-200 rounded flex items-center justify-center">
          <NewspaperLogo variant="masthead" />
        </div>

        {/* Upload Button */}
        {isAdmin && (
          <div className="pt-4 border-t border-stone-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/png,image/svg+xml,image/jpeg,image/webp"
                onChange={handleLogoUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="bg-[#800000] hover:bg-red-950 text-white font-semibold text-xs px-5 py-2.5 rounded shadow flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                <Upload className="w-4 h-4" />
                <span>{uploading ? 'Uploading to Firebase Storage...' : 'Upload Official Logo Image Asset'}</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleResetToDefault}
              className="text-stone-500 hover:text-stone-800 text-xs font-semibold flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset to Default Logo</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
