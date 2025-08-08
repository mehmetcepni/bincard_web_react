import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AuthService from '../../services/auth.service';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { messaging, getToken } from '../../firebase';
import bincardLogo from '../../assets/bincard-logo.jpg';

const getDeviceInfo = () => 'Xiaomi Redmi Note 11 - Android 13';
const getAppVersion = () => '1.4.2';
const getPlatform = () => 'ANDROID';
const getIpAddress = () => '192.168.1.45';

const Login = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showVerify, setShowVerify] = useState(false);
  const [pendingLogin, setPendingLogin] = useState(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [form, setForm] = useState({ telephone: '', password: '' });
  const [isResending, setIsResending] = useState(false);
  
  // Hesap aktifleştirme modal state'leri
  const [showUnfreezeModal, setShowUnfreezeModal] = useState(false);
  const [unfreezeData, setUnfreezeData] = useState({ telephone: '', password: '', note: '' });
  const [isUnfreezing, setIsUnfreezing] = useState(false);

  useEffect(() => {
    if (location.state?.message) {
      toast.success(location.state.message, {
        position: 'top-center',
        autoClose: 5000,
      });
      setSuccessMessage(location.state.message);
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'telephone') {
      const numberOnlyValue = value.replace(/[^0-9]/g, '');
      setForm({ ...form, [name]: numberOnlyValue });
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const validate = () => {
    let err = '';
    if (!form.telephone) {
      err = t('auth.phoneRequired');
    } else if (!/^0[0-9]{10}$/.test(form.telephone)) {
      err = t('auth.phoneFormat');
    } else if (!/^[0-9]+$/.test(form.telephone)) {
      err = t('auth.phoneNumbersOnly');
    } else if (!form.password) {
      err = t('auth.passwordRequired');
    } else if (form.password.length !== 6) {
      err = t('auth.passwordLength');
    }
    setError(err);
    return !err;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!validate()) return;
    
    setIsSubmitting(true);
    setError('');
    
    try {
      let telephone = form.telephone;
      if (!telephone.startsWith('+90')) {
        telephone = '+90' + telephone.replace(/^0/, '');
      }
      
      const response = await AuthService.login(telephone, form.password);
      
      if (
        (response && response.message && response.message.includes('Yeni cihaz algılandı')) ||
        (response && response.message && response.message.includes('Telefon numaranız doğrulanmamış'))
      ) {
        setShowVerify(true);
        setPendingLogin({ telephone });
        toast.info(response.message, {
          position: 'top-center',
          autoClose: 5000,
        });
        setIsSubmitting(false);
        return;
      } else if (response && response.success) {
        const successMessage = response.message || 'Giriş başarılı!';
        toast.success(`${successMessage} Yönlendiriliyorsunuz...`, {
          position: 'top-center',
          autoClose: 2000,
        });
        setTimeout(() => navigate('/dashboard'), 2000);
        
        // FCM Token entegrasyonu
        try {
          if (localStorage.getItem('fcmTokenRegistered') !== 'true') {
            if ('Notification' in window && messaging) {
              const permission = await Notification.requestPermission();
              if (permission === 'granted') {
                const fcmToken = await getToken(messaging, { vapidKey: 'VAPID_KEYINIZ' });
                if (fcmToken) {
                  const accessToken = localStorage.getItem('accessToken');
                  const apiResponse = await fetch(`http://localhost:8080/v1/api/user/update-fcm-token?fcmToken=${encodeURIComponent(fcmToken)}`, {
                    method: 'PATCH',
                    headers: {
                      'Authorization': `Bearer ${accessToken}`
                    }
                  });
                  const result = await apiResponse.json();
                  if (result === true) {
                    localStorage.setItem('fcmTokenRegistered', 'true');
                  }
                }
              }
            }
          }
        } catch (fcmErr) {
          localStorage.removeItem('fcmTokenRegistered');
        }
      } else {
        const errorMessage = response?.message || 'Giriş yapılamadı. Lütfen bilgilerinizi kontrol edin.';
        throw new Error(errorMessage);
      }
    } catch (err) {
      let errorMessage = err.message || err;
      
      if (typeof errorMessage === 'string') {
        if (errorMessage.includes('NotFoundUserException') || 
            errorMessage.includes('kayıtlı kullanıcı bulunamadı')) {
          errorMessage = 'Bu telefon numarasıyla kayıtlı kullanıcı bulunamadı. Lütfen önce kayıt olun.';
        } else if (errorMessage.includes('IncorrectPasswordException') || 
                   errorMessage.includes('şifre hatalı')) {
          errorMessage = 'Girilen şifre hatalı. Lütfen şifrenizi kontrol edin.';
        } else if (errorMessage.includes('AccountFrozenException') || 
                   errorMessage.includes('Hesap kilitli') ||
                   errorMessage.includes('frozen') ||
                   errorMessage.includes('Hesap Aktif Değil') ||
                   errorMessage.includes('aktif değil') ||
                   errorMessage.includes('hesap dondurulmuş')) {
          // Hesap frozen durumu - Modal göster
          console.log('🔓 Frozen hesap tespit edildi, modal açılıyor...', {
            errorMessage,
            telephone: form.telephone
          });
          setUnfreezeData({ 
            telephone: form.telephone, 
            password: form.password, 
            note: '' 
          });
          setShowUnfreezeModal(true);
          setError('');
          setIsSubmitting(false);
          return;
        } else if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
          errorMessage = 'Telefon numarası veya şifre hatalı. Lütfen bilgilerinizi kontrol edin.';
        } else if (!errorMessage || errorMessage === 'undefined') {
          errorMessage = 'Giriş yapılırken beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.';
        }
      }
      
      setError(errorMessage);
      toast.error(errorMessage, {
        position: 'top-center',
        autoClose: 6000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Hesap aktifleştirme fonksiyonu
  const handleUnfreezeAccount = async () => {
    if (!unfreezeData.telephone || !unfreezeData.password) {
      toast.error('Telefon numarası ve şifre gerekli.', {
        position: 'top-center'
      });
      return;
    }

    setIsUnfreezing(true);
    
    try {
      let telephone = unfreezeData.telephone;
      if (!telephone.startsWith('+90')) {
        telephone = '+90' + telephone.replace(/^0/, '');
      }

      const result = await AuthService.unfreezeAccount(telephone, unfreezeData.password, unfreezeData.note);
      
      if (result && result.success) {
        toast.success(result.message || 'Hesabınız başarıyla aktifleştirildi!', {
          position: 'top-center',
          autoClose: 3000
        });
        
        setShowUnfreezeModal(false);
        setUnfreezeData({ telephone: '', password: '', note: '' });
        
        // 2 saniye bekle ve normal giriş yap
        setTimeout(() => {
          handleSubmit({ preventDefault: () => {} });
        }, 2000);
      } else {
        throw new Error(result?.message || 'Hesap aktifleştirme başarısız');
      }
    } catch (error) {
      console.error('Hesap aktifleştirme hatası:', error);
      toast.error(error.message || 'Hesap aktifleştirme sırasında hata oluştu', {
        position: 'top-center',
        autoClose: 5000
      });
    } finally {
      setIsUnfreezing(false);
    }
  };

  const handleVerifySubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    
    try {
      const verifyResponse = await AuthService.phoneVerify({
        code: verifyCode,
        ipAddress: getIpAddress(),
        deviceInfo: getDeviceInfo(),
        appVersion: getAppVersion(),
        platform: getPlatform(),
      });
      
      if (verifyResponse && verifyResponse.success) {
        toast.success('Doğrulama başarılı! Yönlendiriliyorsunuz...', {
          position: 'top-center',
          autoClose: 2000,
        });
        setTimeout(() => navigate('/dashboard'), 2000);
      } else {
        throw new Error(verifyResponse?.message || 'Doğrulama başarısız oldu.');
      }
    } catch (err) {
      let errorMessage = err.message;
      
      if (err.message.includes('geçersiz') || err.message.includes('hatalı')) {
        errorMessage = 'SMS doğrulama kodu hatalı. Lütfen kodu kontrol edin ve tekrar deneyin.';
      } else if (err.message.includes('süresi') || err.message.includes('expired')) {
        errorMessage = 'SMS doğrulama kodunun süresi dolmuş. Lütfen yeni kod isteyin.';
      } else if (!errorMessage || errorMessage === 'undefined') {
        errorMessage = 'SMS doğrulama sırasında bir hata oluştu. Lütfen tekrar deneyin.';
      }
      
      setError(errorMessage);
      toast.error(errorMessage, {
        position: 'top-center',
        autoClose: 6000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendSms = async () => {
    if (isResending || isSubmitting || !pendingLogin?.telephone) return;
    
    setIsResending(true);
    setError('');
    
    try {
      const response = await AuthService.resendLoginSmsCode(pendingLogin.telephone);
      if (response && response.success) {
        toast.success('SMS kodu başarıyla tekrar gönderildi!', { 
          position: 'top-center', 
          autoClose: 3000 
        });
      } else {
        throw new Error(response?.message || 'SMS kodu gönderilemedi');
      }
    } catch (err) {
      const errorMessage = err.message || 'SMS kodu gönderilemedi. Lütfen tekrar deneyin.';
      setError(errorMessage);
      toast.error(errorMessage, { 
        position: 'top-center', 
        autoClose: 5000 
      });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-300">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto w-20 h-20 rounded-3xl overflow-hidden mb-6 shadow-lg">
            <img 
              src={bincardLogo} 
              alt="BinCard Logo" 
              className="w-full h-full object-cover"
            />
          </div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{t('auth.loginToBinCard')}</h1>
        <p className="text-gray-600 dark:text-gray-400">{t('auth.loginDescription')}</p>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="rounded-xl bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
              </div>
            </div>
          </div>
        )}

        {successMessage && (
          <div className="rounded-xl bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-green-800 dark:text-green-200">{successMessage}</p>
              </div>
            </div>
          </div>
        )}

        {/* Form Card */}
        <div className="card p-8">
          {!showVerify ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Telefon Numarası
                </label>
                <input
                  type="tel"
                  name="telephone"
                  maxLength={11}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus-ring text-base bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  placeholder="05xxxxxxxxx"
                  value={form.telephone}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  autoComplete="tel"
                  pattern="[0-9]*"
                  onKeyPress={(e) => {
                    if (!/[0-9]/.test(e.key)) {
                      e.preventDefault();
                    }
                  }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Şifre
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus-ring text-base pr-12 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    placeholder="6 haneli şifreniz"
                    value={form.password}
                    onChange={handleChange}
                    disabled={isSubmitting}
                    autoComplete="current-password"
                    maxLength={6}
                    minLength={6}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#005bac] transition-colors"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L6.464 6.464M9.878 9.878l-2.415-2.414M14.12 14.12l2.415 2.415M14.12 14.12L17.536 17.536M14.12 14.12l2.415-2.415M3 3l3.5 3.5m0 0L9 9l3 3 3 3 3.5 3.5" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="btn-primary w-full flex justify-center items-center"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <div className="spinner mr-2"></div>
                    {t('auth.loggingIn')}
                  </>
                ) : (
                  t('auth.login')
                )}
              </button>

              {/* Links */}
              <div className="flex items-center justify-between text-sm">
                <Link to="/register" className="text-[#005bac] hover:text-[#004690] font-medium transition-colors">
                  {t('auth.noAccount')}
                </Link>
                <Link to="/forgot-password" className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors">
                  {t('auth.forgotPassword')}
                </Link>
              </div>
            </form>
          ) : (
            <form onSubmit={handleVerifySubmit} className="space-y-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-[#005bac]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">{t('auth.smsVerification')}</h2>
                <p className="text-gray-600 dark:text-gray-400">{t('auth.smsDescription')}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('auth.verifyCode')}
                </label>
                <input
                  type="text"
                  name="verifyCode"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus-ring text-base text-center text-lg tracking-widest bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  placeholder="------"
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value)}
                  disabled={isSubmitting}
                  autoComplete="one-time-code"
                  maxLength={6}
                />
              </div>

              <div className="space-y-3">
                <button
                  type="submit"
                  className="btn-primary w-full flex justify-center items-center"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <div className="spinner mr-2"></div>
                      {t('auth.verifying')}
                    </>
                  ) : (
                    t('auth.verifyAndLogin')
                  )}
                </button>

                <button
                  type="button"
                  className="btn-outline w-full flex justify-center items-center"
                  onClick={handleResendSms}
                  disabled={isResending || isSubmitting}
                >
                  {isResending ? (
                    <>
                      <div className="spinner mr-2"></div>
                      {t('auth.resendingSms')}
                    </>
                  ) : (
                    t('auth.resendSmsCode')
                  )}
                </button>

                <button
                  type="button"
                  className="btn-secondary w-full"
                  onClick={() => setShowVerify(false)}
                  disabled={isSubmitting}
                >
                  {t('auth.goBack')}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Hesap Aktifleştirme Modal */}
        {showUnfreezeModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Hesap Aktifleştirme
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Hesabınız dondurulmuş durumda. Hesabınızı aktifleştirmek için bilgilerinizi girin.
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Telefon Numarası
                  </label>
                  <input
                    type="tel"
                    value={unfreezeData.telephone}
                    onChange={(e) => setUnfreezeData(prev => ({ ...prev, telephone: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="5XX XXX XX XX"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Şifre
                  </label>
                  <input
                    type="password"
                    value={unfreezeData.password}
                    onChange={(e) => setUnfreezeData(prev => ({ ...prev, password: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Şifrenizi girin"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Not (İsteğe Bağlı)
                  </label>
                  <textarea
                    value={unfreezeData.note}
                    onChange={(e) => setUnfreezeData(prev => ({ ...prev, note: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Aktifleştirme sebebi..."
                    rows="3"
                  />
                </div>
              </div>
              
              <div className="flex space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowUnfreezeModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  disabled={isUnfreezing}
                >
                  İptal
                </button>
                <button
                  type="button"
                  onClick={handleUnfreezeAccount}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  disabled={isUnfreezing || !unfreezeData.telephone || !unfreezeData.password}
                >
                  {isUnfreezing ? (
                    <>
                      <div className="spinner mr-2"></div>
                      Aktifleştiriliyor...
                    </>
                  ) : (
                    'Hesabı Aktifleştir'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            BinCard ile güvenli ulaşım deneyimi
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;