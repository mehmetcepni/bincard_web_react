import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import AuthService from '../../services/auth.service';
import WalletService from '../../services/wallet.service';
import NewsService from '../../services/news.service';
import PaymentPointService from '../../services/payment-point.service';
import News from './News.jsx';
import LikedNews from './LikedNews.jsx';
import Wallet from './Wallet.jsx';
import Stations from './Stations.jsx';
import Routes from './Routes.jsx';
import Feedback from './Feedback.jsx';
import PaymentPoints from './PaymentPoints.jsx';
import Settings from './Settings.jsx';
import TokenDebug from '../debug/TokenDebug.jsx';
import bincardLogo from '../../assets/bincard-logo.jpg';

// KonyaKart stilinde menü öğeleri
const menuItems = [
  { text: 'Ana Sayfa', icon: '🏠', path: 'dashboard', key: 'dashboard' },
  { text: 'Cüzdan', icon: '💳', path: 'wallet', key: 'wallet' },
  { text: 'Duraklar', icon: '🚏', path: 'routes', key: 'routes' },
  { text: 'Rotalar', icon: '🚌', path: 'bus-routes', key: 'bus-routes' },
  { text: 'Ödeme Noktaları', icon: '📍', path: 'payment-points', key: 'payment-points' },
  { text: 'İşlem Geçmişi', icon: '📋', path: 'history', key: 'history' },
  { text: 'Haberler', icon: '📰', path: 'news', key: 'news' },
  { text: 'Favoriler', icon: '⭐', path: 'liked-news', key: 'liked-news' },
  { text: 'Destek', icon: '💬', path: 'feedback', key: 'feedback' },
  { text: 'Ayarlar', icon: '⚙️', path: 'settings', key: 'settings' },
];

const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [walletData, setWalletData] = useState(null);
  const [isLoadingWallet, setIsLoadingWallet] = useState(false);
  const [user, setUser] = useState(null);
  const [selectedNews, setSelectedNews] = useState(null);
  const [isNewsModalOpen, setIsNewsModalOpen] = useState(false);

  // URL'ye göre aktif tab'ı belirle
  useEffect(() => {
    const path = location.pathname.replace('/', '');
    setActiveTab(path || 'dashboard');
  }, [location]);

  // Auth durumunu kontrol et
  useEffect(() => {
    const checkAuth = () => {
      try {
        const authStatus = AuthService.isAuthenticated();
        setIsAuthenticated(authStatus);
        
        if (authStatus) {
          // Kullanıcı bilgilerini al
          try {
            const savedProfile = localStorage.getItem('lastKnownProfile');
            if (savedProfile) {
              setUser(JSON.parse(savedProfile));
            }
          } catch (error) {
            console.warn('Profil bilgisi alınamadı:', error);
          }
        } else {
          setUser(null);
          setWalletData(null);
        }
      } catch (error) {
        console.error('Dashboard auth check error:', error);
        setIsAuthenticated(false);
        setWalletData(null);
        setUser(null);
      }
    };
    
    checkAuth();
    const interval = setInterval(checkAuth, 5000);
    return () => clearInterval(interval);
  }, [navigate, location.pathname]);

  // Wallet bilgisini çek
  useEffect(() => {
    const fetchWalletData = async () => {
      if (!isAuthenticated) {
        setWalletData(null);
        return;
      }

      setIsLoadingWallet(true);
      try {
        const data = await WalletService.getMyWallet();
        setWalletData(data);
      } catch (error) {
        console.error('[DASHBOARD] Wallet bilgisi alınamadı:', error);
        setWalletData(null);
      } finally {
        setIsLoadingWallet(false);
      }
    };

    fetchWalletData();
  }, [isAuthenticated]);

  const handleNavigation = async (item) => {
    try {
      if ((item.key === 'liked-news' || item.key === 'payment-points' || item.key === 'settings') && !AuthService.isAuthenticated()) {
        const result = await AuthService.showLoginConfirmModal(
          item.key === 'liked-news'
            ? 'Favori haberleri görüntüleme işlemini'
            : item.key === 'payment-points'
              ? 'Yakındaki ödeme noktalarını görüntüleme işlemini'
              : 'Ayarları görüntüleme işlemini',
          navigate
        );
        return;
      }
      setActiveTab(item.key);
      navigate(`/${item.path}`);
      setSidebarOpen(false);
    } catch (error) {
      console.error('Navigation error:', error);
    }
  };

  const handleAuthAction = () => {
    if (isAuthenticated) {
      AuthService.logout();
      setIsAuthenticated(false);
      setUser(null);
    } else {
      navigate('/login');
    }
  };

  const handleNewsClick = (news) => {
    setSelectedNews(news);
    setIsNewsModalOpen(true);
  };

  const closeNewsModal = () => {
    setIsNewsModalOpen(false);
    setSelectedNews(null);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'news':
        return <News />;
      case 'liked-news':
        return <LikedNews />;
      case 'wallet':
        return <Wallet />;
      case 'routes':
        return <Stations />;
      case 'bus-routes':
        return <Routes />;
      case 'feedback':
        return <Feedback />;
      case 'payment-points':
        return <PaymentPoints />;
      case 'settings':
        return <Settings />;
      case 'debug':
        return <TokenDebug />;
      case 'dashboard':
      default:
        return <DashboardHome 
          isAuthenticated={isAuthenticated}
          walletData={walletData}
          isLoadingWallet={isLoadingWallet}
          user={user}
          onNewsClick={handleNewsClick}
        />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      {/* KonyaKart stilinde Header */}
      <header className="fixed top-0 left-0 w-full bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 z-50 shadow-sm transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo ve başlık */}
            <div className="flex items-center space-x-4">
              <button 
                className="md:hidden p-2 rounded-md text-gray-600 dark:text-gray-300 hover:text-[#005bac] dark:hover:text-[#2c7bc7] hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                onClick={() => setSidebarOpen(!sidebarOpen)}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <div className="flex items-center space-x-3 cursor-pointer" onClick={() => navigate('/dashboard')}>
                <div className="w-10 h-10 rounded-xl overflow-hidden shadow-sm">
                  <img 
                    src={bincardLogo} 
                    alt="BinCard Logo" 
                    className="w-full h-full object-cover hover:scale-110 transition-transform duration-200"
                  />
                </div>
                <h1 className="text-xl font-bold text-[#005bac] hidden sm:block hover:text-[#004690] transition-colors duration-200">BinCard</h1>
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              {menuItems.slice(0, 5).map((item) => (
                <button
                  key={item.key}
                  onClick={() => handleNavigation(item)}
                  className={`nav-link px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                    activeTab === item.key ? 'nav-link-active bg-blue-50 dark:bg-blue-900/30' : ''
                  }`}
                >
                  {item.text}
                </button>
              ))}
            </nav>

            {/* User Menu */}
            <div className="flex items-center space-x-4">
              {isAuthenticated ? (
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => handleNavigation({ key: 'settings', path: 'settings' })}
                      className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group"
                      title="Profil Ayarları"
                    >
                      <div className="w-8 h-8 bg-[#005bac] rounded-full flex items-center justify-center text-white text-sm font-medium group-hover:bg-[#004690] transition-colors">
                        {user?.firstName ? user.firstName.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-300 hidden sm:block">
                        Hoş geldin, {user?.firstName || 'Kullanıcı'}
                      </div>
                    </button>
                  </div>
                  <button
                    onClick={handleAuthAction}
                    className="btn-secondary py-2 px-4 text-sm"
                  >
                    Çıkış Yap
                  </button>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => navigate('/login')}
                    className="btn-outline py-2 px-4 text-sm"
                  >
                    Giriş Yap
                  </button>
                  <button
                    onClick={() => navigate('/register')}
                    className="btn-primary py-2 px-4 text-sm"
                  >
                    Kayıt Ol
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Sidebar */}
      <div className={`fixed inset-0 z-40 md:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setSidebarOpen(false)}></div>
        <nav className="fixed top-0 left-0 bottom-0 w-64 bg-white dark:bg-gray-800 shadow-xl transform transition-transform duration-300 ease-in-out">
          <div className="p-6">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-3 cursor-pointer" onClick={() => { navigate('/dashboard'); setSidebarOpen(false); }}>
                <div className="w-10 h-10 rounded-xl overflow-hidden shadow-sm">
                  <img 
                    src={bincardLogo} 
                    alt="BinCard Logo" 
                    className="w-full h-full object-cover hover:scale-110 transition-transform duration-200"
                  />
                </div>
                <h2 className="text-lg font-bold text-[#005bac] hover:text-[#004690] transition-colors duration-200">BinCard</h2>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1 rounded-md text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-2">
              {menuItems.map((item) => (
                <button
                  key={item.key}
                  onClick={() => handleNavigation(item)}
                  className={`w-full flex items-center space-x-3 px-3 py-3 rounded-lg text-left transition-colors ${
                    activeTab === item.key
                      ? 'bg-[#005bac] text-white'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <span className="text-lg">{item.icon}</span>
                  <span className="font-medium">{item.text}</span>
                </button>
              ))}
              
              {/* Profil Ayarları - Mobilde */}
              {isAuthenticated && (
                <button
                  onClick={() => { handleNavigation({ key: 'settings', path: 'settings' }); setSidebarOpen(false); }}
                  className={`w-full flex items-center space-x-3 px-3 py-3 rounded-lg text-left transition-colors ${
                    activeTab === 'settings'
                      ? 'bg-[#005bac] text-white'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <span className="text-lg">👤</span>
                  <span className="font-medium">Profil</span>
                </button>
              )}
            </div>
          </div>
        </nav>
      </div>

      {/* Main Content */}
      <div className="pt-16">
        {renderContent()}
      </div>

      {/* Haber Detay Modal */}
      {isNewsModalOpen && selectedNews && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 news-modal flex items-center justify-center z-50 p-4"
          onClick={closeNewsModal}
        >
          <div 
            className="bg-white dark:bg-gray-800 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto news-modal-content shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Haber Detayı</h2>
              <button
                onClick={closeNewsModal}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {/* Haber Görseli */}
              <div className="relative h-64 sm:h-80 mb-6 rounded-xl overflow-hidden">
                <img
                  src={selectedNews.imageUrl || selectedNews.image || selectedNews.thumbnail || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjQwMCIgdmlld0JveD0iMCAwIDgwMCA0MDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI4MDAiIGhlaWdodD0iNDAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0zNzUgMTcwSDQyNVYyMzBIMzc1VjE3MFoiIGZpbGw9IiM5Q0EzQUYiLz4KPHBhdGggZD0iTTM1MCAyMDBIMzc1VjIzMEgzNTBWMjAwWiIgZmlsbD0iIzlDQTNBRiIvPgo8L3N2Zz4K'}
                  alt={selectedNews.title}
                  className="w-full h-full object-cover"
                  onLoad={(e) => {
                    console.log(`✅ Modal resim başarıyla yüklendi: ${e.target.src}`);
                  }}
                  onError={(e) => {
                    console.error(`❌ Modal resim yüklenemedi: ${e.target.src}`);
                    console.log('🔄 Modal varsayılan resme geçiliyor...');
                    e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjQwMCIgdmlld0JveD0iMCAwIDgwMCA0MDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI4MDAiIGhlaWdodD0iNDAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0zNzUgMTcwSDQyNVYyMzBIMzc1VjE3MFoiIGZpbGw9IiM5Q0EzQUYiLz4KPHBhdGggZD0iTTM1MCAyMDBIMzc1VjIzMEgzNTBWMjAwWiIgZmlsbD0iIzlDQTNBRiIvPgo8L3N2Zz4K';
                  }}
                />
              </div>

              {/* Haber Bilgileri */}
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <span className="px-3 py-1 bg-[#005bac] text-white text-sm font-medium rounded-full">
                    {selectedNews.category || selectedNews.type || 'Genel'}
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {new Date(selectedNews.publishDate || selectedNews.createdAt || Date.now()).toLocaleDateString('tr-TR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-4">
                  {selectedNews.title}
                </h1>
                <p className="text-lg text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
                  {selectedNews.summary}
                </p>
              </div>

              {/* Haber İçeriği */}
              <div className="prose prose-lg max-w-none dark:prose-invert">
                <div 
                  className="text-gray-700 dark:text-gray-300 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: selectedNews.content || selectedNews.summary }}
                />
              </div>

              {/* Paylaş Butonları */}
              <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Bu haberi paylaş</h3>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      const url = window.location.href;
                      const text = `${selectedNews.title} - BinCard Haberler`;
                      if (navigator.share) {
                        navigator.share({ title: text, url });
                      } else {
                        navigator.clipboard.writeText(`${text} ${url}`);
                        toast.success('Link kopyalandı!');
                      }
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-[#005bac] text-white rounded-lg hover:bg-[#004690] transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                    </svg>
                    Paylaş
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// KonyaKart stilinde Ana Dashboard Bileşeni
const DashboardHome = ({ isAuthenticated, walletData, isLoadingWallet, user, onNewsClick }) => {
  const navigate = useNavigate();
  const [newsData, setNewsData] = useState([]);
  const [newsLoading, setNewsLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  
  // Ödeme noktaları için state'ler (Marketler)
  const [paymentPoints, setPaymentPoints] = useState([]);
  const [paymentPointsLoading, setPaymentPointsLoading] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);

  // Debug için state değişimlerini takip et
  useEffect(() => {
    console.log('🔍 Dashboard - PaymentPoints state değişti:', {
      count: paymentPoints.length,
      loading: paymentPointsLoading,
      location: userLocation,
      error: locationError
    });
  }, [paymentPoints, paymentPointsLoading, userLocation, locationError]);
  
  // Nokta navigasyon için state'ler
  const [activeSection, setActiveSection] = useState('hero');
  const sectionRefs = {
    hero: React.useRef(null),
    news: React.useRef(null),
    summary: React.useRef(null),
    pricing: React.useRef(null),
    actions: React.useRef(null),
    paymentPoints: React.useRef(null),
    transactions: React.useRef(null),
    features: React.useRef(null)
  };

  // Haberler için API çağrısı
  useEffect(() => {
    const fetchNews = async () => {
      try {
        setNewsLoading(true);
        // NewsService kullanarak aktif haberler çek
        const data = await NewsService.getActiveNews(0, 5); // İlk 5 haberi al
        console.log('📰 Dashboard - Gelen haber verisi:', data);
        if (Array.isArray(data)) {
          // Her haberin resim URL'sini kontrol et
          data.forEach((news, index) => {
            console.log(`📸 Haber ${index + 1} resim bilgileri:`, {
              id: news.id,
              title: news.title,
              image: news.image,
              imageUrl: news.imageUrl,
              thumbnail: news.thumbnail
            });
          });
          setNewsData(data);
        } else {
          console.warn('News data format error:', data);
          setNewsData([]);
        }
      } catch (error) {
        console.error('Haberler yüklenirken hata oluştu:', error);
        setNewsData([]);
      } finally {
        setNewsLoading(false);
      }
    };

    fetchNews();
  }, []);

  // Kullanıcı konumunu al
  useEffect(() => {
    const getUserLocation = () => {
      console.log('🌍 Dashboard - Konum bilgisi alınmaya çalışılıyor...');
      
      if (navigator.geolocation) {
        console.log('✅ Dashboard - Geolocation API mevcut');
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const location = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude
            };
            console.log('✅ Dashboard - Kullanıcı konumu başarıyla alındı:', location);
            setUserLocation(location);
            setLocationError(null);
          },
          (error) => {
            console.error('❌ Dashboard - Konum alınamadı:', error);
            console.log('🔧 Dashboard - Varsayılan Bingöl koordinatları kullanılıyor...');
            setLocationError(`Konum hatası: ${error.message}`);
            // Varsayılan Bingöl koordinatları
            const defaultLocation = {
              latitude: 39.0626,
              longitude: 40.4984
            };
            console.log('📍 Dashboard - Varsayılan konum ayarlandı:', defaultLocation);
            setUserLocation(defaultLocation);
          },
          {
            enableHighAccuracy: true,
            timeout: 15000, // 15 saniye timeout
            maximumAge: 300000 // 5 dakika cache
          }
        );
      } else {
        console.warn('⚠️ Dashboard - Geolocation desteklenmiyor');
        setLocationError('Konum servisi desteklenmiyor');
        // Varsayılan Bingöl koordinatları
        const defaultLocation = {
          latitude: 39.0626,
          longitude: 40.4984
        };
        console.log('📍 Dashboard - Varsayılan konum ayarlandı (geolocation yok):', defaultLocation);
        setUserLocation(defaultLocation);
      }
    };

    getUserLocation();
  }, []);

  // Marketleri getir
  useEffect(() => {
    const fetchPaymentPoints = async () => {
      if (!userLocation) {
        console.log('⏳ Kullanıcı konumu bekleniyor...');
        return;
      }
      
      try {
        setPaymentPointsLoading(true);
        console.log('🏪 Dashboard - Yakın marketler getiriliyor...', userLocation);
        
        const response = await PaymentPointService.getNearbyPaymentPoints(
          userLocation.latitude,
          userLocation.longitude,
          10.0, // 10km yarıçap
          0, // sayfa
          12  // maksimum 12 market
        );
        
        console.log('🏪 Dashboard - API Response:', response);
        console.log('🏪 Dashboard - Success:', response?.success);
        console.log('🏪 Dashboard - Content:', response?.content);
        console.log('🏪 Dashboard - Content Length:', response?.content?.length);
        
        if (response && response.success && response.content && Array.isArray(response.content) && response.content.length > 0) {
          console.log('✅ Dashboard - Marketler bulundu, işleniyor...', response.content.length);
          
          // Her market için mesafe ve açık/kapalı durumu hesapla
          const processedPoints = response.content.map((point, index) => {
            console.log(`🔄 Dashboard - İşlenen market ${index + 1}:`, point.name);
            const processedPoint = {
              ...point,
              distance: point.latitude && point.longitude ? 
                PaymentPointService.calculateDistance(
                  userLocation.latitude,
                  userLocation.longitude,
                  point.latitude,
                  point.longitude
                ) : null,
              isOpen: PaymentPointService.isOpen(point.workingHours)
            };
            console.log(`✅ Dashboard - İşlenmiş market ${index + 1}:`, processedPoint);
            return processedPoint;
          });
          
          console.log('✅ Dashboard - Tüm işlenmiş marketler:', processedPoints);
          setPaymentPoints(processedPoints);
        } else {
          console.warn('⚠️ Dashboard - API response boş veya format hatası:', response);
          console.log('🔧 Dashboard - Demo verilerle test ediliyor...');
          
          // Demo marketler (gerçek veriler gelmiyorsa)
          const demoMarkets = [
            {
              id: 'demo-1',
              name: 'CarrefourSA Market',
              address: 'Bahçelievler Mah. Atatürk Cad. No:45 Merkez/Bingöl',
              latitude: 39.0656,
              longitude: 40.5014,
              workingHours: '08:00 - 22:00',
              paymentMethods: ['CREDIT_CARD', 'DEBIT_CARD', 'CASH'],
              isActive: true
            },
            {
              id: 'demo-2',
              name: 'Migros Market',
              address: 'Cumhuriyet Mah. İnönü Cad. No:23 Merkez/Bingöl',
              latitude: 39.0626,
              longitude: 40.4984,
              workingHours: '09:00 - 21:00',
              paymentMethods: ['CREDIT_CARD', 'DEBIT_CARD'],
              isActive: true
            },
            {
              id: 'demo-3',
              name: 'A101 Market',
              address: 'Yenişehir Mah. Cumhuriyet Cad. No:67 Merkez/Bingöl',
              latitude: 39.0596,
              longitude: 40.4954,
              workingHours: '07:00 - 23:00',
              paymentMethods: ['CREDIT_CARD', 'DEBIT_CARD', 'CASH'],
              isActive: true
            },
            {
              id: 'demo-4',
              name: 'ŞOK Market',
              address: 'Kültür Mah. Gazi Cad. No:89 Merkez/Bingöl',
              latitude: 39.0666,
              longitude: 40.5024,
              workingHours: '07:30 - 22:30',
              paymentMethods: ['CREDIT_CARD', 'DEBIT_CARD', 'CASH'],
              isActive: true
            },
            {
              id: 'demo-5',
              name: 'BİM Market',
              address: 'Saray Mah. Mehmet Akif Cad. No:12 Merkez/Bingöl',
              latitude: 39.0636,
              longitude: 40.4994,
              workingHours: '08:30 - 21:30',
              paymentMethods: ['CREDIT_CARD', 'DEBIT_CARD', 'CASH'],
              isActive: true
            },
            {
              id: 'demo-6',
              name: 'Yeni İpek Market',
              address: 'Yenişehir Mah. Belediye Cad. No:34 Merkez/Bingöl',
              latitude: 39.0606,
              longitude: 40.4974,
              workingHours: '06:00 - 24:00',
              paymentMethods: ['CREDIT_CARD', 'CASH'],
              isActive: true
            }
          ];
          
          const processedDemoPoints = demoMarkets.map(point => ({
            ...point,
            distance: PaymentPointService.calculateDistance(
              userLocation.latitude,
              userLocation.longitude,
              point.latitude,
              point.longitude
            ),
            isOpen: PaymentPointService.isOpen(point.workingHours)
          }));
          
          console.log('✅ Dashboard - Demo marketler yüklendi:', processedDemoPoints);
          setPaymentPoints(processedDemoPoints);
        }
      } catch (error) {
        console.error('❌ Dashboard - Marketler yüklenirken hata:', error);
        console.error('❌ Dashboard - Error details:', error.message);
        
        // Network hatası varsa demo veriler kullan
        console.log('🌐 Dashboard - Network hatası tespit edildi, demo veriler yükleniyor...');
        
        const demoMarkets = [
          {
            id: 'demo-1',
            name: 'CarrefourSA Market',
            address: 'Bahçelievler Mah. Atatürk Cad. No:45 Merkez/Bingöl',
            latitude: 39.0656,
            longitude: 40.5014,
            workingHours: '08:00 - 22:00',
            paymentMethods: ['CREDIT_CARD', 'DEBIT_CARD', 'CASH'],
            isActive: true
          },
          {
            id: 'demo-2',
            name: 'Migros Market',
            address: 'Cumhuriyet Mah. İnönü Cad. No:23 Merkez/Bingöl',
            latitude: 39.0626,
            longitude: 40.4984,
            workingHours: '09:00 - 21:00',
            paymentMethods: ['CREDIT_CARD', 'DEBIT_CARD'],
            isActive: true
          },
          {
            id: 'demo-3',
            name: 'A101 Market',
            address: 'Yenişehir Mah. Cumhuriyet Cad. No:67 Merkez/Bingöl',
            latitude: 39.0596,
            longitude: 40.4954,
            workingHours: '07:00 - 23:00',
            paymentMethods: ['CREDIT_CARD', 'DEBIT_CARD', 'CASH'],
            isActive: true
          },
          {
            id: 'demo-4',
            name: 'ŞOK Market',
            address: 'Kültür Mah. Gazi Cad. No:89 Merkez/Bingöl',
            latitude: 39.0666,
            longitude: 40.5024,
            workingHours: '07:30 - 22:30',
            paymentMethods: ['CREDIT_CARD', 'DEBIT_CARD', 'CASH'],
            isActive: true
          },
          {
            id: 'demo-5',
            name: 'BİM Market',
            address: 'Saray Mah. Mehmet Akif Cad. No:12 Merkez/Bingöl',
            latitude: 39.0636,
            longitude: 40.4994,
            workingHours: '08:30 - 21:30',
            paymentMethods: ['CREDIT_CARD', 'DEBIT_CARD', 'CASH'],
            isActive: true
          }
        ];
        
        const processedDemoPoints = demoMarkets.map(point => ({
          ...point,
          distance: PaymentPointService.calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            point.latitude,
            point.longitude
          ),
          isOpen: PaymentPointService.isOpen(point.workingHours)
        }));
        
        console.log('✅ Dashboard - Demo marketler hata nedeniyle yüklendi:', processedDemoPoints);
        setPaymentPoints(processedDemoPoints);
      } finally {
        console.log('🏁 Dashboard - Market yükleme işlemi tamamlandı');
        setPaymentPointsLoading(false);
      }
    };

    // Konum varsa marketleri getir
    if (userLocation) {
      console.log('🌍 Dashboard - Kullanıcı konumu mevcut, marketler getiriliyor...', userLocation);
      fetchPaymentPoints();
    } else {
      console.log('⏳ Dashboard - Kullanıcı konumu bekleniyor...');
    }
  }, [userLocation]);

  // Otomatik slider
  useEffect(() => {
    if (newsData.length > 1) {
      const interval = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % newsData.length);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [newsData.length]);

  // Slider navigation
  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % newsData.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + newsData.length) % newsData.length);
  };

  const goToSlide = (index) => {
    setCurrentSlide(index);
  };

  // Auth gerektiren işlemler için kontrol fonksiyonu
  const handleAuthRequired = (action, path) => {
    if (!AuthService.requireAuth(navigate)) {
      toast.warning(`${action} için giriş yapmanız gerekiyor`, {
        position: 'top-center',
        autoClose: 3000
      });
      return false;
    }
    navigate(path);
    return true;
  };

  // Section navigasyon fonksiyonları
  const scrollToSection = (sectionId) => {
    const sectionRef = sectionRefs[sectionId];
    if (sectionRef && sectionRef.current) {
      sectionRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
      setActiveSection(sectionId);
    }
  };

  // Scroll listener to update active section
  useEffect(() => {
    const handleScroll = () => {
      const sections = Object.keys(sectionRefs);
      const scrollPosition = window.scrollY + window.innerHeight / 3; // 1/3 viewport height offset

      let newActiveSection = sections[0]; // Default to first section

      for (let i = 0; i < sections.length; i++) {
        const section = sections[i];
        const ref = sectionRefs[section];
        if (ref && ref.current) {
          const sectionTop = ref.current.offsetTop;
          const sectionHeight = ref.current.offsetHeight;
          const sectionBottom = sectionTop + sectionHeight;

          if (scrollPosition >= sectionTop && scrollPosition < sectionBottom) {
            newActiveSection = section;
            break;
          }
        }
      }

      setActiveSection(newActiveSection);
    };

    // Initial check
    handleScroll();

    // Throttle scroll events for better performance
    let ticking = false;
    const throttledHandleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', throttledHandleScroll);
    return () => window.removeEventListener('scroll', throttledHandleScroll);
  }, []);

  // Mouse wheel navigation - yavaş geçişler için
  useEffect(() => {
    let wheelTimeout;
    let isWheelNavigating = false;

    const handleWheel = (e) => {
      // Sadece desktop'ta aktif
      if (window.innerWidth < 1024) return;
      
      // Eğer zaten wheel navigasyonu aktifse, ignore et
      if (isWheelNavigating) {
        e.preventDefault();
        return;
      }

      const sections = Object.keys(sectionRefs);
      const currentIndex = sections.indexOf(activeSection);
      
      // Wheel timeout'u temizle
      clearTimeout(wheelTimeout);
      
      // Aşağı kaydırma (deltaY > 0)
      if (e.deltaY > 0 && currentIndex < sections.length - 1) {
        e.preventDefault();
        isWheelNavigating = true;
        
        const nextSection = sections[currentIndex + 1];
        scrollToSection(nextSection);
        
        // 1.5 saniye sonra wheel navigasyonunu tekrar aktifleştir
        wheelTimeout = setTimeout(() => {
          isWheelNavigating = false;
        }, 1500);
      }
      // Yukarı kaydırma (deltaY < 0)
      else if (e.deltaY < 0 && currentIndex > 0) {
        e.preventDefault();
        isWheelNavigating = true;
        
        const prevSection = sections[currentIndex - 1];
        scrollToSection(prevSection);
        
        // 1.5 saniye sonra wheel navigasyonunu tekrar aktifleştir
        wheelTimeout = setTimeout(() => {
          isWheelNavigating = false;
        }, 1500);
      }
    };

    // Passive: false ile wheel event'i dinle ki preventDefault çalışsın
    window.addEventListener('wheel', handleWheel, { passive: false });
    
    return () => {
      window.removeEventListener('wheel', handleWheel);
      clearTimeout(wheelTimeout);
    };
  }, [activeSection]); // activeSection değiştiğinde yeniden attach et

  // Section definitions for navigation
  const sections = [
    { id: 'hero', label: 'Ana Sayfa', icon: '🏠' },
    { id: 'news', label: 'Haberler', icon: '📰' },
    { id: 'summary', label: 'Özet Bilgiler', icon: '📊' },
    { id: 'pricing', label: 'Ücretler', icon: '💳' },
    { id: 'actions', label: 'Hızlı İşlemler', icon: '⚡' },
    { id: 'paymentPoints', label: 'Yakın Marketler', icon: '🏪' },
    ...(isAuthenticated ? [{ id: 'transactions', label: 'Son İşlemler', icon: '📋' }] : []),
    ...(!isAuthenticated ? [{ id: 'features', label: 'Özellikler', icon: '✨' }] : [])
  ];

  // Bakiye formatını düzenle
  const formatBalance = (balance) => {
    if (balance === null || balance === undefined) return '₺0,00';
    return `₺${parseFloat(balance).toFixed(2).replace('.', ',')}`;
  };

  // Ana kart verileri
  const mainCards = [
    {
      title: 'Bakiye',
      value: isAuthenticated 
        ? isLoadingWallet 
          ? 'Yükleniyor...' 
          : walletData 
            ? formatBalance(walletData.balance || walletData.totalBalance || walletData.amount || 0)
            : '₺0,00'
        : 'Giriş Yapın',
      icon: '�',
      color: 'bg-gradient-to-br from-[#005bac] to-[#004690]',
      onClick: () => isAuthenticated ? navigate('/wallet') : navigate('/login')
    },
    {
      title: 'Aktif Kartlar',
      value: isAuthenticated ? '2 Kart' : '--',
      icon: '🎫',
      color: 'bg-gradient-to-br from-[#1e40af] to-[#1d4ed8]',
      onClick: () => isAuthenticated ? navigate('/wallet') : navigate('/login')
    },
    {
      title: 'Puanlar',
      value: isAuthenticated ? '1,240' : '--',
      icon: '⭐',
      color: 'bg-gradient-to-br from-[#2563eb] to-[#3b82f6]',
      onClick: () => isAuthenticated ? navigate('/wallet') : navigate('/login')
    },
    {
      title: 'Bu Ay',
      value: isAuthenticated ? '42 Yolculuk' : '--',
      icon: '🚌',
      color: 'bg-gradient-to-br from-[#3b82f6] to-[#60a5fa]',
      onClick: () => isAuthenticated ? navigate('/history') : navigate('/login')
    }
  ];

  // Hızlı işlemler
  const quickActions = [
    {
      title: 'Bakiye Yükle',
      description: 'Kartınıza hızlıca bakiye yükleyin',
      icon: '💰',
      action: () => isAuthenticated ? navigate('/balance-topup') : navigate('/login')
    },
    {
      title: 'Ödeme Noktaları',
      description: 'Yakındaki marketleri keşfedin',
      icon: '🏪',
      action: () => navigate('/payment-points')
    },
    {
      title: 'İşlem Geçmişi',
      description: 'Geçmiş işlemlerinizi görüntüleyin',
      icon: '�',
      action: () => isAuthenticated ? navigate('/history') : navigate('/login')
    },
    {
      title: 'Destek Al',
      description: 'Yardım ve geri bildirim',
      icon: '�',
      action: () => navigate('/feedback')
    }
  ];

  const recentTransactions = [
    { id: 1, type: 'Otobüs Bilet', amount: '-₺4,25', date: '15 Ara', location: 'Karatay - Selçuklu' },
    { id: 2, type: 'Bakiye Yükleme', amount: '+₺50,00', date: '14 Ara', location: 'Online' },
    { id: 3, type: 'Otobüs Bilet', amount: '-₺4,25', date: '14 Ara', location: 'Selçuklu - Meram' },
    { id: 4, type: 'Otobüs Bilet', amount: '-₺4,25', date: '13 Ara', location: 'Meram - Karatay' },
  ];
  
  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      {/* Nokta Navigasyon Menüsü - Desktop */}
      <div className="dot-navigation fixed right-6 top-1/2 transform -translate-y-1/2 z-50 hidden lg:block">
        <div className="flex flex-col space-y-3">
          {sections.map((section, index) => (
            <div key={section.id} className="relative group">
              <button
                onClick={() => scrollToSection(section.id)}
                data-active={activeSection === section.id}
                className={`relative w-4 h-4 rounded-full transition-all duration-300 border-2 ${
                  activeSection === section.id
                    ? 'bg-[#005bac] border-[#005bac] scale-125'
                    : 'bg-transparent border-gray-400 dark:border-gray-500 hover:border-[#005bac] hover:scale-110'
                }`}
                title={section.label}
              >
                {/* İç nokta - aktif durumda */}
                {activeSection === section.id && (
                  <div className="absolute inset-1 bg-white rounded-full"></div>
                )}
              </button>
              
              {/* Tooltip - TUSAŞ stilinde */}
              <div className="absolute right-8 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                <div className="bg-[#005bac] text-white text-xs px-3 py-2 rounded-md whitespace-nowrap font-medium shadow-lg">
                  <span className="mr-1">{section.icon}</span>
                  {section.label}
                  {/* Ok işareti */}
                  <div className="absolute left-full top-1/2 transform -translate-y-1/2 w-0 h-0 border-t-4 border-b-4 border-l-4 border-transparent border-l-[#005bac]"></div>
                </div>
              </div>
              
              {/* Bağlantı çizgisi - TUSAŞ stilinde */}
              {index < sections.length - 1 && (
                <div className="connection-line absolute top-full left-1/2 transform -translate-x-1/2 w-px h-3 bg-gray-300 dark:bg-gray-600"></div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Mobil Navigasyon Menüsü - Bottom Float */}
      <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 block lg:hidden">
        <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-full px-4 py-2 shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="flex space-x-4">
            {sections.slice(0, 5).map((section) => (
              <button
                key={section.id}
                onClick={() => scrollToSection(section.id)}
                className={`mobile-nav-button w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                  activeSection === section.id
                    ? 'bg-[#005bac] text-white scale-110'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-[#005bac]/60 hover:text-white'
                }`}
                title={section.label}
              >
                <span className="text-xs">{section.icon}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <section 
        ref={sectionRefs.hero}
        className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 transition-colors duration-300"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4 fade-in">
              {isAuthenticated 
                ? `Hoş Geldin${user?.firstName ? `, ${user.firstName}` : ''}!` 
                : 'BinCard ile Şehri Keşfedin'
              }
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto fade-in">
              {isAuthenticated 
                ? 'Akıllı ulaşım kartınızı kolayca yönetin, bakiye yükleyin ve işlemlerinizi takip edin.'
                : 'Akıllı ulaşım kartı sistemi ile şehir içi ulaşımda konfor ve kolaylık yaşayın. Hemen üye olun ve avantajlardan yararlanın.'
              }
            </p>
            {!isAuthenticated && (
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center fade-in">
                <button 
                  onClick={() => navigate('/register')}
                  className="btn-primary"
                >
                  Hemen Kayıt Ol
                </button>
                <button 
                  onClick={() => navigate('/login')}
                  className="btn-outline"
                >
                  Giriş Yap
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Haber Slider */}
        <section ref={sectionRefs.news} className="mb-12 slide-up">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Güncel Haberler</h2>
            <button 
              onClick={() => navigate('/news')}
              className="text-[#005bac] hover:text-[#004690] font-medium transition-colors duration-200 flex items-center gap-2"
            >
              Tümünü Gör
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          
          <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-gray-800 shadow-lg">
            {newsLoading ? (
              <div className="h-80 flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-700">
                <div className="spinner mb-4"></div>
                <span className="text-gray-600 dark:text-gray-300 font-medium">Haberler yükleniyor...</span>
                <span className="text-gray-500 dark:text-gray-400 text-sm mt-1">Lütfen bekleyiniz</span>
              </div>
            ) : newsData.length > 0 ? (
              <>
                {/* Slider Container */}
                <div 
                  className="flex transition-transform duration-500 ease-in-out"
                  style={{ transform: `translateX(-${currentSlide * 100}%)` }}
                >
                  {newsData.map((news, index) => (
                    <div key={news.id} className="w-full flex-shrink-0">
                      <div 
                        className="relative h-80 cursor-pointer hover:scale-[1.02] transition-transform duration-300"
                        onClick={() => onNewsClick && onNewsClick(news)}
                      >
                        <img 
                          src={news.imageUrl || news.image || news.thumbnail || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjQwMCIgdmlld0JveD0iMCAwIDgwMCA0MDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI4MDAiIGhlaWdodD0iNDAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0zNzUgMTcwSDQyNVYyMzBIMzc1VjE3MFoiIGZpbGw9IiM5Q0EzQUYiLz4KPHBhdGggZD0iTTM1MCAyMDBIMzc1VjIzMEgzNTBWMjAwWiIgZmlsbD0iIzlDQTNBRiIvPgo8L3N2Zz4K'} 
                          alt={news.title}
                          className="w-full h-full object-cover"
                          onLoad={(e) => {
                            console.log(`✅ Resim başarıyla yüklendi: ${e.target.src}`);
                          }}
                          onError={(e) => {
                            console.error(`❌ Resim yüklenemedi: ${e.target.src}`);
                            console.log('🔄 Varsayılan resme geçiliyor...');
                            e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjQwMCIgdmlld0JveD0iMCAwIDgwMCA0MDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI4MDAiIGhlaWdodD0iNDAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0zNzUgMTcwSDQyNVYyMzBIMzc1VjE3MFoiIGZpbGw9IiM5Q0EzQUYiLz4KPHBhdGggZD0iTTM1MCAyMDBIMzc1VjIzMEgzNTBWMjAwWiIgZmlsbD0iIjlDQTNBRiIvPgo8L3N2Zz4K';
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
                        <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                          <div className="flex items-center gap-3 mb-3">
                            <span className="px-3 py-1 bg-[#005bac] text-white text-sm font-medium rounded-full">
                              {news.category || news.type || 'Genel'}
                            </span>
                            <span className="text-sm text-gray-200">
                              {new Date(news.publishDate || news.createdAt || Date.now()).toLocaleDateString('tr-TR')}
                            </span>
                          </div>
                          <h3 className="text-2xl font-bold mb-2 line-clamp-2">{news.title}</h3>
                          <p className="text-gray-200 line-clamp-2">{news.summary || news.content}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Navigation Arrows */}
                {newsData.length > 1 && (
                  <>
                    <button
                      onClick={prevSlide}
                      className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/90 dark:bg-gray-800/90 hover:bg-white dark:hover:bg-gray-800 text-gray-800 dark:text-white rounded-full p-2 shadow-lg transition-all duration-200 hover:scale-110"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <button
                      onClick={nextSlide}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/90 dark:bg-gray-800/90 hover:bg-white dark:hover:bg-gray-800 text-gray-800 dark:text-white rounded-full p-2 shadow-lg transition-all duration-200 hover:scale-110"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </>
                )}

                {/* Dots Indicator */}
                {newsData.length > 1 && (
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
                    {newsData.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => goToSlide(index)}
                        className={`w-3 h-3 rounded-full transition-all duration-200 ${
                          index === currentSlide 
                            ? 'bg-white shadow-lg scale-110' 
                            : 'bg-white/50 hover:bg-white/80'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="h-80 flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-700">
                <svg className="w-16 h-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                </svg>
                <p className="text-gray-600 dark:text-gray-300 text-lg font-medium mb-2">Henüz haber bulunmuyor</p>
                <p className="text-gray-500 dark:text-gray-400 text-sm">Yakında güncel haberler burada görünecek</p>
              </div>
            )}
          </div>
        </section>

        {/* Ana Kartlar */}
        <section ref={sectionRefs.summary} className="mb-12 slide-up">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Özet Bilgiler</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {mainCards.map((card, index) => (
              <div 
                key={card.title}
                className={`card card-hover ${card.color} text-white p-6 cursor-pointer transform transition-all duration-200`}
                onClick={card.onClick}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="text-3xl">{card.icon}</div>
                  <div className="text-white/80">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-white/90 mb-2">{card.title}</h3>
                <p className="text-2xl font-bold">{card.value}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Kart Fiyatlandırması */}
        <section ref={sectionRefs.pricing} className="mb-12 slide-up">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">BinCard Kullanım Ücretleri</h2>
            <p className="text-gray-600 dark:text-gray-400">Şehiriçi Ulaşım Ücretleri</p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Tam BinCard */}
            <div className="pricing-card card bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="p-6 text-center">
                <div className="pricing-card-icon w-16 h-16 mx-auto mb-4 bg-[#005bac] rounded-2xl flex items-center justify-center shadow-lg">
                  <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/>
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Tam BinCard</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
                  Herhangi bir BinCard yükleme noktasından ücret karşılığında temin edilebilir.
                </p>
                <div className="text-3xl font-bold text-[#005bac] dark:text-blue-400 mb-2">17,50 TL</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Kart Ücreti</div>
              </div>
            </div>

            {/* İndirimli BinCard */}
            <div className="pricing-card card bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="p-6 text-center">
                <div className="pricing-card-icon w-16 h-16 mx-auto mb-4 bg-gray-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">İndirimli BinCard</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
                  BinCard Şube Müdürlüğünden ya da BinCard web sayfasından temin edilebilir.
                </p>
                <div className="text-3xl font-bold text-gray-600 dark:text-gray-400 mb-2">6,75 TL</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Öğrenci/65+ Yaş</div>
              </div>
            </div>

            {/* Tam Abonman */}
            <div className="pricing-card card bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="p-6 text-center">
                <div className="pricing-card-icon w-16 h-16 mx-auto mb-4 bg-green-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/>
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Tam Abonman</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
                  BinCard Şube Müdürlüğünden ya da BinCard web sayfasından temin edilebilir.
                </p>
                <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-2">900,00 TL</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Aylık Abonman</div>
              </div>
            </div>

            {/* İndirimli Abonman */}
            <div className="pricing-card card bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="p-6 text-center">
                <div className="pricing-card-icon w-16 h-16 mx-auto mb-4 bg-amber-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">İndirimli Abonman</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
                  BinCard Şube Müdürlüğünden ya da BinCard web sayfasından temin edilebilir.
                </p>
                <div className="text-3xl font-bold text-amber-600 dark:text-amber-400 mb-2">290,00 TL</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Öğrenci Abonman</div>
              </div>
            </div>
          </div>

          {/* Ek Bilgiler */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="card p-6 border-l-4 border-l-[#005bac]">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                <svg className="w-5 h-5 text-[#005bac] mr-2" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
                Avantajlar
              </h4>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li className="flex items-center">
                  <span className="w-1.5 h-1.5 bg-[#005bac] rounded-full mr-2"></span>
                  Temassız ödeme teknolojisi
                </li>
                <li className="flex items-center">
                  <span className="w-1.5 h-1.5 bg-[#005bac] rounded-full mr-2"></span>
                  Online bakiye yükleme
                </li>
                <li className="flex items-center">
                  <span className="w-1.5 h-1.5 bg-[#005bac] rounded-full mr-2"></span>
                  İşlem geçmişi takibi
                </li>
                <li className="flex items-center">
                  <span className="w-1.5 h-1.5 bg-[#005bac] rounded-full mr-2"></span>
                  Kayıp/çalınma koruması
                </li>
              </ul>
            </div>

            <div className="card p-6 border-l-4 border-l-green-500">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
                </svg>
                Başvuru Şartları
              </h4>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li className="flex items-center">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-2"></span>
                  T.C. kimlik numarası
                </li>
                <li className="flex items-center">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-2"></span>
                  Güncel fotoğraf
                </li>
                <li className="flex items-center">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-2"></span>
                  İndirimli kartlar için belge
                </li>
                <li className="flex items-center">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-2"></span>
                  Online başvuru mümkün
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Hızlı İşlemler */}
        <section ref={sectionRefs.actions} className="mb-12 slide-up">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Hızlı İşlemler</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {quickActions.map((action, index) => (
              <div 
                key={action.title}
                className="card card-hover p-6 cursor-pointer group"
                onClick={action.action}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-200">
                  {action.icon}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{action.title}</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">{action.description}</p>
                <div className="mt-4 text-[#005bac] font-medium group-hover:translate-x-1 transition-transform duration-200">
                  İlerle →
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Yakın Marketler */}
        <section ref={sectionRefs.paymentPoints} className="mb-12 slide-up">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Yakındaki Marketler</h2>
            <button 
              onClick={() => navigate('/payment-points')}
              className="text-[#005bac] hover:text-[#004690] font-medium transition-colors duration-200 flex items-center gap-2"
            >
              Tümünü Gör
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {paymentPointsLoading ? (
            <div className="card p-8">
              <div className="flex flex-col items-center justify-center">
                <div className="spinner mb-4"></div>
                <span className="text-gray-600 dark:text-gray-300 font-medium">Marketler yükleniyor...</span>
                <span className="text-gray-500 dark:text-gray-400 text-sm mt-1">Konum bilgisi alınıyor</span>
              </div>
            </div>
          ) : paymentPoints.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paymentPoints.slice(0, 3).map((point, index) => (
                <div 
                  key={point.id}
                  className="card card-hover p-6 cursor-pointer group"
                  onClick={() => navigate('/payment-points')}
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl">🏪</span>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white line-clamp-1">
                          {point.name}
                        </h3>
                      </div>
                      <p className="text-gray-600 dark:text-gray-400 text-sm mb-2 line-clamp-2">
                        {point.address}
                      </p>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-500 dark:text-gray-400">📍</span>
                        <span className="text-gray-600 dark:text-gray-300">
                          {point.distance ? `${point.distance.toFixed(1)} km` : 'Mesafe hesaplanıyor...'}
                        </span>
                      </div>
                    </div>
                    <div className="flex-shrink-0 ml-4">
                      {point.isOpen ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                          🟢 Açık
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                          🔴 Kapalı
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {point.workingHours && (
                    <div className="mb-3">
                      <span className="text-xs text-gray-500 dark:text-gray-400">⏰ Çalışma Saatleri:</span>
                      <p className="text-sm text-gray-600 dark:text-gray-300">{point.workingHours}</p>
                    </div>
                  )}

                  {point.paymentMethods && point.paymentMethods.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {PaymentPointService.formatPaymentMethods(point.paymentMethods.slice(0, 3)).map((method, idx) => (
                        <span 
                          key={idx}
                          className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                        >
                          💳 {method}
                        </span>
                      ))}
                      {point.paymentMethods.length > 3 && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          +{point.paymentMethods.length - 3} daha
                        </span>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-4">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (userLocation && point.latitude && point.longitude) {
                          const mapsUrl = `https://www.google.com/maps/dir/${userLocation.latitude},${userLocation.longitude}/${point.latitude},${point.longitude}`;
                          window.open(mapsUrl, '_blank');
                        }
                      }}
                      className="text-[#005bac] hover:text-[#004690] font-medium text-sm transition-colors flex items-center gap-1"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      📍 Yol Tarifi
                    </button>
                    
                    <span className="text-[#005bac] font-medium group-hover:translate-x-1 transition-transform duration-200">
                      🏪 Detaylar →
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="card p-8">
              <div className="text-center">
                <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 flex items-center justify-center gap-2">
                  <span>🏪</span>
                  Yakınlarda Market Bulunamadı
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  {locationError ? 
                    `Konum hatası: ${locationError}` : 
                    'Şu anda yakınınızda BinCard kabul eden market bulunmuyor.'}
                </p>
                <div className="space-y-2 mb-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    📍 Arama yapılan konum: {userLocation ? 
                      `${userLocation.latitude.toFixed(4)}, ${userLocation.longitude.toFixed(4)}` : 
                      'Konum alınamadı'}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    🔍 Arama yarıçapı: 10 km
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 justify-center">
                  <button 
                    onClick={() => {
                      console.log('🔄 Marketler yeniden yükleniyor...');
                      setPaymentPointsLoading(true);
                      // Konumu yeniden al ve marketleri getir
                      if (navigator.geolocation) {
                        navigator.geolocation.getCurrentPosition(
                          (position) => {
                            const location = {
                              latitude: position.coords.latitude,
                              longitude: position.coords.longitude
                            };
                            setUserLocation(location);
                          },
                          (error) => {
                            console.error('Konum alınamadı:', error);
                          }
                        );
                      }
                    }}
                    className="btn-outline"
                  >
                    🔄 Yeniden Dene
                  </button>
                  <button 
                    onClick={() => navigate('/payment-points')}
                    className="btn-primary"
                  >
                    🗺️ Tüm Marketleri Gör
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Basit Harita Görünümü */}
          {userLocation && paymentPoints.length > 0 && (
            <div className="mt-8">
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <span>🗺️</span>
                  Marketler Harita Görünümü
                  <span>🏪</span>
                </h3>
                <div className="relative bg-gray-100 dark:bg-gray-800 rounded-lg h-64 overflow-hidden">
                  <iframe
                    src={`https://www.google.com/maps/embed/v1/search?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dO9nzXLPbN4n4k&q=markets+supermarkets+near+${userLocation.latitude},${userLocation.longitude}&zoom=13`}
                    className="w-full h-full border-0"
                    loading="lazy"
                    allowFullScreen
                    title="Yakın Marketler Haritası"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  ></iframe>
                  <div 
                    className="absolute inset-0 bg-gray-100 dark:bg-gray-800 items-center justify-center flex-col hidden"
                  >
                    <span className="text-4xl mb-2">🏪</span>
                    <svg className="w-12 h-12 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m0 0L9 7" />
                    </svg>
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">🗺️ Harita yüklenemedi</p>
                    <button 
                      onClick={() => navigate('/payment-points')}
                      className="mt-2 text-[#005bac] hover:text-[#004690] font-medium text-sm"
                    >
                      🏪 Detaylı Market Haritası →
                    </button>
                  </div>
                </div>
                
                {/* Market Özet Bilgileri */}
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="text-2xl font-bold text-[#005bac] dark:text-blue-400">
                      {paymentPoints.length}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">🏪 Yakın Market</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {paymentPoints.filter(p => p.isOpen).length}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">🟢 Açık Market</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {paymentPoints.length > 0 ? 
                        `${Math.min(...paymentPoints.map(p => p.distance || 0)).toFixed(1)}km` : 
                        'N/A'
                      }
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">📍 En Yakın</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Son İşlemler - Sadece giriş yapmış kullanıcılar için */}
        {isAuthenticated && (
          <section ref={sectionRefs.transactions} className="slide-up">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Son İşlemler</h2>
              <button 
                onClick={() => navigate('/history')}
                className="text-[#005bac] hover:text-[#004690] font-medium transition-colors"
              >
                Tümünü Gör →
              </button>
            </div>
            <div className="card p-6">
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">İşlem</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Tutar</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Tarih</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Konum</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentTransactions.map((tx) => (
                      <tr key={tx.id} className="border-b border-gray-100 dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-medium text-gray-900 dark:text-white">{tx.type}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`font-semibold ${
                            tx.amount.startsWith('+') ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {tx.amount}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{tx.date}</td>
                        <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{tx.location}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* Giriş yapmamış kullanıcılar için bilgi kartları */}
        {!isAuthenticated && (
          <section ref={sectionRefs.features} className="slide-up">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Neden BinCard?</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="card p-6 text-center">
                <div className="text-4xl mb-4">🚀</div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Hızlı ve Kolay</h3>
                <p className="text-gray-600 dark:text-gray-400">Kartınızı okutun, yolculuğa başlayın. Hiç nakit para taşımaya gerek yok.</p>
              </div>
              <div className="card p-6 text-center">
                <div className="text-4xl mb-4">💰</div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Ekonomik</h3>
                <p className="text-gray-600 dark:text-gray-400">Nakit ödemeye göre daha uygun fiyatlarla şehir içi ulaşımın keyfini çıkarın.</p>
              </div>
              <div className="card p-6 text-center">
                <div className="text-4xl mb-4">📱</div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Dijital Takip</h3>
                <p className="text-gray-600 dark:text-gray-400">Bakiyenizi, işlemlerinizi ve yolculuk geçmişinizi online takip edin.</p>
              </div>
            </div>
          </section>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            
            {/* İletişim Bilgileri */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">İletişim</h3>
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <svg className="w-5 h-5 text-gray-500 dark:text-gray-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Bingöl Belediyesi<br />
                      Ulaştırma Hizmetleri Müdürlüğü<br />
                      Merkez/Bingöl
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <span className="text-sm text-gray-600 dark:text-gray-400">+90 426 213 10 00</span>
                </div>
                
                <div className="flex items-center space-x-3">
                  <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span className="text-sm text-gray-600 dark:text-gray-400">info@bingolkart.gov.tr</span>
                </div>
              </div>
            </div>

            {/* Hızlı Erişim - Haberler */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Haberler</h3>
              <ul className="space-y-2">
                <li>
                  <button 
                    onClick={() => navigate('/news')}
                    className="text-sm text-gray-600 dark:text-gray-400 hover:text-[#005bac] dark:hover:text-blue-400 transition-colors text-left"
                  >
                    Güncel Haberler
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => navigate('/news?category=DUYURU')}
                    className="text-sm text-gray-600 dark:text-gray-400 hover:text-[#005bac] dark:hover:text-blue-400 transition-colors text-left"
                  >
                    Duyurular
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => navigate('/news?category=KAMPANYA')}
                    className="text-sm text-gray-600 dark:text-gray-400 hover:text-[#005bac] dark:hover:text-blue-400 transition-colors text-left"
                  >
                    Kampanyalar
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => navigate('/feedback')}
                    className="text-sm text-gray-600 dark:text-gray-400 hover:text-[#005bac] dark:hover:text-blue-400 transition-colors text-left"
                  >
                    Geri Bildirim
                  </button>
                </li>
              </ul>
            </div>

            {/* Hızlı Erişim - Ödeme Noktaları */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Ödeme Noktaları</h3>
              <ul className="space-y-2">
                <li>
                  <button 
                    onClick={() => navigate('/payment-points')}
                    className="text-sm text-gray-600 dark:text-gray-400 hover:text-[#005bac] dark:hover:text-blue-400 transition-colors text-left"
                  >
                    Yakındaki Bayiler
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => navigate('/payment-points')}
                    className="text-sm text-gray-600 dark:text-gray-400 hover:text-[#005bac] dark:hover:text-blue-400 transition-colors text-left"
                  >
                    Online Ödeme
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => navigate('/wallet')}
                    className="text-sm text-gray-600 dark:text-gray-400 hover:text-[#005bac] dark:hover:text-blue-400 transition-colors text-left"
                  >
                    Bakiye Yükleme
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => navigate('/wallet')}
                    className="text-sm text-gray-600 dark:text-gray-400 hover:text-[#005bac] dark:hover:text-blue-400 transition-colors text-left"
                  >
                    Kart İşlemleri
                  </button>
                </li>
              </ul>
            </div>

            {/* Mobil Uygulamalar ve Sosyal Medya */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Mobil Uygulamalar</h3>
              <div className="space-y-3 mb-6">
                <a 
                  href="#" 
                  className="flex items-center space-x-3 p-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <svg className="w-6 h-6 text-gray-600 dark:text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M3 20.5v-17c0-.83.67-1.5 1.5-1.5H6c.83 0 1.5.67 1.5 1.5v17c0 .83-.67 1.5-1.5 1.5H4.5c-.83 0-1.5-.67-1.5-1.5zm9-17v17c0 .83-.67 1.5-1.5 1.5H9c-.83 0-1.5-.67-1.5-1.5v-17C7.5 2.67 8.17 2 9 2h1.5c.83 0 1.5.67 1.5 1.5zm9 17v-17c0-.83-.67-1.5-1.5-1.5H18c-.83 0-1.5.67-1.5 1.5v17c0 .83.67 1.5 1.5 1.5h1.5c.83 0 1.5-.67 1.5-1.5z"/>
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Google Play</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Android'de İndir</p>
                  </div>
                </a>
                
                <a 
                  href="#" 
                  className="flex items-center space-x-3 p-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <svg className="w-6 h-6 text-gray-600 dark:text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">App Store</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">iOS'de İndir</p>
                  </div>
                </a>
              </div>

              {/* Sosyal Medya */}
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Bizi Takip Edin</h4>
              <div className="flex space-x-3">
                <a 
                  href="#" 
                  className="p-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  title="Facebook"
                >
                  <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </a>
                
                <a 
                  href="#" 
                  className="p-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  title="Twitter"
                >
                  <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                  </svg>
                </a>
                
                <a 
                  href="#" 
                  className="p-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  title="Instagram"
                >
                  <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 6.62 5.367 11.987 11.988 11.987 6.62 0 11.987-5.367 11.987-11.987C24.004 5.367 18.637.001 12.017.001zM8.449 16.988c-1.297 0-2.448-.611-3.132-1.551-.684-.94-.684-2.116 0-3.056.684-.94 1.835-1.551 3.132-1.551s2.448.611 3.132 1.551c.684.94.684 2.116 0 3.056-.684.94-1.835 1.551-3.132 1.551zm7.518 0c-1.297 0-2.448-.611-3.132-1.551-.684-.94-.684-2.116 0-3.056.684-.94 1.835-1.551 3.132-1.551s2.448.611 3.132 1.551c.684.94.684 2.116 0 3.056-.684.94-1.835 1.551-3.132 1.551z"/>
                  </svg>
                </a>
              </div>
            </div>
          </div>
          
          {/* Alt Çizgi ve Telif Hakkı */}
          <div className="border-t border-gray-200 dark:border-gray-700 mt-8 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <div className="flex items-center space-x-2 mb-4 md:mb-0">
                <div className="w-8 h-8 rounded-lg overflow-hidden">
                  <img 
                    src={bincardLogo} 
                    alt="BinCard Logo" 
                    className="w-full h-full object-cover"
                  />
                </div>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  © 2024 BinCard. Tüm hakları saklıdır.
                </span>
              </div>
              <div className="flex space-x-6">
                <button 
                  onClick={() => navigate('/feedback')}
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-[#005bac] dark:hover:text-blue-400 transition-colors"
                >
                  Gizlilik Politikası
                </button>
                <button 
                  onClick={() => navigate('/feedback')}
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-[#005bac] dark:hover:text-blue-400 transition-colors"
                >
                  Kullanım Şartları
                </button>
                <button 
                  onClick={() => navigate('/feedback')}
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-[#005bac] dark:hover:text-blue-400 transition-colors"
                >
                  İletişim
                </button>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
};

export default Dashboard;
