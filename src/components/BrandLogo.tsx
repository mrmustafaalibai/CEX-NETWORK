import React, { useState } from 'react';

export const OFFICIAL_LOGO_URL = 'https://i.postimg.cc/LsLBkQZK/logo-Bvusjrh-R.png';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
  imgClassName?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  showText = false,
  className = '',
  imgClassName = '',
}) => {
  const [imageError, setImageError] = useState(false);

  const sizeDimensions = {
    sm: 'h-7 w-7',
    md: 'h-9 w-9',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16',
  };

  const textStyles = {
    sm: 'text-sm font-bold tracking-tight',
    md: 'text-base font-bold tracking-tight',
    lg: 'text-xl font-extrabold tracking-tight',
    xl: 'text-2xl font-extrabold tracking-tight',
  };

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {!imageError ? (
        <img
          src={OFFICIAL_LOGO_URL}
          alt="CEX Network Logo"
          referrerPolicy="no-referrer"
          onError={() => setImageError(true)}
          className={`${sizeDimensions[size]} object-contain drop-shadow-md rounded-lg shrink-0 ${imgClassName}`}
        />
      ) : (
        <div
          className={`${sizeDimensions[size]} rounded-xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 flex items-center justify-center font-extrabold text-white text-xs shadow-md shrink-0`}
        >
          CEX
        </div>
      )}

      {showText && (
        <div className="flex flex-col leading-none">
          <span className={`${textStyles[size]} text-white font-['Inter',sans-serif]`}>
            CEX NETWORK
          </span>
          <span className="text-[9px] font-mono tracking-wider text-cyan-400 font-semibold mt-0.5">
            INSTITUTIONAL
          </span>
        </div>
      )}
    </div>
  );
};
