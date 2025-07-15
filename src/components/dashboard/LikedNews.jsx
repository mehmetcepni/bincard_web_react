import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import NewsService from '../../services/news.service';
import AuthService from '../../services/auth.service';
import { toast } from 'react-toastify';

// Resim URL'sini düzeltme fonksiyonu
const normalizeImageUrl = (imageUrl, newsId) => {
  console.log(`🔍 [Beğenilen Haber ${newsId}] Original imageUrl:`, imageUrl);
  
  if (!imageUrl || imageUrl === '' || imageUrl === null || imageUrl === undefined) {
    console.log(`📷 [Beğenilen Haber ${newsId}] Resim yok, boş bırakılıyor`);
    return null;
  }
  
  let finalUrl = imageUrl;
  
  if (imageUrl.startsWith('/')) {
    finalUrl = `http://localhost:8080${imageUrl}`;
    console.log(`🔗 [Beğenilen Haber ${newsId}] Relative path düzeltildi:`, finalUrl);
  } else if (!imageUrl.startsWith('http')) {
    finalUrl = `https://${imageUrl}`;
    console.log(`🔒 [Beğenilen Haber ${newsId}] Protocol eklendi:`, finalUrl);
  } else {
    console.log(`✅ [Beğenilen Haber ${newsId}] URL geçerli:`, finalUrl);
  }
  
  // Geçersiz URL'leri filtrele
  if (finalUrl.includes('example.com')) {
    console.log(`🚫 [Beğenilen Haber ${newsId}] Geçersiz URL algılandı, resim gösterilmeyecek:`, finalUrl);
    return null;
  }
  
  return finalUrl;
};

const LikedNews = () => {
  const navigate = useNavigate();
  const [likedNews, setLikedNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [removingNews, setRemovingNews] = useState(new Set());
  const [selectedNews, setSelectedNews] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    // Auth kontrolü
    const checkAuth = async () => {
      try {
        console.log('🔐 [LIKED_NEWS] Auth kontrolü yapılıyor...');
        const authResult = await AuthService.showLoginConfirmModal('Beğenilen haberleri görüntüleme işlemini', navigate);
        console.log('🔐 [LIKED_NEWS] Auth modal sonucu:', authResult);
        
        if (!authResult && !AuthService.isAuthenticated()) {
          // Kullanıcı giriş yapmak istemedi, ana sayfaya yönlendir
          console.log('🔄 [LIKED_NEWS] Kullanıcı giriş yapmak istemedi, dashboard\'a yönlendiriliyor...');
          navigate('/dashboard');
          return;
        }
        
        console.log('✅ [LIKED_NEWS] Auth kontrolü tamamlandı, beğenilen haberler getiriliyor...');
        fetchLikedNews();
      } catch (error) {
        console.error('❌ [LIKED_NEWS] Auth kontrolü hatası:', error);
        navigate('/dashboard');
      }
    };

    if (!AuthService.isAuthenticated()) {
      checkAuth();
    } else {
      fetchLikedNews();
    }
  }, [navigate]);

  // Pagination hesaplamaları
  const totalPages = Math.ceil(likedNews.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentNews = likedNews.slice(startIndex, endIndex);

  // Beğenilen haberleri çekme
  const fetchLikedNews = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔄 Beğenilen haberler getiriliyor...');
      const data = await NewsService.getLikedNews();
      
      if (data && Array.isArray(data)) {
        console.log('✅ Beğenilen haberler başarıyla getirildi:', data.length, 'haber');
        setLikedNews(data);
      } else {
        console.warn('⚠️ Beğenilen haber verisi beklenmeyen formatta:', data);
        setLikedNews([]);
      }
    } catch (error) {
      console.error('❌ Beğenilen haberler getirilirken hata:', error);
      setError('Beğenilen haberler yüklenirken bir hata oluştu: ' + error.message);
      setLikedNews([]);
    } finally {
      setLoading(false);
    }
  };

  // Haber detayını getirme ve modal açma
  const handleNewsClick = async (news) => {
    try {
      console.log('📰 Beğenilen haber detayı açılıyor:', news.id);
      
      setSelectedNews({ loading: true });
      setIsModalOpen(true);
      
      try {
        console.log('🔄 Haber detayı getiriliyor...');
        const detailData = await NewsService.getNewsDetail(news.id);
        console.log('✅ Haber detayı başarıyla getirildi:', detailData);
        
        setSelectedNews({
          ...detailData,
          loading: false
        });
      } catch (detailError) {
        console.error('❌ Haber detayı getirilemedi:', detailError);
        setIsModalOpen(false);
        setSelectedNews(null);
        alert('Haber detayı yüklenirken bir hata oluştu: ' + detailError.message);
      }
    } catch (error) {
      console.error('❌ Modal açılırken hata:', error);
      alert('Haber açılırken bir hata oluştu: ' + error.message);
    }
  };

  // Modal'ı kapatma fonksiyonu
  const closeModal = () => {
    setIsModalOpen(false);
    setTimeout(() => setSelectedNews(null), 300);
  };

  // ESC tuşu ile modal kapatma
  useEffect(() => {
    const handleEscapeKey = (event) => {
      if (event.keyCode === 27 && isModalOpen) {
        closeModal();
      }
    };
    document.addEventListener('keydown', handleEscapeKey);
    return () => document.removeEventListener('keydown', handleEscapeKey);
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

  // Beğeniyi kaldırma işlemi
  const handleRemoveLike = async (newsId) => {
    try {
      console.log('💔 Beğeni kaldırılıyor:', newsId);
      
      setRemovingNews(prev => new Set([...prev, newsId]));
      
      try {
        const result = await NewsService.unlikeNews(newsId);
        console.log('✅ Beğeni başarıyla kaldırıldı:', result);
        
        setLikedNews(prev => prev.filter(news => news.id !== newsId));
        
        if (selectedNews && selectedNews.id === newsId) {
          closeModal();
        }
        
        // Success toast
        const toast = document.createElement('div');
        toast.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-[100] animate-fade-in-up';
        toast.innerHTML = '💔 Beğeni kaldırıldı!';
        document.body.appendChild(toast);
        setTimeout(() => {
          toast.remove();
        }, 3000);
        
      } catch (error) {
        console.error('❌ Beğeni kaldırılamadı:', error);
        alert('Beğeni kaldırılırken bir hata oluştu: ' + error.message);
      }
    } catch (error) {
      console.error('❌ Unlike işleminde hata:', error);
      alert('İşlem sırasında bir hata oluştu: ' + error.message);
    } finally {
      setRemovingNews(prev => {
        const newSet = new Set(prev);
        newSet.delete(newsId);
        return newSet;
      });
    }
  };

  // Loading durumu
  if (loading) {
    return (
      <div className="py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-xl shadow-md p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="h-8 bg-gray-200 rounded w-64 animate-pulse"></div>
              <div className="h-8 bg-gray-200 rounded w-32 animate-pulse"></div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl shadow-md overflow-hidden h-72">
                <div className="h-40 bg-gray-200 animate-pulse"></div>
                <div className="p-4">
                  <div className="h-5 bg-gray-200 rounded mb-2 animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3 mb-2 animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Error durumu
  if (error) {
    return (
      <div className="py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-center items-center min-h-[80vh]">
            <div className="bg-red-50 p-8 rounded-lg border border-red-200 text-red-700 max-w-md text-center">
              <svg className="w-16 h-16 mx-auto text-red-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-xl font-bold mb-2">Bir Hata Oluştu</h3>
              <p className="mb-4">{error}</p>
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
            <h1 className="text-2xl font-bold text-red-700 mb-2 md:mb-0 flex items-center">
              <svg className="w-8 h-8 mr-3 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
              </svg>
              Beğendiğiniz Haberler
            </h1>
            
            <div className="text-sm text-gray-600">
              <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full font-medium">
                {likedNews.length} beğenilen haber
              </span>
            </div>
          </div>
          
          {likedNews.length === 0 ? (
            <div className="text-center py-8">
              <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              <p className="text-gray-600 text-lg">Henüz beğendiğiniz haber bulunmuyor.</p>
              <p className="text-gray-500 text-sm mt-2">Haberler sekmesinden haberleri beğenerek buraya ekleyebilirsiniz.</p>
            </div>
          ) : (
            <p className="text-gray-600">
              Beğendiğiniz haberler bu sayfada listelenmektedir. Bir haberi beğenmeyi bırakmak için ❤️ butonuna tekrar tıklayabilirsiniz.
            </p>
          )}
        </div>

        {/* News Grid */}
        {likedNews.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {currentNews.map((news) => (
              <div 
                key={news.id} 
                className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 cursor-pointer"
                onClick={() => handleNewsClick(news)}
              >
                <div className="relative">
                  {news.image ? (
                    <img 
                      src={normalizeImageUrl(news.image, news.id)}
                      alt={news.title}
                      className="w-full h-48 object-cover"
                      onError={(e) => {
                        console.log('Beğenilen haber resim yükleme hatası:', e.target.src);
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div 
                    className="w-full h-48 bg-gradient-to-br from-red-500 to-pink-600 flex items-center justify-center"
                    style={{ display: news.image ? 'none' : 'flex' }}
                  >
                    <svg className="w-16 h-16 text-white opacity-50" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                    </svg>
                  </div>
                  
                  {/* Love badge */}
                  <div className="absolute top-3 right-3">
                    <div className="bg-red-500 text-white p-2 rounded-full shadow-lg">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                </div>
                
                <div className="p-6">
                  <h3 className="font-bold text-lg text-gray-900 mb-2 line-clamp-2 hover:text-red-700 transition-colors">
                    {news.title}
                  </h3>
                  
                  <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                    {news.content}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      {news.type && (
                        <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full">
                          {news.type}
                        </span>
                      )}
                      {news.viewCount !== undefined && (
                        <span className="flex items-center">
                          <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                            <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                          </svg>
                          {news.viewCount}
                        </span>
                      )}
                      {news.likeCount !== undefined && (
                        <span className="flex items-center text-red-600">
                          <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                          </svg>
                          {news.likeCount}
                        </span>
                      )}
                    </div>
                    
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveLike(news.id);
                      }}
                      disabled={removingNews.has(news.id)}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                        removingNews.has(news.id)
                          ? 'opacity-50 cursor-not-allowed bg-gray-300 text-gray-600'
                          : 'bg-red-100 text-red-700 hover:bg-red-200 hover:text-red-800'
                      }`}
                    >
                      {removingNews.has(news.id) ? (
                        <>
                          <div className="w-3 h-3 border border-gray-600 border-t-transparent rounded-full animate-spin"></div>
                          <span>Kaldırılıyor...</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                          </svg>
                          <span>Kaldır</span>
                        </>
                      )}
                    </button>
                  </div>
                  
                  {news.createdAt && (
                    <div className="mt-3 text-xs text-gray-400">
                      {new Date(news.createdAt).toLocaleDateString('tr-TR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {likedNews.length > 0 && totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between">
            <nav className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                  currentPage === 1
                    ? 'opacity-50 cursor-not-allowed bg-gray-100 text-gray-500'
                    : 'bg-white text-gray-700 hover:bg-red-50 hover:text-red-600 shadow-md'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Önceki
              </button>

              <div className="flex items-center gap-2 mx-4">
                {[...Array(totalPages)].map((_, i) => {
                  const pageNum = i + 1;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-10 h-10 rounded-lg font-medium transition-all duration-200 ${
                        currentPage === pageNum
                          ? 'bg-red-600 text-white shadow-lg'
                          : 'bg-white text-gray-700 hover:bg-red-50 hover:text-red-600 shadow-md'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                  currentPage === totalPages
                    ? 'opacity-50 cursor-not-allowed bg-gray-100 text-gray-500'
                    : 'bg-white text-gray-700 hover:bg-red-50 hover:text-red-600 shadow-md'
                }`}
              >
                Sonraki
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </nav>
          </div>
        )}

        {/* Page Info */}
        {likedNews.length > 0 && totalPages > 1 && (
          <div className="text-center mt-6">
            <span className="text-sm text-gray-600">
              <strong>{startIndex + 1}-{Math.min(endIndex, likedNews.length)}</strong> / <strong>{likedNews.length}</strong> beğenilen haber gösteriliyor
            </span>
          </div>
        )}
      </div>

      {/* Premium Liked News Modal with Blur Background */}
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
            <div className="absolute -top-10 -left-10 w-20 h-20 bg-red-500/20 rounded-full animate-pulse"></div>
            <div className="absolute top-1/4 -right-5 w-16 h-16 bg-pink-500/20 rounded-full animate-bounce" style={{animationDelay: '0.5s'}}></div>
            <div className="absolute -bottom-10 left-1/3 w-24 h-24 bg-rose-500/20 rounded-full animate-pulse" style={{animationDelay: '1s'}}></div>
            <div className="absolute top-1/2 left-10 w-12 h-12 bg-purple-500/20 rounded-full animate-bounce" style={{animationDelay: '1.5s'}}></div>
          </div>

          <div 
            className={`relative bg-white/95 backdrop-blur-sm rounded-3xl max-w-6xl w-full max-h-[95vh] overflow-hidden shadow-2xl border border-white/20 transform transition-all duration-500 ${
              isModalOpen ? 'scale-100 opacity-100 translate-y-0' : 'scale-95 opacity-0 translate-y-10'
            }`}
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(254,242,242,0.98) 100%)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.4)'
            }}
          >
            {/* Premium Modal Header for Liked News */}
            <div className="relative px-8 py-6 bg-gradient-to-r from-red-600 via-pink-600 to-rose-800 text-white overflow-hidden">
              {/* Animated Background Pattern */}
              <div className="absolute inset-0 opacity-20">
                <div className="absolute top-0 left-0 w-full h-full animate-pulse">
                  <div className="w-full h-full" style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M10 10h40v40H10z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
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
              
              {/* Enhanced Liked News Header */}
              <div className="relative z-10 text-center">
                <div className="flex items-center justify-center mb-3">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mr-3 animate-pulse">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <h2 className="text-3xl font-bold tracking-wide">💕 Beğendiğiniz Haberler</h2>
                </div>
                <div className="flex items-center justify-center text-sm text-white/90 space-x-6">
                  <div className="flex items-center">
                    <span className="mr-2">📰</span>
                    <span className="font-medium">BinCard Haber Arşivi</span>
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
                  <div className="h-10 bg-gradient-to-r from-red-200 to-pink-200 rounded-xl w-3/4"></div>
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
                  {selectedNews?.image && (
                    <div className="mb-8 relative group">
                      <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-pink-500 rounded-2xl opacity-20 group-hover:opacity-30 transition-opacity duration-300"></div>
                      <img 
                        src={normalizeImageUrl(selectedNews.image, selectedNews.id)}
                        alt={selectedNews.title}
                        className="relative w-full h-80 object-cover rounded-2xl border-4 border-white shadow-2xl transform group-hover:scale-[1.02] transition-transform duration-500"
                        onError={(e) => {
                          console.log('Beğenilen haber detay resim yükleme hatası:', e.target.src);
                          e.target.style.display = 'none';
                        }}
                      />
                      <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    </div>
                  )}

                  {/* Premium News Title */}
                  <div className="relative mb-6">
                    <div className="absolute -inset-1 bg-gradient-to-r from-red-600 to-pink-600 rounded-2xl blur opacity-20"></div>
                    <h1 className="relative text-3xl md:text-4xl font-bold text-gray-900 mb-4 leading-tight p-6 bg-white rounded-xl border border-red-100 shadow-lg">
                      {selectedNews?.title}
                    </h1>
                  </div>

                  {/* Enhanced Special Liked News Badge */}
                  <div className="mb-8 relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-pink-500 rounded-2xl blur opacity-20"></div>
                    <div className="relative bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-200 rounded-2xl p-6 shadow-lg">
                      <div className="flex items-center justify-center">
                        <div className="flex items-center text-red-700 bg-white rounded-full px-6 py-3 shadow-md">
                          <svg className="w-6 h-6 mr-3 text-red-600 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                          </svg>
                          <span className="font-bold text-lg">Bu haberi beğendiniz!</span>
                          <div className="ml-3 w-2 h-2 bg-red-500 rounded-full animate-ping"></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Enhanced News Meta Information */}
                  <div className="flex flex-wrap items-center gap-4 mb-8 p-6 bg-gradient-to-r from-red-50 to-pink-50 rounded-2xl border border-red-200 shadow-inner">
                    {selectedNews?.type && (
                      <div className="flex items-center text-sm bg-white rounded-full px-4 py-2 shadow-md hover:shadow-lg transition-shadow duration-200">
                        <span className="font-semibold text-red-600 mr-2">📂 Kategori:</span>
                        <span className="bg-gradient-to-r from-red-500 to-pink-500 text-white px-3 py-1 rounded-full text-xs font-bold">
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
                          'bg-gradient-to-r from-red-500 to-red-600'
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
                    <div className="bg-white p-8 rounded-2xl border border-red-200 shadow-lg">
                      <div className="text-gray-800 leading-8 text-justify whitespace-pre-line text-lg font-medium" style={{ lineHeight: '1.9' }}>
                        {selectedNews?.content}
                      </div>
                    </div>
                  </div>

                  {/* Premium Action Buttons Footer */}
                  <div className="mt-8 pt-6 border-t border-red-200">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-6 p-6 bg-gradient-to-r from-red-50 to-pink-50 rounded-2xl border border-red-200">
                      <div className="flex items-center gap-4">
                        {/* Enhanced Remove Like Button */}
                        <button 
                          onClick={() => selectedNews && handleRemoveLike(selectedNews.id)}
                          disabled={!selectedNews || removingNews.has(selectedNews?.id)}
                          className={`flex items-center gap-3 px-6 py-3 rounded-full font-bold transition-all duration-300 transform hover:scale-105 shadow-lg ${
                            selectedNews && removingNews.has(selectedNews.id)
                              ? 'opacity-50 cursor-not-allowed bg-gray-300 text-gray-600'
                              : 'bg-gradient-to-r from-red-500 to-pink-500 text-white hover:from-red-600 hover:to-pink-600'
                          }`}
                        >
                          {selectedNews && removingNews.has(selectedNews.id) ? (
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                            </svg>
                          )}
                          <span className="text-sm">
                            {selectedNews && removingNews.has(selectedNews.id) ? 'Kaldırılıyor...' : 'Beğeniyi Kaldır'}
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
  );
};

export default LikedNews;