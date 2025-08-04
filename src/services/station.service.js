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
    console.error('[STATION_REQUEST] İstek hatası:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    console.error('[STATION_RESPONSE] Yanıt hatası:', error);
    
    // 401 hatası durumunda token yenileme işlemi burada yapılabilir
    if (error.response?.status === 401) {
      console.warn('[STATION] Token geçersiz, yeniden giriş gerekebilir');
    }
    
    return Promise.reject(error);
  }
);

// Error handler
const handleError = (error, operation = 'İşlem') => {
  console.error(`[STATION_ERROR] ${operation} hatası:`, error);
  
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
      errorMessage = 'Durak bulunamadı';
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

const StationService = {
  // 🚏 Durak detaylarını getir
  getStationById: async (stationId, directionType = null) => {
    try {
      console.log('[STATION] Durak detayları getiriliyor:', { stationId, directionType });
      
      const params = {};
      if (directionType) {
        params.directionType = directionType;
      }
      
      const response = await axiosInstance.get(`/station/${stationId}`, { params });
      
      console.log('[STATION] Durak detayları başarıyla alındı:', response.data);
      
      return {
        success: true,
        data: response.data.data,
        message: response.data.message || 'Durak detayları getirildi'
      };
    } catch (error) {
      console.error('[STATION] Durak detayları getirilemedi:', error);
      return handleError(error, 'Durak detayları getirme');
    }
  },

  // 🗺️ Yakındaki durakları getir (konum bazlı)
  getNearbyStations: async (latitude, longitude, type = null, page = 0, size = 10) => {
    try {
      console.log('[STATION] Yakındaki duraklar getiriliyor:', { latitude, longitude, type, page, size });
      
      const params = {
        latitude,
        longitude,
        page,
        size
      };
      
      if (type) {
        params.type = type;
      }
      
      const response = await axiosInstance.get('/station', { params });
      
      console.log('[STATION] Yakındaki duraklar başarıyla alındı:', response.data);
      
      return {
        success: true,
        data: response.data.data,
        message: response.data.message || 'Yakındaki duraklar getirildi'
      };
    } catch (error) {
      console.error('[STATION] Yakındaki duraklar getirilemedi:', error);
      return handleError(error, 'Yakındaki durakları getirme');
    }
  },

  // 🔍 İsme göre durak arama
  searchStationsByName: async (name, page = 0, size = 10) => {
    try {
      console.log('[STATION] İsme göre durak aranıyor:', { name, page, size });
      
      const params = {
        name,
        page,
        size
      };
      
      const response = await axiosInstance.get('/station/search', { params });
      
      console.log('[STATION] Durak arama sonuçları alındı:', response.data);
      
      return {
        success: true,
        data: response.data.data,
        message: response.data.message || 'Arama tamamlandı'
      };
    } catch (error) {
      console.error('[STATION] Durak arama başarısız:', error);
      return handleError(error, 'Durak arama');
    }
  },

  // 🎯 Gelişmiş yakındaki durak arama
  searchNearbyStations: async (searchRequest, page = 0, size = 10) => {
    try {
      console.log('[STATION] Gelişmiş yakındaki durak arama:', { searchRequest, page, size });
      
      const params = {
        page,
        size
      };
      
      const response = await axiosInstance.post('/station/search/nearby', searchRequest, { params });
      
      console.log('[STATION] Gelişmiş arama sonuçları alındı:', response.data);
      
      return {
        success: true,
        data: response.data.data,
        message: response.data.message || 'Gelişmiş arama tamamlandı'
      };
    } catch (error) {
      console.error('[STATION] Gelişmiş arama başarısız:', error);
      return handleError(error, 'Gelişmiş durak arama');
    }
  },

  // 💡 Arama önerilerini getir
  getSearchKeywords: async (query) => {
    try {
      console.log('[STATION] Arama önerileri getiriliyor:', query);
      
      const params = { query };
      
      const response = await axiosInstance.get('/station/keywords', { params });
      
      console.log('[STATION] Arama önerileri alındı:', response.data);
      
      return {
        success: true,
        data: response.data, // Bu endpoint Set<String> döndürüyor
        message: 'Arama önerileri getirildi'
      };
    } catch (error) {
      console.error('[STATION] Arama önerileri getirilemedi:', error);
      return handleError(error, 'Arama önerileri getirme');
    }
  },

  // ⭐ Favorilere durak ekleme
  addFavoriteStation: async (stationId) => {
    try {
      console.log('[STATION] Durak favorilere ekleniyor:', stationId);
      
      const params = { stationId };
      
      const response = await axiosInstance.post('/station/add-favorite', null, { params });
      
      console.log('[STATION] Durak favorilere eklendi:', response.data);
      
      return {
        success: true,
        message: response.data.message || 'Durak favorilere eklendi'
      };
    } catch (error) {
      console.error('[STATION] Durak favorilere eklenemedi:', error);
      return handleError(error, 'Favorilere ekleme');
    }
  },

  // 💔 Favorilerden durak çıkarma
  removeFavoriteStation: async (stationId) => {
    try {
      console.log('[STATION] Durak favorilerden çıkarılıyor:', stationId);
      
      const params = { stationId };
      
      const response = await axiosInstance.delete('/station/remove-favorite', { params });
      
      console.log('[STATION] Durak favorilerden çıkarıldı:', response.data);
      
      return {
        success: true,
        message: response.data.message || 'Durak favorilerden çıkarıldı'
      };
    } catch (error) {
      console.error('[STATION] Durak favorilerden çıkarılamadı:', error);
      return handleError(error, 'Favorilerden çıkarma');
    }
  },

  // ⭐ Favori durakları listele
  getFavoriteStations: async () => {
    try {
      console.log('[STATION] Favori duraklar getiriliyor...');
      
      const response = await axiosInstance.get('/station/favorite');
      
      console.log('[STATION] Favori duraklar alındı:', response.data);
      
      return {
        success: true,
        data: response.data.data,
        message: response.data.message || 'Favori duraklar getirildi'
      };
    } catch (error) {
      console.error('[STATION] Favori duraklar getirilemedi:', error);
      return handleError(error, 'Favori durakları getirme');
    }
  },

  // 🚌 Duraktan geçen rotaları getir
  getStationRoutes: async (stationId) => {
    try {
      console.log('[STATION] Durak rotaları getiriliyor:', stationId);
      
      const params = { stationId };
      
      const response = await axiosInstance.get('/station/routes', { params });
      
      console.log('[STATION] Durak rotaları alındı:', response.data);
      
      return {
        success: true,
        data: response.data.data,
        message: response.data.message || 'Durak rotaları getirildi'
      };
    } catch (error) {
      console.error('[STATION] Durak rotaları getirilemedi:', error);
      return handleError(error, 'Durak rotalarını getirme');
    }
  },

  // 📍 Konum bazlı yakındaki duraklar (alternatif endpoint)
  getNearbyStationsAlternative: async (latitude, longitude, page = 0, size = 10) => {
    try {
      console.log('[STATION] Alternatif yakındaki duraklar getiriliyor:', { latitude, longitude, page, size });
      
      const params = {
        latitude,
        longitude,
        page,
        size
      };
      
      const response = await axiosInstance.get('/station/nearby', { params });
      
      console.log('[STATION] Alternatif yakındaki duraklar alındı:', response.data);
      
      return {
        success: true,
        data: response.data.data,
        message: response.data.message || 'Yakındaki duraklar getirildi'
      };
    } catch (error) {
      console.error('[STATION] Alternatif yakındaki duraklar getirilemedi:', error);
      return handleError(error, 'Yakındaki durakları getirme (alternatif)');
    }
  },

  // 📱 Kullanıcının mevcut konumunu al
  getCurrentLocation: () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Tarayıcınız konum özelliğini desteklemiyor'));
        return;
      }

      const options = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 dakika cache
      };

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          console.log('[STATION] Konum alındı:', { latitude, longitude });
          resolve({ latitude, longitude });
        },
        (error) => {
          console.error('[STATION] Konum alınamadı:', error);
          let errorMessage = 'Konum bilgisi alınamadı';
          
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Konum erişimi reddedildi. Lütfen tarayıcı ayarlarından konum erişimini açın.';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Konum bilgisi mevcut değil.';
              break;
            case error.TIMEOUT:
              errorMessage = 'Konum alınırken zaman aşımı oluştu.';
              break;
          }
          
          reject(new Error(errorMessage));
        },
        options
      );
    });
  },

  // 🔄 Favori durumu toggle
  toggleFavoriteStation: async (stationId, isFavorite) => {
    try {
      if (isFavorite) {
        return await StationService.removeFavoriteStation(stationId);
      } else {
        return await StationService.addFavoriteStation(stationId);
      }
    } catch (error) {
      console.error('[STATION] Favori toggle hatası:', error);
      return handleError(error, 'Favori durumunu değiştirme');
    }
  },

  // 📏 İki nokta arası mesafe hesaplama (Haversine formülü)
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
  },

  // 🔍 Durak türü çevirme
  getStationTypeLabel: (stationType) => {
    const typeLabels = {
      'BUS_STOP': 'Otobüs Durağı',
      'METRO_STATION': 'Metro İstasyonu',
      'TRAIN_STATION': 'Tren İstasyonu',
      'TRAM_STOP': 'Tramvay Durağı',
      'FERRY_TERMINAL': 'Feribot İskelesi',
      'AIRPORT': 'Havaalanı',
      'TAXI_STAND': 'Taksi Durağı',
      'BIKE_STATION': 'Bisiklet İstasyonu'
    };
    
    return typeLabels[stationType] || stationType;
  }
};

export default StationService;
