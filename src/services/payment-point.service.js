import AuthService from './auth.service';

const BASE_URL = 'http://localhost:8080/v1/api';

class PaymentPointService {
  
  // ID ile belirli bir ödeme noktasını getir
  async getPaymentPointById(id) {
    try {
      const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
      
      const response = await fetch(`${BASE_URL}/payment-point/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` })
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          AuthService.logout();
          throw new Error('Oturum süresi doldu. Lütfen tekrar giriş yapın.');
        }
        if (response.status === 404) {
          throw new Error('Ödeme noktası bulunamadı.');
        }
        throw new Error(`Ödeme noktası alınamadı: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`❌ Ödeme noktası ${id} servisi hatası:`, error);
      throw error;
    }
  }

  // Konuma göre yakın ödeme noktalarını getir 
  async getNearbyPaymentPoints(latitude, longitude, radiusKm = 1000.0, page = 0, size = 10, sort = 'distance,asc') {
    try {
      const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
      const endpoint = `${BASE_URL}/payment-point/nearby?latitude=${latitude}&longitude=${longitude}&radiusKm=${radiusKm}&page=${page}&size=${size}&sort=${sort}`;
      
      console.log('🌐 API çağrısı yapılıyor:', {
        endpoint,
        method: 'GET',
        hasToken: !!token,
        parameters: { latitude, longitude, radiusKm, page, size, sort }
      });
      
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` })
        }
      });

      console.log('🌐 API response status:', response.status, response.statusText);

      if (!response.ok) {
        if (response.status === 401) {
          AuthService.logout();
          throw new Error('Oturum süresi doldu. Lütfen tekrar giriş yapın.');
        }
        throw new Error(`Yakın ödeme noktaları alınamadı: ${response.status}`);
      }

      const data = await response.json();
      console.log('📍 Yakın ödeme noktaları API response:', data);
      
      if (data.success && data.data) {
        console.log('📍 Content array:', data.data.content);
        console.log('📍 Content length:', data.data.content ? data.data.content.length : 0);
        return {
          content: data.data.content || [],
          message: data.message,
          pageInfo: {
            pageNumber: data.data.pageNumber,
            pageSize: data.data.pageSize,
            totalElements: data.data.totalElements,
            totalPages: data.data.totalPages,
            first: data.data.first,
            last: data.data.last
          }
        };
      } else {
        console.log('❌ API başarısız response:', data);
        throw new Error(data.message || 'Yakın ödeme noktaları alınamadı');
      }
    } catch (error) {
      console.error('❌ Yakın ödeme noktaları servisi hatası:', error);
      throw error;
    }
  }

  // Ödeme metodlarını formatla
  formatPaymentMethods(methods) {
    const methodNames = {
      'CREDIT_CARD': 'Kredi Kartı',
      'DEBIT_CARD': 'Banka Kartı',
      'CASH': 'Nakit',
      'QR_CODE': 'QR Kod'
    };

    return methods.map(method => methodNames[method] || method);
  }

  // Resim URL'sini normalize et
  normalizeImageUrl(imageUrl) {
    if (!imageUrl) return null;
    
    if (imageUrl.startsWith('http')) {
      return imageUrl;
    } else if (imageUrl.startsWith('/')) {
      return `${BASE_URL}${imageUrl}`;
    } else {
      return `https://${imageUrl}`;
    }
  }

  // Mesafe hesapla (haversine formula)
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Dünya'nın yarıçapı (km)
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // Mesafe km cinsinden
    return distance;
  }

  deg2rad(deg) {
    return deg * (Math.PI/180);
  }

  // Çalışma saatlerini kontrol et
  isOpen(workingHours) {
    if (!workingHours) return false;
    
    try {
      const now = new Date();
      const currentTime = now.getHours() * 60 + now.getMinutes();
      
      // Çalışma saatlerini parse et (örn: "09:00 - 18:00")
      const [startTime, endTime] = workingHours.split(' - ');
      const [startHour, startMin] = startTime.split(':').map(Number);
      const [endHour, endMin] = endTime.split(':').map(Number);
      
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;
      
      return currentTime >= startMinutes && currentTime <= endMinutes;
    } catch (error) {
      console.error('Çalışma saati kontrolü hatası:', error);
      return false;
    }
  }

  // Ödeme noktalarında arama yap
  async searchPaymentPoints(query, latitude = null, longitude = null, page = 0, size = 10) {
    try {
      const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
      
      // URL parametrelerini oluştur
      let searchUrl = `${BASE_URL}/payment-point/search?query=${encodeURIComponent(query)}&page=${page}&size=${size}`;
      
      // Konum bilgisi varsa ekle
      if (latitude && longitude) {
        searchUrl += `&latitude=${latitude}&longitude=${longitude}`;
      }
      
      console.log('🔍 Arama API çağrısı yapılıyor:', {
        endpoint: searchUrl,
        method: 'GET',
        hasToken: !!token,
        parameters: { query, latitude, longitude, page, size }
      });
      
      const response = await fetch(searchUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` })
        }
      });

      console.log('🔍 Arama API response status:', response.status, response.statusText);

      if (!response.ok) {
        if (response.status === 401) {
          AuthService.logout();
          throw new Error('Oturum süresi doldu. Lütfen tekrar giriş yapın.');
        }
        throw new Error(`Arama işlemi başarısız: ${response.status}`);
      }

      const data = await response.json();
      console.log('🔍 Arama API response:', data);
      
      if (data.success && data.data) {
        console.log('🔍 Arama sonucu content array:', data.data.content);
        console.log('🔍 Bulunan ödeme noktası sayısı:', data.data.content ? data.data.content.length : 0);
        return {
          content: data.data.content || [],
          message: data.message,
          pageInfo: {
            pageNumber: data.data.pageNumber,
            pageSize: data.data.pageSize,
            totalElements: data.data.totalElements,
            totalPages: data.data.totalPages,
            first: data.data.first,
            last: data.data.last
          }
        };
      } else {
        console.log('❌ Arama API başarısız response:', data);
        throw new Error(data.message || 'Arama işlemi başarısız');
      }
    } catch (error) {
      console.error('❌ Arama servisi hatası:', error);
      throw error;
    }
  }
}

export default new PaymentPointService();
