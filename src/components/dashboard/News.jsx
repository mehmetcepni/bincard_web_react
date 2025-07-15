import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import NewsService from '../../services/news.service';
import AuthService from '../../services/auth.service';
import { toast } from 'react-toastify';
import NewsImage from '../ui/NewsImage';

// Resim URL'sini düzeltme fonksiyonu
const normalizeImageUrl = (imageUrl, newsId) => {
  console.log(`🔍 [Haber ${newsId}] Original imageUrl:`, imageUrl);
  
  // Eğer backend'den resim gelmemişse veya geçersizse null döndür (boş bırak)
  if (!imageUrl || imageUrl === '' || imageUrl === null || imageUrl === undefined) {
    console.log(`📷 [Haber ${newsId}] Resim yok, boş bırakılıyor`);
    return null;
  }
  
  let finalUrl = imageUrl;
  
  if (imageUrl.startsWith('/')) {
    // Relative path ise backend base URL'i ekle
    finalUrl = `http://localhost:8080${imageUrl}`;
    console.log(`🔗 [Haber ${newsId}] Relative path düzeltildi:`, finalUrl);
  } else if (!imageUrl.startsWith('http')) {
    // Protocol eksikse https ekle
    finalUrl = `https://${imageUrl}`;
    console.log(`🔒 [Haber ${newsId}] Protocol eklendi:`, finalUrl);
  } else {
    console.log(`✅ [Haber ${newsId}] URL geçerli:`, finalUrl);
  }
  
  // Geçersiz URL'leri filtrele (test URL'leri gibi) - via.placeholder.com'u test için izin ver
  if (finalUrl.includes('example.com')) {
    console.log(`🚫 [Haber ${newsId}] Geçersiz URL algılandı, resim gösterilmeyecek:`, finalUrl);
    return null;
  }
  
  return finalUrl;
};

const News = () => {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeCategory, setActiveCategory] = useState('all');
  const [likedNews, setLikedNews] = useState(new Set()); // Beğenilen haberleri takip et
  const [likingNews, setLikingNews] = useState(new Set()); // Beğenme işlemi devam eden haberler
  const [isOnline, setIsOnline] = useState(true); // Backend bağlantı durumu
  const [selectedNews, setSelectedNews] = useState(null); // Seçilen haber detayı
  const [isModalOpen, setIsModalOpen] = useState(false); // Modal açık/kapalı durumu

  // Pagination states - removed for single page view
  // const [currentPage, setCurrentPage] = useState(1);
  // const itemsPerPage = 5;

  useEffect(() => {
    // Backend'den haberleri getir
    const fetchNews = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Aktif haberleri getir
        const newsData = await NewsService.getActiveNews();
        
        console.log('✅ Backend\'den haberler alındı, online mode aktivated');
        setIsOnline(true);
        
        // Backend'den gelen raw veriyi logla
        console.log('📊 Backend\'den gelen haber verisi:', newsData);
        newsData.forEach((news, index) => {
          console.log(`📰 Haber ${index + 1}:`, {
            id: news.id,
            title: news.title,
            imageUrl: news.imageUrl,
            hasImage: !!news.imageUrl,
            imageType: typeof news.imageUrl
          });
        });
        
        // Backend'den gelen veriyi frontend formatına dönüştür
        const formattedNews = newsData.map(news => {
          return {
            id: news.id,
            title: news.title,
            content: news.content,
            image: normalizeImageUrl(news.image || news.imageUrl, news.id), // Backend'den 'image' field'ı (NewsDTO'ya göre)
            thumbnail: news.thumbnail,
            validUntil: news.endDate ? new Date(news.endDate).toLocaleDateString('tr-TR') : 'Sürekli',
            category: news.type || 'Genel', // Backend'den 'type' alanı geliyor
            discount: news.priority === 'KRITIK' ? 'KRİTİK' : 
                     news.priority === 'COK_YUKSEK' ? 'ÇOK YÜKSEK' :
                     news.priority === 'YUKSEK' ? 'YÜKSEK' :
                     news.priority === 'NORMAL' ? 'NORMAL' :
                     news.priority === 'DUSUK' ? 'DÜŞÜK' :
                     news.priority === 'COK_DUSUK' ? 'ÇOK DÜŞÜK' : 'Özel Fırsat',
            code: news.promoCode || `HABER${news.id}`,
            isActive: news.active !== undefined ? news.active : true,
            likeCount: news.likeCount || 0,
            isLikedByUser: news.likedByUser || false, // Backend'den gelen beğeni durumu
            viewCount: news.viewCount || 0,
            priority: news.priority,
            type: news.type,
            startDate: news.startDate,
            endDate: news.endDate,
            createdAt: news.createdAt
          };
        });
        
        setCampaigns(formattedNews);
        
        // Backend'den gelen beğeni durumlarını set et
        const userLikedNews = formattedNews
          .filter(news => news.isLikedByUser) // Backend'den likedByUser field'ı gelirse
          .map(news => news.id);
        
        if (userLikedNews.length > 0) {
          setLikedNews(new Set(userLikedNews));
          console.log('👍 Kullanıcının beğendiği haberler:', userLikedNews);
        }
        
        // Kategorileri dinamik olarak çıkar (type alanından)
        const uniqueCategories = [...new Set(formattedNews.map(item => item.category))];
        setCategories(uniqueCategories);
        
        console.log('✅ Haberler başarıyla yüklendi:', formattedNews);
        setIsOnline(true); // Backend bağlantısı başarılı
        
      } catch (err) {
        console.error('❌ Haberler yüklenirken hata:', err);
        
        // Test verisi ile devam et (offline mode)
        console.log('🔄 Backend bağlantısı yok, test verileri kullanılıyor...');
        setIsOnline(false);
        
        const testNews = [
          {
            id: 1,
            title: 'BinCard Yeni Özellikler',
            content: 'BinCard uygulamasına yeni özellikler eklendi. Mobil ödeme sistemi artık daha hızlı ve güvenli.',
            imageUrl: 'https://via.placeholder.com/400x300/3B82F6/FFFFFF?text=BinCard+Ozellikler',
            endDate: null,
            type: 'GENEL',
            priority: 'NORMAL',
            likeCount: 15,
            viewCount: 234,
            active: true,
            likedByUser: false,
            createdAt: new Date().toISOString()
          },
          {
            id: 2,
            title: 'Özel İndirim Kampanyası',
            content: '%20 indirim fırsatı! Bu ay boyunca tüm BinCard yüklemelerinde geçerli.',
            imageUrl: 'https://via.placeholder.com/400x300/EF4444/FFFFFF?text=Indirim+Kampanyasi',
            endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            type: 'KAMPANYA',
            priority: 'YUKSEK',
            likeCount: 42,
            viewCount: 567,
            active: true,
            likedByUser: false,
            createdAt: new Date().toISOString()
          },
          {
            id: 3,
            title: 'Sistem Bakım Duyurusu',
            content: 'Bu gece 02:00 - 04:00 arası sistem bakımı yapılacaktır. Bu sürede hizmet kesintisi yaşanabilir.',
            imageUrl: 'https://via.placeholder.com/400x300/F59E0B/FFFFFF?text=Sistem+Bakimi',
            endDate: null,
            type: 'DUYURU',
            priority: 'KRITIK',
            likeCount: 8,
            viewCount: 156,
            active: true,
            likedByUser: true,
            createdAt: new Date().toISOString()
          }
        ];
        
        // Test verilerini format et
        const formattedTestNews = testNews.map(news => {
          return {
            id: news.id,
            title: news.title,
            content: news.content,
            image: normalizeImageUrl(news.image || news.imageUrl, news.id), // Backend'den 'image' field'ı (NewsDTO'ya göre)
            thumbnail: news.thumbnail,
            validUntil: news.endDate ? new Date(news.endDate).toLocaleDateString('tr-TR') : 'Sürekli',
            category: news.type || 'Genel',
            discount: news.priority === 'KRITIK' ? 'KRİTİK' : 
                     news.priority === 'COK_YUKSEK' ? 'ÇOK YÜKSEK' :
                     news.priority === 'YUKSEK' ? 'YÜKSEK' :
                     news.priority === 'NORMAL' ? 'NORMAL' :
                     news.priority === 'DUSUK' ? 'DÜŞÜK' :
                     news.priority === 'COK_DUSUK' ? 'ÇOK DÜŞÜK' : 'Özel Fırsat',
            code: news.promoCode || `HABER${news.id}`,
            isActive: news.active !== undefined ? news.active : true,
            likeCount: news.likeCount || 0,
            isLikedByUser: news.likedByUser || false,
            viewCount: news.viewCount || 0,
            viewedByUser: news.viewedByUser || false,
            priority: news.priority,
            type: news.type,
            startDate: news.startDate,
            endDate: news.endDate,
            createdAt: news.createdAt
          };
        });
        
        setCampaigns(formattedTestNews);
        
        // Test verilerinden beğeni durumlarını set et
        const userLikedNews = formattedTestNews
          .filter(news => news.isLikedByUser)
          .map(news => news.id);
        
        if (userLikedNews.length > 0) {
          setLikedNews(new Set(userLikedNews));
          console.log('👍 Test verisinde beğenilen haberler:', userLikedNews);
        }
        
        // Kategorileri test verisinden çıkar
        const uniqueCategories = [...new Set(formattedTestNews.map(item => item.category))];
        setCategories(uniqueCategories);
        
        // Hata mesajını daha bilgilendirici hale getir
        setError('Backend bağlantısı kurulamadı. Test verileri gösteriliyor.');
        
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, []);

  // Haber beğenme fonksiyonu with Premium Effects
  const handleLikeNews = async (newsId, event) => {
    // Auth kontrolü - giriş yapmamışsa modal göster
    if (!AuthService.isAuthenticated()) {
      try {
        console.log('🔐 [NEWS] Beğeni için auth kontrolü yapılıyor...');
        const authResult = await AuthService.showLoginConfirmModal('Haberleri beğenme işlemini', navigate);
        console.log('🔐 [NEWS] Beğeni auth modal sonucu:', authResult);
        
        if (!authResult) {
          console.log('🔄 [NEWS] Kullanıcı beğeni için giriş yapmak istemedi');
          return;
        }
      } catch (error) {
        console.error('❌ [NEWS] Beğeni auth kontrolü hatası:', error);
        return;
      }
    }

    // Backend bağlantısı yoksa işlem yapma
    if (!isOnline) {
      setError('Backend bağlantısı bulunamadı. Beğeni işlemi yapılamıyor.');
      setTimeout(() => setError(null), 3000);
      return;
    }

    const buttonElement = event?.currentTarget;

    try {
      // Çift tıklamayı önle
      if (likingNews.has(newsId)) {
        return;
      }

      setLikingNews(prev => new Set([...prev, newsId]));
      
      // Button animation effect
      if (buttonElement) {
        animateHeartButton(buttonElement, true);
        
        // Create love particles after a short delay
        setTimeout(() => {
          createHeartParticles(buttonElement, true);
        }, 200);
      }
      
      // Backend'e beğeni isteği gönder
      const response = await NewsService.likeNews(newsId);
      
      // Başarılı ise beğeni durumunu güncelle
      setLikedNews(prev => new Set([...prev, newsId]));
      
      // Haber listesindeki beğeni sayısını artır
      setCampaigns(prev => 
        prev.map(campaign => 
          campaign.id === newsId 
            ? { ...campaign, likeCount: (campaign.likeCount || 0) + 1 }
            : campaign
        )
      );

      // Success toast with heart emoji
      showToast('Haber başarıyla beğenildi!', 'success', '💙');
      
      console.log('✅ Haber başarıyla beğenildi:', response);
      
    } catch (error) {
      console.error('❌ Haber beğenme hatası:', error);
      
      // Reset button animation on error
      if (buttonElement) {
        buttonElement.style.transform = 'scale(1)';
        buttonElement.style.filter = 'none';
      }
      
      // Error toast
      showToast('Beğeni işlemi başarısız', 'error', '❌');
      
      setError(error.message);
      
      // Hata mesajını 3 saniye sonra temizle
      setTimeout(() => setError(null), 3000);
      
    } finally {
      // İşlem tamamlandı, loading state'ini kaldır
      setLikingNews(prev => {
        const newSet = new Set(prev);
        newSet.delete(newsId);
        return newSet;
      });
    }
  };

  // Haber beğenisini kaldırma fonksiyonu with Premium Effects
  const handleUnlikeNews = async (newsId, event) => {
    // Auth kontrolü - giriş yapmamışsa modal göster
    if (!AuthService.isAuthenticated()) {
      try {
        console.log('🔐 [NEWS] Beğeni kaldırma için auth kontrolü yapılıyor...');
        const authResult = await AuthService.showLoginConfirmModal('Beğeni kaldırma işlemini', navigate);
        console.log('🔐 [NEWS] Beğeni kaldırma auth modal sonucu:', authResult);
        
        if (!authResult) {
          console.log('🔄 [NEWS] Kullanıcı beğeni kaldırma için giriş yapmak istemedi');
          return;
        }
      } catch (error) {
        console.error('❌ [NEWS] Beğeni kaldırma auth kontrolü hatası:', error);
        return;
      }
    }

    const buttonElement = event?.currentTarget;
    
    try {
      if (likingNews.has(newsId)) {
        return;
      }

      setLikingNews(prev => new Set([...prev, newsId]));
      
      // Button animation effect
      if (buttonElement) {
        animateHeartButton(buttonElement, false);
        
        // Create broken heart particles
        setTimeout(() => {
          createHeartParticles(buttonElement, false);
        }, 200);
      }
      
      await NewsService.unlikeNews(newsId);
      
      setLikedNews(prev => {
        const newSet = new Set(prev);
        newSet.delete(newsId);
        return newSet;
      });
      
      setCampaigns(prev => 
        prev.map(campaign => 
          campaign.id === newsId 
            ? { ...campaign, likeCount: Math.max((campaign.likeCount || 0) - 1, 0) }
            : campaign
        )
      );

      // Success toast for unlike
      showToast('Haber beğenisi kaldırıldı', 'unlike', '💔');

    } catch (error) {
      console.error('❌ Haber beğeni kaldırma hatası:', error);
      setError(error.message);
      setTimeout(() => setError(null), 3000);
      
    } finally {
      setLikingNews(prev => {
        const newSet = new Set(prev);
        newSet.delete(newsId);
        return newSet;
      });
    }
  };

  // Haber detayını görüntüleme fonksiyonu
  const handleViewNewsDetail = async (newsId) => {
    try {
      console.log(`📰 Haber ${newsId} detayı isteniyor...`);
      
      // Loading state göster
      setSelectedNews({ loading: true });
      setIsModalOpen(true);
      
      const newsDetail = await NewsService.getNewsDetail(newsId);
      
      console.log(`✅ Haber ${newsId} detayı alındı:`, newsDetail);
      
      // Haber detayını set et
      setSelectedNews({
        ...newsDetail,
        image: normalizeImageUrl(newsDetail.image, newsDetail.id),
        loading: false
      });
      
    } catch (error) {
      console.error(`❌ Haber ${newsId} detayı görüntülenirken hata:`, error);
      
      // Hata durumunda modal'ı kapat ve alert göster
      setIsModalOpen(false);
      setSelectedNews(null);
      
      if (error.message.includes('403')) {
        alert(`🔒 Haber detayına erişim yetkisi bulunmuyor.\n\nHata: ${error.message}\n\nLütfen admin ile iletişime geçin.`);
      } else if (error.message.includes('404')) {
        alert(`❌ Haber bulunamadı.\n\nBu haber silinmiş veya mevcut değil olabilir.`);
      } else if (error.message.includes('401')) {
        alert(`🔐 Kimlik doğrulama gerekli.\n\nLütfen giriş yapın ve tekrar deneyin.`);
      } else {
        alert(`❌ Haber detayı yüklenirken hata oluştu:\n\n${error.message}\n\nLütfen daha sonra tekrar deneyin.`);
      }
    }
  };

  // Modal'ı kapatma fonksiyonu
  const closeModal = () => {
    setIsModalOpen(false);
    setTimeout(() => setSelectedNews(null), 300); // Animation için delay
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

  // Modal açıkken body scroll'unu engelle
  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isModalOpen]);

  // Filtreli haberleri getir - all news on single page
  const filteredCampaigns = activeCategory === 'all' 
    ? campaigns 
    : campaigns.filter(campaign => campaign.category === activeCategory);

  // Removed pagination calculations - show all news
  // const totalPages = Math.ceil(filteredCampaigns.length / itemsPerPage);
  // const startIndex = (currentPage - 1) * itemsPerPage;
  // const endIndex = startIndex + itemsPerPage;
  // const currentPageCampaigns = filteredCampaigns.slice(startIndex, endIndex);
  const currentPageCampaigns = filteredCampaigns; // Show all filtered news

  // Kategori değiştiğinde - no pagination needed
  // useEffect(() => {
  //   setCurrentPage(1);
  // }, [activeCategory]);

  // Sayfa değiştirme fonksiyonu - removed
  // const handlePageChange = (pageNumber) => {
  //   setCurrentPage(pageNumber);
  //   // Sayfa değiştiğinde üste scroll et
  //   window.scrollTo({ top: 0, behavior: 'smooth' });
  // };

  // Premium Heart Particles Effect for News
  const createHeartParticles = (element, isLike = true) => {
    const colors = isLike ? ['#ef4444', '#f97316', '#f59e0b', '#ec4899', '#8b5cf6'] : ['#6b7280', '#9ca3af', '#d1d5db'];
    const emojis = isLike ? ['💙', '💚', '💛', '🧡', '💜', '❤️', '🌟', '✨'] : ['💔', '😢', '⛔', '😞'];
    
    for (let i = 0; i < (isLike ? 15 : 10); i++) {
      const particle = document.createElement('div');
      const isEmoji = Math.random() > 0.25;
      
      if (isEmoji) {
        particle.textContent = emojis[Math.floor(Math.random() * emojis.length)];
        particle.style.fontSize = `${14 + Math.random() * 10}px`;
      } else {
        particle.style.width = `${5 + Math.random() * 10}px`;
        particle.style.height = particle.style.width;
        particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        particle.style.borderRadius = '50%';
        particle.style.boxShadow = '0 0 10px rgba(255,255,255,0.5)';
      }
      
      particle.style.position = 'absolute';
      particle.style.pointerEvents = 'none';
      particle.style.zIndex = '1000';
      particle.style.userSelect = 'none';
      
      const rect = element.getBoundingClientRect();
      const startX = rect.left + rect.width / 2;
      const startY = rect.top + rect.height / 2;
      
      particle.style.left = `${startX}px`;
      particle.style.top = `${startY}px`;
      
      document.body.appendChild(particle);
      
      const angle = (Math.PI * 2 * i) / (isLike ? 15 : 10) + Math.random() * 0.7;
      const velocity = 60 + Math.random() * 120;
      const gravity = 0.6;
      const life = 2500 + Math.random() * 1500;
      
      let vx = Math.cos(angle) * velocity;
      let vy = Math.sin(angle) * velocity - 30;
      let x = startX;
      let y = startY;
      
      const animate = () => {
        x += vx * 0.016;
        y += vy * 0.016;
        vy += gravity;
        
        particle.style.left = `${x}px`;
        particle.style.top = `${y}px`;
        particle.style.opacity = Math.max(0, 1 - (Date.now() - startTime) / life);
        particle.style.transform = `scale(${Math.max(0.1, 1 - (Date.now() - startTime) / life)})`;
        
        if (Date.now() - startTime < life) {
          requestAnimationFrame(animate);
        } else {
          particle.remove();
        }
      };
      
      const startTime = Date.now();
      requestAnimationFrame(animate);
    }
  };

  // Premium Toast Notification for News
  const showToast = (message, type = 'success', emoji = '💙') => {
    const toast = document.createElement('div');
    toast.className = `fixed top-8 right-8 z-[1000] animate-fade-in-up transform transition-all duration-500`;
    
    const bgGradient = type === 'success' 
      ? 'bg-gradient-to-r from-blue-500 to-purple-500' 
      : type === 'error'
      ? 'bg-gradient-to-r from-red-500 to-pink-500'
      : type === 'unlike'
      ? 'bg-gradient-to-r from-gray-500 to-slate-500'
      : 'bg-gradient-to-r from-indigo-500 to-purple-500';
    
    toast.innerHTML = `
      <div class="${bgGradient} text-white px-8 py-4 rounded-2xl shadow-2xl border border-white/20 backdrop-blur-lg">
        <div class="flex items-center gap-3">
          <span class="text-2xl animate-bounce" style="animation-duration: 0.6s;">${emoji}</span>
          <div>
            <div class="font-semibold text-lg">${message}</div>
            <div class="text-sm opacity-90">Haber beğeni durumu güncellendi</div>
          </div>
        </div>
        <div class="absolute inset-0 rounded-2xl bg-white/10 opacity-0 hover:opacity-100 transition-opacity duration-300"></div>
        <div class="absolute -top-1 -right-1 w-6 h-6 bg-white/20 rounded-full animate-ping"></div>
      </div>
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.animation = 'fade-out-up 0.5s ease-in-out forwards';
      setTimeout(() => toast.remove(), 500);
    }, 4000);
    
    toast.addEventListener('click', () => {
      toast.style.animation = 'fade-out-up 0.5s ease-in-out forwards';
      setTimeout(() => toast.remove(), 500);
    });
  };

  // Heart Button Animation Effect for News
  const animateHeartButton = (buttonElement, isLiking = true) => {
    if (!buttonElement) return;
    
    buttonElement.style.transform = 'scale(0.8)';
    buttonElement.style.transition = 'all 0.15s ease-out';
    
    setTimeout(() => {
      buttonElement.style.transform = 'scale(1.15)';
      if (isLiking) {
        buttonElement.style.filter = 'hue-rotate(20deg) brightness(1.2)';
      } else {
        buttonElement.style.filter = 'grayscale(50%) brightness(0.8)';
      }
    }, 150);
    
    setTimeout(() => {
      buttonElement.style.transform = 'scale(1)';
      if (isLiking) {
        buttonElement.style.filter = 'brightness(1.1)';
      } else {
        buttonElement.style.filter = 'grayscale(30%)';
      }
    }, 300);
    
    setTimeout(() => {
      if (!isLiking) {
        buttonElement.style.filter = 'none';
      }
    }, 1000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="animate-pulse grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-6xl">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="bg-white rounded-xl shadow-md overflow-hidden h-72">
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

  if (error) {
    return (
      <div className="py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-center items-center min-h-[80vh]">
            <div className="bg-red-50 p-8 rounded-lg border border-red-200 text-red-700 max-w-md text-center">
              <svg className="w-16 h-16 mx-auto text-red-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-xl font-bold mb-2">Backend Bağlantı Hatası</h3>
              <p className="mb-4">{error}</p>
              <p className="text-sm text-red-600 mb-4">
                Lütfen internet bağlantınızı kontrol edin veya daha sonra tekrar deneyin.
              </p>
              <button 
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200 w-full"
                onClick={() => window.location.reload()}
              >
                Sayfayı Yenile
              </button>
            </div>
          </div>
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
            <h1 className="text-2xl font-bold text-blue-800 mb-2 md:mb-0">Güncel Haberler</h1>
            
            {/* Beğendiğim Haberler Linki */}
            <button 
              onClick={() => {
                // Dashboard içindeki liked-news sekmesine geç
                const currentUrl = window.location.href;
                if (currentUrl.includes('/news')) {
                  window.location.href = window.location.href.replace('/news', '/liked-news');
                } else {
                  window.location.href = '/liked-news';
                }
              }}
              className="flex items-center px-4 py-2 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-lg hover:from-red-600 hover:to-pink-600 transition-all duration-300 transform hover:scale-105 shadow-lg"
            >
              <span className="mr-2">❤️</span>
              <span className="font-medium">Beğendiğim Haberler</span>
              <span className="ml-2 bg-white bg-opacity-20 rounded-full px-2 py-1 text-xs">
                {likedNews.size}
              </span>
            </button>
          </div>
          
          <p className="text-gray-600 mb-6">
            BinCard'ınızla ilgili haberler ve duyuruları keşfedin. Tüm haberlerimizi inceleyerek güncel gelişmelerden haberdar olun.
          </p>

          {/* Backend Bağlantı Durumu */}
          <div className={`mb-4 p-3 border rounded-lg ${isOnline ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'}`}>
            <div className="flex items-center">
              <div className={`w-3 h-3 rounded-full mr-2 ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-orange-500'}`}></div>
              <span className={`text-sm font-medium ${isOnline ? 'text-green-800' : 'text-orange-800'}`}>
                {isOnline 
                  ? 'Backend\'e bağlı - Gerçek zamanlı veriler' 
                  : 'Offline mod - Örnek veriler gösteriliyor'
                }
              </span>
            </div>
          </div>

          {/* Kategori filtreleri */}
          <div className="flex flex-wrap gap-2">
            <button 
              onClick={() => setActiveCategory('all')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                activeCategory === 'all' 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
              }`}
            >
              Tümü
            </button>
            
            {categories.map(category => (
              <button 
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                  activeCategory === category 
                    ? 'bg-blue-600 text-white shadow-md' 
                    : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Campaign Cards - 2 columns layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Error Message */}
          {error && (
            <div className="col-span-full mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-red-800 font-medium">{error}</span>
              </div>
            </div>
          )}

          {currentPageCampaigns.map(campaign => (
            <div key={campaign.id} className="bg-white rounded-xl shadow-md overflow-hidden transition-transform hover:shadow-lg hover:-translate-y-1" id={`news-card-${campaign.id}`}>
              {/* Resim alanı - her zaman göster, NewsImage component fallback ile */}
              <div className="h-48 overflow-hidden relative">
                <NewsImage
                  src={normalizeImageUrl(campaign.image || campaign.imageUrl, campaign.id) || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'}
                  alt={campaign.title}
                  className="w-full h-full object-cover"
                  onLoad={() => {
                    console.log(`✅ [Haber ${campaign.id}] Resim başarıyla yüklendi: ${campaign.title}`);
                  }}
                  onError={(e) => {
                    console.log(`❌ [Haber ${campaign.id}] Resim yüklenemedi, fallback kullanıldı`);
                  }}
                />
                <div className="absolute top-0 right-0 bg-red-500 text-white py-1 px-3 rounded-bl-lg font-bold">
                  {campaign.discount}
                </div>
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent text-white p-3">
                  <span className="text-sm font-medium">
                    Son geçerlilik: {campaign.validUntil}
                  </span>
                </div>
              </div>
              
              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <h2 className="text-lg font-bold text-gray-800 line-clamp-2">{campaign.title}</h2>
                </div>
                <p className="text-gray-600 text-sm mb-4 line-clamp-2">{campaign.content}</p>
                
                <div className="flex items-center justify-between mt-auto">
                  <span className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                    {campaign.category}
                  </span>
                  
                  <div className="flex items-center gap-2">
                    {/* Beğeni Butonu */}
                    <button 
                      onClick={(e) => likedNews.has(campaign.id) ? handleUnlikeNews(campaign.id, e) : handleLikeNews(campaign.id, e)}
                      disabled={likingNews.has(campaign.id)}
                      className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium transition-all duration-200 ${
                        likedNews.has(campaign.id)
                          ? 'bg-red-500 text-white hover:bg-red-600'
                          : 'bg-gray-100 text-gray-600 hover:bg-red-100 hover:text-red-600'
                      } ${likingNews.has(campaign.id) ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {likingNews.has(campaign.id) ? (
                        <svg className="w-3 h-3 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      ) : (
                        <svg className="w-3 h-3" fill={likedNews.has(campaign.id) ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                      )}
                      <span>{campaign.likeCount || 0}</span>
                    </button>
                    
                    {/* Haber Detay Butonu */}
                    <button 
                      onClick={() => handleViewNewsDetail(campaign.id)}
                      className="text-white bg-blue-600 hover:bg-blue-700 transition px-4 py-2 rounded-lg text-sm font-medium"
                    >
                      Haberi Gör
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* No results */}
        {currentPageCampaigns.length === 0 && filteredCampaigns.length === 0 && (
          <div className="bg-white rounded-xl shadow-md p-8 text-center">
            <svg className="w-16 h-16 mx-auto text-blue-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-xl font-bold text-gray-800 mb-2">
              {activeCategory === 'all' ? 'Henüz haber bulunmuyor' : 'Bu kategoride haber bulunamadı'}
            </h3>
            <p className="text-gray-600 mb-4">
              {isOnline 
                ? (activeCategory === 'all' 
                   ? 'Backend\'den henüz haber gelmedi. Lütfen daha sonra tekrar kontrol edin.' 
                   : 'Farklı bir kategori seçabilir veya daha sonra tekrar kontrol edebilirsiniz.')
                : 'Backend bağlantısı kurulamadı. Lütfen internet bağlantınızı kontrol edin.'
              }
            </p>
            {activeCategory !== 'all' && (
              <button 
                onClick={() => setActiveCategory('all')}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Tüm Haberleri Göster
              </button>
            )}
          </div>
        )}

        {/* Haber Sayı Bilgisi */}
        {filteredCampaigns.length > 0 && (
          <div className="text-center mt-6">
            <span className="inline-block bg-blue-50 px-6 py-3 rounded-full text-sm text-gray-600 border border-blue-100 font-medium">
              📊 Toplam <strong>{filteredCampaigns.length}</strong> haber görüntüleniyor
            </span>
          </div>
        )}

        {/* Promo Footer */}
        <div className="mt-10 bg-gradient-to-r from-blue-600 to-blue-400 rounded-xl shadow-md p-6 text-white">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="mb-4 md:mb-0">
              <h3 className="text-xl font-bold mb-2">BinCard Mobil Uygulama İndirin</h3>
              <p className="opacity-90">Haberlerden anında haberdar olmak ve özel duyuruları kaçırmamak için mobil uygulamayı indirin.</p>
            </div>
            <div className="flex gap-3">
              <button className="bg-white text-blue-700 px-4 py-2 rounded-lg font-medium hover:bg-blue-50">
                App Store
              </button>
              <button className="bg-white text-blue-700 px-4 py-2 rounded-lg font-medium hover:bg-blue-50">
                Google Play
              </button>
            </div>
          </div>
        </div>

        {/* Premium News Modal with Blur Background */}
        {isModalOpen && (
          <div 
            className={`fixed inset-0 transition-all duration-500 flex items-center justify-center z-50 p-4 ${
              isModalOpen ? 'backdrop-blur-lg bg-black/40' : 'backdrop-blur-none bg-black/0'
            }`}
            style={{
              backdropFilter: isModalOpen ? 'blur(12px) brightness(0.7)' : 'none',
              WebkitBackdropFilter: isModalOpen ? 'blur(12px) brightness(0.7)' : 'none'
            }}
            onClick={(e) => e.target === e.currentTarget && closeModal()}
          >
            {/* Animated Background Elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute -top-10 -left-10 w-20 h-20 bg-blue-500/20 rounded-full animate-pulse"></div>
              <div className="absolute top-1/4 -right-5 w-16 h-16 bg-purple-500/20 rounded-full animate-bounce" style={{animationDelay: '0.5s'}}></div>
              <div className="absolute -bottom-10 left-1/3 w-24 h-24 bg-pink-500/20 rounded-full animate-pulse" style={{animationDelay: '1s'}}></div>
              <div className="absolute top-1/2 left-10 w-12 h-12 bg-green-500/20 rounded-full animate-bounce" style={{animationDelay: '1.5s'}}></div>
            </div>

            <div 
              className={`relative bg-white/95 backdrop-blur-sm rounded-3xl max-w-6xl w-full max-h-[95vh] overflow-hidden shadow-2xl border border-white/20 transform transition-all duration-500 ${
                isModalOpen ? 'scale-100 opacity-100 translate-y-0' : 'scale-95 opacity-0 translate-y-10'
              }`}
              style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.98) 100%)',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.4)'
              }}
            >
              {/* Premium Modal Header */}
              <div className="relative px-8 py-6 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 text-white overflow-hidden">
                {/* Animated Background Pattern */}
                <div className="absolute inset-0 opacity-20">
                  <div className="absolute top-0 left-0 w-full h-full animate-pulse">
                    <div className="w-full h-full" style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='m36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                      backgroundRepeat: 'repeat'
                    }}></div>
                  </div>
                </div>

                {/* Floating Close Button */}
                <button
                  onClick={closeModal}
                  className="absolute top-4 right-4 w-10 h-10 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:text-gray-200 transition-all duration-300 transform hover:scale-110 hover:rotate-90 group"
                  aria-label="Kapat"
                >
                  <svg className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                
                {/* Enhanced News Header */}
                <div className="relative z-10 text-center">
                  <div className="flex items-center justify-center mb-3">
                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mr-3 animate-pulse">
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z"/>
                      </svg>
                    </div>
                    <h2 className="text-3xl font-bold tracking-wide">BinCard Haber Merkezi</h2>
                  </div>
                  <div className="flex items-center justify-center text-sm text-white/90 space-x-6">
                    <div className="flex items-center">
                      <span className="mr-2">📰</span>
                      <span className="font-medium">Son Dakika Haberleri</span>
                    </div>
                    {selectedNews?.createdAt && (
                      <div className="flex items-center">
                        <span className="mr-2">🕐</span>
                        <span className="font-medium">
                          {new Date(selectedNews.createdAt).toLocaleDateString('tr-TR', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Enhanced Modal Content */}
              <div className="p-8 max-h-[calc(90vh-12rem)] overflow-y-auto custom-scrollbar">
                {selectedNews?.loading ? (
                  <div className="animate-pulse space-y-6">
                    <div className="h-10 bg-gradient-to-r from-blue-200 to-purple-200 rounded-xl w-3/4"></div>
                    <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg w-1/4"></div>
                    <div className="space-y-3">
                      <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg"></div>
                      <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg"></div>
                      <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg w-5/6"></div>
                    </div>
                  </div>
                ) : (
                  <div className="animate-fade-in-up">
                    {/* Enhanced News Image */}
                    <div className="mb-8 relative group">
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl opacity-20 group-hover:opacity-30 transition-opacity duration-300"></div>
                      <NewsImage
                        src={normalizeImageUrl(selectedNews?.image || selectedNews?.imageUrl, selectedNews?.id) || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'}
                        alt={selectedNews?.title || 'Haber Resmi'}
                        className="relative w-full h-80 object-cover rounded-2xl border-4 border-white shadow-2xl transform group-hover:scale-[1.02] transition-transform duration-500"
                        onLoad={() => {
                          console.log(`✅ Modal resimi yüklendi: ${selectedNews?.title}`);
                        }}
                        onError={() => {
                          console.log(`❌ Modal resimi yüklenemedi, fallback kullanıldı: ${selectedNews?.title}`);
                        }}
                      />
                      <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    </div>

                    {/* Premium News Title */}
                    <div className="relative mb-6">
                      <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl blur opacity-20"></div>
                      <h1 className="relative text-3xl md:text-4xl font-bold text-gray-900 mb-4 leading-tight p-6 bg-white rounded-xl border border-gray-100 shadow-lg">
                        {selectedNews?.title}
                      </h1>
                    </div>

                    {/* Enhanced News Meta Information */}
                    <div className="flex flex-wrap items-center gap-4 mb-8 p-6 bg-gradient-to-r from-gray-50 to-blue-50 rounded-2xl border border-gray-200 shadow-inner">
                      {selectedNews?.type && (
                        <div className="flex items-center text-sm bg-white rounded-full px-4 py-2 shadow-md hover:shadow-lg transition-shadow duration-200">
                          <span className="font-semibold text-blue-600 mr-2">📂 Kategori:</span>
                          <span className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                            {selectedNews.type}
                          </span>
                        </div>
                      )}
                      
                      {selectedNews?.viewCount !== undefined && (
                        <div className="flex items-center text-sm bg-white rounded-full px-4 py-2 shadow-md hover:shadow-lg transition-shadow duration-200">
                          <span className="font-semibold text-green-600 mr-2">👁️ Okunma:</span>
                          <span className="font-bold text-gray-800">{selectedNews.viewCount.toLocaleString()}</span>
                        </div>
                      )}

                      {selectedNews?.likeCount !== undefined && (
                        <div className="flex items-center text-sm bg-white rounded-full px-4 py-2 shadow-md hover:shadow-lg transition-shadow duration-200">
                          <span className="font-semibold text-red-600 mr-2">❤️ Beğeni:</span>
                          <span className="font-bold text-gray-800">{selectedNews.likeCount.toLocaleString()}</span>
                        </div>
                      )}

                      {selectedNews?.priority && selectedNews.priority !== 'NORMAL' && (
                        <div className="flex items-center text-sm">
                          <span className={`px-4 py-2 rounded-full text-xs font-bold text-white shadow-lg transform hover:scale-105 transition-transform duration-200 ${
                            selectedNews.priority === 'KRITIK' ? 'bg-gradient-to-r from-red-600 to-red-700' :
                            selectedNews.priority === 'COK_YUKSEK' ? 'bg-gradient-to-r from-orange-500 to-orange-600' :
                            selectedNews.priority === 'YUKSEK' ? 'bg-gradient-to-r from-yellow-500 to-yellow-600' :
                            'bg-gradient-to-r from-blue-500 to-blue-600'
                          }`}>
                            ⚡ {selectedNews.priority === 'KRITIK' ? 'KRİTİK HABER' : 
                               selectedNews.priority === 'COK_YUKSEK' ? 'ÇOK ÖNEMLİ' :
                               selectedNews.priority === 'YUKSEK' ? 'ÖNEMLİ' : 'ÖZEL'}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Premium News Content */}
                    <div className="prose prose-lg max-w-none mb-8">
                      <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-lg">
                        <div className="text-gray-800 leading-8 text-justify whitespace-pre-line text-lg font-medium" style={{ lineHeight: '1.9' }}>
                          {selectedNews?.content}
                        </div>
                      </div>
                    </div>

                    {/* Premium Action Buttons Footer */}
                    <div className="mt-8 pt-6 border-t border-gray-200">
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-6 p-6 bg-gradient-to-r from-gray-50 to-blue-50 rounded-2xl border border-gray-200">
                        <div className="flex items-center gap-4">
                          {/* Enhanced Like Button */}
                          <button 
                            onClick={(e) => selectedNews && (likedNews.has(selectedNews.id) ? handleUnlikeNews(selectedNews.id, e) : handleLikeNews(selectedNews.id, e))}
                            disabled={!selectedNews || likingNews.has(selectedNews?.id)}
                            className={`flex items-center gap-3 px-6 py-3 rounded-full font-bold transition-all duration-300 transform hover:scale-105 shadow-lg ${
                              selectedNews && likedNews.has(selectedNews.id)
                                ? 'bg-gradient-to-r from-red-500 to-pink-500 text-white hover:from-red-600 hover:to-pink-600'
                                : 'bg-white text-gray-700 hover:bg-gradient-to-r hover:from-red-100 hover:to-pink-100 hover:text-red-600 border-2 border-gray-200'
                            } ${selectedNews && likingNews.has(selectedNews.id) ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            {selectedNews && likingNews.has(selectedNews.id) ? (
                              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                              <svg className="w-5 h-5" fill={selectedNews && likedNews.has(selectedNews.id) ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                              </svg>
                            )}
                            <span className="text-sm">
                              {selectedNews && likedNews.has(selectedNews.id) ? 'Beğenildi' : 'Beğen'}
                            </span>
                          </button>

                          {/* Enhanced Share Button */}
                          <button 
                            onClick={() => {
                              if (navigator.share && selectedNews) {
                                navigator.share({
                                  title: selectedNews.title,
                                  text: selectedNews.content,
                                  url: window.location.href
                                });
                              } else if (selectedNews) {
                                navigator.clipboard.writeText(`${selectedNews.title}\n\n${selectedNews.content}\n\n${window.location.href}`);
                                const toast = document.createElement('div');
                                toast.className = 'fixed top-4 right-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-6 py-3 rounded-2xl shadow-2xl z-[100] animate-bounce';
                                toast.innerHTML = '<div class="flex items-center gap-2"><span>✅</span><span class="font-bold">Haber linki kopyalandı!</span></div>';
                                document.body.appendChild(toast);
                                setTimeout(() => toast.remove(), 3000);
                              }
                            }}
                            className="flex items-center gap-3 px-6 py-3 rounded-full font-bold bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600 transition-all duration-300 transform hover:scale-105 shadow-lg"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                            </svg>
                            <span className="text-sm">Paylaş</span>
                          </button>
                        </div>

                        {/* Enhanced Close Button */}
                        <button
                          onClick={closeModal}
                          className="px-8 py-3 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-full hover:from-gray-600 hover:to-gray-700 transition-all duration-300 font-bold transform hover:scale-105 shadow-lg"
                        >
                          <span className="flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            Kapat
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default News;
