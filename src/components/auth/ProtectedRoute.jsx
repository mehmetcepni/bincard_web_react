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
      // Token varlığını kontrol et
      const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
      
      if (!token) {
        console.log('ProtectedRoute: No token found');
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }
      
      // AuthService'den authentication durumunu kontrol et
      const authStatus = AuthService.isAuthenticated();
      
      if (!authStatus) {
        console.log('ProtectedRoute: AuthService authentication failed');
        // Token'ları temizle
        localStorage.removeItem('token');
        localStorage.removeItem('accessToken');
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }

      // Kullanıcı durum kontrolü geçici olarak devre dışı (backend endpoint henüz yok)
      console.log('⚠️ ProtectedRoute: Kullanıcı durum kontrolü geçici olarak devre dışı');
      
      // // Kullanıcı durum kontrolü
      // const statusCheck = await AuthService.checkUserStatus();
      
      // if (!statusCheck.success) {
      //   if (statusCheck.error === 'ACCOUNT_FROZEN') {
      //     console.log('ProtectedRoute: Account is frozen, redirecting to login');
      //     setIsAuthenticated(false);
      //     setIsLoading(false);
      //     return;
      //   } else if (statusCheck.error === 'AUTH_ERROR') {
      //     console.log('ProtectedRoute: Auth error, user already logged out');
      //     setIsAuthenticated(false);
      //     setIsLoading(false);
      //     return;
      //   } else if (statusCheck.error === 'CHECK_FAILED' || statusCheck.error === 'NO_TOKEN') {
      //     // Status kontrolü başarısız ama route erişimi devam etsin (backend endpoint henüz yok)
      //     console.warn('⚠️ ProtectedRoute: Kullanıcı durum kontrolü başarısız, ancak erişim devam ediyor:', statusCheck.error);
      //   }
      // }

      console.log('ProtectedRoute: User is authenticated and active');
      setIsAuthenticated(true);
      setIsLoading(false);
      
    } catch (error) {
      console.error('ProtectedRoute authentication check error:', error);
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
