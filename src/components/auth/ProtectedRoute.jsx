import React, { useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import AuthService from '../../services/auth.service';

const ProtectedRoute = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(null); // null = checking, true = authenticated, false = not authenticated
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    checkAuthentication();
  }, []);

  // Browser back/forward butonlarını dinle
  useEffect(() => {
    const handlePopState = (event) => {
      console.log('🔄 Browser navigation detected:', {
        pathname: location.pathname,
        isAuthenticated: isAuthenticated
      });
      
      // Eğer kullanıcı authenticate değilse ve korumalı bir sayfaya gitmeye çalışıyorsa
      if (!isAuthenticated && isProtectedPath(location.pathname)) {
        console.log('🚫 Unauthorized access attempt blocked');
        event.preventDefault();
        navigate('/login', { 
          replace: true,
          state: { 
            message: 'Oturum süresi dolmuş. Lütfen tekrar giriş yapın.',
            type: 'warning',
            from: location.pathname
          }
        });
      }
    };

    window.addEventListener('popstate', handlePopState);
    
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isAuthenticated, location.pathname, navigate]);

  const isProtectedPath = (path) => {
    const protectedPaths = [
      '/dashboard',
      '/profilim', 
      '/news',
      '/liked-news',
      '/routes',
      '/cards',
      '/wallet',
      '/payment-points',
      '/feedback',
      '/history',
      '/debug'
    ];
    return protectedPaths.some(protectedPath => path.startsWith(protectedPath));
  };

  const checkAuthentication = async () => {
    try {
      console.log('🔐 Authentication check started...');
      
      // Token varlığını kontrol et
      const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
      
      if (!token) {
        console.log('❌ No token found');
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }

      console.log('✅ Token found:', token.substring(0, 10) + '...');
      
      // AuthService'den authentication durumunu kontrol et
      const authStatus = AuthService.isAuthenticated();
      
      if (!authStatus) {
        console.log('❌ AuthService authentication failed');
        // Token'ları temizle
        localStorage.removeItem('token');
        localStorage.removeItem('accessToken');
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }

      console.log('✅ User is authenticated');
      setIsAuthenticated(true);
      setIsLoading(false);
      
    } catch (error) {
      console.error('❌ Authentication check error:', error);
      setIsAuthenticated(false);
      setIsLoading(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Kimlik doğrulanıyor...</p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated) {
    return (
      <Navigate 
        to="/login" 
        replace 
        state={{ 
          message: 'Bu sayfaya erişim için giriş yapmanız gerekiyor.',
          type: 'warning',
          from: location.pathname 
        }} 
      />
    );
  }

  // Authenticated - render children
  return children;
};

export default ProtectedRoute;
