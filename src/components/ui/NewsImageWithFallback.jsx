import React, { useState, useCallback } from 'react';

const NewsImageWithFallback = ({ 
  src, 
  alt, 
  className, 
  onLoad, 
  onClick 
}) => {
  const [hasError, setHasError] = useState(false);
  const [hasLogged, setHasLogged] = useState(false);

  // Fallback SVG as base64 (gri placeholder)
  const fallbackImage = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjQwMCIgdmlld0JveD0iMCAwIDgwMCA0MDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI4MDAiIGhlaWdodD0iNDAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0zNzUgMTcwSDQyNVYyMzBIMzc1VjE3MFoiIGZpbGw9IiM5Q0EzQUYiLz4KPHBhdGggZD0iTTM1MCAyMDBIMzc1VjIzMEgzNTBWMjAwWiIgZmlsbD0iIzlDQTNBRiIvPgo8L3N2Zz4K';

  const handleImageLoad = useCallback((e) => {
    if (!hasLogged && !hasError) {
      console.log(`✅ Haber resmi başarıyla yüklendi: ${src}`);
      setHasLogged(true);
    }
    if (onLoad) onLoad(e);
  }, [src, hasError, hasLogged, onLoad]);

  const handleImageError = useCallback((e) => {
    if (!hasError && !hasLogged) {
      console.warn(`⚠️ Haber resmi yüklenemedi, fallback gösteriliyor: ${src}`);
      setHasError(true);
      setHasLogged(true);
    }
    
    // Prevent infinite error loops
    if (e.target.src !== fallbackImage) {
      e.target.src = fallbackImage;
    }
  }, [src, hasError, hasLogged, fallbackImage]);

  // CSS fallback for news cards
  const imageStyle = hasError ? {
    backgroundImage: `url("${fallbackImage}")`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat'
  } : {};

  return (
    <img 
      src={hasError ? fallbackImage : (src || fallbackImage)}
      alt={alt}
      className={className}
      style={imageStyle}
      onLoad={handleImageLoad}
      onError={handleImageError}
      onClick={onClick}
    />
  );
};

export default NewsImageWithFallback;
