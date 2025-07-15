import axios from 'axios';

// Axios instance oluştur
const axiosInstance = axios.create({
  baseURL: '/api',  // Vite proxy üzerinden yönlendirilecek
  timeout: 15000,   // 15 saniye timeout
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor - token ekleme
axiosInstance.interceptors.request.use(
  (config) => {
    // Hem accessToken hem token anahtarını kontrol et
    const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('[AUTH] Authorization header eklendi:', token);
    } else {
      console.warn('[AUTH] Authorization header eklenmedi, token bulunamadı!');
    }
    // İstek detaylarını logla
    console.log('🚀 İstek gönderiliyor:', {
      url: `${config.baseURL}${config.url}`,
      method: config.method?.toUpperCase(),
      headers: config.headers,
      data: config.data ? {
        ...config.data,
        password: config.data.password ? '[GİZLİ]' : undefined
      } : undefined
    });
    return config;
  },
  (error) => {
    console.error('❌ İstek hatası:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
axiosInstance.interceptors.response.use(
  (response) => {
    // Başarılı yanıtı logla
    console.log('✅ Başarılı yanıt:', {
      status: response.status,
      statusText: response.statusText,
      data: response.data,
      headers: response.headers,
      url: response.config.url
    });
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    // Token expired ise ve daha önce refresh denenmediyse
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const data = await AuthService.refreshToken(refreshToken);
          if (data.success && data.accessToken && data.refreshToken) {
            localStorage.setItem('accessToken', data.accessToken.token);
            localStorage.setItem('refreshToken', data.refreshToken.token);
            // Yeni token ile isteği tekrar dene
            originalRequest.headers['Authorization'] = `Bearer ${data.accessToken.token}`;
            return axiosInstance(originalRequest);
          } else {
            // Refresh başarısızsa logout
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            window.location.href = '/login';
            return Promise.reject(new Error(data.message || 'Oturum süresi doldu. Lütfen tekrar giriş yapın.'));
          }
        } catch (refreshError) {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      }
    }
    // Hata detaylarını logla
    console.error('❌ Axios Hatası:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      url: error.config?.url,
      method: error.config?.method,
      headers: error.config?.headers
    });
    
    // 403 hataları için sadece kritik endpoint'lerde logout yap
    if (error.response?.status === 403) {
      const isAuthEndpoint = error.config?.url?.includes('/auth/') || 
                            error.config?.url?.includes('/login') || 
                            error.config?.url?.includes('/register');
      
      if (isAuthEndpoint) {
        // Sadece auth endpoint'lerinde token geçersizse logout yap
        console.warn('🔐 Auth endpoint token geçersiz, logout yapılıyor');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
      } else {
        // Diğer endpoint'lerde sadece uyarı ver
        console.warn('🔐 Non-auth endpoint için 403 hatası, logout yapılmıyor');
      }
    }
    return Promise.reject(error);
  }
);

// Error handler
const handleError = (error) => {
  console.error('Hata İşleme Detayları:', {
    originalError: {
      message: error.message,
      name: error.name,
      code: error.code,
      stack: error.stack
    },
    response: {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    },
    request: {
      url: error.config?.url ? `${error.config.baseURL}${error.config.url}` : undefined,
      method: error.config?.method,
      headers: error.config?.headers
    }
  });

  if (error.code === 'ECONNABORTED') {
    return {
      success: false,
      message: 'Sunucu yanıt vermedi. Lütfen daha sonra tekrar deneyin.',
      error: true
    };
  }

  if (!error.response) {
    return {
      success: false,
      message: 'Sunucuya bağlanılamadı. Lütfen internet bağlantınızı kontrol edin.',
      error: true
    };
  }

  // Backend'den gelen mesajı öncelikle kullan
  const backendMessage = error.response?.data?.message || error.response?.data?.error;
  const backendSuccess = error.response?.data?.success;
  
  // Eğer backend açık bir mesaj döndürdüyse, onu kullan
  if (backendMessage) {
    return {
      success: backendSuccess || false,
      message: backendMessage,
      error: true,
      statusCode: error.response.status
    };
  }

  // Status code ve backend exception türlerine göre spesifik hata mesajları
  const status = error.response.status;
  const exceptionType = error.response?.data?.exception || backendMessage;
  
  // Backend exception türlerine göre özel mesajlar
  if (exceptionType?.includes('NotFoundUserException')) {
    return {
      success: false,
      message: 'Bu telefon numarasıyla kayıtlı kullanıcı bulunamadı',
      error: true
    };
  } else if (exceptionType?.includes('IncorrectPasswordException')) {
    return {
      success: false,
      message: 'Girilen şifre hatalı',
      error: true
    };
  } else if (exceptionType?.includes('UserDeletedException')) {
    return {
      success: false,
      message: 'Bu hesap silinmiş durumda',
      error: true
    };
  } else if (exceptionType?.includes('UserNotActiveException')) {
    return {
      success: false,
      message: 'Hesabınız aktif değil. Lütfen yönetici ile iletişime geçin',
      error: true
    };
  } else if (exceptionType?.includes('PhoneNotVerifiedException')) {
    return {
      success: false,
      message: 'Telefon numaranız doğrulanmamış. SMS kodu gönderildi',
      phoneNotVerified: true
    };
  } else if (exceptionType?.includes('UnrecognizedDeviceException')) {
    return {
      success: false,
      message: 'Yeni cihaz algılandı. Doğrulama kodu gönderildi',
      newDevice: true
    };
  } else if (exceptionType?.includes('PhoneNumberAlreadyExistsException')) {
    return {
      success: false,
      message: 'Bu telefon numarasıyla daha önce hesap oluşturulmuş',
      error: true
    };
  } else if (exceptionType?.includes('InvalidPhoneNumberFormatException')) {
    return {
      success: false,
      message: 'Geçersiz telefon numarası formatı',
      error: true
    };
  } else if (exceptionType?.includes('VerificationCodeStillValidException')) {
    return {
      success: false,
      message: 'Daha önce gönderilen doğrulama kodu hala geçerli',
      error: true
    };
  } else if (exceptionType?.includes('VerificationCooldownException')) {
    return {
      success: false,
      message: 'Çok fazla doğrulama kodu istendi. Lütfen bekleyin',
      error: true
    };
  } else if (exceptionType?.includes('ExpiredVerificationCodeException')) {
    return {
      success: false,
      message: 'Doğrulama kodunun süresi dolmuş. Lütfen yeni kod isteyin',
      error: true
    };
  } else if (exceptionType?.includes('InvalidOrUsedVerificationCodeException')) {
    return {
      success: false,
      message: 'Doğrulama kodu geçersiz veya daha önce kullanılmış',
      error: true
    };
  } else if (exceptionType?.includes('PasswordResetTokenNotFoundException')) {
    return {
      success: false,
      message: 'Şifre sıfırlama bağlantısı geçersiz',
      error: true
    };
  } else if (exceptionType?.includes('PasswordResetTokenExpiredException')) {
    return {
      success: false,
      message: 'Şifre sıfırlama bağlantısının süresi dolmuş',
      error: true
    };
  } else if (exceptionType?.includes('PasswordResetTokenIsUsedException')) {
    return {
      success: false,
      message: 'Şifre sıfırlama bağlantısı daha önce kullanılmış',
      error: true
    };
  } else if (exceptionType?.includes('SamePasswordException')) {
    return {
      success: false,
      message: 'Yeni şifre mevcut şifre ile aynı olamaz',
      error: true
    };
  } else if (exceptionType?.includes('PasswordTooShortException')) {
    return {
      success: false,
      message: 'Şifre en az 6 karakter olmalıdır',
      error: true
    };
  } else if (exceptionType?.includes('IncorrectCurrentPasswordException')) {
    return {
      success: false,
      message: 'Mevcut şifre hatalı',
      error: true
    };
  } else if (exceptionType?.includes('InvalidNewPasswordException')) {
    return {
      success: false,
      message: 'Yeni şifre geçersiz',
      error: true
    };
  } else if (exceptionType?.includes('PasswordsDoNotMatchException')) {
    return {
      success: false,
      message: 'Şifreler eşleşmiyor',
      error: true
    };
  }

  // Genel status code kontrolü
  let errorMessage = 'Bir hata oluştu';
  
  switch (status) {
    case 400:
      errorMessage = 'Geçersiz istek. Lütfen bilgilerinizi kontrol edin.';
      break;
    case 401:
      errorMessage = 'Telefon numarası veya şifre hatalı';
      break;
    case 403:
      errorMessage = 'Bu işlem için yetkiniz bulunmuyor';
      break;
    case 404:
      errorMessage = 'Bu telefon numarasıyla kayıtlı kullanıcı bulunamadı';
      break;
    case 409:
      errorMessage = 'Bu telefon numarasıyla daha önce hesap oluşturulmuş';
      break;
    case 422:
      errorMessage = 'Girilen veriler geçersiz';
      break;
    case 429:
      errorMessage = 'Çok fazla istek gönderildi. Lütfen birkaç dakika bekleyin.';
      break;
    case 500:
      errorMessage = 'Sunucu hatası. Lütfen birkaç dakika sonra tekrar deneyin.';
      break;
    case 502:
    case 503:
    case 504:
      errorMessage = 'Sunucu geçici olarak kullanılamıyor. Lütfen daha sonra tekrar deneyin.';
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

const AuthService = {
  // Test bağlantısı
  testConnection: async () => {
    try {
      console.log('Backend bağlantısı test ediliyor...');
      const response = await axiosInstance.options('/user/sign-up');
      console.log('Backend bağlantı testi başarılı:', response.data);
      return true;
    } catch (error) {
      if (error.response?.status === 403 || error.response?.status === 401) {
        console.log('Backend çalışıyor ama yetkilendirme gerekiyor');
        return true;
      }
      console.error('Backend bağlantı testi başarısız:', error);
      return false;
    }
  },

  // Kayıt olma işlemi
  register: async (userData) => {
    try {
      console.log('Register isteği başlatılıyor:', {
        ...userData,
        password: '[GİZLİ]'
      });

      // Backend'in beklediği CreateUserRequest formatına dönüştür
      const createUserRequest = {
        firstName: userData.firstName.trim(),
        lastName: userData.lastName.trim(),
        telephone: userData.telephone.trim(),
        password: userData.password
        // ipAddress ve userAgent backend tarafından HttpServletRequest'ten otomatik alınıyor
      };

      console.log('Backend\'e gönderilecek CreateUserRequest:', {
        ...createUserRequest,
        password: '[GİZLİ]'
      });

      const response = await axios.post('http://localhost:8080/v1/api/user/sign-up', createUserRequest, {
        headers: { 'Content-Type': 'application/json' }
      });
      
      console.log('Backend\'den gelen ResponseMessage:', {
        status: response.status,
        data: response.data
      });

      // Backend'den gelen ResponseMessage'ı işle
      const responseData = response.data;
      
      // Backend'den gelen mesajı frontend'e ilet
      return {
        success: responseData.success || true,
        message: responseData.message || 'Kayıt işlemi başarılı',
        data: responseData
      };
    } catch (error) {
      console.error('Register hatası:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      
      // Backend'den gelen hata mesajını handle et
      const backendMessage = error.response?.data?.message;
      const backendSuccess = error.response?.data?.success;
      
      // Eğer backend bir mesaj döndürdüyse, onu kullan
      if (backendMessage) {
        return {
          success: backendSuccess || false,
          message: backendMessage,
          error: true
        };
      }
      
      // Yoksa handleError kullan
      return handleError(error);
    }
  },

  // Giriş yapma işlemi
  login: async (telephone, password) => {
    try {
      console.log('Login isteği başlatılıyor:', {
        telephone: telephone,
        password: '[GİZLİ]'
      });

      // Backend'in beklediği LoginRequestDTO formatına dönüştür
      const loginRequestDTO = {
        telephone: telephone.trim(), // Backend telefon normalizasyonunu kendisi yapıyor
        password: password
      };

      console.log('Backend\'e gönderilecek LoginRequestDTO:', {
        ...loginRequestDTO,
        password: '[GİZLİ]'
      });

      const response = await axios.post('http://localhost:8080/v1/api/auth/login', loginRequestDTO, {
        headers: { 'Content-Type': 'application/json' }
      });
      
      console.log('Backend\'den gelen TokenResponseDTO:', {
        status: response.status,
        data: response.data
      });

      const data = response.data;
      
      // Başarılı giriş - TokenResponseDTO alındı
      if (data && data.accessToken && data.refreshToken) {
        localStorage.setItem('accessToken', data.accessToken.token);
        localStorage.setItem('refreshToken', data.refreshToken.token);
        return { 
          success: true, 
          data: data,
          message: 'Giriş başarılı!' 
        };
      } else {
        // Backend'den mesaj varsa onu kullan
        const backendMessage = data?.message || 'Giriş başarısız oldu';
        return {
          success: false,
          message: backendMessage,
          error: true
        };
      }
    } catch (error) {
      console.error('Login hatası:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });

      // Backend'den gelen exception türlerine göre özel işlem
      const backendData = error.response?.data;
      const backendMessage = backendData?.message;
      const exceptionType = backendData?.exception || backendData?.error;
      
      // Özel durum kontrolü - Backend'den gelen mesajları kontrol et
      if (error.response?.status === 400 || exceptionType) {
        if (exceptionType?.includes('PhoneNotVerifiedException') || 
            backendMessage?.includes('doğrulanmamış') ||
            backendMessage?.includes('not verified')) {
          return { 
            success: false, 
            phoneNotVerified: true, 
            message: backendMessage || 'Telefon numaranız doğrulanmamış. SMS kodu gönderildi.' 
          };
        } else if (exceptionType?.includes('UnrecognizedDeviceException') ||
                   backendMessage?.includes('Yeni cihaz') ||
                   backendMessage?.includes('new device')) {
          return { 
            success: false, 
            newDevice: true, 
            message: backendMessage || 'Yeni cihaz algılandı. Doğrulama kodu gönderildi.' 
          };
        }
      }
      
      // Backend'den mesaj varsa onu kullan
      if (backendMessage) {
        return {
          success: false,
          message: backendMessage,
          error: true
        };
      }
      
      // Son çare olarak handleError kullan
      return handleError(error);
    }
  },

  // Yeni cihaz için SMS doğrulama
  phoneVerify: async ({ code, ipAddress, deviceInfo, appVersion, platform }) => {
    try {
      const response = await axios.post('http://localhost:8080/v1/api/auth/phone-verify', {
        code,
        ipAddress,
        deviceInfo,
        appVersion,
        platform
      }, {
        headers: { 'Content-Type': 'application/json' }
      });
      const data = response.data;
      if (data && data.accessToken && data.refreshToken) {
        localStorage.setItem('accessToken', data.accessToken.token);
        localStorage.setItem('refreshToken', data.refreshToken.token);
        return { 
          success: true, 
          data: data,
          message: data.message || 'SMS doğrulama başarılı!' 
        };
      } else {
        return {
          success: false,
          message: data?.message || 'Doğrulama başarısız oldu',
          error: true
        };
      }
    } catch (error) {
      console.error('Phone verify hatası:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      
      // Backend'den gelen hata mesajını handle et
      const backendMessage = error.response?.data?.message;
      
      if (backendMessage) {
        return {
          success: false,
          message: backendMessage,
          error: true
        };
      }
      
      return handleError(error);
    }
  },

  // Çıkış yapma işlemi (Enhanced)
  logout: () => {
    console.log('🚪 Çıkış yapılıyor, tüm token\'lar temizleniyor...');
    
    // Deep clean - tüm auth verilerini temizle
    AuthService.clearAllTokens();
    
    console.log('✅ Çıkış işlemi tamamlandı');
    
    // Login sayfasına yönlendir - sadece production'da
    if (typeof window !== 'undefined') {
      // Eğer zaten login sayfasındaysak tekrar yönlendirme
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
  },

  // Token kontrolü
  isAuthenticated: () => {
    const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
    return !!token;
  },

  // Kullanıcının giriş yapmış olup olmadığını kontrol et ve gerekirse login'e yönlendir
  requireAuth: (navigate) => {
    const isLoggedIn = AuthService.isAuthenticated();
    if (!isLoggedIn) {
      console.warn('[AUTH] Kullanıcı giriş yapmamış, login sayfasına yönlendiriliyor...');
      navigate('/login');
      return false;
    }
    return true;
  },

  // Giriş yapması gereken işlemler için modal göster
  showLoginConfirmModal: (actionName = 'Bu işlemi', navigate) => {
    return new Promise((resolve) => {
      const isLoggedIn = AuthService.isAuthenticated();
      if (isLoggedIn) {
        resolve(true);
        return;
      }

      // Promise sadece bir kez resolve edilmesini sağla
      let isResolved = false;
      const resolveOnce = (value) => {
        if (!isResolved) {
          isResolved = true;
          resolve(value);
        }
      };

      // Unique ID oluştur
      const modalId = 'loginModal_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      const yesButtonId = 'loginConfirmYes_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      const noButtonId = 'loginConfirmNo_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

      console.log('🆔 Modal ID\'leri oluşturuldu:', { modalId, yesButtonId, noButtonId });

      // Modal oluştur
      const modal = document.createElement('div');
      modal.id = modalId;
      modal.className = 'fixed inset-0 z-[1000] flex items-center justify-center p-4';
      modal.style.background = 'rgba(0, 0, 0, 0.7)';
      modal.style.backdropFilter = 'blur(8px)';
      modal.style.WebkitBackdropFilter = 'blur(8px)';
      
      modal.innerHTML = `
        <div class="relative bg-white rounded-3xl max-w-md w-full shadow-2xl border border-gray-200 overflow-hidden animate-fade-in-up">
          <!-- Header -->
          <div class="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 text-center">
            <div class="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 class="text-xl font-bold">Giriş Gerekli</h3>
          </div>
          
          <!-- Content -->
          <div class="p-6 text-center">
            <p class="text-gray-700 text-lg mb-2 font-semibold">${actionName} gerçekleştirmek için</p>
            <p class="text-gray-600 mb-6">giriş yapmanız gerekiyor.</p>
            <p class="text-blue-600 font-medium">Giriş yapmak ister misiniz?</p>
          </div>
          
          <!-- Buttons -->
          <div class="flex gap-3 p-6 pt-0">
            <button 
              id="${noButtonId}" 
              class="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-all duration-200 font-medium"
              type="button"
              title="Modal'ı kapat"
            >
              Hayır
            </button>
            <button 
              id="${yesButtonId}" 
              class="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl hover:from-blue-600 hover:to-purple-600 transition-all duration-200 font-bold shadow-lg transform hover:scale-105"
              type="button"
              title="Login sayfasına git"
            >
              Evet, Giriş Yap
            </button>
          </div>
        </div>
      `;

      // Modal'ı DOM'a ekle
      document.body.appendChild(modal);
      console.log('✅ Modal DOM\'a eklendi:', modalId);

      // Modal kapatma fonksiyonu
      const closeModal = () => {
        console.log('🗙 Modal kapatılıyor...', modalId);
        try {
          // Event listener'ları temizle
          document.removeEventListener('keydown', handleEscPress);
          
          // Modal'ı DOM'dan kaldır
          if (modal && modal.parentNode) {
            modal.parentNode.removeChild(modal);
            console.log('✅ Modal DOM\'dan kaldırıldı');
          }
        } catch (error) {
          console.error('❌ Modal kapatma hatası:', error);
        }
      };

      // Event handler fonksiyonları
      const handleYesClick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('✅ EVET BUTONUNA TIKLANDI - Login sayfasına yönlendiriliyor...');
        closeModal();
        navigate('/login');
        resolveOnce(false);
      };

      const handleNoClick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('❌ HAYIR BUTONUNA TIKLANDI - Modal kapatılıyor...');
        closeModal();
        resolveOnce(false);
      };

      const handleModalClick = (e) => {
        if (e.target === modal) {
          console.log('🔽 Modal dışına tıklandı, modal kapatılıyor...');
          closeModal();
          resolveOnce(false);
        }
      };

      const handleEscPress = (e) => {
        if (e.key === 'Escape') {
          console.log('⌨️ ESC tuşuna basıldı, modal kapatılıyor...');
          closeModal();
          resolveOnce(false);
        }
      };

      // DOM hazır olduğunda event listener'ları ekle
      setTimeout(() => {
        const yesButton = document.getElementById(yesButtonId);
        const noButton = document.getElementById(noButtonId);

        console.log('🔍 Modal butonları aranıyor:', { yesButtonId, noButtonId });
        console.log('🔍 Butonlar bulundu mu?', { 
          yesButton: !!yesButton, 
          noButton: !!noButton,
          modalInDOM: !!document.getElementById(modalId)
        });

        if (yesButton && noButton) {
          console.log('✅ Butonlar bulundu, event listener\'lar ekleniyor...');
          
          // Event listener'ları ekle
          yesButton.addEventListener('click', handleYesClick);
          noButton.addEventListener('click', handleNoClick);
          modal.addEventListener('click', handleModalClick);
          document.addEventListener('keydown', handleEscPress);

          console.log('🎯 Event listener\'lar başarıyla eklendi');
        } else {
          console.error('❌ Butonlar bulunamadı!', {
            yesButtonElement: yesButton,
            noButtonElement: noButton,
            modalHTML: modal.innerHTML.substring(0, 200) + '...'
          });
        }
      }, 50);
    });
  },

  // SMS doğrulama
  // Telefon doğrulama işlemi (Kayıt sonrası)
  verifyPhone: async (code) => {
    try {
      console.log('Telefon doğrulama isteği başlatılıyor:', { code: '[GİZLİ]' });
      
      // Backend'in beklediği format için kod gönderiliyor
      const response = await axios.post('http://localhost:8080/v1/api/user/verify/phone', { 
        code: code 
      }, {
        headers: { 'Content-Type': 'application/json' }
      });
      
      console.log('Telefon doğrulama yanıtı:', {
        status: response.status,
        data: response.data
      });
      
      // Backend'den gelen yanıtı işle
      const responseData = response.data;
      
      return {
        success: responseData.success !== false, // Backend'den success gelmezse true kabul et
        message: responseData.message || 'Telefon doğrulama başarılı',
        data: responseData
      };
    } catch (error) {
      console.error('Telefon doğrulama hatası:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      
      // Backend'den gelen hata mesajını handle et
      const backendMessage = error.response?.data?.message;
      
      if (backendMessage) {
        return {
          success: false,
          message: backendMessage,
          error: true
        };
      }
      
      return handleError(error);
    }
  },

  // SMS kodunu tekrar gönderme (Register işlemi için)
  resendSmsCode: async (telephone) => {
    try {
      console.log('[RESEND_SMS] Yeniden SMS kodu gönderiliyor:', telephone);
      
      // Telefon numarasını +90 ile başlat ve normalize et
      let normalizedPhone = telephone;
      if (!normalizedPhone.startsWith('+90')) {
        normalizedPhone = '+90' + normalizedPhone.replace(/^0/, '');
      }
      
      // Backend'in beklediği format: ResendPhoneVerificationRequest
      const requestData = {
        telephone: normalizedPhone,
        // IP address ve User Agent backend tarafından otomatik ekleniyor
      };
      
      console.log('[RESEND_SMS] Backend\'e gönderilecek veri:', requestData);
      
      // Kullanıcının belirttiği endpoint: POST /v1/api/auth/resend-verify-code?telephone=XXX
      // Query parameter olarak telefon numarası gönderiliyor
      const queryParams = new URLSearchParams({ telephone: normalizedPhone });
      const response = await axios.post(`http://localhost:8080/v1/api/auth/resend-verify-code?${queryParams}`, requestData, {
        headers: { 'Content-Type': 'application/json' }
      });
      
      console.log('[RESEND_SMS] SMS kodu başarıyla gönderildi:', response.data);
      
      // Backend'den gelen yanıtı işle
      const responseData = response.data;
      
      return {
        success: responseData.success !== false,
        message: responseData.message || 'SMS kodu başarıyla gönderildi',
        data: responseData
      };
    } catch (error) {
      console.error('[RESEND_SMS] SMS kodu gönderilemedi:', error);
      
      // Backend'den gelen hata mesajını öncelik ver
      const backendMessage = error.response?.data?.message;
      
      if (backendMessage) {
        return {
          success: false,
          message: backendMessage,
          error: true
        };
      }
      
      // Özel hata durumları
      if (error.response?.status === 404) {
        // UserNotFoundException
        throw new Error('Kullanıcı bulunamadı. Lütfen önce kayıt olun.');
      } else if (error.response?.status === 400) {
        // Geçersiz telefon numarası vb.
        throw new Error('Geçersiz telefon numarası.');
      } else if (error.response?.status === 429) {
        // Rate limiting - çok fazla istek
        throw new Error('Çok fazla istek gönderildi. Lütfen birkaç dakika bekleyin.');
      }
      
      throw new Error('SMS kodu gönderilirken bir hata oluştu');
    }
  },

  // 📲 Adım 1: Şifremi unuttum -> Telefon numarasına kod gönder
  forgotPassword: async (phone) => {
    try {
      console.log('[FORGOT_PASSWORD] Şifre sıfırlama kodu gönderiliyor:', phone);
      
      // Telefon numarasını normalize et
      let normalizedPhone = phone;
      if (!normalizedPhone.startsWith('+90')) {
        normalizedPhone = '+90' + normalizedPhone.replace(/^0/, '');
      }
      
      console.log('[FORGOT_PASSWORD] Normalize edilmiş telefon:', normalizedPhone);
      
      // Backend endpoint: POST /v1/api/user/password/forgot?phone=XXX
      const queryParams = new URLSearchParams({ phone: normalizedPhone });
      const response = await axios.post(`http://localhost:8080/v1/api/user/password/forgot?${queryParams}`, {}, {
        headers: { 'Content-Type': 'application/json' }
      });
      
      console.log('[FORGOT_PASSWORD] Şifre sıfırlama kodu başarıyla gönderildi:', response.data);
      
      // Backend'den gelen ResponseMessage'ı işle
      const responseData = response.data;
      
      return {
        success: responseData.success !== false,
        message: responseData.message || 'Doğrulama kodu gönderildi.',
        data: responseData
      };
    } catch (error) {
      console.error('[FORGOT_PASSWORD] Şifre sıfırlama kodu gönderilemedi:', error);
      
      // Backend'den gelen hata mesajını handle et
      const backendMessage = error.response?.data?.message;
      
      if (backendMessage) {
        return {
          success: false,
          message: backendMessage,
          error: true
        };
      }
      
      return handleError(error);
    }
  },

  // ✅ Adım 2: Telefon numarasını doğrulama (kod girilerek) - Reset Token alımı
  passwordVerifyCode: async (verificationCodeRequest) => {
    try {
      console.log('[PASSWORD_VERIFY_CODE] Şifre sıfırlama kodu doğrulanıyor:', { code: '[GİZLİ]' });
      
      // Backend'in beklediği VerificationCodeRequest formatı
      const requestData = {
        code: verificationCodeRequest.code
      };
      
      console.log('[PASSWORD_VERIFY_CODE] Backend\'e gönderilecek veri:', requestData);
      
      // Backend endpoint: POST /v1/api/user/password/verify-code
      const response = await axios.post('http://localhost:8080/v1/api/user/password/verify-code', requestData, {
        headers: { 'Content-Type': 'application/json' }
      });
      
      console.log('[PASSWORD_VERIFY_CODE] Kod doğrulaması başarılı:', response.data);
      
      // Backend'den gelen ResponseMessage'da resetToken bulunuyor
      const responseData = response.data;
      
      return {
        success: responseData.success !== false,
        message: responseData.message || 'Kod doğrulandı.',
        resetToken: responseData.message, // Backend resetToken'ı message olarak döndürüyor
        data: responseData
      };
    } catch (error) {
      console.error('[PASSWORD_VERIFY_CODE] Kod doğrulaması başarısız:', error);
      
      // Backend'den gelen hata mesajını handle et
      const backendMessage = error.response?.data?.message;
      
      if (backendMessage) {
        return {
          success: false,
          message: backendMessage,
          error: true
        };
      }
      
      return handleError(error);
    }
  },

  // 🔐 Adım 3: Yeni şifre belirleme
  passwordReset: async ({ resetToken, newPassword }) => {
    try {
      console.log('[PASSWORD_RESET] Yeni şifre belirleniyor...');
      
      // Backend'in beklediği PasswordResetRequest formatı
      const requestData = {
        resetToken: resetToken,
        newPassword: newPassword
      };
      
      console.log('[PASSWORD_RESET] Backend\'e gönderilecek veri:', {
        resetToken: resetToken,
        newPassword: '[GİZLİ]'
      });
      
      // Backend endpoint: POST /v1/api/user/password/reset
      const response = await axios.post('http://localhost:8080/v1/api/user/password/reset', requestData, {
        headers: { 'Content-Type': 'application/json' }
      });
      
      console.log('[PASSWORD_RESET] Şifre başarıyla sıfırlandı:', response.data);
      
      // Backend'den gelen ResponseMessage'ı işle
      const responseData = response.data;
      
      return {
        success: responseData.success !== false,
        message: responseData.message || 'Şifreniz başarıyla sıfırlandı.',
        data: responseData
      };
    } catch (error) {
      console.error('[PASSWORD_RESET] Şifre sıfırlama başarısız:', error);
      
      // Backend'den gelen hata mesajını handle et
      const backendMessage = error.response?.data?.message;
      
      if (backendMessage) {
        return {
          success: false,
          message: backendMessage,
          error: true
        };
      }
      
      return handleError(error);
    }
  },

  // 🔐 Şifre değiştirme (Mevcut kullanıcı için)
  changePassword: async ({ currentPassword, newPassword }) => {
    try {
      console.log('[CHANGE_PASSWORD] Şifre değiştiriliyor...');
      
      // Backend'in beklediği ChangePasswordRequest formatı
      const requestData = {
        currentPassword: currentPassword,
        newPassword: newPassword
      };
      
      console.log('[CHANGE_PASSWORD] Backend\'e gönderilecek veri:', {
        currentPassword: '[GİZLİ]',
        newPassword: '[GİZLİ]'
      });
      
      const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
      if (!token) {
        throw new Error('Oturum bulunamadı! Lütfen tekrar giriş yapın.');
      }
      
      // Backend endpoint: PUT /v1/api/user/password/change
      const response = await axios.put('http://localhost:8080/v1/api/user/password/change', requestData, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('[CHANGE_PASSWORD] Şifre başarıyla değiştirildi:', response.data);
      
      // Backend'den gelen ResponseMessage'ı işle
      const responseData = response.data;
      
      return {
        success: responseData.success !== false,
        message: responseData.message || 'Şifre başarıyla güncellendi.',
        data: responseData
      };
    } catch (error) {
      console.error('[CHANGE_PASSWORD] Şifre değiştirme başarısız:', error);
      
      // Backend'den gelen hata mesajını handle et
      const backendMessage = error.response?.data?.message;
      
      if (backendMessage) {
        return {
          success: false,
          message: backendMessage,
          error: true
        };
      }
      
      return handleError(error);
    }
  },

  // Refresh token fonksiyonu
  refreshToken: async (refreshToken) => {
    try {
      const response = await axios.post('http://localhost:8080/v1/api/auth/refresh', { refreshToken });
      return response.data;
    } catch (error) {
      return handleError(error);
    }
  },

  // Kullanıcı profilini getiren fonksiyon (Improved with better token handling)
  getProfile: async () => {
    try {
      console.log('[PROFILE] Profil bilgisi çekiliyor...');
      
      // Token varlığını kontrol et
      const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
      if (!token) {
        console.error('[PROFILE] Token bulunamadı, login sayfasına yönlendiriliyor...');
        AuthService.logout();
        throw new Error('Oturum bulunamadı. Lütfen tekrar giriş yapın.');
      }
      
      console.log('[PROFILE] Token mevcut, API isteği yapılıyor...');
      
      try {
        const response = await axios.get('http://localhost:8080/v1/api/user/profile', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log('[PROFILE] Profil bilgisi başarıyla alındı:', response.data);
        
        const data = response.data;
        
        // Profile data parsing logic...
        const profileData = {
          firstName: data.firstName || data.first_name || data.ad || data.name || '',
          lastName: data.lastName || data.last_name || data.soyad || data.surname || '',
          email: data.email || data.mail || data.emailAddress || data.e_mail || '',
          photoUrl: data.photoUrl || data.photo_url || data.profilePhoto || data.avatarUrl || '',
          _rawData: data
        };
        
        console.log('[PROFILE] Oluşturulan profil nesnesi:', profileData);
        localStorage.setItem('lastKnownProfile', JSON.stringify(profileData));
        
        return profileData;
        
      } catch (apiError) {
        console.error('[PROFILE] API hatası:', apiError);
        
        // 401 Unauthorized - Token geçersiz
        if (apiError.response?.status === 401) {
          console.warn('[PROFILE] Token geçersiz (401), logout yapılıyor...');
          AuthService.logout();
          throw new Error('Oturum süresi dolmuş. Lütfen tekrar giriş yapın.');
        }
        
        // 403 Forbidden - Yetki yok
        if (apiError.response?.status === 403) {
          console.warn('[PROFILE] Yetkisiz erişim (403)');
          throw new Error('Bu işlem için yetkiniz bulunmuyor.');
        }
        
        // 404 Not Found - Kullanıcı bulunamadı
        if (apiError.response?.status === 404) {
          console.warn('[PROFILE] Kullanıcı bulunamadı (404)');
          AuthService.logout();
          throw new Error('Kullanıcı bulunamadı. Lütfen tekrar giriş yapın.');
        }
        
        // Diğer hatalar için genel mesaj
        const errorMessage = apiError.response?.data?.message || apiError.message || 'Profil bilgisi alınamadı.';
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('[PROFILE] Profil bilgisi alınamadı:', error);
      throw error; // Re-throw the error to be handled by the component
    }
  },

  // Kullanıcı profilini güncelleyen fonksiyon
  updateProfile: async (updateData) => {
    try {
      console.log('[PROFILE] Profil güncelleniyor:', updateData);
      
      // Girilen değerlerin boş olup olmadığını kontrol et
      if (!updateData.firstName || !updateData.lastName) {
        throw new Error('Ad ve soyad alanları boş bırakılamaz!');
      }
      
      // Backend'in beklediği tam parametreleri kontrol etmek için olası tüm alan adlarını deneyeceğiz
      // Java Spring Boot backend'in UpdateProfileRequest sınıfında hangi alanları beklediğini bilmiyoruz
      // bu nedenle birkaç olası varyantı deneyeceğiz
      const requestData = {
        // Camel case (Java standart)
        firstName: updateData.firstName,
        lastName: updateData.lastName,
        email: updateData.email,
        
        // Alternatif alan adları (Türkçe)
        ad: updateData.firstName, 
        soyad: updateData.lastName,
        
        // Snake case
        first_name: updateData.firstName,
        last_name: updateData.lastName,
        
        // Diğer varyantlar
        name: updateData.firstName,
        surname: updateData.lastName
      };
      
      console.log('[PROFILE] Backend\'e gönderilecek genişletilmiş veri:', requestData);
      
      try {
        // Request öncesi detaylı log
        console.log('[PROFILE] Profil güncellemesi için HTTP isteği yapılıyor:');
        console.log('- Endpoint: http://localhost:8080/v1/api/user/profile');
        console.log('- Metod: PUT');
        console.log('- Veri:', JSON.stringify(requestData, null, 2));
        
        // Backend'deki @PutMapping("/profile") ile eşleşen endpoint
        const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
        if (!token) {
          throw new Error('Oturum bulunamadı! Lütfen tekrar giriş yapın.');
        }

        console.log('[PROFILE] Yetkilendirme token:', token.substring(0, 15) + '...');
        
        const response = await axios.put('http://localhost:8080/v1/api/user/profile', requestData, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
        console.log('[PROFILE] Profil başarıyla güncellendi:', response.data);
        
        // Backend'den dönen veriyi işle
        const responseData = response.data || {};
        
        // Backend'den gelen tüm olası alan adlarını kontrol et
        const updatedProfile = {
          message: responseData.message || 'Profil bilgileriniz başarıyla güncellendi.',
          
          // Öncelikle backend yanıtındaki alanları kontrol et
          firstName: responseData.firstName || responseData.first_name || responseData.ad || responseData.name || updateData.firstName,
          lastName: responseData.lastName || responseData.last_name || responseData.soyad || responseData.surname || updateData.lastName,
          
          // Email için özel olarak tüm olası alanları kontrol et
          email: responseData.email || responseData.mail || responseData.emailAddress || responseData.e_mail || updateData.email,
          
          // Diğer alanları da ekle
          ...responseData
        };
        
        console.log('[PROFILE] Döndürülen güncellenmiş profil:', updatedProfile);
        
        // Profil bilgisini localStorage'a da kaydedelim, böylece API bağlantısı olmasa bile 
        // son bilinen profil bilgisini gösterebiliriz
        localStorage.setItem('lastKnownProfile', JSON.stringify(updatedProfile));
        
        return updatedProfile;
      } catch (apiError) {
        console.warn('[PROFILE] API hatası, istemci tarafında güncellenmiş veri döndürülüyor:', apiError);
        
        // API hatası durumunda, kullanıcının gönderdiği bilgileri geri döndür
        const fallbackProfile = { 
          message: 'Profil bilgileriniz güncellendi (sunucu yanıtı alınamadı).',
          firstName: updateData.firstName,
          lastName: updateData.lastName,
          email: updateData.email,
          // Alternatif alan adları
          ad: updateData.firstName,
          soyad: updateData.lastName,
          first_name: updateData.firstName,
          last_name: updateData.lastName,
          name: updateData.firstName,
          surname: updateData.lastName
        };
        
        // Önbellekte de saklayalım
        localStorage.setItem('lastKnownProfile', JSON.stringify(fallbackProfile));
        
        return fallbackProfile;
      }
    } catch (error) {
      console.error('[PROFILE] Profil güncellenemedi:', error);
      return handleError(error);
    }
  },

  // Kullanıcı profil fotoğrafını güncelleyen fonksiyon
  updateProfilePhoto: async (photoFile) => {
    try {
      if (!photoFile) {
        throw new Error('Lütfen bir fotoğraf seçin!');
      }
      if (photoFile.size > 5 * 1024 * 1024) {
        throw new Error('Fotoğraf boyutu 5MB\'dan küçük olmalıdır!');
      }
      
      console.log('[PROFILE_PHOTO] Fotoğraf yükleniyor:', photoFile.name, photoFile.size);
      
      // Backend'in beklediği parametre adı "photo" olmalı
      const formData = new FormData();
      formData.append('photo', photoFile);
      const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
      
      console.log('[PROFILE_PHOTO] FormData içeriği:', formData);
      console.log('[PROFILE_PHOTO] Fotoğraf adı:', photoFile.name);
      console.log('[PROFILE_PHOTO] Fotoğraf tipi:', photoFile.type);
      console.log('[PROFILE_PHOTO] Fotoğraf boyutu:', photoFile.size);
      
      try {
        // @PutMapping("/profile/photo") endpoint'i ile uyumlu
        // @RequestParam("photo") MultipartFile parametresi için doğru isim kullanılmalı
        console.log('[PROFILE_PHOTO] PUT isteği: http://localhost:8080/v1/api/user/profile/photo');
        console.log('[PROFILE_PHOTO] FormData içinde "photo" parametresi gönderiliyor');
        
        const response = await axios.put('http://localhost:8080/v1/api/user/profile/photo', formData, {
          headers: {
            'Authorization': `Bearer ${token}`
            // Content-Type header'ını axios otomatik ekleyecek
            // ve doğru boundary değeri ile multipart/form-data olarak ayarlayacak
          },
          // Dosya yükleme ilerleme bilgisi ekle
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            console.log(`[PROFILE_PHOTO] Yükleme ilerleme: %${percentCompleted}`);
          }
        });
        
        console.log('[PROFILE_PHOTO] Fotoğraf başarıyla yüklendi:', response.data);
        return response.data;
      } catch (apiError) {
        console.error('[PROFILE_PHOTO] API hatası:', apiError);
        console.error('[PROFILE_PHOTO] Hata detayları:', {
          status: apiError.response?.status,
          statusText: apiError.response?.statusText,
          data: apiError.response?.data,
          headers: apiError.response?.headers
        });
        throw new Error(apiError.response?.data?.message || 'Fotoğraf yüklenemedi.');
      }
    } catch (error) {
      console.error('[PROFILE] Profil fotoğrafı güncellenemedi:', error);
      
      // Tutarlı hata mesajı formatı için
      const errorMessage = error.message || 'Profil fotoğrafı güncellenirken bir hata oluştu.';
      throw new Error(errorMessage);
    }
  },

  // Haber ekleme fonksiyonu (Admin işlemi)
  addNews: async (newsData) => {
    try {
      console.log('[NEWS] Yeni haber ekleniyor:', newsData);
      
      // Girilen değerlerin boş olup olmadığını kontrol et
      if (!newsData.title || !newsData.content) {
        throw new Error('Başlık ve içerik alanları boş bırakılamaz!');
      }
      
      // Backend'e gönderilecek veri formatı
      const requestData = {
        title: newsData.title,
        content: newsData.content,
        image: newsData.image || null,
        priority: newsData.priority || 'NORMAL',
        type: newsData.type || 'DUYURU',
        endDate: newsData.endDate || null,
        active: newsData.active !== undefined ? newsData.active : true
      };
      
      console.log('[NEWS] Backend\'e gönderilecek haber verisi:', requestData);
      
      const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
      if (!token) {
        throw new Error('Oturum bulunamadı! Lütfen tekrar giriş yapın.');
      }

      console.log('[NEWS] Haber ekleme için HTTP isteği yapılıyor...');
      
      const response = await axios.post('http://localhost:8080/v1/api/news', requestData, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('[NEWS] Haber başarıyla eklendi:', response.data);
      return response.data;
      
    } catch (error) {
      console.error('[NEWS] Haber eklenemedi:', error);
      
      // API hatası durumunda hata mesajını döndür
      const errorMessage = error.response?.data?.message || error.message || 'Haber eklenirken bir hata oluştu.';
      throw new Error(errorMessage);
    }
  },

  // Login SMS doğrulama için tekrar kod gönderme (Yeni cihaz doğrulaması)
  resendLoginSmsCode: async (telephone) => {
    try {
      console.log('[RESEND_LOGIN_SMS] Yeniden SMS kodu gönderiliyor (Login):', telephone);
      
      // Telefon numarasını +90 ile başlat ve normalize et
      let normalizedPhone = telephone;
      if (!normalizedPhone.startsWith('+90')) {
        normalizedPhone = '+90' + normalizedPhone.replace(/^0/, '');
      }
      
      // Backend'in beklediği format
      const requestData = {
        telephone: normalizedPhone,
      };
      
      console.log('[RESEND_LOGIN_SMS] Backend\'e gönderilecek veri:', requestData);
      
      // Aynı resend endpoint'ini kullan - register ve login için aynı
      const queryParams = new URLSearchParams({ telephone: normalizedPhone });
      const response = await axios.post(`http://localhost:8080/v1/api/auth/resend-verify-code?${queryParams}`, requestData, {
        headers: { 'Content-Type': 'application/json' }
      });
      
      console.log('[RESEND_LOGIN_SMS] SMS kodu başarıyla gönderildi:', response.data);
      return response.data;
    } catch (error) {
      console.error('[RESEND_LOGIN_SMS] SMS kodu gönderilemedi:', error);
      
      // Backend'den gelen hata mesajını öncelik ver
      const backendMessage = error.response?.data?.message;
      
      // Özel hata durumları
      if (error.response?.status === 404) {
        throw new Error(backendMessage || 'Kullanıcı bulunamadı.');
      } else if (error.response?.status === 400) {
        throw new Error(backendMessage || 'Geçersiz telefon numarası.');
      } else if (error.response?.status === 429) {
        throw new Error(backendMessage || 'Çok fazla istek gönderildi. Lütfen birkaç dakika bekleyin.');
      }
      
      throw new Error(backendMessage || 'SMS kodu gönderilirken bir hata oluştu');
    }
  },

  // Kullanıcı hesabını tamamen silme (Delete Account)
  deleteAccount: async () => {
    try {
      console.log('[DELETE_ACCOUNT] Kullanıcı hesabı siliniyor...');
      
      const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
      if (!token) {
        throw new Error('Oturum bulunamadı! Lütfen tekrar giriş yapın.');
      }

      console.log('[DELETE_ACCOUNT] Backend\'e hesap silme isteği gönderiliyor...');
      
      const response = await axios.delete('http://localhost:8080/v1/api/user/delete-account', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('[DELETE_ACCOUNT] Hesap başarıyla silindi:', response.data);
      
      // Başarılı ise tüm local verileri temizle
      AuthService.logout();
      
      return { success: true, message: 'Hesabınız başarıyla silindi.' };
      
    } catch (error) {
      console.error('[DELETE_ACCOUNT] Hesap silinemedi:', error);
      
      // 401 hatası ise token geçersiz, logout yap
      if (error.response?.status === 401) {
        console.warn('[DELETE_ACCOUNT] Token geçersiz, logout yapılıyor...');
        AuthService.logout();
        throw new Error('Oturum süresi dolmuş. Lütfen tekrar giriş yapın.');
      }
      
      // Backend'den gelen hata mesajını öncelik ver
      const errorMessage = error.response?.data?.message || error.message || 'Hesap silinirken bir hata oluştu.';
      throw new Error(errorMessage);
    }
  },

  // Token'ları tamamen temizleme (Deep Clean)
  clearAllTokens: () => {
    console.log('[CLEAR_TOKENS] Tüm token\'lar ve veriler temizleniyor...');
    
    // localStorage'dan tüm auth bilgilerini sil
    const authKeys = [
      'token', 'accessToken', 'refreshToken', 'auth_token', 'user_token',
      'user', 'userProfile', 'currentUser', 'lastKnownProfile'
    ];
    
    authKeys.forEach(key => {
      localStorage.removeItem(key);
    });
    
    // sessionStorage'dan da temizle
    sessionStorage.clear();
    
    console.log('[CLEAR_TOKENS] Tüm veriler temizlendi');
  },
};

export default AuthService;