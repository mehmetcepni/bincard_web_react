import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import AuthService from '../../services/auth.service';
import NotificationService from '../../services/notification.service';
import Avatar from '../common/Avatar';

// Hesap Aktifleştirme Modal Component
const UnfreezeAccountModal = ({ 
  isOpen, 
  onClose, 
  unfreezeReason, 
  setUnfreezeReason, 
  unfreezeDescription, 
  setUnfreezeDescription, 
  onConfirm, 
  isUnfreezing,
  t 
}) => {
  if (!isOpen) return null;

  const unfreezeReasons = [
    { value: 'user_request', label: t('settings.unfreezeReasons.user_request') },
    { value: 'security_cleared', label: t('settings.unfreezeReasons.security_cleared') },
    { value: 'account_review', label: t('settings.unfreezeReasons.account_review') },
    { value: 'other', label: t('settings.unfreezeReasons.other') }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
            🔓 {t('settings.unfreezeAccount')}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-lg p-4">
            <p className="text-green-800 dark:text-green-200 text-sm">
              ⚠️ {t('settings.unfreezeAccountWarning')}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('settings.unfreezeReason')} *
            </label>
            <select
              value={unfreezeReason}
              onChange={(e) => setUnfreezeReason(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 dark:bg-gray-700 dark:text-white transition-colors"
              required
            >
              <option value="">{t('common.selectOption')}</option>
              {unfreezeReasons.map((reason) => (
                <option key={reason.value} value={reason.value}>
                  {reason.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('settings.unfreezeDescription')}
            </label>
            <textarea
              value={unfreezeDescription}
              onChange={(e) => setUnfreezeDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 dark:bg-gray-700 dark:text-white transition-colors resize-none"
              placeholder={t('settings.unfreezeDescriptionPlaceholder')}
              maxLength={500}
            />
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {unfreezeDescription.length}/500
            </div>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-700 font-medium transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={onConfirm}
              disabled={isUnfreezing || !unfreezeReason.trim()}
              className="flex-1 px-4 py-3 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center justify-center"
            >
              {isUnfreezing ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  {t('settings.unfreezing')}
                </>
              ) : (
                <>🔓 {t('settings.unfreezeConfirm')}</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const Settings = () => {
  const { t } = useTranslation();
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState('profile'); // 'profile', 'notifications' veya 'settings'
  const [settings, setSettings] = useState({
    notifications: {
      email: true,
      push: true,
      sms: false,
      news: true,
      promotions: true
    },
    privacy: {
      profileVisible: true,
      locationTracking: true,
      dataSharing: false
    },
    language: 'tr',
    theme: 'light',
    currency: 'TRY'
  });
  
  // Notifications tab states
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Avatar modal state
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  
  // Token info state
  const [tokenInfo, setTokenInfo] = useState(null);
  
  // Profile edit states
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    email: ''
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  
  // Notification detail modal states
  const [showNotificationDetailModal, setShowNotificationDetailModal] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [notificationType, setNotificationType] = useState(null); // null, SUCCESS, WARNING, ERROR

  // Hesap dondurma için state'ler
  const [showFreezeAccountModal, setShowFreezeAccountModal] = useState(false);
  const [freezeReason, setFreezeReason] = useState('');
  const [freezeDuration, setFreezeDuration] = useState(30); // Gün cinsinden
  const [isFreezing, setIsFreezing] = useState(false);

  // Hesap silme için state'ler
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteFormData, setDeleteFormData] = useState({
    password: '',
    reason: '',
    confirmDeletion: false
  });
  const [isDeleting, setIsDeleting] = useState(false);

  // Bildirim tipi simgesini belirleme
  const getNotificationIcon = (type) => {
    switch(type) {
      case 'SUCCESS': return '✅';
      case 'WARNING': return '⚠️';
      case 'ERROR': return '❌';
      case 'INFO': return '📌';
      default: return '🔔';
    }
  };

  // Bildirim okundu olarak işaretle
  const markAsRead = (id) => {
    NotificationService.markAsRead(id)
      .then(() => {
        setNotifications(prev => 
          prev.map(notif => notif.id === id ? {...notif, read: true} : notif)
        );
        toast.success(t('settings.notificationMarkedAsRead'), {
          position: 'top-center',
          autoClose: 2000
        });
      })
      .catch(err => {
        console.error('Bildirim işaretlenirken hata oluştu:', err);
        toast.error(t('settings.errorDuringOperation'), {
          position: 'top-center'
        });
      });
  };

  // Tüm bildirimleri okundu olarak işaretle
  const markAllAsRead = () => {
    NotificationService.markAllAsRead()
      .then(() => {
        setNotifications(prev => 
          prev.map(notif => ({...notif, read: true}))
        );
        toast.success(t('settings.allNotificationsMarkedAsRead'), {
          position: 'top-center',
          autoClose: 2000
        });
      })
      .catch(err => {
        console.error('Bildirimler işaretlenirken hata oluştu:', err);
        toast.error(t('settings.operationError'), {
          position: 'top-center'
        });
      });
  };
  
  // Bildirim detayını görüntüle
  const handleViewNotificationDetail = (notification) => {
    setSelectedNotification(notification);
    setLoadingDetail(true);
    
    NotificationService.getNotificationDetail(notification.id)
      .then(detailData => {
        setSelectedNotification(detailData);
        setShowNotificationDetailModal(true);
        
        // Bildirim listesinde okundu olarak işaretle
        setNotifications(prev => 
          prev.map(notif => notif.id === notification.id ? {...notif, read: true} : notif)
        );
      })
      .catch(err => {
        console.error('Bildirim detayı alınırken hata oluştu:', err);
        toast.error(t('settings.notificationDetailsError'), {
          position: 'top-center'
        });
      })
      .finally(() => {
        setLoadingDetail(false);
      });
  };

  // Bildirim silme
  const handleDeleteNotification = (notificationId, e) => {
    e.stopPropagation(); // Modal açılmasını engelle
    
    if (window.confirm(t('settings.deleteNotificationConfirm'))) {
      NotificationService.deleteNotification(notificationId)
        .then(() => {
          // Bildirim listesinden kaldır
          setNotifications(prev => 
            prev.filter(notif => notif.id !== notificationId)
          );
          toast.success(t('settings.notificationDeleted'), {
            position: 'top-center',
            autoClose: 2000
          });
        })
        .catch(err => {
          console.error('Bildirim silinirken hata oluştu:', err);
          toast.error(t('settings.notificationDeleteError'), {
            position: 'top-center'
          });
        });
    }
  };

  // Filtre değiştir
  const changeNotificationType = (type) => {
    setNotificationType(type);
    setPage(0); // Sayfa numarasını sıfırla
  };

  // Sayfa değiştir
  const changePage = (newPage) => {
    if (newPage >= 0 && newPage < totalPages) {
      setPage(newPage);
    }
  };

  const applyTheme = (theme) => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  };
  
  // Avatar değiştirme işlemlerini yönetir
  const handleAvatarClick = () => {
    setShowAvatarModal(true);
  };

  useEffect(() => {
    const checkAuth = async () => {
      // İlk olarak localStorage'da token olup olmadığını kontrol et
      const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
      
      if (!token) {
        console.warn('Token bulunamadı, kullanıcı oturum açmamış');
        setIsAuthenticated(false);
        return;
      }
      
      // Token varsa AuthService ile kontrol et
      const authStatus = AuthService.isAuthenticated();
      console.log('Auth status:', authStatus);
      setIsAuthenticated(authStatus);
      
      if (authStatus) {
        try {
          // Önce API'den profil bilgilerini çekmeyi deneyelim
          try {
            const profileData = await AuthService.getProfile();
            if (profileData) {
              console.log('API\'den profil bilgisi alındı:', profileData);
              setUser(profileData);
              
              // Profil edit verilerini de set et
              setProfileData({
                firstName: profileData.firstName || '',
                lastName: profileData.lastName || '',
                email: profileData.email || ''
              });
              
              // Profil bilgilerini localStorage'a kaydet
              localStorage.setItem('lastKnownProfile', JSON.stringify(profileData));
              return; // API'den veri alındıysa fonksiyondan çık
            }
          } catch (apiError) {
            console.warn('API\'den profil bilgisi alınamadı, localStorage kullanılacak:', apiError);
            
            // API hatası varsa token geçersiz olabilir, kontrol et
            if (apiError.response?.status === 401 || apiError.response?.status === 403) {
              console.warn('Token geçersiz görünüyor, logout yapılıyor...');
              localStorage.removeItem('accessToken');
              localStorage.removeItem('token');
              localStorage.removeItem('refreshToken');
              setIsAuthenticated(false);
              setUser(null);
              return;
            }
          }
          
          // API'den alınamazsa localStorage'dan oku
          const savedProfile = localStorage.getItem('lastKnownProfile');
          if (savedProfile) {
            console.log('localStorage\'dan profil bilgisi alındı');
            const parsedProfile = JSON.parse(savedProfile);
            setUser(parsedProfile);
            
            // Profil edit verilerini de set et
            setProfileData({
              firstName: parsedProfile.firstName || '',
              lastName: parsedProfile.lastName || '',
              email: parsedProfile.email || ''
            });
          } else {
            console.warn('Profil bilgisi localStorage\'da bulunamadı');
            toast.warning(t('settings.profileLoadError'), {
              position: 'top-center'
            });
          }
        } catch (error) {
          console.error('Profil bilgisi alınamadı:', error);
          toast.error(t('settings.profileLoadError') + ': ' + error.message);
        }
      } else {
        // Token varsa ama AuthService.isAuthenticated false dönüyorsa
        console.warn('Token var ama geçersiz, temizleniyor...');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        setUser(null);
      }
    };

    // Ayarları localStorage'dan yükle
    const savedSettings = localStorage.getItem('userSettings');
    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings));
      } catch (error) {
        console.warn('Ayarlar yüklenemedi:', error);
      }
    }

    // Tema ayarını yükle ve uygula
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      applyTheme(savedTheme);
      setSettings(prev => ({ ...prev, theme: savedTheme }));
    }

    // Asenkron fonksiyonu çağır
    checkAuth();
  }, []);
  
  // Bildirimler API'sini çağıran useEffect
  useEffect(() => {
    if (activeSubTab === 'notifications') {
      setLoading(true);
      setError(null);
      
      NotificationService.getNotifications(notificationType, page, 10)
        .then(data => {
          setNotifications(data.content);
          setTotalPages(data.totalPages);
          setLoading(false);
        })
        .catch(err => {
          console.error('Bildirimler yüklenirken hata oluştu:', err);
          setError('Bildirimler yüklenemedi. Lütfen daha sonra tekrar deneyin.');
          setLoading(false);
          toast.error('Bildirimler yüklenemedi', {
            position: 'top-center'
          });
        });
    }
  }, [page, notificationType, activeSubTab]);

  // Token bilgilerini güncelleyen useEffect
  useEffect(() => {
    if (activeSubTab === 'settings' && isAuthenticated) {
      const updateTokenInfo = () => {
        const info = getTokenInfo();
        setTokenInfo(info);
      };
      
      // İlk güncelleme
      updateTokenInfo();
      
      // Her 30 saniyede bir güncelle
      const interval = setInterval(updateTokenInfo, 30 * 1000);
      
      return () => clearInterval(interval);
    }
  }, [activeSubTab, isAuthenticated]);

  const saveSettings = () => {
    localStorage.setItem('userSettings', JSON.stringify(settings));
            toast.success(t('settings.savedSuccessfully'), {
      position: 'top-center',
      autoClose: 2000
    });
  };

  const handlePrivacyChange = (key) => {
    setSettings(prev => ({
      ...prev,
      privacy: {
        ...prev.privacy,
        [key]: !prev.privacy[key]
      }
    }));
  };

  const handleNotificationChange = (key) => {
    setSettings(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [key]: !prev.notifications[key]
      }
    }));
  };

  const handleLanguageChange = (language) => {
    setSettings(prev => ({
      ...prev,
      language
    }));
  };

  const handleThemeChange = (theme) => {
    setSettings(prev => ({
      ...prev,
      theme
    }));
    
    // Tema değişikliğini hemen uygula
    applyTheme(theme);
    
    // Local storage'a kaydet
    localStorage.setItem('theme', theme);
    
    toast.success(`${theme === 'dark' ? 'Koyu' : 'Açık'} tema aktif edildi!`, {
      position: 'top-center',
      autoClose: 2000
    });
  };

  // Profil düzenleme fonksiyonları
  const handleProfileEdit = () => {
    setIsEditingProfile(true);
  };

  const handleProfileCancel = () => {
    setIsEditingProfile(false);
    // Orijinal verilere geri dön
    setProfileData({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email || ''
    });
  };

  const handleProfileInputChange = (field, value) => {
    setProfileData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleProfileSave = async () => {
    // Veri doğrulama
    if (!profileData.firstName.trim() || !profileData.lastName.trim()) {
      toast.error('Ad ve soyad alanları boş bırakılamaz!', {
        position: 'top-center',
        autoClose: 3000
      });
      return;
    }

    // Email doğrulama (varsa)
    if (profileData.email && profileData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(profileData.email.trim())) {
        toast.error('Geçerli bir e-posta adresi girin!', {
          position: 'top-center',
          autoClose: 3000
        });
        return;
      }
    }

    setIsSavingProfile(true);

    try {
      console.log('[PROFILE_SAVE] Profil güncelleniyor:', profileData);
      console.log('[PROFILE_SAVE] Kullanıcı mevcut bilgileri:', user);

      const result = await AuthService.updateProfile({
        firstName: profileData.firstName.trim(),
        lastName: profileData.lastName.trim(),
        email: profileData.email.trim() || null
      });

      console.log('[PROFILE_SAVE] Backend response result:', result);

      if (result && result.success !== false) {
        // Kullanıcı verilerini güncelle
        const updatedUser = {
          ...user,
          firstName: profileData.firstName.trim(),
          lastName: profileData.lastName.trim(),
          email: profileData.email.trim() || user.email
        };

        console.log('[PROFILE_SAVE] Güncellenmiş kullanıcı bilgileri:', updatedUser);
        setUser(updatedUser);
        localStorage.setItem('lastKnownProfile', JSON.stringify(updatedUser));

        setIsEditingProfile(false);

        toast.success(result.message || 'Profil bilgileriniz başarıyla güncellendi!', {
          position: 'top-center',
          autoClose: 3000
        });

        // API'den güncel profil bilgilerini çek
        try {
          console.log('[PROFILE_SAVE] API\'den güncel profil bilgileri çekiliyor...');
          const refreshedProfile = await AuthService.getProfile();
          console.log('[PROFILE_SAVE] API\'den gelen güncel profil:', refreshedProfile);
          
          if (refreshedProfile) {
            setUser(refreshedProfile);
            setProfileData({
              firstName: refreshedProfile.firstName || '',
              lastName: refreshedProfile.lastName || '',
              email: refreshedProfile.email || ''
            });
            console.log('[PROFILE_SAVE] State güncellendi');
            localStorage.setItem('lastKnownProfile', JSON.stringify(refreshedProfile));
          }
        } catch (refreshError) {
          console.warn('[PROFILE_SAVE] Profil yenilenemedi:', refreshError);
        }
      } else {
        throw new Error(result.message || 'Güncelleme başarısız oldu');
      }
    } catch (error) {
      console.error('[PROFILE_SAVE] Profil güncellenemedi:', error);
      toast.error(error.message || 'Profil güncellenirken bir hata oluştu!', {
        position: 'top-center',
        autoClose: 5000
      });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const clearCache = () => {
    // Belirli cache verilerini temizle (kullanıcı verilerini koru)
    const keysToRemove = ['newsCache', 'paymentPointsCache', 'tempData'];
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
    });
    
    toast.success('Önbellek temizlendi!', {
      position: 'top-center',
      autoClose: 2000
    });
  };

  // Hesap dondurma fonksiyonları
  const handleFreezeAccount = async () => {
    if (!freezeReason.trim()) {
      toast.error(t('settings.freezeReasonRequired'), {
        position: 'top-center',
        autoClose: 3000
      });
      return;
    }

    setIsFreezing(true);

    try {
      console.log('[SETTINGS] Hesap dondurma başlatılıyor...', {
        reason: freezeReason,
        duration: freezeDuration + ' gün'
      });
      
      const result = await AuthService.freezeAccount(freezeReason.trim(), freezeDuration);
      
      console.log('[SETTINGS] Freeze account result:', result);
      
      if (result && result.success) {
        toast.success(result.message || t('settings.freezeSuccess'), {
          position: 'top-center',
          autoClose: 5000
        });
        
        // Modal'ı kapat ve formu temizle
        setShowFreezeAccountModal(false);
        setFreezeReason('');
        setFreezeDuration(30);
        
        // 2 saniye bekle, ardından login sayfasına yönlendir
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
      } else {
        throw new Error('İşlem sonucu alınamadı');
      }
    } catch (error) {
      console.error('[SETTINGS] Hesap pasifleştirme hatası:', error);
      console.error('[SETTINGS] Error type:', typeof error);
      console.error('[SETTINGS] Error message:', error.message);
      
      let errorMessage = t('settings.freezeError');
      
      if (error.message && error.message.includes('zaten pasif')) {
        errorMessage = t('settings.alreadyFrozenError');
      } else if (error.message && error.message.includes('zaten dondurulmuş')) {
        errorMessage = t('settings.alreadyFrozenError');
      } else if (error.message && error.message.includes('AccountAlreadyFrozenException')) {
        errorMessage = t('settings.alreadyFrozenError');
      } else if (error.message && error.message.includes('yetkiniz bulunmuyor')) {
        errorMessage = t('settings.unauthorizedError');
      } else if (error.message && error.message.includes('Oturum bilginiz geçersiz')) {
        errorMessage = t('settings.sessionExpiredError');
      } else if (error.message && error.message.includes('UserNotFoundException')) {
        errorMessage = t('settings.userNotFoundError');
      } else if (error.message && error.message.includes('İnternet bağlantınızı kontrol edin')) {
        errorMessage = error.message;
      } else if (error.message && error.message.includes('Demo Mode')) {
        errorMessage = error.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage, {
        position: 'top-center',
        autoClose: 5000
      });
    } finally {
      setIsFreezing(false);
    }
  };

  const openFreezeAccountModal = () => {
    setFreezeReason('');
    setFreezeDuration(30);
    setShowFreezeAccountModal(true);
  };

  const closeFreezeAccountModal = () => {
    setShowFreezeAccountModal(false);
    setFreezeReason('');
    setFreezeDuration(30);
  };

  // Hesap çözme fonksiyonları
  const handleUnfreezeAccount = async () => {
    if (!unfreezeReason.trim()) {
      toast.error(t('settings.unfreezeReasonRequired'), {
        position: 'top-center',
        autoClose: 3000
      });
      return;
    }

    setIsUnfreezing(true);

    try {
      console.log('[SETTINGS] Hesap çözme başlatılıyor...', {
        reason: unfreezeReason,
        description: unfreezeDescription.slice(0, 50) + (unfreezeDescription.length > 50 ? '...' : '')
      });
      
      const result = await AuthService.unfreezeAccount(unfreezeReason.trim(), unfreezeDescription.trim());
      
      console.log('[SETTINGS] Unfreeze account result:', result);
      
      if (result && result.success) {
        toast.success(result.message || t('settings.unfreezeSuccess'), {
          position: 'top-center',
          autoClose: 5000
        });
        
        // Modal'ı kapat ve formu temizle
        setShowUnfreezeAccountModal(false);
        setUnfreezeReason('');
        setUnfreezeDescription('');
        
        // Kullanıcıya hesabın aktif olduğunu bildir
        setTimeout(() => {
          toast.info(t('settings.accountReactivated'), {
            position: 'top-center',
            autoClose: 3000
          });
        }, 1000);
        
      } else {
        toast.error(result?.message || t('settings.unfreezeError'), {
          position: 'top-center',
          autoClose: 5000
        });
      }
      
    } catch (error) {
      console.error('[SETTINGS] Unfreeze account error:', error);
      
      let errorMessage = t('settings.unfreezeError');
      
      if (error.message && error.message.includes('zaten aktif')) {
        errorMessage = t('settings.alreadyActiveError');
      } else if (error.message && error.message.includes('AccountNotFrozenException')) {
        errorMessage = t('settings.alreadyActiveError');
      } else if (error.message && error.message.includes('yetkiniz bulunmuyor')) {
        errorMessage = t('settings.unauthorizedError');
      } else if (error.message && error.message.includes('Oturum bilginiz geçersiz')) {
        errorMessage = t('settings.sessionExpiredError');
      } else if (error.message && error.message.includes('Kullanıcı bulunamadı')) {
        errorMessage = t('settings.userNotFoundError');
      } else if (error.message && error.message.includes('UserNotFoundException')) {
        errorMessage = t('settings.userNotFoundError');
      } else if (error.message && error.message.includes('Demo Mode')) {
        errorMessage = error.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage, {
        position: 'top-center',
        autoClose: 5000
      });
    } finally {
      setIsUnfreezing(false);
    }
  };

  const openUnfreezeAccountModal = () => {
    setUnfreezeReason('');
    setUnfreezeDescription('');
    setShowUnfreezeAccountModal(true);
  };

  const closeUnfreezeAccountModal = () => {
    setShowUnfreezeAccountModal(false);
    setUnfreezeReason('');
    setUnfreezeDescription('');
  };

  // Hesap silme fonksiyonları
  const handleDeleteInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setDeleteFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const validateDeleteForm = () => {
    if (!deleteFormData.password.trim()) {
      toast.error('Şifre alanı boş olamaz', {
        position: 'top-center',
        autoClose: 3000
      });
      return false;
    }
    
    if (!deleteFormData.reason.trim()) {
      toast.error('Silme nedeni belirtilmelidir', {
        position: 'top-center',
        autoClose: 3000
      });
      return false;
    }
    
    if (deleteFormData.reason.length > 500) {
      toast.error('Silme nedeni 500 karakteri geçemez', {
        position: 'top-center',
        autoClose: 3000
      });
      return false;
    }
    
    if (!deleteFormData.confirmDeletion) {
      toast.error('Hesap silme işlemini onaylamalısınız', {
        position: 'top-center',
        autoClose: 3000
      });
      return false;
    }
    
    return true;
  };

  const handleDeleteAccount = async () => {
    if (!validateDeleteForm()) {
      return;
    }

    setIsDeleting(true);

    try {
      console.log('[SETTINGS] Hesap silme başlatılıyor...', {
        reason: deleteFormData.reason.slice(0, 50) + (deleteFormData.reason.length > 50 ? '...' : ''),
        confirmDeletion: deleteFormData.confirmDeletion
      });
      
      const result = await AuthService.deleteAccount(
        deleteFormData.password,
        deleteFormData.reason,
        deleteFormData.confirmDeletion
      );
      
      console.log('[SETTINGS] Delete account result:', result);
      
      if (result && result.success) {
        toast.success(result.message || 'Hesabınız başarıyla silindi. İyi günler dileriz.', {
          position: 'top-center',
          autoClose: 5000
        });
        
        // Modal'ı kapat
        setShowDeleteModal(false);
        
        // Kullanıcı otomatik olarak logout edilecek
        // 2 saniye bekle, ardından ana sayfaya yönlendir
        setTimeout(() => {
          window.location.href = '/';
        }, 2000);
      } else {
        throw new Error(result?.message || 'Hesap silme işlemi başarısız oldu');
      }
    } catch (error) {
      console.error('[SETTINGS] Hesap silme hatası:', error);
      
      let errorMessage = 'Hesap silme işlemi sırasında bir hata oluştu';
      
      if (error.message && error.message.includes('cüzdan')) {
        errorMessage = 'Cüzdan bakiyeniz sıfır olmadığı için hesap silinemez. Önce bakiyenizi sıfırlayın.';
      } else if (error.message && error.message.includes('şifre')) {
        errorMessage = 'Girilen şifre hatalı. Lütfen doğru şifrenizi girin.';
      } else if (error.message && error.message.includes('onay')) {
        errorMessage = 'Hesap silme işlemini onaylamalısınız.';
      } else if (error.message && error.message.includes('kullanıcı bulunamadı')) {
        errorMessage = 'Kullanıcı bulunamadı. Lütfen tekrar giriş yapmayı deneyin.';
      } else if (error.message && error.message.includes('aktif değil')) {
        errorMessage = 'Hesabınız aktif değil. Bu işlemi gerçekleştiremezsiniz.';
      } else if (error.message && error.message.includes('Oturum süresi dolmuş')) {
        errorMessage = 'Oturum süresi dolmuş. Lütfen tekrar giriş yapın.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage, {
        position: 'top-center',
        autoClose: 5000
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const openDeleteModal = () => {
    setDeleteFormData({
      password: '',
      reason: '',
      confirmDeletion: false
    });
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setDeleteFormData({
      password: '',
      reason: '',
      confirmDeletion: false
    });
  };

  const resetSettings = () => {
    const defaultSettings = {
      notifications: {
        email: true,
        push: true,
        sms: false,
        news: true,
        promotions: true
      },
      privacy: {
        profileVisible: true,
        locationTracking: true,
        dataSharing: false
      },
      language: 'tr',
      theme: 'light',
      currency: 'TRY'
    };
    
    setSettings(defaultSettings);
    applyTheme('light');
    localStorage.setItem('theme', 'light');
    
            toast.info(t('settings.resetToDefault'), {
      position: 'top-center',
      autoClose: 2000
    });
  };

  // Token yönetimi fonksiyonları
  const handleManualRefresh = async () => {
    try {
      toast.info('Token yenileniyor...', {
        position: 'top-center',
        autoClose: 2000
      });
      
      const result = await AuthService.manualRefreshToken();
      
      if (result.success) {
        // Token bilgilerini güncelle
        const updatedTokenInfo = getTokenInfo();
        setTokenInfo(updatedTokenInfo);
        
        toast.success('Token başarıyla yenilendi!', {
          position: 'top-center',
          autoClose: 3000
        });
      } else {
        toast.error(result.message || 'Token yenilenemedi', {
          position: 'top-center',
          autoClose: 3000
        });
      }
    } catch (error) {
      toast.error('Token yenileme hatası: ' + error.message, {
        position: 'top-center',
        autoClose: 3000
      });
    }
  };

  const getTokenInfo = () => {
    const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
    if (!token) return null;
    
    const timeToExpiry = AuthService.getTokenTimeToExpiry(token);
    const expirationTime = AuthService.getTokenExpirationTime(token);
    
    return {
      timeToExpiry,
      expirationTime: expirationTime ? new Date(expirationTime).toLocaleString('tr-TR') : null,
      hasRefreshToken: !!localStorage.getItem('refreshToken')
    };
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <div className="card p-8 text-center">
            <div className="w-16 h-16 bg-[#005bac] rounded-2xl flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('settings.loginRequired')}</h2>
            <p className="text-gray-600 mb-8">
              {t('settings.loginToViewSettings')}
            </p>
            <button
              onClick={() => AuthService.showLoginConfirmModal(t('settings.viewSettingsOperation'))}
              className="btn-primary w-full"
            >
              Giriş Yap
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Profil sekmesi içeriği
  const renderProfileTab = () => {
    return (
      <div className="space-y-6">
        {/* Kullanıcı Bilgileri */}
        <div className="card p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            👤 {t('settings.accountInfo')}
          </h2>
          
          {user ? (
            <div className="space-y-6">
              {/* Profil Fotoğrafı */}
              <div className="flex items-center space-x-6">
                <Avatar 
                  user={user} 
                  size="large" 
                  onClick={() => handleAvatarClick()}
                />
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    {user.firstName} {user.lastName}
                  </h3>
                  <p className="text-gray-600">{user.email}</p>
                  <button 
                    onClick={handleAvatarClick}
                    className="mt-3 text-[#005bac] hover:text-[#004690] font-medium transition-colors"
                  >
                    📷 {t('settings.changeProfilePhoto')}
                  </button>
                </div>
              </div>

              {/* Detaylı Bilgiler */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('settings.firstName')}</label>
                    <input
                      type="text"
                      value={isEditingProfile ? profileData.firstName : (user.firstName || '')}
                      onChange={(e) => isEditingProfile && handleProfileInputChange('firstName', e.target.value)}
                      className={`w-full px-4 py-3 border border-gray-300 rounded-xl focus-ring text-base ${
                        isEditingProfile ? 'bg-white' : 'bg-gray-50'
                      }`}
                      readOnly={!isEditingProfile}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('settings.lastName')}</label>
                    <input
                      type="text"
                      value={isEditingProfile ? profileData.lastName : (user.lastName || '')}
                      onChange={(e) => isEditingProfile && handleProfileInputChange('lastName', e.target.value)}
                      className={`w-full px-4 py-3 border border-gray-300 rounded-xl focus-ring text-base ${
                        isEditingProfile ? 'bg-white' : 'bg-gray-50'
                      }`}
                      readOnly={!isEditingProfile}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('settings.email')}</label>
                    <input
                      type="email"
                      value={isEditingProfile ? profileData.email : (user.email || '')}
                      onChange={(e) => isEditingProfile && handleProfileInputChange('email', e.target.value)}
                      className={`w-full px-4 py-3 border border-gray-300 rounded-xl focus-ring text-base ${
                        isEditingProfile ? 'bg-white' : 'bg-gray-50'
                      }`}
                      readOnly={!isEditingProfile}
                      placeholder={isEditingProfile ? t('settings.enterEmailPlaceholder') : t('settings.emailNotSpecified')}
                    />
                  </div>
                  
                  {/* Düzenleme Butonları */}
                  <div className="flex gap-3 mt-6">
                    {!isEditingProfile ? (
                      <button
                        onClick={handleProfileEdit}
                        className="btn-primary flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        {t('settings.edit')}
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={handleProfileSave}
                          disabled={isSavingProfile}
                          className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isSavingProfile ? (
                            <>
                              <div className="spinner"></div>
                              {t('settings.saving')}...
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                              </svg>
                              {t('common.save')}
                            </>
                          )}
                        </button>
                        <button
                          onClick={handleProfileCancel}
                          disabled={isSavingProfile}
                          className="btn-secondary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          {t('common.cancel')}
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('settings.phone')}</label>
                    <input
                      type="tel"
                      value={user.phoneNumber || ''}
                      placeholder={t('settings.phoneNotSpecified')}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-gray-50 text-base"
                      readOnly
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('settings.membershipDate')}</label>
                    <input
                      type="text"
                      value={user.createdAt ? new Date(user.createdAt).toLocaleDateString('tr-TR') : t('settings.unknown')}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-gray-50 text-base"
                      readOnly
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('settings.userId')}</label>
                    <input
                      type="text"
                      value={user.id || t('settings.unknown')}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-gray-50 text-base"
                      readOnly
                    />
                  </div>
                </div>
              </div>

              {/* Güvenlik Seçenekleri */}
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">🔐 {t('settings.security')}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button className="btn-outline flex items-center justify-center gap-2">
                    🔑 {t('settings.changePassword')}
                  </button>
                  <button className="btn-outline flex items-center justify-center gap-2">
                    📱 {t('settings.twoFactorAuth')}
                  </button>
                </div>
                
                {/* Hesap Yönetimi */}
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <h4 className="text-md font-medium text-gray-900 mb-3">{t('settings.accountManagement')}</h4>
                  <div className="grid grid-cols-1 gap-4">
                    <button 
                      onClick={openFreezeAccountModal}
                      className="btn-outline-danger flex items-center justify-center gap-2 text-red-600 border-red-300 hover:bg-red-50 hover:border-red-400"
                    >
                      🚫 {t('settings.freezeAccount')}
                    </button>
                    
                    {/* Tehlikeli İşlemler */}
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mt-4">
                      <div className="flex items-center mb-2">
                        <svg className="w-5 h-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                        <span className="text-sm font-medium text-red-800 dark:text-red-200">{t('settings.dangerousOperation')}</span>
                      </div>
                      <p className="text-sm text-red-700 dark:text-red-300 mb-3">
                        {t('settings.deleteAccountWarning')}
                      </p>
                      <button 
                        onClick={openDeleteModal}
                        className="w-full bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 text-white py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                      >
                        🗑️ {t('settings.deleteAccountPermanently')}
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    ℹ️ {t('settings.accountActivationNote')}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">👤</span>
              </div>
              <p className="text-gray-600">Profil bilgileri yüklenemedi.</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Bildirimler sekmesi içeriği 
  const renderNotificationsTab = () => {
    return (
      <div className="space-y-6">
        {/* Bildirim Listesi */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center">
              🔔 {t('settings.myNotifications')}
            </h2>
            <div className="flex space-x-2">
              <button 
                onClick={markAllAsRead}
                className="text-sm bg-blue-100 hover:bg-blue-200 dark:bg-blue-900 dark:hover:bg-blue-800 text-blue-800 dark:text-blue-200 py-1 px-3 rounded-md transition-colors"
              >
                {t('settings.markAllAsRead')}
              </button>
            </div>
          </div>

          {/* Filtre Seçenekleri */}
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              onClick={() => changeNotificationType(null)}
              className={`px-3 py-1 text-sm rounded-full transition-colors ${
                notificationType === null
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
              }`}
            >
              {t('settings.all')}
            </button>
            <button
              onClick={() => changeNotificationType('SUCCESS')}
              className={`px-3 py-1 text-sm rounded-full transition-colors ${
                notificationType === 'SUCCESS'
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
              }`}
            >
              ✅ {t('settings.successful')}
            </button>
            <button
              onClick={() => changeNotificationType('WARNING')}
              className={`px-3 py-1 text-sm rounded-full transition-colors ${
                notificationType === 'WARNING'
                  ? 'bg-yellow-500 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
              }`}
            >
              ⚠️ {t('settings.warning')}
            </button>
            <button
              onClick={() => changeNotificationType('ERROR')}
              className={`px-3 py-1 text-sm rounded-full transition-colors ${
                notificationType === 'ERROR'
                  ? 'bg-red-500 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
              }`}
            >
              ❌ {t('common.error')}
            </button>
          </div>
          
          {/* Yükleniyor göstergesi */}
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
              <p className="mt-2 text-gray-600 dark:text-gray-400">{t('settings.loadingNotifications')}...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-3">😔</div>
              <p className="text-gray-700 dark:text-gray-300">{error}</p>
            </div>
          ) : notifications.length > 0 ? (
            <>
              <div className="space-y-4">
                {notifications.map(notif => (
                  <div 
                    key={notif.id} 
                    className={`border dark:border-gray-700 rounded-lg p-4 transition-colors ${
                      notif.read 
                        ? 'bg-white dark:bg-gray-800' 
                        : 'bg-blue-50 dark:bg-blue-900/20'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="text-2xl">{getNotificationIcon(notif.type)}</div>
                      <div 
                        className="flex-grow cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
                        onClick={() => handleViewNotificationDetail(notif)}
                      >
                        <div className="flex justify-between">
                          <h3 className={`font-semibold ${!notif.read ? 'text-blue-700 dark:text-blue-400' : 'text-gray-800 dark:text-white'}`}>
                            {notif.title}
                          </h3>
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {new Date(notif.sentAt).toLocaleString('tr-TR', {day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'})}
                          </span>
                        </div>
                        <p className="text-gray-600 dark:text-gray-300 mt-1">{notif.message}</p>
                      </div>
                      
                      {/* Silme butonu */}
                      <button 
                        onClick={(e) => handleDeleteNotification(notif.id, e)}
                        className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors p-1"
                        title="Bildirimi sil"
                      >
                        🗑️
                      </button>
                    </div>
                    
                    <div className="mt-2 flex justify-end space-x-2">
                      {!notif.read && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsRead(notif.id);
                          }}
                          className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                        >
                          Okundu İşaretle
                        </button>
                      )}
                      {notif.targetUrl && (
                        <a 
                          href={notif.targetUrl} 
                          className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                        >
                          İlgili Sayfaya Git →
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Sayfalama */}
              {totalPages > 1 && (
                <div className="flex justify-center mt-6">
                  <div className="flex space-x-1">
                    <button
                      onClick={() => changePage(page - 1)}
                      disabled={page === 0}
                      className={`px-3 py-1 rounded border ${
                        page === 0
                          ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed'
                          : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                      }`}
                    >
                      ← Önceki
                    </button>
                    
                    {Array.from({ length: totalPages }, (_, i) => (
                      <button
                        key={i}
                        onClick={() => changePage(i)}
                        className={`w-8 h-8 flex items-center justify-center rounded-full ${
                          page === i
                            ? 'bg-blue-600 dark:bg-blue-700 text-white'
                            : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                        }`}
                      >
                        {i + 1}
                      </button>
                    ))}
                    
                    <button
                      onClick={() => changePage(page + 1)}
                      disabled={page === totalPages - 1}
                      className={`px-3 py-1 rounded border ${
                        page === totalPages - 1
                          ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed'
                          : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                      }`}
                    >
                      Sonraki →
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-16">
              <div className="text-5xl mb-4">📭</div>
              <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">Hiç Bildiriminiz Yok</h3>
              <p className="text-gray-600 dark:text-gray-400">
                {notificationType ? 'Bu filtre için bildirim bulunamadı.' : 'Bildirimleriniz burada görüntülenecektir.'}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Ayarlar sekmesi içeriği
  const renderSettingsTab = () => {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Bildirim Ayarları */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4 flex items-center">
              🔔 Bildirim Ayarları
            </h2>
            <div className="space-y-4">
              {Object.entries({
                email: 'E-posta Bildirimleri',
                push: 'Push Bildirimleri',
                sms: 'SMS Bildirimleri',
                news: 'Haber Bildirimleri',
                promotions: 'Promosyon Bildirimleri'
              }).map(([key, label]) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-gray-700 dark:text-gray-300">{label}</span>
                  <button
                    onClick={() => handleNotificationChange(key)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      settings.notifications[key] ? 'bg-blue-600 dark:bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        settings.notifications[key] ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Gizlilik Ayarları */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4 flex items-center">
              🔐 Gizlilik Ayarları
            </h2>
            <div className="space-y-4">
              {Object.entries({
                profileVisible: 'Profil Görünürlüğü',
                locationTracking: 'Konum Takibi',
                dataSharing: 'Veri Paylaşımı'
              }).map(([key, label]) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-gray-700 dark:text-gray-300">{label}</span>
                  <button
                    onClick={() => handlePrivacyChange(key)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      settings.privacy[key] ? 'bg-blue-600 dark:bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        settings.privacy[key] ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Dil ve Tema Ayarları */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4 flex items-center">
              🌍 Dil ve Tema
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-gray-700 dark:text-gray-300 mb-2">Dil</label>
                <select
                  value={settings.language}
                  onChange={(e) => handleLanguageChange(e.target.value)}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="tr">Türkçe</option>
                  <option value="en">English</option>
                  <option value="de">Deutsch</option>
                </select>
              </div>
              <div>
                <label className="block text-gray-700 dark:text-gray-300 mb-2">Tema</label>
                <div className="grid grid-cols-2 gap-2">
                  {['light', 'dark'].map(theme => (
                    <button
                      key={theme}
                      onClick={() => handleThemeChange(theme)}
                      className={`p-3 rounded-lg border transition-all ${
                        settings.theme === theme
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                          : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 dark:bg-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {theme === 'light' ? '☀️ Açık' : '🌙 Koyu'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Sistem Ayarları */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4 flex items-center">
              🛠️ Sistem Ayarları
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-gray-700 dark:text-gray-300 mb-2">Para Birimi</label>
                <select
                  value={settings.currency}
                  onChange={(e) => setSettings(prev => ({ ...prev, currency: e.target.value }))}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="TRY">TRY (₺)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                </select>
              </div>
              
                {/* Token Yönetimi */}
                <div className="border-t dark:border-gray-700 pt-4">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3 flex items-center">
                    🔐 Token Yönetimi
                  </h3>
                  {tokenInfo ? (
                    <div className="space-y-3">
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="font-medium text-gray-700 dark:text-gray-300">Expire süresi:</span>
                            <span className={`ml-2 ${
                              tokenInfo.timeToExpiry <= 5 ? 'text-red-600 dark:text-red-400 font-bold' : 
                              tokenInfo.timeToExpiry <= 15 ? 'text-yellow-600 dark:text-yellow-400' : 
                              'text-green-600 dark:text-green-400'
                            }`}>
                              {tokenInfo.timeToExpiry > 0 ? `${tokenInfo.timeToExpiry} dakika` : 'Süresi dolmuş'}
                            </span>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700 dark:text-gray-300">Expire zamanı:</span>
                            <span className="ml-2 text-gray-600 dark:text-gray-400 text-xs">
                              {tokenInfo.expirationTime}
                            </span>
                          </div>
                          <div className="md:col-span-2">
                            <span className="font-medium text-gray-700 dark:text-gray-300">Refresh Token:</span>
                            <span className={`ml-2 ${tokenInfo.hasRefreshToken ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                              {tokenInfo.hasRefreshToken ? '✅ Mevcut' : '❌ Yok'}
                            </span>
                          </div>
                          <div className="md:col-span-2">
                            <span className="font-medium text-gray-700 dark:text-gray-300">Auto-Refresh:</span>
                            <span className="ml-2 text-blue-600 dark:text-blue-400">
                              {tokenInfo.timeToExpiry <= 5 ? '🔄 Yakında çalışacak' : '⏳ Standby'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={handleManualRefresh}
                        className="w-full bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-medium transition-colors"
                      >
                        🔄 Token'ı Manuel Yenile
                      </button>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <span className="text-gray-500 dark:text-gray-400">Token bilgisi bulunamadı</span>
                    </div>
                  )}
                </div>
              
              <div className="space-y-2">
                <button
                  onClick={clearCache}
                  className="w-full bg-yellow-500 hover:bg-yellow-600 dark:bg-yellow-600 dark:hover:bg-yellow-700 text-white py-3 px-4 rounded-lg font-medium transition-colors"
                >
                  🗑️ Önbelleği Temizle
                </button>
                <button
                  onClick={resetSettings}
                  className="w-full bg-gray-500 hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-700 text-white py-3 px-4 rounded-lg font-medium transition-colors"
                >
                  🔄 Ayarları Sıfırla
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* İkinci satır - tek kolon */}
        <div className="grid grid-cols-1 gap-6">
          {/* Uygulama Bilgileri */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4 flex items-center">
              📱 Uygulama Bilgileri
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex justify-between md:flex-col md:justify-start">
                <span className="font-medium text-gray-700 dark:text-gray-300">Versiyon:</span>
                <span className="text-gray-600 dark:text-gray-400">1.0.0</span>
              </div>
              <div className="flex justify-between md:flex-col md:justify-start">
                <span className="font-medium text-gray-700 dark:text-gray-300">Son Güncelleme:</span>
                <span className="text-gray-600 dark:text-gray-400">22 Temmuz 2025</span>
              </div>
              <div className="flex justify-between md:flex-col md:justify-start">
                <span className="font-medium text-gray-700 dark:text-gray-300">Geliştirici:</span>
                <span className="text-gray-600 dark:text-gray-400">BinCard Team</span>
              </div>
            </div>
            <div className="pt-4 border-t dark:border-gray-700 mt-4">
              <button className="w-full bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-medium transition-colors">
                📞 Destek İletişim
              </button>
            </div>
          </div>
        </div>

        {/* Kaydet Butonu */}
        <div className="text-center">
          <button
            onClick={saveSettings}
            className="bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700 text-white py-3 px-8 rounded-lg font-bold text-lg transition-colors shadow-md"
          >
            💾 Ayarları Kaydet
          </button>
        </div>
      </div>
    );
  };

  // Avatar değiştirme modalı
  const AvatarChangeModal = () => {
    const [selectedAvatar, setSelectedAvatar] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    
    const handleClose = () => {
      setShowAvatarModal(false);
      setSelectedAvatar(null);
      setSelectedFile(null);
    };
    
    const handleFileChange = (e) => {
      const file = e.target.files[0];
      if (file) {
        // Dosya boyutu kontrolü (5MB)
        if (file.size > 5 * 1024 * 1024) {
          toast.error('Dosya boyutu 5MB\'dan küçük olmalıdır!', {
            position: 'top-center'
          });
          return;
        }
        
        // Dosya tipi kontrolü
        if (!file.type.startsWith('image/')) {
          toast.error('Lütfen geçerli bir resim dosyası seçin!', {
            position: 'top-center'
          });
          return;
        }
        
        setSelectedFile(file);
        console.log('Seçilen dosya:', file.name, file.size, file.type);
      }
    };
    
    const handleSave = async () => {
      if (!selectedFile) {
        toast.warning('Lütfen bir resim seçin!', {
          position: 'top-center'
        });
        return;
      }
      
      setUploading(true);
      
      try {
        console.log('Profil fotoğrafı yükleniyor...');
        
        const result = await AuthService.updateProfilePhoto(selectedFile);
        
        console.log('Profil fotoğrafı güncelleme sonucu:', result);
        
        // Başarılı olursa kullanıcı bilgilerini güncelle
        if (result) {
          // Profil bilgilerini yeniden çek
          try {
            const updatedProfile = await AuthService.getProfile();
            setUser(updatedProfile);
            localStorage.setItem('lastKnownProfile', JSON.stringify(updatedProfile));
          } catch (profileError) {
            console.warn('Profil bilgileri güncellenemedi:', profileError);
          }
          
          toast.success('Profil fotoğrafı başarıyla güncellendi!', {
            position: 'top-center',
            autoClose: 3000
          });
          
          handleClose();
        }
      } catch (error) {
        console.error('Profil fotoğrafı güncelleme hatası:', error);
        toast.error(error.message || 'Profil fotoğrafı güncellenemedi!', {
          position: 'top-center',
          autoClose: 5000
        });
      } finally {
        setUploading(false);
      }
    };
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md">
          <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
            <h3 className="text-xl font-bold text-gray-800 dark:text-white">Profil Fotoğrafını Değiştir</h3>
            <button 
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-200 text-lg"
            >
              &times;
            </button>
          </div>
          <div className="p-6">
            <div className="flex justify-center mb-6">
              <Avatar user={user} size="xlarge" />
            </div>
            
            <div className="mb-6">
              <p className="text-gray-700 dark:text-gray-300 mb-4">Yeni bir profil fotoğrafı yükleyin:</p>
              
              <div className="mb-4">
                <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  📷 Resim Dosyası Seç
                </label>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={handleFileChange}
                  className="block w-full text-sm text-gray-500 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-l-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">PNG, JPG, JPEG (max. 5MB)</p>
                
                {selectedFile && (
                  <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <div className="flex items-center">
                      <span className="text-green-600 dark:text-green-400 mr-2">✓</span>
                      <div>
                        <p className="text-sm font-medium text-green-800 dark:text-green-200">
                          Seçilen dosya: {selectedFile.name}
                        </p>
                        <p className="text-xs text-green-600 dark:text-green-400">
                          Boyut: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex justify-end space-x-2">
              <button
                onClick={handleClose}
                disabled={uploading}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                İptal
              </button>
              <button
                onClick={handleSave}
                disabled={uploading || !selectedFile}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {uploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Yükleniyor...
                  </>
                ) : (
                  '💾 Kaydet'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Bildirim detay modalı
  const NotificationDetailModal = () => {
    const closeModal = () => {
      setShowNotificationDetailModal(false);
      setSelectedNotification(null);
    };
    
    if (!selectedNotification) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
          <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
            <div className="flex items-center">
              <span className="text-2xl mr-2">{getNotificationIcon(selectedNotification.type)}</span>
              <h3 className="text-xl font-bold text-gray-800 dark:text-white">{selectedNotification.title}</h3>
            </div>
            <button 
              onClick={closeModal}
              className="text-gray-400 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-200 text-2xl"
            >
              &times;
            </button>
          </div>
          
          <div className="p-6">
            {loadingDetail ? (
              <div className="flex justify-center items-center py-10">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 dark:border-blue-400"></div>
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="text-gray-500 dark:text-gray-400">
                      <span className="text-sm font-medium">Tarih:</span> {new Date(selectedNotification.sentAt).toLocaleString('tr-TR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                    <div className={`text-sm font-medium ${
                      selectedNotification.read ? 'text-gray-500 dark:text-gray-400' : 'text-blue-600 dark:text-blue-400'
                    }`}>
                      {selectedNotification.read ? 'Okundu' : 'Okunmadı'}
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap text-lg leading-relaxed">
                      {selectedNotification.message}
                    </p>
                  </div>
                </div>
                
                <div className="border-t dark:border-gray-700 pt-4 flex justify-between items-center">
                  <div className="flex space-x-2">
                    {selectedNotification.targetUrl && (
                      <a 
                        href={selectedNotification.targetUrl} 
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-medium transition-colors flex items-center"
                      >
                        İlgili Sayfaya Git <span className="ml-1">→</span>
                      </a>
                    )}
                    <button 
                      onClick={() => {
                        handleDeleteNotification(selectedNotification.id, { stopPropagation: () => {} });
                        closeModal();
                      }}
                      className="bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg font-medium transition-colors flex items-center"
                    >
                      🗑️ Sil
                    </button>
                  </div>
                  <button 
                    onClick={closeModal}
                    className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white py-2 px-4 rounded-lg font-medium transition-colors"
                  >
                    Kapat
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Hesap dondurma modalı
  const FreezeAccountModal = () => {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-xl">
          {/* Modal Header */}
          <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between rounded-t-2xl">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
              🚫 {t('settings.freezeAccount')}
            </h2>
            <button
              onClick={closeFreezeAccountModal}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Modal Content */}
          <div className="p-6">
            {/* Uyarı Mesajı */}
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                    {t('settings.freezeAccountWarning')}
                  </h3>
                  <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                    <p>
                      {t('settings.freezeAccountDescription')}
                    </p>
                    <ul className="list-disc mt-2 ml-4 space-y-1">
                      <li>{t('settings.freezeAccountEffects.noAccess')}</li>
                      <li>{t('settings.freezeAccountEffects.cardsDisabled')}</li>
                      <li>{t('settings.freezeAccountEffects.supportRequired')}</li>
                      <li>{t('settings.freezeAccountEffects.autoLogout')}</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Form */}
            <div className="space-y-4">
              {/* Sebep seçimi */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('settings.freezeReason')} *
                </label>
                <select
                  value={freezeReason}
                  onChange={(e) => setFreezeReason(e.target.value)}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  required
                >
                  <option value="">{t('common.selectOption')}...</option>
                  <option value="security_concern">{t('settings.freezeReasons.security_concern')}</option>
                  <option value="lost_phone">{t('settings.freezeReasons.lost_phone')}</option>
                  <option value="suspicious_activity">{t('settings.freezeReasons.suspicious_activity')}</option>
                  <option value="temporary_break">{t('settings.freezeReasons.temporary_break')}</option>
                  <option value="other">{t('settings.freezeReasons.other')}</option>
                </select>
              </div>

              {/* Dondurma süresi */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Dondurma Süresi (Gün) *
                </label>
                <input
                  type="number"
                  value={freezeDuration}
                  onChange={(e) => setFreezeDuration(Math.max(1, Math.min(365, parseInt(e.target.value) || 1)))}
                  min="1"
                  max="365"
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="30"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Minimum 1 gün, maksimum 365 gün
                </p>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={closeFreezeAccountModal}
                disabled={isFreezing}
                className="flex-1 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 py-3 px-4 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleFreezeAccount}
                disabled={isFreezing || !freezeReason.trim()}
                className="flex-1 bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 text-white py-3 px-4 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isFreezing ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    {t('settings.freezing')}
                  </>
                ) : (
                  <>🚫 {t('settings.freezeConfirm')}</>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Hesap Silme Modal Component
  const DeleteAccountModal = () => {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-xl">
          {/* Modal Header */}
          <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between rounded-t-2xl">
            <h2 className="text-xl font-bold text-red-600 dark:text-red-400 flex items-center">
              🗑️ Hesabı Sil
            </h2>
            <button
              onClick={closeDeleteModal}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Modal Content */}
          <div className="p-6">
            {/* Uyarı Mesajı */}
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                    ⚠️ Dikkat: Bu işlem geri alınamaz!
                  </h3>
                  <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                    <p>
                      Hesabınızı sildiğinizde aşağıdaki veriler kalıcı olarak silinir:
                    </p>
                    <ul className="list-disc mt-2 ml-4 space-y-1">
                      <li>Tüm kişisel bilgileriniz</li>
                      <li>İşlem geçmişiniz</li>
                      <li>Kart bilgileriniz</li>
                      <li>Bildirim ayarlarınız</li>
                      <li>Favorileriniz ve tercihlerin</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Form */}
            <div className="space-y-4">
              {/* Şifre */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Mevcut Şifreniz *
                </label>
                <input
                  type="password"
                  name="password"
                  value={deleteFormData.password}
                  onChange={handleDeleteInputChange}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="Şifrenizi girin"
                  disabled={isDeleting}
                />
              </div>

              {/* Silme Nedeni */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Silme Nedeni *
                </label>
                <textarea
                  name="reason"
                  value={deleteFormData.reason}
                  onChange={handleDeleteInputChange}
                  rows={4}
                  maxLength={500}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                  placeholder="Hesabınızı neden silmek istiyorsunuz?"
                  disabled={isDeleting}
                />
                <div className="text-right text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {deleteFormData.reason.length}/500 karakter
                </div>
              </div>

              {/* Onay Checkbox */}
              <div className="flex items-start">
                <input
                  type="checkbox"
                  name="confirmDeletion"
                  checked={deleteFormData.confirmDeletion}
                  onChange={handleDeleteInputChange}
                  className="mt-1 h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                  disabled={isDeleting}
                />
                <label className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  Hesabımı kalıcı olarak silmek istediğimi onaylıyorum. Bu işlemin geri alınamaz olduğunu biliyorum.
                </label>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={closeDeleteModal}
                disabled={isDeleting}
                className="flex-1 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 py-3 px-4 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                İptal
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={isDeleting || !deleteFormData.password.trim() || !deleteFormData.reason.trim() || !deleteFormData.confirmDeletion}
                className="flex-1 bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 text-white py-3 px-4 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isDeleting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Siliniyor...
                  </>
                ) : (
                  <>🗑️ Hesabı Sil</>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      {showAvatarModal && <AvatarChangeModal />}
      {showNotificationDetailModal && <NotificationDetailModal />}
      {showFreezeAccountModal && <FreezeAccountModal />}
      {showDeleteModal && <DeleteAccountModal />}
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="card p-6 mb-8 bg-gradient-to-r from-[#005bac] to-[#004690] text-white">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold mb-2 fade-in">⚙️ {t('settings.title')}</h1>
              <p className="text-blue-100 fade-in">
                {t('settings.description')}
              </p>
            </div>
            {/* Tema değiştirme butonu */}
            <button
              onClick={() => handleThemeChange(settings.theme === 'light' ? 'dark' : 'light')}
              className="p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-colors duration-200"
              title={settings.theme === 'light' ? t('settings.switchToDarkMode') : t('settings.switchToLightMode')}
            >
              {settings.theme === 'light' ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="card mb-6 overflow-hidden">
          <div className="flex border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setActiveSubTab('profile')}
              className={`flex-1 py-4 px-6 text-center font-medium transition-all duration-200 ${
                activeSubTab === 'profile'
                  ? 'text-[#005bac] border-b-2 border-[#005bac] bg-blue-50 dark:bg-blue-900/30'
                  : 'text-gray-600 dark:text-gray-400 hover:text-[#005bac] hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              👤 {t('settings.profileTab')}
            </button>
            <button
              onClick={() => setActiveSubTab('notifications')}
              className={`flex-1 py-4 px-6 text-center font-medium transition-all duration-200 ${
                activeSubTab === 'notifications'
                  ? 'text-[#005bac] border-b-2 border-[#005bac] bg-blue-50 dark:bg-blue-900/30'
                  : 'text-gray-600 dark:text-gray-400 hover:text-[#005bac] hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              🔔 {t('settings.notificationsTab')}
            </button>
            <button
              onClick={() => setActiveSubTab('settings')}
              className={`flex-1 py-4 px-6 text-center font-medium transition-all duration-200 ${
                activeSubTab === 'settings'
                  ? 'text-[#005bac] border-b-2 border-[#005bac] bg-blue-50 dark:bg-blue-900/30'
                  : 'text-gray-600 dark:text-gray-400 hover:text-[#005bac] hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              ⚙️ {t('settings.appSettingsTab')}
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="slide-up">
          {activeSubTab === 'profile' 
            ? renderProfileTab() 
            : activeSubTab === 'notifications'
              ? renderNotificationsTab()
              : renderSettingsTab()}
        </div>
      </div>
    </div>
  );
};

export default Settings;
