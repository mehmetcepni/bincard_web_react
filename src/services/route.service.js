import axios from 'axios';

// Ana axios instance'ı oluştur
const axiosInstance = axios.create({
  baseURL: 'http://localhost:8080/v1/api',
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 10000
});

// Request interceptor - token ekleme
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error('[ROUTE_REQUEST] İstek hatası:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    console.error('[ROUTE_RESPONSE] Yanıt hatası:', error);
    
    // 401 hatası durumunda token yenileme işlemi burada yapılabilir
    if (error.response?.status === 401) {
      console.warn('[ROUTE] Token geçersiz, yeniden giriş gerekebilir');
    }
    
    return Promise.reject(error);
  }
);

// Error handler
const handleError = (error, operation = 'İşlem') => {
  console.error(`[ROUTE_ERROR] ${operation} hatası:`, error);
  
  const status = error.response?.status;
  const backendMessage = error.response?.data?.message;
  
  // Backend'den gelen mesajı öncelikle kullan
  if (backendMessage) {
    return {
      success: false,
      message: backendMessage,
      error: true,
      statusCode: status
    };
  }
  
  // Status code'a göre genel mesajlar
  let errorMessage = 'Bir hata oluştu';
  
  switch (status) {
    case 400:
      errorMessage = 'Geçersiz istek parametreleri';
      break;
    case 401:
      errorMessage = 'Oturum süresi dolmuş. Lütfen tekrar giriş yapın.';
      break;
    case 403:
      errorMessage = 'Bu işlem için yetkiniz bulunmuyor';
      break;
    case 404:
      errorMessage = 'Rota bulunamadı';
      break;
    case 500:
      errorMessage = 'Sunucu hatası. Lütfen daha sonra tekrar deneyin.';
      break;
    default:
      errorMessage = error.message || 'Bilinmeyen bir hata oluştu';
  }

  return {
    success: false,
    message: errorMessage,
    error: true,
    statusCode: status
  };
};

const RouteService = {
  // 🚌 Tüm aktif rotaları listele
  getAllRoutes: async () => {
    try {
      console.log('[ROUTE] Tüm rotalar getiriliyor...');
      
      const response = await axiosInstance.get('/route/all');
      
      console.log('[ROUTE] Tüm rotalar başarıyla alındı:', response.data);
      
      return {
        success: true,
        data: response.data.data,
        message: response.data.message || 'Rotalar getirildi'
      };
    } catch (error) {
      console.error('[ROUTE] Rotalar getirilemedi:', error);
      return handleError(error, 'Rotaları getirme');
    }
  },

  // 🔍 Rota detaylarını getir
  getRouteById: async (routeId) => {
    try {
      console.log('[ROUTE] Rota detayları getiriliyor:', routeId);
      
      const response = await axiosInstance.get(`/route/${routeId}`);
      
      console.log('[ROUTE] Rota detayları başarıyla alındı:', response.data);
      
      return {
        success: true,
        data: response.data.data,
        message: response.data.message || 'Rota detayları getirildi'
      };
    } catch (error) {
      console.error('[ROUTE] Rota detayları getirilemedi:', error);
      return handleError(error, 'Rota detayları getirme');
    }
  },

  // 🧭 Rota yönlerini getir
  getRouteDirections: async (routeId) => {
    try {
      console.log('[ROUTE] Rota yönleri getiriliyor:', routeId);
      
      const response = await axiosInstance.get(`/route/${routeId}/directions`);
      
      console.log('[ROUTE] Rota yönleri başarıyla alındı:', response.data);
      
      return {
        success: true,
        data: response.data.data,
        message: response.data.message || 'Rota yönleri getirildi'
      };
    } catch (error) {
      console.error('[ROUTE] Rota yönleri getirilemedi:', error);
      return handleError(error, 'Rota yönlerini getirme');
    }
  },

  // 🚏 Belirli yöndeki durakları getir
  getStationsInDirection: async (routeId, directionType) => {
    try {
      console.log('[ROUTE] Yöndeki duraklar getiriliyor:', { routeId, directionType });
      
      const response = await axiosInstance.get(`/route/${routeId}/direction/${directionType}/stations`);
      
      console.log('[ROUTE] Yöndeki duraklar başarıyla alındı:', response.data);
      
      return {
        success: true,
        data: response.data.data,
        message: response.data.message || 'Duraklar getirildi'
      };
    } catch (error) {
      console.error('[ROUTE] Yöndeki duraklar getirilemedi:', error);
      return handleError(error, 'Yöndeki durakları getirme');
    }
  },

  // 🔍 İsme göre rota arama
  searchRoutesByName: async (name) => {
    try {
      console.log('[ROUTE] İsme göre rota aranıyor:', name);
      
      const params = { name };
      
      const response = await axiosInstance.get('/route/search', { params });
      
      console.log('[ROUTE] Rota arama sonuçları alındı:', response.data);
      
      return {
        success: true,
        data: response.data.data,
        message: response.data.message || 'Arama tamamlandı'
      };
    } catch (error) {
      console.error('[ROUTE] Rota arama başarısız:', error);
      return handleError(error, 'Rota arama');
    }
  },

  // 🚏 Durağa göre rota arama (sonraki otobüs bilgisi ile)
  searchRoutesByStation: async (stationId) => {
    try {
      console.log('[ROUTE] Durağa göre rotalar aranıyor:', stationId);
      
      const params = { stationId };
      
      const response = await axiosInstance.get('/route/search-by-station', { params });
      
      console.log('[ROUTE] Durak bazlı arama sonuçları alındı:', response.data);
      
      return {
        success: true,
        data: response.data.data,
        message: response.data.message || 'Durak bazlı arama tamamlandı'
      };
    } catch (error) {
      console.error('[ROUTE] Durak bazlı arama başarısız:', error);
      return handleError(error, 'Durak bazlı rota arama');
    }
  },

  // ⭐ Favorilere rota ekleme
  addFavoriteRoute: async (routeId) => {
    try {
      console.log('[ROUTE] Rota favorilere ekleniyor:', routeId);
      
      const params = { routeId };
      
      const response = await axiosInstance.post('/route/favorite', null, { params });
      
      console.log('[ROUTE] Rota favorilere eklendi:', response.data);
      
      return {
        success: true,
        message: response.data.message || 'Rota favorilere eklendi'
      };
    } catch (error) {
      console.error('[ROUTE] Rota favorilere eklenemedi:', error);
      return handleError(error, 'Favorilere ekleme');
    }
  },

  // 💔 Favorilerden rota çıkarma
  removeFavoriteRoute: async (routeId) => {
    try {
      console.log('[ROUTE] Rota favorilerden çıkarılıyor:', routeId);
      
      const params = { routeId };
      
      const response = await axiosInstance.delete('/route/favorite', { params });
      
      console.log('[ROUTE] Rota favorilerden çıkarıldı:', response.data);
      
      return {
        success: true,
        message: response.data.message || 'Rota favorilerden çıkarıldı'
      };
    } catch (error) {
      console.error('[ROUTE] Rota favorilerden çıkarılamadı:', error);
      return handleError(error, 'Favorilerden çıkarma');
    }
  },

  // ⭐ Favori rotaları listele
  getFavoriteRoutes: async () => {
    try {
      console.log('[ROUTE] Favori rotalar getiriliyor...');
      
      const response = await axiosInstance.get('/route/favorites');
      
      console.log('[ROUTE] Favori rotalar alındı:', response.data);
      
      return {
        success: true,
        data: response.data.data,
        message: response.data.message || 'Favori rotalar getirildi'
      };
    } catch (error) {
      console.error('[ROUTE] Favori rotalar getirilemedi:', error);
      return handleError(error, 'Favori rotaları getirme');
    }
  },

  // 🎯 Rota önerisi al
  suggestRoute: async (request) => {
    try {
      console.log('[ROUTE] Rota önerisi isteniyor:', request);
      
      const response = await axiosInstance.post('/route/suggest', request);
      
      console.log('[ROUTE] Rota önerisi alındı:', response.data);
      
      return {
        success: true,
        data: response.data.data,
        message: response.data.message || 'Rota önerisi getirildi'
      };
    } catch (error) {
      console.error('[ROUTE] Rota önerisi alınamadı:', error);
      return handleError(error, 'Rota önerisi alma');
    }
  },

  // 🔄 Favori durumu toggle
  toggleFavoriteRoute: async (routeId, isFavorite) => {
    try {
      if (isFavorite) {
        return await RouteService.removeFavoriteRoute(routeId);
      } else {
        return await RouteService.addFavoriteRoute(routeId);
      }
    } catch (error) {
      console.error('[ROUTE] Favori toggle hatası:', error);
      return handleError(error, 'Favori durumunu değiştirme');
    }
  },

  // 🚌 Yön türü çevirme
  getDirectionTypeLabel: (directionType) => {
    if (!directionType) return 'Bilinmiyor';
    
    const directionLabels = {
      'FORWARD': 'Gidiş',
      'BACKWARD': 'Dönüş',
      'CIRCULAR': 'Çemberde',
      'GIDIS': 'Gidiş',
      'DONUS': 'Dönüş',
      'DONUS': 'Dönüş'
    };
    
    return directionLabels[directionType.toUpperCase()] || directionType;
  },

  // 🕒 Sonraki otobüs zamanını formatla
  formatNextBusTime: (nextBusMinutes) => {
    if (!nextBusMinutes || nextBusMinutes < 0) {
      return 'Bilinmiyor';
    }
    
    if (nextBusMinutes === 0) {
      return 'Şimdi';
    }
    
    if (nextBusMinutes < 60) {
      return `${nextBusMinutes} dk`;
    }
    
    const hours = Math.floor(nextBusMinutes / 60);
    const minutes = nextBusMinutes % 60;
    
    if (minutes === 0) {
      return `${hours} sa`;
    }
    
    return `${hours} sa ${minutes} dk`;
  },

  // 🔢 Rota numarasını formatla
  formatRouteNumber: (routeNumber) => {
    if (!routeNumber) return '';
    return routeNumber.toString().padStart(2, '0');
  },

  // 🎨 Rota rengini formatla
  getRouteColor: (routeId) => {
    // Rota ID'sine göre renk paleti
    const colors = [
      '#3B82F6', // Blue
      '#EF4444', // Red
      '#10B981', // Green
      '#F59E0B', // Yellow
      '#8B5CF6', // Purple
      '#06B6D4', // Cyan
      '#F97316', // Orange
      '#84CC16', // Lime
      '#EC4899', // Pink
      '#6B7280'  // Gray
    ];
    
    return colors[routeId % colors.length];
  },

  // 📏 İki nokta arası mesafe hesaplama (StationService'den alınmış)
  calculateDistance: (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Dünya'nın yarıçapı (km)
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // km cinsinden mesafe
    
    if (distance < 1) {
      return Math.round(distance * 1000) + ' m';
    } else {
      return distance.toFixed(1) + ' km';
    }
  }
};

export default RouteService;
