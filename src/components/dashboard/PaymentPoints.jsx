import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PaymentPointService from '../../services/payment-point.service';
import AuthService from '../../services/auth.service';
import { toast } from 'react-toastify';
import NewsImage from '../ui/NewsImage';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useRef } from 'react';

// Marker icons
const blueIcon = new L.Icon({
  iconUrl: 'https://cdn.jsdelivr.net/gh/pointhi/leaflet-color-markers@master/img/marker-icon-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});
const redIcon = new L.Icon({
  iconUrl: 'https://cdn.jsdelivr.net/gh/pointhi/leaflet-color-markers@master/img/marker-icon-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Async popup for payment point details
function PaymentPointPopup({ pointId }) {
  const [loading, setLoading] = React.useState(true);
  const [details, setDetails] = React.useState(null);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    setDetails(null);
    PaymentPointService.getPaymentPointById(pointId)
      .then(data => {
        let point = data && data.data ? data.data : data;
        if (mounted) {
          setDetails(point);
          setLoading(false);
        }
      })
      .catch(err => {
        if (mounted) {
          setError(err.message);
          setLoading(false);
        }
      });
    return () => { mounted = false; };
  }, [pointId]);

  if (loading) return <div className="p-4 text-center text-sm">Yükleniyor...</div>;
  if (error) return <div className="p-4 text-center text-red-600 text-sm">Hata: {error}</div>;
  if (!details) return <div className="p-4 text-center text-sm">Detay bulunamadı.</div>;

  // Açık/Kapalı durumu
  const isOpen = PaymentPointService.isOpen(details.workingHours);

  return (
    <div className="min-w-[180px] max-w-[240px] p-0 flex flex-col items-center gap-2">
      <div className="font-bold text-base text-blue-800 text-center truncate w-full" title={details.name}>{details.name}</div>
      <div className="flex flex-wrap justify-center gap-1 w-full mt-1">
        {details.paymentMethods && details.paymentMethods.length > 0 ? (
          PaymentPointService.formatPaymentMethods(details.paymentMethods).map((m, i) => (
            <span key={i} className="inline-block bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap">{m}</span>
          ))
        ) : (
          <span className="text-gray-400 text-xs">Ödeme tipi yok</span>
        )}
      </div>
      <div className={`mt-2 px-3 py-1 rounded-full text-xs font-bold shadow-sm ${isOpen ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'}`}
        style={{letterSpacing: '0.5px'}}>
        {isOpen ? 'AÇIK' : 'KAPALI'}
      </div>
    </div>
  );
}

const PaymentPoints = () => {
  const navigate = useNavigate();
  const [nearbyPoints, setNearbyPoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [locationPermission, setLocationPermission] = useState('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [searchMode, setSearchMode] = useState(false); // Arama modu takibi
  const mapRef = useRef();
  const [selectedMapPointId, setSelectedMapPointId] = useState(null);

  // Auth kontrolü
  useEffect(() => {
    const checkAuth = async () => {
      try {
        console.log('🔐 [PAYMENT_POINTS] Auth kontrolü yapılıyor...');
        const authResult = await AuthService.showLoginConfirmModal('Ödeme noktalarını görüntüleme işlemini', navigate);
        console.log('🔐 [PAYMENT_POINTS] Auth modal sonucu:', authResult);
        
        if (!authResult && !AuthService.isAuthenticated()) {
          console.log('🔄 [PAYMENT_POINTS] Kullanıcı giriş yapmak istemedi, dashboard\'a yönlendiriliyor...');
          navigate('/dashboard');
        } else {
          console.log('✅ [PAYMENT_POINTS] Auth kontrolü tamamlandı');
        }
      } catch (error) {
        console.error('❌ [PAYMENT_POINTS] Auth kontrolü hatası:', error);
        navigate('/dashboard');
      }
    };

    if (!AuthService.isAuthenticated()) {
      checkAuth();
    } else {
      console.log('✅ [PAYMENT_POINTS] Kullanıcı zaten giriş yapmış');
    }
  }, [navigate]);

  useEffect(() => {
    requestLocation();
  }, []);

  // Konum izni iste
  const requestLocation = () => {
    console.log('🌍 [LOCATION] Konum izni isteniyor...');
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const locationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: new Date(position.timestamp).toLocaleString('tr-TR')
          };
          // Kullanıcı konumu debug mesajı
          console.log('[DEBUG] Kullanıcı konumu:', {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
          console.log('✅ [LOCATION] Konum başarıyla alındı:', locationData);
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
          setLocationPermission('granted');
        },
        (error) => {
          console.error('❌ [LOCATION] Konum alınamadı:', {
            code: error.code,
            message: error.message,
            errorTypes: {
              1: 'PERMISSION_DENIED - Kullanıcı konum iznini reddetti',
              2: 'POSITION_UNAVAILABLE - Konum bilgisi mevcut değil',
              3: 'TIMEOUT - Konum alma işlemi zaman aşımına uğradı'
            }[error.code] || 'Bilinmeyen hata'
          });
          setLocationPermission('denied');
        }
      );
    } else {
      console.warn('⚠️ [LOCATION] Geolocation API desteklenmiyor');
      setLocationPermission('not-available');
    }
  };

  // Yakın ödeme noktalarını getir
  const fetchNearbyPaymentPoints = async () => {
    if (!userLocation) {
      console.warn('⚠️ [NEARBY] Konum bilgisi bulunamadı');
      toast.warning('Konum bilgisi bulunamadı. Lütfen konum izni verin.');
      return;
    }

    try {
      setNearbyLoading(true);
      const requestParams = {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        radiusKm: 100,
        page: 0,
        size: 10,
        sort: 'distance,asc'
      };
      
      console.log('� [NEARBY] Yakın ödeme noktaları API çağrısı başlatılıyor...', {
        userLocation: userLocation,
        requestParams: requestParams,
        fullEndpoint: `http://localhost:8080/v1/api/payment-point/nearby?latitude=${userLocation.latitude}&longitude=${userLocation.longitude}&radiusKm=100&page=0&size=10&sort=distance,asc`,
        timestamp: new Date().toLocaleString('tr-TR')
      });
      
      const result = await PaymentPointService.getNearbyPaymentPoints(
        requestParams.latitude, 
        requestParams.longitude, 
        requestParams.radiusKm,
        requestParams.page,
        requestParams.size,
        requestParams.sort
      );
      
      console.log('� [NEARBY] API Response Tamamlandı:', {
        success: result.success || 'undefined',
        message: result.message || 'No message',
        contentLength: result.content ? result.content.length : 0,
        totalElements: result.pageInfo?.totalElements || 'undefined',
        fullResponse: result,
        responseTime: new Date().toLocaleString('tr-TR')
      });
      
      // API'den gelen her bir ödeme noktasını logla
      if (result.content && result.content.length > 0) {
        console.log('📍 [NEARBY] Bulunan Ödeme Noktaları:');
        result.content.forEach((point, index) => {
          console.log(`  ${index + 1}. ${point.name}`, {
            id: point.id,
            location: point.location,
            address: `${point.address.street}, ${point.address.district}, ${point.address.city}`,
            distance: point.distance,
            isActive: point.active,
            paymentMethods: point.paymentMethods,
            workingHours: point.workingHours
          });
        });
      }
      
      // Yakın noktaları formatla
      let formattedNearbyPoints = [];
      if (result.content && result.content.length > 0) {
        formattedNearbyPoints = result.content.map(point => ({
          ...point,
          formattedPaymentMethods: PaymentPointService.formatPaymentMethods(point.paymentMethods),
          isOpen: PaymentPointService.isOpen(point.workingHours),
          photos: point.photos || []
        }));
      }

      setNearbyPoints(formattedNearbyPoints);
      setSearchMode(false); // Yakındakiler modu, arama değil
      
      // Detaylı bilgilendirme mesajları
      if (formattedNearbyPoints.length > 0) {
        // API'den gelen message kullan veya varsayılan
        const apiMessage = result.message || `📍 100km çapında ${formattedNearbyPoints.length} ödeme noktası bulundu!`;
        console.log('✅ [NEARBY] Başarılı Sonuç:', {
          foundPoints: formattedNearbyPoints.length,
          apiMessage: result.message,
          displayMessage: apiMessage,
          pointNames: formattedNearbyPoints.map(p => p.name)
        });
        toast.success(apiMessage);
      } else {
        console.log('� [NEARBY] Boş Sonuç Detayları:', {
          apiSuccess: result.success || 'undefined',
          apiMessage: result.message || 'No message from API',
          contentArray: result.content,
          contentLength: result.content ? result.content.length : 'null/undefined',
          pageInfo: result.pageInfo || 'undefined',
          searchRadius: '100km',
          userLocation: userLocation,
          warningMessage: '100km çapında yakın ödeme noktası bulunamadı'
        });
        toast.info('📍 100km çapında yakın ödeme noktası bulunamadı. Farklı bir konumdan deneyin.');
      }
    } catch (err) {
      console.error('❌ [NEARBY] API Hatası:', {
        errorMessage: err.message,
        errorStack: err.stack,
        userLocation: userLocation,
        requestParams: {
          latitude: userLocation?.latitude,
          longitude: userLocation?.longitude,
          radiusKm: 100
        },
        timestamp: new Date().toLocaleString('tr-TR'),
        possibleCauses: [
          'Backend server çalışmıyor olabilir',
          'API endpoint değişmiş olabilir',
          'Auth token geçersiz olabilir',
          'Network bağlantı sorunu olabilir'
        ]
      });
      toast.error('Yakın ödeme noktaları yüklenirken hata oluştu: ' + err.message);
    } finally {
      setNearbyLoading(false);
      console.log('🏁 [NEARBY] API çağrısı tamamlandı:', {
        timestamp: new Date().toLocaleString('tr-TR'),
        loadingState: 'false'
      });
    }
  };

  // Ödeme noktası detayını görüntüle
  const handleViewDetails = async (pointId) => {
    try {
      setSelectedPoint({ loading: true });
      setIsModalOpen(true);
      
      const pointDetail = await PaymentPointService.getPaymentPointById(pointId);
      
      setSelectedPoint({
        ...pointDetail,
        formattedPaymentMethods: PaymentPointService.formatPaymentMethods(pointDetail.paymentMethods),
        isOpen: PaymentPointService.isOpen(pointDetail.workingHours),
        loading: false
      });
    } catch (error) {
      console.error(`❌ Ödeme noktası ${pointId} detayı alınamadı:`, error);
      setIsModalOpen(false);
      setSelectedPoint(null);
      toast.error('Ödeme noktası detayları yüklenemedi');
    }
  };

  // Modal'ı kapat
  const closeModal = () => {
    setIsModalOpen(false);
    setTimeout(() => setSelectedPoint(null), 300);
  };

  // ESC tuşu ile modal kapatma
  useEffect(() => {
    const handleEsc = (event) => {
      if (event.keyCode === 27 && isModalOpen) {
        closeModal();
      }
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isModalOpen]);

  // Mesafe hesapla ve göster
  const getDistanceText = (point) => {
    // API'den gelen distance varsa onu kullan
    if (point.distance !== null && point.distance !== undefined) {
      return `${point.distance.toFixed(1)} km`;
    }
    
    // Yoksa manuel hesapla
    if (!userLocation || !point.location) return null;
    
    const distance = PaymentPointService.calculateDistance(
      userLocation.latitude,
      userLocation.longitude,
      point.location.latitude,
      point.location.longitude
    );
    
    return `${distance.toFixed(1)} km`;
  };

  // Harita bağlantısı oluştur
  const getMapLink = (point) => {
    const { latitude, longitude } = point.location;
    return `https://www.google.com/maps?q=${latitude},${longitude}`;
  };

  // Telefon bağlantısı
  const callPhone = (phoneNumber) => {
    window.open(`tel:${phoneNumber}`);
  };

  // filteredPaymentPoints'i nearbyPoints'e göre ayarla
  const filteredPaymentPoints = React.useMemo(() => {
    if (!nearbyPoints || nearbyPoints.length === 0) return [];
    if (!searchTerm.trim()) return nearbyPoints;
    const term = searchTerm.trim().toLowerCase();
    return nearbyPoints.filter(point =>
      point.name.toLowerCase().includes(term) ||
      (point.address && (
        point.address.city?.toLowerCase().includes(term) ||
        point.address.district?.toLowerCase().includes(term) ||
        point.address.street?.toLowerCase().includes(term)
      ))
    );
  }, [nearbyPoints, searchTerm]);

  // Kartlardaki 📍 butonu için fonksiyon
  const handleMapFocus = (point) => {
    setSelectedMapPointId(point.id);
    if (mapRef.current && point.location && point.location.latitude && point.location.longitude) {
      mapRef.current.setView([point.location.latitude, point.location.longitude], 15, { animate: true });
    }
  };

  // userLocation değiştiğinde nearbyPoints otomatik yüklensin
  useEffect(() => {
    if (userLocation && locationPermission === 'granted') {
      fetchNearbyPaymentPoints();
    }
    // eslint-disable-next-line
  }, [userLocation, locationPermission]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="animate-pulse grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-6xl">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="bg-white rounded-xl shadow-md overflow-hidden h-80">
              <div className="h-40 bg-blue-100"></div>
              <div className="p-4">
                <div className="h-5 bg-blue-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-100 rounded w-2/3 mb-2"></div>
                <div className="h-4 bg-gray-100 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
            <h1 className="text-2xl font-bold text-blue-800 mb-2 md:mb-0">Yakındaki Ödeme Noktaları</h1>
            
            {/* Konum Durumu */}
            <div className={`flex items-center px-4 py-2 rounded-lg text-sm ${
              locationPermission === 'granted' 
                ? 'bg-green-100 text-green-800' 
                : locationPermission === 'denied'
                ? 'bg-orange-100 text-orange-800'
                : 'bg-gray-100 text-gray-800'
            }`}>
              <span className="mr-2">
                {locationPermission === 'granted' ? '📍' : 
                 locationPermission === 'denied' ? '🚫' : '⏳'}
              </span>
              <span className="font-medium">
                {locationPermission === 'granted' ? 'Konum aktif - Mesafeler gösteriliyor' :
                 locationPermission === 'denied' ? 'Konum izni reddedildi' :
                 'Konum alınıyor...'}
              </span>
            </div>
          </div>
          
          <p className="text-gray-600 mb-4">
            Konumunuza en yakın bakiye yükleme ve ödeme noktalarını harita ve liste üzerinden görüntüleyin.
          </p>

          {/* Arama ve Filtreler */}
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="flex-1 flex gap-2">
              <input
                type="text"
                placeholder="Ödeme noktası adı, şehir, ilçe ile ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && searchTerm.trim().length >= 2) {
                    handleSearch(searchTerm);
                  }
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <button
                onClick={() => handleSearch(searchTerm)}
                disabled={nearbyLoading || searchTerm.trim().length < 2}
                className={`px-6 py-2 rounded-lg font-medium transition whitespace-nowrap ${
                  searchTerm.trim().length >= 2 && !nearbyLoading
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {nearbyLoading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Arıyor...
                  </span>
                ) : (
                  <>🔍 Ara</>
                )}
              </button>
            </div>
            
            {/* Yakın Noktalar Butonu */}
            {userLocation && (
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    if (searchMode) {
                      // Filtreyi kaldır
                      setSearchMode(false);
                      setSearchTerm('');
                      setNearbyPoints([]);
                    } else {
                      // Yakındakileri getir
                      console.log('📍 [NEARBY] Yakın noktalar butonu tıklandı');
                      setSearchMode(false);
                      setSearchTerm('');
                      fetchNearbyPaymentPoints();
                    }
                  }}
                  disabled={nearbyLoading}
                  className={`px-4 py-2 rounded-lg font-medium transition whitespace-nowrap ${
                    searchMode
                      ? 'bg-blue-600 text-white hover:bg-blue-700' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  } ${nearbyLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {nearbyLoading ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Yükleniyor...
                    </span>
                  ) : (
                    searchMode ? <>📍 Yakınımdakiler Kapat</> : <>📍 Yakınımdakiler ({nearbyPoints.length})</>
                  )}
                </button>
                
                {(searchMode) && (
                  <button
                    onClick={() => {
                      console.log('🧹 [CLEAR] Arama/Yakın noktalar temizleniyor');
                      setSearchMode(false);
                      setSearchTerm('');
                      setNearbyPoints([]);
                      
                      // Eğer konum varsa yakın noktaları yeniden yükle
                      if (userLocation) {
                        console.log('🔄 [CLEAR] Yakın noktalar yeniden yükleniyor');
                        fetchNearbyPaymentPoints();
                      }
                    }}
                    className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 font-medium transition whitespace-nowrap"
                  >
                    Aramayı Temizle
                  </button>
                )}
              </div>
            )}
          </div>

          {/* İstatistikler */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-3 rounded-lg text-center">
              <div className="text-2xl font-bold text-blue-600">{filteredPaymentPoints.length}</div>
              <div className="text-sm text-blue-700">
                {searchMode ? 'Arama Sonuçları' : 'Yakın Nokta'}
              </div>
            </div>
            <div className="bg-green-50 p-3 rounded-lg text-center">
              <div className="text-2xl font-bold text-green-600">
                {filteredPaymentPoints.filter(p => p.isOpen).length}
              </div>
              <div className="text-sm text-green-700">Şu An Açık</div>
            </div>
            <div className="bg-purple-50 p-3 rounded-lg text-center">
              <div className="text-2xl font-bold text-purple-600">
                {filteredPaymentPoints.filter(p => p.paymentMethods && p.paymentMethods.includes('QR_CODE')).length}
              </div>
              <div className="text-sm text-purple-700">QR Kod Destekli</div>
            </div>
            <div className="bg-orange-50 p-3 rounded-lg text-center">
              <div className="text-2xl font-bold text-orange-600">
                {filteredPaymentPoints.filter(p => p.paymentMethods && p.paymentMethods.includes('CASH')).length}
              </div>
              <div className="text-sm text-orange-700">Nakit Kabul Eden</div>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && !searchMode && (
          <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-orange-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-orange-800 font-medium">Backend bağlantısı kurulamadı - Test verileri gösteriliyor</span>
            </div>
          </div>
        )}

        {/* Yakın Noktalar/Arama Bilgi */}
        {searchMode && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {searchMode ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                ) : (
                  <>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </>
                )}
              </svg>
              <span className="text-blue-800 font-medium">
                {searchMode 
                  ? `"${searchTerm}" arama sonuçları gösteriliyor`
                  : 'Konumunuza yakın ödeme noktaları gösteriliyor (100 km çapında)'
                }
              </span>
            </div>
          </div>
        )}

        {/* Map Section */}
        <div className="mb-8">
          <MapContainer
            center={userLocation ? [userLocation.latitude, userLocation.longitude] : [39.925533, 32.866287]} // Default: Ankara
            zoom={userLocation ? 11 : 6}
            style={{ height: '350px', width: '100%', borderRadius: '1rem', boxShadow: '0 2px 16px rgba(0,0,0,0.08)' }}
            scrollWheelZoom={true}
            whenCreated={mapInstance => { mapRef.current = mapInstance; }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {/* User Location Marker */}
            {userLocation && (
              <Marker position={[userLocation.latitude, userLocation.longitude]} icon={blueIcon}>
                <Popup>Mevcut Konumunuz</Popup>
              </Marker>
            )}
            {/* Only show nearby payment points on the map */}
            {filteredPaymentPoints.map(point => (
              point.location && point.location.latitude && point.location.longitude && (
                <Marker
                  key={point.id}
                  position={[
                    point.location.latitude,
                    point.location.longitude
                  ]}
                  icon={redIcon}
                  eventHandlers={{
                    popupopen: () => setSelectedMapPointId(point.id)
                  }}
                >
                  <Popup autoPan={true} open={selectedMapPointId === point.id}>
                    <PaymentPointPopup pointId={point.id} />
                  </Popup>
                </Marker>
              )
            ))}
          </MapContainer>
        </div>

        {/* Payment Points Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPaymentPoints.map(point => (
            <div key={point.id} className="bg-white rounded-xl shadow-md overflow-hidden transition-transform hover:shadow-lg hover:-translate-y-1">
              {/* Resim alanı */}
              <div className="h-48 overflow-hidden relative">
                <NewsImage
                  src={point.photos.length > 0 
                    ? PaymentPointService.normalizeImageUrl(point.photos[0].imageUrl)
                    : 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop'
                  }
                  alt={point.name}
                  className="w-full h-full object-cover"
                />
                
                {/* Durum badge'i */}
                <div className={`absolute top-3 right-3 px-2 py-1 rounded-full text-xs font-bold text-white ${
                  point.isOpen ? 'bg-green-500' : 'bg-red-500'
                }`}>
                  {point.isOpen ? 'AÇIK' : 'KAPALI'}
                </div>

                {/* Mesafe badge'i */}
                {userLocation && (
                  <div className="absolute top-3 left-3 bg-blue-500 text-white px-2 py-1 rounded-full text-xs font-bold">
                    📍 {getDistanceText(point)}
                  </div>
                )}
              </div>

              {/* İçerik */}
              <div className="p-4">
                <h3 className="text-lg font-bold text-gray-800 mb-2 line-clamp-1">{point.name}</h3>
                
                {/* Adres */}
                <div className="flex items-start mb-3">
                  <svg className="w-4 h-4 text-gray-500 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="text-sm text-gray-600 line-clamp-2">
                    {point.address.street}, {point.address.district}, {point.address.city}
                  </span>
                </div>

                {/* Çalışma saatleri */}
                <div className="flex items-center mb-3">
                  <svg className="w-4 h-4 text-gray-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm text-gray-600">{point.workingHours}</span>
                </div>

                {/* Ödeme yöntemleri */}
                <div className="flex flex-wrap gap-1 mb-4">
                  {point.formattedPaymentMethods.slice(0, 2).map((method, index) => (
                    <span key={index} className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                      {method}
                    </span>
                  ))}
                  {point.formattedPaymentMethods.length > 2 && (
                    <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded">
                      +{point.formattedPaymentMethods.length - 2}
                    </span>
                  )}
                </div>

                {/* Aksiyon butonları */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleViewDetails(point.id)}
                    className="flex-1 bg-blue-600 text-white py-2 px-3 rounded-lg text-sm font-medium hover:bg-blue-700 transition"
                  >
                    Detaylar
                  </button>
                  <button
                    onClick={() => handleMapFocus(point)}
                    className="bg-green-600 text-white py-2 px-3 rounded-lg text-sm font-medium hover:bg-green-700 transition"
                  >
                    📍
                  </button>
                  <button
                    onClick={() => callPhone(point.contactNumber)}
                    className="bg-orange-600 text-white py-2 px-3 rounded-lg text-sm font-medium hover:bg-orange-700 transition"
                  >
                    📞
                  </button>
                </div>
                {/* Description */}
                {point.description && (
                  <div className="mt-3 text-xs text-gray-500 leading-snug line-clamp-3">
                    {point.description}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* No results */}
        {filteredPaymentPoints.length === 0 && !loading && (
          <div className="bg-white rounded-xl shadow-md p-8 text-center">
            <svg className="w-16 h-16 mx-auto text-blue-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            </svg>
            <h3 className="text-xl font-bold text-gray-800 mb-2">
              {searchMode 
                ? 'Arama kriterine uygun nokta bulunamadı' 
                : 'Henüz ödeme noktası bulunmuyor'
              }
            </h3>
            <p className="text-gray-600 mb-4">
              {searchMode 
                ? 'Farklı bir arama terimi deneyin veya filtreleri temizleyin.'
                : 'Ödeme noktaları yükleniyor veya henüz sisteme eklenmiş nokta bulunmuyor.'
              }
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {searchMode ? (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Aramayı Temizle
                </button>
              ) : (
                <button 
                  onClick={fetchNearbyPaymentPoints}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                >
                  Yenile
                </button>
              )}
            </div>
          </div>
        )}

        {/* Payment Point Detail Modal */}
        {isModalOpen && (
          <div 
            className="fixed inset-0 backdrop-blur-lg bg-black/40 flex items-center justify-center z-50 p-4"
            onClick={(e) => e.target === e.currentTarget && closeModal()}
          >
            <div className="relative bg-white rounded-3xl max-w-4xl w-full max-h-[95vh] overflow-hidden shadow-2xl">
              {/* Modal Header */}
              <div className="relative px-8 py-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                <button
                  onClick={closeModal}
                  className="absolute top-4 right-4 w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white transition-all duration-300"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <h2 className="text-2xl font-bold">Ödeme Noktası Detayları</h2>
                <p className="text-white/90">Detaylı bilgiler ve iletişim</p>
              </div>

              {/* Modal Content */}
              <div className="p-8 max-h-[calc(90vh-8rem)] overflow-y-auto">
                {selectedPoint?.loading ? (
                  <div className="animate-pulse space-y-6">
                    <div className="h-8 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    <div className="space-y-3">
                      <div className="h-4 bg-gray-200 rounded"></div>
                      <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                    </div>
                  </div>
                ) : selectedPoint ? (
                  <div>
                    {/* Galeri */}
                    <PaymentPointGallery photos={selectedPoint.photos} name={selectedPoint.name} />
                    {/* Başlık ve durum */}
                    <div className="flex items-center justify-between mb-6 mt-6">
                      <h1 className="text-3xl font-bold text-gray-900">{selectedPoint.name}</h1>
                      <span className={`px-4 py-2 rounded-full text-sm font-bold text-white ${
                        selectedPoint.isOpen ? 'bg-green-500' : 'bg-red-500'
                      }`}>
                        {selectedPoint.isOpen ? '✅ AÇIK' : '❌ KAPALI'}
                      </span>
                    </div>
                    {/* Bilgi kartları */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      {/* Adres Kartı */}
                      <div className="bg-gray-50 p-6 rounded-xl">
                        <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center">
                          <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          </svg>
                          Adres
                        </h3>
                        <p className="text-gray-700 mb-2">{selectedPoint.address.street}</p>
                        <p className="text-gray-700 mb-2">{selectedPoint.address.district}, {selectedPoint.address.city}</p>
                        <p className="text-gray-600">{selectedPoint.address.postalCode}</p>
                      </div>
                      {/* İletişim Kartı */}
                      <div className="bg-gray-50 p-6 rounded-xl">
                        <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center">
                          <svg className="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          İletişim
                        </h3>
                        <p className="text-gray-700 mb-2">{selectedPoint.contactNumber}</p>
                        <p className="text-gray-600">Çalışma Saatleri: {selectedPoint.workingHours}</p>
                      </div>
                    </div>
                    {/* Açıklama */}
                    {selectedPoint.description && (
                      <div className="bg-blue-50 p-6 rounded-xl mb-6">
                        <h3 className="text-lg font-bold text-gray-800 mb-3">Açıklama</h3>
                        <p className="text-gray-700">{selectedPoint.description}</p>
                      </div>
                    )}
                    {/* Ödeme Yöntemleri */}
                    <div className="bg-purple-50 p-6 rounded-xl mb-6">
                      <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center">
                        <svg className="w-5 h-5 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                        </svg>
                        Kabul Edilen Ödeme Yöntemleri
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {selectedPoint.formattedPaymentMethods.map((method, index) => (
                          <span key={index} className="bg-purple-100 text-purple-800 px-3 py-2 rounded-lg font-medium">
                            {method}
                          </span>
                        ))}
                      </div>
                    </div>
                    {/* Aksiyon Butonları */}
                    <div className="flex flex-col sm:flex-row gap-4">
                      <button
                        onClick={() => window.open(getMapLink(selectedPoint), '_blank')}
                        className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-xl font-bold hover:bg-blue-700 transition flex items-center justify-center"
                      >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m0 0L9 7" />
                        </svg>
                        Haritada Göster
                      </button>
                      <button
                        onClick={() => callPhone(selectedPoint.contactNumber)}
                        className="flex-1 bg-green-600 text-white py-3 px-6 rounded-xl font-bold hover:bg-green-700 transition flex items-center justify-center"
                      >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        Ara
                      </button>
                      <button
                        onClick={closeModal}
                        className="bg-gray-500 text-white py-3 px-6 rounded-xl font-bold hover:bg-gray-600 transition"
                      >
                        Kapat
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentPoints;

// Galeri bileşeni
function PaymentPointGallery({ photos, name }) {
  const [current, setCurrent] = React.useState(0);
  if (!photos || photos.length === 0) {
    return (
      <div className="w-full h-64 bg-gray-100 flex items-center justify-center rounded-xl mb-6">
        <img
          src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop"
          alt={name}
          className="object-cover w-full h-full rounded-xl"
        />
      </div>
    );
  }
  const goPrev = () => setCurrent((c) => (c === 0 ? photos.length - 1 : c - 1));
  const goNext = () => setCurrent((c) => (c === photos.length - 1 ? 0 : c + 1));
  return (
    <div className="relative w-full h-64 mb-6">
      <img
        src={PaymentPointService.normalizeImageUrl(photos[current].imageUrl)}
        alt={name}
        className="object-cover w-full h-full rounded-xl"
      />
      {photos.length > 1 && (
        <>
          <button
            onClick={goPrev}
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-gray-700 rounded-full w-10 h-10 flex items-center justify-center shadow-lg"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={goNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-gray-700 rounded-full w-10 h-10 flex items-center justify-center shadow-lg"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </>
      )}
      {/* Fotoğraf sayacı */}
      {photos.length > 1 && (
        <div className="absolute bottom-2 right-4 bg-black/60 text-white text-xs px-3 py-1 rounded-full">
          {current + 1} / {photos.length}
        </div>
      )}
    </div>
  );
}
