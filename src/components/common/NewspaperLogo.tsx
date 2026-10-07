import React, { useState, useEffect } from 'react';
import { getNewspaperBranding, NewspaperBranding } from '../../firebase/services/branding';

interface NewspaperLogoProps {
  className?: string;
  variant?: 'masthead' | 'compact' | 'footer' | 'cms';
  onClick?: () => void;
}

export const NewspaperLogo: React.FC<NewspaperLogoProps> = ({
  className = '',
  variant = 'masthead',
  onClick,
}) => {
  const [branding, setBranding] = useState<NewspaperBranding>({
    logoUrl: '/assets/newspaper-logo.svg',
    name: 'THE BHARAT CHRONICLE',
    edition: 'Ranchi & National Daily',
    tagline: 'Truth • Integrity • Public Interest',
  });

  useEffect(() => {
    let mounted = true;
    getNewspaperBranding().then(b => {
      if (mounted && b) setBranding(b);
    }).catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  if (variant === 'compact') {
    return (
      <div onClick={onClick} className={`inline-flex items-center cursor-pointer ${className}`}>
        <img
          src={branding.logoUrl}
          alt={branding.name}
          className="h-9 w-auto object-contain max-w-[220px]"
          loading="eager"
        />
      </div>
    );
  }

  if (variant === 'footer') {
    return (
      <div onClick={onClick} className={`inline-flex flex-col items-start cursor-pointer ${className}`}>
        <img
          src={branding.logoUrl}
          alt={branding.name}
          className="h-12 w-auto object-contain brightness-0 invert opacity-90 max-w-[280px]"
          loading="lazy"
        />
      </div>
    );
  }

  if (variant === 'cms') {
    return (
      <div onClick={onClick} className={`inline-flex items-center cursor-pointer ${className}`}>
        <img
          src={branding.logoUrl}
          alt={branding.name}
          className="h-10 w-auto object-contain brightness-0 invert max-w-[240px]"
          loading="eager"
        />
      </div>
    );
  }

  // Grand Masthead variant (Default for public broadsheet header)
  return (
    <div
      onClick={onClick}
      className={`w-full max-w-4xl mx-auto flex flex-col items-center justify-center cursor-pointer group ${className}`}
    >
      <img
        src={branding.logoUrl}
        alt={branding.name}
        className="w-full max-w-[680px] h-auto object-contain transition-transform duration-300 group-hover:scale-[1.01]"
        loading="eager"
      />
    </div>
  );
};
