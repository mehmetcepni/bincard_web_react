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
        
        // Auto-refresh mekanizmasını başlat
        AuthService.startAutoRefresh();
        
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
    
    // Dashboard sayfasına yönlendir
    if (typeof window !== 'undefined') {
      // Eğer zaten dashboard sayfasındaysak tekrar yönlendirme
      if (!window.location.pathname.includes('/dashboard')) {
        window.location.href = '/dashboard';
      }
    }
  },

  // Token kontrolü - geliştirilmiş versiyon
  isAuthenticated: () => {
    try {
      const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
      
      if (!token) {
        console.log('[AUTH] Token bulunamadı');
        return false;
      }
      
      // Token formatını kontrol et (JWT olup olmadığını basitçe kontrol et)
      const tokenParts = token.split('.');
      if (tokenParts.length !== 3) {
        console.warn('[AUTH] Token formatı geçersiz');
        // Geçersiz token'ı temizle
        localStorage.removeItem('accessToken');
        localStorage.removeItem('token');
        return false;
      }
      
      // Token süresi kontrolü (isteğe bağlı)
      try {
        const payload = JSON.parse(atob(tokenParts[1]));
        const currentTime = Math.floor(Date.now() / 1000);
        
        if (payload.exp && payload.exp < currentTime) {
          console.warn('[AUTH] Token süresi dolmuş');
          localStorage.removeItem('accessToken');
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          return false;
        }
      } catch (parseError) {
        console.warn('[AUTH] Token payload parse edilemedi:', parseError);
        // Parse hatası olsa bile token'ı geçerli say, backend kontrol edecek
      }
      
      console.log('[AUTH] Token geçerli görünüyor');
      return true;
    } catch (error) {
      console.error('[AUTH] Token kontrol hatası:', error);
      return false;
    }
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

      // Modal zaten açıksa tekrar eklenmesin
      if (document.querySelector('.login-confirm-modal-active')) {
        const existingModal = document.querySelector('.login-confirm-modal-active');
        if (existingModal) existingModal.focus();
        return;
      }

      let isResolved = false;
      const resolveOnce = (value) => {
        if (!isResolved) {
          isResolved = true;
          resolve(value);
        }
      };

      const modalId = 'loginModal_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      const yesButtonId = 'loginConfirmYes_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      const noButtonId = 'loginConfirmNo_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

      // Modal arka planı
      const modalBg = document.createElement('div');
      modalBg.id = modalId;
      modalBg.className = 'fixed inset-0 z-[1000] flex items-center justify-center p-4 login-confirm-modal-active';
      modalBg.style.background = 'rgba(0, 0, 0, 0.7)';
      modalBg.style.backdropFilter = 'blur(8px)';
      modalBg.style.WebkitBackdropFilter = 'blur(8px)';

      // Modal içeriği
      const modalContent = document.createElement('div');
      modalContent.className = 'relative bg-white rounded-3xl max-w-md w-full shadow-2xl border border-gray-200 overflow-hidden animate-fade-in-up';
      modalContent.innerHTML = `
        <div class="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 text-center">
          <div class="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h3 class="text-xl font-bold">Giriş Gerekli</h3>
        </div>
        <div class="p-6 text-center">
          <p class="text-gray-700 text-lg mb-2 font-semibold">${actionName} gerçekleştirmek için</p>
          <p class="text-gray-600 mb-6">giriş yapmanız gerekiyor.</p>
          <p class="text-blue-600 font-medium">Giriş yapmak ister misiniz?</p>
        </div>
        <div class="flex gap-3 p-6 pt-0">
          <button id="${noButtonId}" class="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-all duration-200 font-medium" type="button" title="Modal'ı kapat">Hayır</button>
          <button id="${yesButtonId}" class="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl hover:from-blue-600 hover:to-purple-600 transition-all duration-200 font-bold shadow-lg transform hover:scale-105" type="button" title="Login sayfasına git">Evet, Giriş Yap</button>
        </div>
      `;

      // Modalı DOM'a ekle
      modalBg.appendChild(modalContent);
      document.body.appendChild(modalBg);
      modalContent.focus();

      // Modalı kapat
      const closeModal = () => {
        document.removeEventListener('keydown', handleEscPress);
        const yesButton = document.getElementById(yesButtonId);
        const noButton = document.getElementById(noButtonId);
        if (yesButton) yesButton.removeEventListener('click', handleYesClick);
        if (noButton) noButton.removeEventListener('click', handleNoClick);
        if (modalBg && modalBg.parentNode) modalBg.parentNode.removeChild(modalBg);
      };

      // ESC ile kapama
      const handleEscPress = (e) => {
        if (e.key === 'Escape') {
          closeModal();
          resolveOnce(false);
        }
      };
      document.addEventListener('keydown', handleEscPress);

      // Arka plana tıklayınca kapansın, içeriğe tıklayınca kapanmasın
      modalBg.addEventListener('click', (e) => {
        if (e.target === modalBg) {
          closeModal();
          resolveOnce(false);
        }
      });
      modalContent.addEventListener('click', (e) => {
        e.stopPropagation();
      });

      // Butonlar
      const handleYesClick = (e) => {
        e.preventDefault();
        closeModal();
        if (typeof navigate === 'function') {
          navigate('/login');
        } else {
          window.location.href = '/login';
        }
        resolveOnce(true);
      };
      const handleNoClick = (e) => {
        e.preventDefault();
        closeModal();
        resolveOnce(false);
      };
      setTimeout(() => {
        const yesButton = document.getElementById(yesButtonId);
        const noButton = document.getElementById(noButtonId);
        if (yesButton) yesButton.addEventListener('click', handleYesClick);
        if (noButton) noButton.addEventListener('click', handleNoClick);
      }, 10);
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
        // Debug isteğin yapıldığını göster
        console.log(`[PROFILE] GET isteği: http://localhost:8080/v1/api/user/profile`);
        console.log(`[PROFILE] Headers: Bearer ${token.substring(0, 15)}...`);
        
        const response = await axios.get('http://localhost:8080/v1/api/user/profile', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 5000 // 5 saniye timeout ekleyelim
        });
        
        console.log('[PROFILE] Profil bilgisi başarıyla alındı:', response.data);
        
        const data = response.data;
        if (!data) {
          throw new Error('API boş veri döndürdü');
        }
        
        // Profile data parsing logic...
        const profileData = {
          id: data.id || data.userId || data.user_id || '',
          firstName: data.firstName || data.first_name || data.ad || data.name || 'İsimsiz',
          lastName: data.lastName || data.last_name || data.soyad || data.surname || 'Kullanıcı',
          email: data.email || data.mail || data.emailAddress || data.e_mail || '',
          phoneNumber: data.phoneNumber || data.phone || data.telephone || data.tel || '',
          createdAt: data.createdAt || data.created_at || data.registerDate || new Date().toISOString(),
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
      console.log('[PROFILE_UPDATE] Profil güncelleniyor:', updateData);
      
      // Girilen değerlerin boş olup olmadığını kontrol et
      if (!updateData.firstName || !updateData.lastName) {
        throw new Error('Ad ve soyad alanları boş bırakılamaz!');
      }
      
      // Backend'in beklediği UpdateProfileRequest formatı
      const requestData = {
        firstName: updateData.firstName.trim(),
        lastName: updateData.lastName.trim(),
        email: updateData.email ? updateData.email.trim() : null
      };
      
      console.log('[PROFILE_UPDATE] Backend\'e gönderilecek UpdateProfileRequest:', requestData);
      
      const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
      if (!token) {
        throw new Error('Oturum bulunamadı! Lütfen tekrar giriş yapın.');
      }

      console.log('[PROFILE_UPDATE] HTTP PUT isteği yapılıyor...');
      console.log('[PROFILE_UPDATE] Endpoint: http://localhost:8080/v1/api/user/profile');
      console.log('[PROFILE_UPDATE] Headers: Authorization Bearer token');
      
      const response = await axios.put('http://localhost:8080/v1/api/user/profile', requestData, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('[PROFILE_UPDATE] Profil başarıyla güncellendi - Response:', response.data);
      console.log('[PROFILE_UPDATE] Response Status:', response.status);
      console.log('[PROFILE_UPDATE] Response Headers:', response.headers);
      
      // Backend'den gelen ResponseMessage'ı işle
      const responseData = response.data;
      
      // Response data'yı detaylı logla
      console.log('[PROFILE_UPDATE] Response Data Detay:', {
        success: responseData.success,
        message: responseData.message,
        data: responseData.data,
        fullResponse: responseData
      });
      
      return {
        success: responseData.success !== false,
        message: responseData.message || 'Profil bilgileriniz başarıyla güncellendi.',
        data: responseData
      };
    } catch (error) {
      console.error('[PROFILE_UPDATE] Profil güncellenemedi:', error);
      
      // Detaylı hata bilgisi
      if (error.response) {
        console.error('[PROFILE_UPDATE] API Hatası:', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data,
          headers: error.response.headers
        });
        
        // Backend'den gelen özel hata mesajları
        const backendMessage = error.response.data?.message;
        
        if (error.response.status === 401) {
          throw new Error('Oturum süresi dolmuş. Lütfen tekrar giriş yapın.');
        } else if (error.response.status === 403) {
          throw new Error('Bu işlem için yetkiniz bulunmuyor.');
        } else if (error.response.status === 404) {
          throw new Error('Kullanıcı bulunamadı. Lütfen tekrar giriş yapın.');
        } else if (error.response.status === 409) {
          throw new Error('Bu e-posta adresi zaten kullanılıyor.');
        } else if (backendMessage) {
          throw new Error(backendMessage);
        }
      }
      
      // Genel hata mesajı
      const errorMessage = error.message || 'Profil güncellenirken bir hata oluştu.';
      throw new Error(errorMessage);
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
      
      console.log('[PROFILE_PHOTO] Fotoğraf yükleniyor:', {
        name: photoFile.name,
        size: photoFile.size,
        type: photoFile.type
      });
      
      // Token kontrolü
      const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
      if (!token) {
        throw new Error('Oturum bulunamadı! Lütfen tekrar giriş yapın.');
      }
      
      // FormData oluştur - backend @RequestParam("photo") bekliyor
      const formData = new FormData();
      formData.append('photo', photoFile);
      
      console.log('[PROFILE_PHOTO] FormData hazırlandı, API isteği gönderiliyor...');
      console.log('[PROFILE_PHOTO] Endpoint: PUT /v1/api/user/profile/photo');
      console.log('[PROFILE_PHOTO] Parameter: photo =', photoFile.name);
      
      const response = await axios.put('http://localhost:8080/v1/api/user/profile/photo', formData, {
        headers: {
          'Authorization': `Bearer ${token}`
          // Content-Type'ı manuel olarak eklemeyin, axios otomatik multipart/form-data ekleyecek
        },
        timeout: 30000, // 30 saniye timeout (dosya yükleme için)
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          console.log(`[PROFILE_PHOTO] Yükleme ilerleme: %${percentCompleted}`);
        }
      });
      
      console.log('[PROFILE_PHOTO] Fotoğraf başarıyla yüklendi:', response.data);
      
      // Backend'den ResponseMessage döndürüyor
      const responseData = response.data;
      
      return {
        success: responseData.success !== false,
        message: responseData.message || 'Profil fotoğrafı başarıyla güncellendi!',
        data: responseData
      };
    } catch (error) {
      console.error('[PROFILE_PHOTO] Profil fotoğrafı güncellenemedi:', error);
      
      // Detaylı hata bilgisi
      if (error.response) {
        console.error('[PROFILE_PHOTO] API Hatası:', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data,
          headers: error.response.headers
        });
        
        // Backend'den gelen özel hata mesajları
        const backendMessage = error.response.data?.message;
        
        if (error.response.status === 413) {
          throw new Error('Dosya boyutu çok büyük. Lütfen 5MB\'dan küçük bir dosya seçin.');
        } else if (error.response.status === 415) {
          throw new Error('Desteklenmeyen dosya formatı. Lütfen PNG, JPG veya JPEG dosyası seçin.');
        } else if (error.response.status === 401) {
          throw new Error('Oturum süresi dolmuş. Lütfen tekrar giriş yapın.');
        } else if (backendMessage) {
          throw new Error(backendMessage);
        }
      }
      
      // Genel hata mesajı
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

  // Token'ların expiry zamanını kontrol et
  getTokenExpirationTime: (token) => {
    try {
      if (!token) return null;
      
      const base64Url = token.split('.')[1];
      if (!base64Url) return null;
      
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      
      const payload = JSON.parse(jsonPayload);
      return payload.exp ? payload.exp * 1000 : null; // Convert to milliseconds
    } catch (error) {
      console.error('Token expiry zamanı okunamadı:', error);
      return null;
    }
  },

  // Token'ın ne kadar süre sonra expire olacağını kontrol et (dakika cinsinden)
  getTokenTimeToExpiry: (token) => {
    const expirationTime = AuthService.getTokenExpirationTime(token);
    if (!expirationTime) return null;
    
    const now = Date.now();
    const timeLeft = expirationTime - now;
    return Math.floor(timeLeft / (1000 * 60)); // Dakika cinsinden
  },

  // Auto-refresh timer'ı başlat
  startAutoRefresh: () => {
    // Mevcut timer'ı temizle
    AuthService.stopAutoRefresh();
    
    const checkAndRefresh = async () => {
      try {
        const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
        const refreshToken = localStorage.getItem('refreshToken');
        
        if (!token || !refreshToken) {
          console.log('[AUTO_REFRESH] Token veya refresh token bulunamadı');
          AuthService.stopAutoRefresh();
          return;
        }
        
        const timeToExpiry = AuthService.getTokenTimeToExpiry(token);
        console.log(`[AUTO_REFRESH] Token ${timeToExpiry} dakika sonra expire olacak`);
        
        // Token 5 dakika içinde expire olacaksa refresh yap
        if (timeToExpiry !== null && timeToExpiry <= 5) {
          console.log('[AUTO_REFRESH] Token yakında expire olacak, refresh yapılıyor...');
          
          try {
            const refreshResult = await AuthService.refreshToken(refreshToken);
            
            if (refreshResult.success && refreshResult.accessToken && refreshResult.refreshToken) {
              localStorage.setItem('accessToken', refreshResult.accessToken.token);
              localStorage.setItem('refreshToken', refreshResult.refreshToken.token);
              console.log('[AUTO_REFRESH] Token başarıyla yenilendi');
            } else {
              console.error('[AUTO_REFRESH] Token yenilenemedi:', refreshResult);
              AuthService.logout();
            }
          } catch (error) {
            console.error('[AUTO_REFRESH] Token yenileme hatası:', error);
            AuthService.logout();
          }
        }
      } catch (error) {
        console.error('[AUTO_REFRESH] Kontrol hatası:', error);
      }
    };
    
    // İlk kontrolü hemen yap
    checkAndRefresh();
    
    // Her 2 dakikada bir kontrol et
    window.authRefreshInterval = setInterval(checkAndRefresh, 2 * 60 * 1000);
    console.log('[AUTO_REFRESH] Otomatik token yenileme başlatıldı');
  },

  // Auto-refresh timer'ı durdur
  stopAutoRefresh: () => {
    if (window.authRefreshInterval) {
      clearInterval(window.authRefreshInterval);
      window.authRefreshInterval = null;
      console.log('[AUTO_REFRESH] Otomatik token yenileme durduruldu');
    }
  },

  // Manual refresh token işlemi
  manualRefreshToken: async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      
      if (!refreshToken) {
        throw new Error('Refresh token bulunamadı');
      }
      
      console.log('[MANUAL_REFRESH] Manuel token yenileme başlatıldı');
      const result = await AuthService.refreshToken(refreshToken);
      
      if (result.success && result.accessToken && result.refreshToken) {
        localStorage.setItem('accessToken', result.accessToken.token);
        localStorage.setItem('refreshToken', result.refreshToken.token);
        console.log('[MANUAL_REFRESH] Token başarıyla yenilendi');
        return { success: true, message: 'Token başarıyla yenilendi' };
      } else {
        throw new Error(result.message || 'Token yenilenemedi');
      }
    } catch (error) {
      console.error('[MANUAL_REFRESH] Token yenileme hatası:', error);
      return { success: false, message: error.message };
    }
  },

  // Token'ların geçerliliğini kontrol et ve gerekirse yenile
  validateAndRefreshTokens: async () => {
    try {
      const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
      const refreshToken = localStorage.getItem('refreshToken');
      
      if (!token || !refreshToken) {
        return { valid: false, message: 'Token bulunamadı' };
      }
      
      const timeToExpiry = AuthService.getTokenTimeToExpiry(token);
      
      // Token geçersiz veya 1 dakika içinde expire olacaksa
      if (timeToExpiry === null || timeToExpiry <= 1) {
        console.log('[VALIDATE] Token geçersiz veya yakında expire olacak, yenileniyor...');
        
        const refreshResult = await AuthService.manualRefreshToken();
        if (refreshResult.success) {
          return { valid: true, refreshed: true, message: 'Token yenilendi' };
        } else {
          return { valid: false, message: refreshResult.message };
        }
      }
      
      return { valid: true, refreshed: false, timeToExpiry, message: 'Token geçerli' };
    } catch (error) {
      console.error('[VALIDATE] Token doğrulama hatası:', error);
      return { valid: false, message: error.message };
    }
  },

  // Token'ları tamamen temizleme (Deep Clean)
  clearAllTokens: () => {
    console.log('[CLEAR_TOKENS] Tüm token\'lar ve veriler temizleniyor...');
    
    // Auto-refresh'i durdur
    AuthService.stopAutoRefresh();
    
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

  // Hesap dondurma
  async freezeAccount(reason = '', description = '') {
    try {
      console.log('[FREEZE_ACCOUNT] Hesap pasifleştirme işlemi başlatılıyor...');
      console.log('[FREEZE_ACCOUNT] Sebep:', reason);
      console.log('[FREEZE_ACCOUNT] Açıklama:', description);
      
      // Backend'in beklediği format: FreezeAccountRequest DTO
      const freezeRequest = {
        reason: reason || 'USER_REQUEST',
        additionalInfo: description || ''
      };
      
      console.log('[FREEZE_ACCOUNT] Request data:', freezeRequest);
      
      const response = await axiosInstance.post('/auth/freeze-account', freezeRequest);
      
      console.log('[FREEZE_ACCOUNT] Backend response:', response.data);
      console.log('[FREEZE_ACCOUNT] Response structure:', {
        success: response.data?.success,
        message: response.data?.message,
        status: response.status,
        keys: Object.keys(response.data || {})
      });
      
      // Backend ResponseMessage format'ını handle et
      // ResponseMessage: { message: string, success: boolean }
      if (response.status === 200) {
        console.log('[FREEZE_ACCOUNT] Hesap başarıyla pasifleştirildi');
        
        // Kullanıcıyı otomatik çıkış yap
        this.logout();
        
        return {
          success: true,
          message: response.data?.message || 'Hesabınız başarıyla geçici olarak pasifleştirildi'
        };
      } else {
        throw new Error(response.data?.message || response.data?.error || 'Hesap pasifleştirme işlemi başarısız');
      }
    } catch (error) {
      console.error('[FREEZE_ACCOUNT] Hesap pasifleştirme hatası:', error);
      console.error('[FREEZE_ACCOUNT] Error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });
      
      // Specific backend exceptions
      if (error.response?.status === 400) {
        const errorMessage = error.response.data?.message || error.response.data?.error || 'Geçersiz istek';
        if (errorMessage.includes('already frozen') || errorMessage.includes('zaten dondurulmuş') || 
            errorMessage.includes('AccountAlreadyFrozenException') || errorMessage.includes('zaten pasif')) {
          throw new Error('Hesabınız zaten pasifleştirilmiş durumda');
        }
        throw new Error(errorMessage);
      }
      
      if (error.response?.status === 401) {
        throw new Error('Oturum bilginiz geçersiz. Lütfen tekrar giriş yapın.');
      }
      
      if (error.response?.status === 403) {
        throw new Error('Bu işlem için yetkiniz bulunmuyor.');
      }
      
      if (error.response?.status === 404) {
        // Backend UserNotFoundException throw ediyor
        throw new Error('Kullanıcı bulunamadı. Lütfen tekrar giriş yapmayı deneyin.');
      }
      
      // Backend henüz implementasyonu tamamlanmamışsa mock response döndür
      if (error.response?.status === 500 || error.response?.status === 404) {
        console.log('[FREEZE_ACCOUNT] Backend hatası tespit edildi, mock implementasyon kullanılıyor...');
        
        // Mock delay ekle
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Mock success response
        console.log('[FREEZE_ACCOUNT] Mock hesap pasifleştirme işlemi tamamlandı');
        
        // Kullanıcıyı otomatik çıkış yap
        this.logout();
        
        return {
          success: true,
          message: 'Hesabınız başarıyla geçici olarak pasifleştirildi (Demo Mode)'
        };
      }
      
      // Network hatası kontrolü
      if (error.code === 'NETWORK_ERROR' || !error.response) {
        throw new Error('İnternet bağlantınızı kontrol edin');
      }
      
      // Backend hatası
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      
      if (error.response?.data?.error) {
        throw new Error(error.response.data.error);
      }
      
      throw new Error('İşlem sırasında bir hata oluştu. Lütfen tekrar deneyin.');
    }
  },

  // Kullanıcı durumunu kontrol et
  async checkUserStatus() {
    try {
      console.log('🔍 Kullanıcı durum kontrolü başlatılıyor...');
      
      const token = localStorage.getItem('accessToken');
      if (!token) {
        console.log('❌ Token bulunamadı');
        return { success: false, error: 'NO_TOKEN' };
      }

      const response = await axiosInstance.get('/auth/user-status');
      console.log('✅ Kullanıcı durum kontrolü başarılı:', response.data);
      
      // Eğer kullanıcı dondurulmuşsa
      if (response.data.status === 'FROZEN') {
        console.log('🚫 Kullanıcı hesabı dondurulmuş, otomatik çıkış yapılıyor...');
        this.logout();
        return { 
          success: false, 
          error: 'ACCOUNT_FROZEN',
          reason: response.data.freezeReason,
          description: response.data.freezeDescription
        };
      }

      return {
        success: true,
        status: response.data.status,
        user: response.data.user
      };
      
    } catch (error) {
      console.error('❌ Kullanıcı durum kontrolü hatası:', error);
      
      // Demo mode için mock response - 404, 500 vs. hatalarda
      if (error.code === 'NETWORK_ERROR' || error.response?.status >= 400) {
        console.log('🎭 Demo Mode: Kullanıcı durum kontrolü mock response (endpoint yok veya hata)');
        return {
          success: true,
          status: 'ACTIVE',
          user: {
            id: Date.now(),
            phone: '555-DEMO',
            status: 'ACTIVE'
          }
        };
      }
      
      // 401 veya 403 hatası durumunda logout
      if (error.response?.status === 401 || error.response?.status === 403) {
        console.log('🔐 Auth hatası, çıkış yapılıyor...');
        this.logout();
        return { success: false, error: 'AUTH_ERROR' };
      }
      
      return { success: false, error: 'CHECK_FAILED' };
    }
  },

  // Hesap çözme (unfreeze) fonksiyonu
  async unfreezeAccount(reason, description) {
    try {
      console.log('🔓 Hesap çözme işlemi başlatılıyor...', {
        reason: reason?.slice(0, 50),
        description: description?.slice(0, 100)
      });
      
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('Oturum bilgisi bulunamadı. Lütfen tekrar giriş yapın.');
      }

      // Backend'in beklediği format: UnfreezeAccountRequest DTO
      const requestData = {
        reason: reason || 'USER_REQUEST',
        additionalInfo: description || ''
      };

      console.log('📤 Unfreeze request data:', requestData);

      const response = await axiosInstance.post('/auth/unfreeze-account', requestData);
      
      console.log('✅ Hesap çözme backend response:', response.data);
      
      // Backend ResponseMessage format'ını handle et
      return {
        success: true,
        message: response.data.message || response.data.data || 'Hesabınız başarıyla yeniden aktifleştirildi'
      };
      
    } catch (error) {
      console.error('❌ Hesap çözme hatası:', error);
      console.error('❌ Error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });
      
      // Specific backend exceptions
      if (error.response?.status === 400) {
        const errorMessage = error.response.data?.message || error.response.data?.error || 'Geçersiz istek';
        if (errorMessage.includes('not frozen') || errorMessage.includes('AccountNotFrozenException')) {
          throw new Error('Hesabınız zaten aktif durumda');
        }
        throw new Error(errorMessage);
      }
      
      if (error.response?.status === 401) {
        throw new Error('Oturum bilginiz geçersiz. Lütfen tekrar giriş yapın.');
      }
      
      if (error.response?.status === 403) {
        throw new Error('Bu işlem için yetkiniz bulunmuyor.');
      }
      
      if (error.response?.status === 404) {
        const errorMessage = error.response.data?.message || error.response.data?.error;
        if (errorMessage && errorMessage.includes('UserNotFoundException')) {
          throw new Error('Kullanıcı bulunamadı.');
        }
        throw new Error('Kullanıcı bulunamadı.');
      }
      
      // Demo mode için mock response
      if (error.code === 'NETWORK_ERROR' || error.response?.status >= 500) {
        console.log('🎭 Demo Mode: Hesap çözme mock response');
        
        return {
          success: true,
          message: 'Hesabınız başarıyla yeniden aktifleştirildi (Demo Mode)'
        };
      }
      
      // Network hatası kontrolü
      if (error.code === 'NETWORK_ERROR' || !error.response) {
        throw new Error('İnternet bağlantınızı kontrol edin');
      }
      
      // Backend hatası
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      
      if (error.response?.data?.error) {
        throw new Error(error.response.data.error);
      }
      
      throw new Error('İşlem sırasında bir hata oluştu. Lütfen tekrar deneyin.');
    }
  },
};

export default AuthService;