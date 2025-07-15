import React, { useState } from 'react';

const NewsImage = ({ src, alt, className, onLoad, onError }) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  const handleImageLoad = () => {
    setImageLoading(false);
    setImageError(false);
    if (onLoad) onLoad();
  };

  const handleImageError = (e) => {
    console.log(`📷 Resim yüklenemedi, varsayılan resim gösteriliyor: ${src}`);
    setImageLoading(false);
    setImageError(true);
    
    // Placeholder resim göster - haber temalı bir placeholder
    const fallbackImage = 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D';
    e.target.src = fallbackImage;
    e.target.onerror = null; // Infinite loop'u önle
    
    if (onError) onError(e);
  };

  return (
    <div className="relative">
      {/* Loading Spinner */}
      {imageLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      )}
      
      {/* Error State */}
      {imageError && (
        <div className="absolute top-2 left-2 bg-yellow-500 text-white text-xs px-2 py-1 rounded">
          📷 Varsayılan Resim
        </div>
      )}
      
      <img
        src={src}
        alt={alt}
        className={className}
        onLoad={handleImageLoad}
        onError={handleImageError}
        loading="lazy"
      />
    </div>
  );
};

export default NewsImage;
