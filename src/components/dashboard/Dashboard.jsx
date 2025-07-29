import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import AuthService from '../../services/auth.service';
import WalletService from '../../services/wallet.service';
import NewsService from '../../services/news.service';
import News from './News.jsx';
import LikedNews from './LikedNews.jsx';
import Wallet from './Wallet.jsx';
import Feedback from './Feedback.jsx';
import PaymentPoints from './PaymentPoints.jsx';
import Settings from './Settings.jsx';
import TokenDebug from '../debug/TokenDebug.jsx';
import bincardLogo from '../../assets/bincard-logo.jpg';

// KonyaKart stilinde menü öğeleri
const menuItems = [
  { text: 'Ana Sayfa', icon: '🏠', path: 'dashboard', key: 'dashboard' },
  { text: 'Cüzdan', icon: '�', path: 'wallet', key: 'wallet' },
  { text: 'Ödeme Noktaları', icon: '📍', path: 'payment-points', key: 'payment-points' },
  { text: 'İşlem Geçmişi', icon: '�', path: 'history', key: 'history' },
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

  const renderContent = () => {
    switch (activeTab) {
      case 'news':
        return <News />;
      case 'liked-news':
        return <LikedNews />;
      case 'wallet':
        return <Wallet />;
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
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl overflow-hidden shadow-sm">
                  <img 
                    src={bincardLogo} 
                    alt="BinCard Logo" 
                    className="w-full h-full object-cover"
                  />
                </div>
                <h1 className="text-xl font-bold text-[#005bac] hidden sm:block">BinCard</h1>
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
                  <div className="text-sm text-gray-600 dark:text-gray-300 hidden sm:block">
                    Hoş geldin, {user?.firstName || 'Kullanıcı'}
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
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl overflow-hidden shadow-sm">
                  <img 
                    src={bincardLogo} 
                    alt="BinCard Logo" 
                    className="w-full h-full object-cover"
                  />
                </div>
                <h2 className="text-lg font-bold text-[#005bac]">BinCard</h2>
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
            </div>
          </div>
        </nav>
      </div>

      {/* Main Content */}
      <div className="pt-16">
        {renderContent()}
      </div>
    </div>
  );
};

// KonyaKart stilinde Ana Dashboard Bileşeni
const DashboardHome = ({ isAuthenticated, walletData, isLoadingWallet, user }) => {
  const navigate = useNavigate();
  const [newsData, setNewsData] = useState([]);
  const [newsLoading, setNewsLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);

  // Haberler için API çağrısı
  useEffect(() => {
    const fetchNews = async () => {
      try {
        // NewsService kullanarak haberler çek
        const data = await NewsService.getNews();
        if (data && data.content) {
          setNewsData(data.content.slice(0, 5)); // İlk 5 haberi al
        } else {
          throw new Error('News data format error');
        }
      } catch (error) {
        console.warn('API\'den haberler alınamadı, demo haberler yükleniyor:', error);
        // Demo haberler yükle
        setNewsData([
          {
            id: 1,
            title: "Yeni Akıllı Duraklar Hizmete Girdi",
            summary: "Konya'da 50 yeni akıllı durak teknolojisi ile vatandaşlara hizmet vermeye başladı.",
            imageUrl: "https://images.unsplash.com/photo-1570125909232-eb263c188f7e?w=800&h=400&fit=crop",
            category: "Ulaşım",
            publishDate: "2024-12-15"
          },
          {
            id: 2,
            title: "BinCard ile %20 İndirim Kampanyası",
            summary: "Bu ay boyunca BinCard kullanıcılarına özel indirim fırsatları sizi bekliyor.",
            imageUrl: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&h=400&fit=crop",
            category: "Kampanya",
            publishDate: "2024-12-14"
          },
          {
            id: 3,
            title: "Toplu Taşıma Güzergahları Güncellendi",
            summary: "Vatandaş taleplerini değerlendirerek 15 otobüs hattında güzergah iyileştirmesi yapıldı.",
            imageUrl: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800&h=400&fit=crop",
            category: "Duyuru",
            publishDate: "2024-12-13"
          },
          {
            id: 4,
            title: "Mobil Ödeme Sistemi Devreye Girdi",
            summary: "Artık QR kod ile kolayca ödeme yapabilir, kartınızı unuttuğunuzda bile ulaşımınızı sürdürebilirsiniz.",
            imageUrl: "https://images.unsplash.com/photo-1563986768494-4dee2763ff3f?w=800&h=400&fit=crop",
            category: "Teknoloji",
            publishDate: "2024-12-12"
          },
          {
            id: 5,
            title: "Çevre Dostu Ulaşım Ödülleri",
            summary: "Toplu taşıma kullanan vatandaşlara çevre bilinci ödülü verilmeye başlandı.",
            imageUrl: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800&h=400&fit=crop",
            category: "Çevre",
            publishDate: "2024-12-11"
          }
        ]);
      } finally {
        setNewsLoading(false);
      }
    };

    fetchNews();
  }, []);

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
      color: 'bg-gradient-to-br from-green-500 to-green-600',
      onClick: () => isAuthenticated ? navigate('/wallet') : navigate('/login')
    },
    {
      title: 'Puanlar',
      value: isAuthenticated ? '1,240' : '--',
      icon: '⭐',
      color: 'bg-gradient-to-br from-yellow-500 to-orange-500',
      onClick: () => isAuthenticated ? navigate('/wallet') : navigate('/login')
    },
    {
      title: 'Bu Ay',
      value: isAuthenticated ? '42 Yolculuk' : '--',
      icon: '🚌',
      color: 'bg-gradient-to-br from-purple-500 to-purple-600',
      onClick: () => isAuthenticated ? navigate('/history') : navigate('/login')
    }
  ];

  // Hızlı işlemler
  const quickActions = [
    {
      title: 'Bakiye Yükle',
      description: 'Kartınıza hızlıca bakiye yükleyin',
      icon: '💰',
      action: () => isAuthenticated ? navigate('/wallet') : navigate('/login')
    },
    {
      title: 'Ödeme Noktaları',
      description: 'Yakındaki bayileri keşfedin',
      icon: '📍',
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
      {/* Hero Section */}
      <section className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 transition-colors duration-300">
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
        <section className="mb-12 slide-up">
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
              <div className="h-80 flex items-center justify-center bg-gray-100 dark:bg-gray-700">
                <div className="spinner"></div>
                <span className="ml-3 text-gray-600 dark:text-gray-300">Haberler yükleniyor...</span>
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
                      <div className="relative h-80">
                        <img 
                          src={news.imageUrl} 
                          alt={news.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjQwMCIgdmlld0JveD0iMCAwIDgwMCA0MDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI4MDAiIGhlaWdodD0iNDAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0zNzUgMTcwSDQyNVYyMzBIMzc1VjE3MFoiIGZpbGw9IiM5Q0EzQUYiLz4KPHBhdGggZD0iTTM1MCAyMDBIMzc1VjIzMEgzNTBWMjAwWiIgZmlsbD0iIzlDQTNBRiIvPgo8L3N2Zz4K';
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
                        <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                          <div className="flex items-center gap-3 mb-3">
                            <span className="px-3 py-1 bg-[#005bac] text-white text-sm font-medium rounded-full">
                              {news.category}
                            </span>
                            <span className="text-sm text-gray-200">
                              {new Date(news.publishDate).toLocaleDateString('tr-TR')}
                            </span>
                          </div>
                          <h3 className="text-2xl font-bold mb-2 line-clamp-2">{news.title}</h3>
                          <p className="text-gray-200 line-clamp-2">{news.summary}</p>
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
              <div className="h-80 flex items-center justify-center bg-gray-100 dark:bg-gray-700">
                <p className="text-gray-600 dark:text-gray-300">Henüz haber bulunmuyor.</p>
              </div>
            )}
          </div>
        </section>

        {/* Ana Kartlar */}
        <section className="mb-12 slide-up">
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

        {/* Hızlı İşlemler */}
        <section className="mb-12 slide-up">
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

        {/* Son İşlemler - Sadece giriş yapmış kullanıcılar için */}
        {isAuthenticated && (
          <section className="slide-up">
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
          <section className="slide-up">
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
    </main>
  );
};

export default Dashboard;
