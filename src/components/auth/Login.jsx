import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import AuthService from '../../services/auth.service';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const getDeviceInfo = () => 'Xiaomi Redmi Note 11 - Android 13';
const getAppVersion = () => '1.4.2';
const getPlatform = () => 'ANDROID';
const getIpAddress = () => '192.168.1.45';

const Login = () => {
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
    
    // Input validation - telefon numarası için sadece sayılar
    if (name === 'telephone') {
      // Telefon numarası için sadece sayılar
      const numberOnlyValue = value.replace(/[^0-9]/g, '');
      setForm({ ...form, [name]: numberOnlyValue });
    } else {
      // Diğer alanlar için normal işlem
      setForm({ ...form, [name]: value });
    }
  };

  const validate = () => {
    let err = '';
    if (!form.telephone) {
      err = '📱 Lütfen telefon numaranızı girin';
    } else if (!/^0[0-9]{10}$/.test(form.telephone)) {
      err = '📱 Telefon numarası 0 ile başlamalı ve 11 haneli olmalı (örn: 05xxxxxxxxx)';
    } else if (!/^[0-9]+$/.test(form.telephone)) {
      err = '📱 Telefon numarası sadece sayılardan oluşmalı';
    } else if (!form.password) {
      err = '🔒 Lütfen şifrenizi girin';
    } else if (form.password.length < 6) {
      err = '🔒 Şifre en az 6 karakter olmalı';
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
      
      console.log('AuthService login response:', response);
      
        // Özel durumlar - Backend exception türlerine göre
        if (response && response.phoneNotVerified) {
          setShowVerify(true);
          setPendingLogin({ telephone }); 
          // Backend'den gelen mesajı göster
          const message = response.message || 'Telefon numaranız doğrulanmamış. SMS kodu gönderildi.';
          toast.info(`📱 ${message}`, {
            position: 'top-center',
            autoClose: 5000,
          });
          setIsSubmitting(false);
          return;
        } else if (response && response.newDevice) {
          setShowVerify(true);
          setPendingLogin({ telephone }); 
          // Backend'den gelen mesajı göster
          const message = response.message || 'Yeni cihaz algılandı. Giriş için doğrulama kodu gönderildi.';
          toast.info(`🔐 ${message}`, {
            position: 'top-center',
            autoClose: 5000,
          });
          setIsSubmitting(false);
          return;
        } else if (response && response.success) {
          // Backend'den gelen başarı mesajını göster
          const successMessage = response.message || 'Giriş başarılı!';
          toast.success(`✅ ${successMessage} Yönlendiriliyorsunuz...`, {
            position: 'top-center',            autoClose: 2000,
            onClose: () => navigate('/dashboard'),
          });
        } else if (response && !response.success) {
          // Backend'den gelen hata mesajını direkt göster
          const errorMessage = response.message || 'Giriş yapılamadı. Lütfen bilgilerinizi kontrol edin.';
          throw new Error(errorMessage);
        } else {
          throw new Error(response?.message || 'Giriş yapılamadı. Lütfen bilgilerinizi kontrol edin.');
        }
      } catch (err) {
        console.log('Login catch error:', err);
        
        // AuthService'den dönen hata objesini kontrol et
        if (err && typeof err === 'object' && err.message) {
          const errorMessage = `❌ ${err.message}`;
          setError(errorMessage);
          toast.error(errorMessage, {
            position: 'top-center',
            autoClose: 6000,
          });
          return;
        }
        
        // Spesifik hata mesajları - Backend exception türlerine göre
        let errorMessage = err.message || err;
        
        if (typeof errorMessage === 'string') {
          if (errorMessage.includes('NotFoundUserException') || 
              errorMessage.includes('kayıtlı kullanıcı bulunamadı')) {
            errorMessage = '❌ Bu telefon numarasıyla kayıtlı kullanıcı bulunamadı. Lütfen önce kayıt olun.';
          } else if (errorMessage.includes('IncorrectPasswordException') || 
                     errorMessage.includes('şifre hatalı')) {
            errorMessage = '❌ Girilen şifre hatalı. Lütfen şifrenizi kontrol edin.';
          } else if (errorMessage.includes('UserDeletedException')) {
            errorMessage = '❌ Bu hesap silinmiş durumda. Lütfen yeni hesap oluşturun.';
          } else if (errorMessage.includes('UserNotActiveException')) {
            errorMessage = '❌ Hesabınız aktif değil. Lütfen yönetici ile iletişime geçin.';
          } else if (errorMessage.includes('UserRoleNotAssignedException')) {
            errorMessage = '❌ Hesabınızda rol atanmamış. Lütfen yönetici ile iletişime geçin.';
          } else if (errorMessage.includes('AdminNotApprovedException')) {
            errorMessage = '❌ Hesabınız henüz onaylanmamış. Lütfen onay bekleyin.';
          } else if (errorMessage.includes('401') || errorMessage.includes('Unauthorized') || 
                     errorMessage.includes('telefon numarası veya şifre hatalı')) {
            errorMessage = '❌ Telefon numarası veya şifre hatalı. Lütfen bilgilerinizi kontrol edin.';
          } else if (errorMessage.includes('telefon') || errorMessage.includes('phone')) {
            errorMessage = '❌ Geçersiz telefon numarası formatı. Lütfen 05xxxxxxxxx şeklinde girin.';
          } else if (errorMessage.includes('network') || errorMessage.includes('timeout') || 
                     errorMessage.includes('bağlan')) {
            errorMessage = '🌐 İnternet bağlantınızı kontrol edin ve tekrar deneyin.';
          } else if (errorMessage.includes('server') || errorMessage.includes('500')) {
            errorMessage = '🔧 Sunucu hatası. Lütfen birkaç dakika sonra tekrar deneyin.';
          } else if (!errorMessage || errorMessage === 'undefined') {
            errorMessage = '❌ Giriş yapılırken beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.';
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
          onClose: () => navigate('/dashboard'),
        });
      } else {
        if (verifyResponse?.message && verifyResponse.message.includes('Doğrulama kodu geçersiz')) {
          setError('❌ Girilen SMS doğrulama kodu hatalı. Lütfen tekrar kontrol edin.');
          toast.error('❌ Girilen SMS doğrulama kodu hatalı. Lütfen tekrar kontrol edin.', {
            position: 'top-center',
            autoClose: 6000,
          });
          return;
        }
        throw new Error(verifyResponse?.message || 'Doğrulama başarısız oldu.');
      }
    } catch (err) {
      // Spesifik SMS doğrulama hata mesajları
      let errorMessage = err.message;
      
      if (err.message.includes('geçersiz') || err.message.includes('invalid') || 
          err.message.includes('wrong') || err.message.includes('hatalı')) {
        errorMessage = '❌ SMS doğrulama kodu hatalı. Lütfen kodu kontrol edin ve tekrar deneyin.';
      } else if (err.message.includes('süresi') || err.message.includes('expired')) {
        errorMessage = '⏰ SMS doğrulama kodunun süresi dolmuş. Lütfen yeni kod isteyin.';
      } else if (err.message.includes('limit') || err.message.includes('çok fazla')) {
        errorMessage = '⚠️ Çok fazla hatalı deneme. Lütfen birkaç dakika bekleyin.';
      } else if (!errorMessage || errorMessage === 'undefined') {
        errorMessage = '❌ SMS doğrulama sırasında bir hata oluştu. Lütfen tekrar deneyin.';
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
      // Login durumu için özel resend fonksiyonu kullan
      const response = await AuthService.resendLoginSmsCode(pendingLogin.telephone);
      if (response && response.success) {
        toast.success('SMS kodu başarıyla tekrar gönderildi!', { 
          position: 'top-center', 
          autoClose: 3000 
        });
        toast.info('Yeni doğrulama kodunu telefonunuza gönderdik!', { 
          position: 'top-center', 
          autoClose: 5000 
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 to-blue-300 p-4">
      <ToastContainer />
      <div className="w-full max-w-md bg-white/90 rounded-2xl shadow-2xl p-8">
        <h1 className="text-3xl font-bold text-center mb-6 text-blue-700 tracking-tight">Giriş Yap</h1>
        {error && (
          <div className="mb-4 text-red-600 bg-red-100 border border-red-200 rounded px-4 py-2 text-sm animate-shake">
            {error}
          </div>
        )}
        {successMessage && (
          <div className="mb-4 text-green-700 bg-green-100 border border-green-200 rounded px-4 py-2 text-sm">
            {successMessage}
          </div>
        )}
        {!showVerify ? (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">Telefon Numarası</label>
              <input
                type="tel"
                name="telephone"
                maxLength={11}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-base bg-white"
                placeholder="05xxxxxxxxx"
                value={form.telephone}
                onChange={handleChange}
                disabled={isSubmitting}
                autoComplete="tel"
                pattern="[0-9]*"
                title="Sadece sayılar girebilirsiniz"
                onKeyPress={(e) => {
                  // Sadece sayılar
                  if (!/[0-9]/.test(e.key)) {
                    e.preventDefault();
                  }
                }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">Şifre</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-base bg-white pr-10"
                  placeholder="Şifreniz"
                  value={form.password}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600"
                  onClick={() => setShowPassword((v) => !v)}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 2.25 12c2.036 3.807 6.07 6.75 9.75 6.75 1.563 0 3.06-.362 4.396-1.02M6.25 6.25l11.5 11.5M9.75 9.75a3 3 0 1 0 4.5 4.5" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6.25 0c-2.036-3.807-6.07-6.75-9.75-6.75-1.563 0-3.06.362-4.396 1.02M3.98 8.223A10.477 10.477 0 0 0 2.25 12c2.036 3.807 6.07 6.75 9.75 6.75 1.563 0 3.06-.362 4.396-1.02" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
            <button
              type="submit"
              className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md transition duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Giriş Yapılıyor...' : 'Giriş Yap'}
            </button>
            <div className="flex justify-between text-sm mt-2">
              <Link to="/register" className="text-blue-600 hover:underline">Kayıt Ol</Link>
              <Link to="/forgot-password" className="text-gray-500 hover:underline">Şifremi Unuttum</Link>
            </div>
          </form>
        ) : (
          <form onSubmit={handleVerifySubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">SMS Doğrulama Kodu</label>
              <input
                type="text"
                name="verifyCode"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-base bg-white"
                placeholder="Doğrulama kodu"
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value)}
                disabled={isSubmitting}
                autoComplete="one-time-code"
              />
            </div>
            <button
                type="submit"
              className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md transition duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={isSubmitting}
              >
              {isSubmitting ? 'Doğrulanıyor...' : 'Doğrula ve Giriş Yap'}
            </button>
            
            {/* Tekrar SMS Kodu Gönder Butonu */}
            <button
              type="button"
              className="w-full py-2 px-4 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg shadow-md transition duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
              onClick={handleResendSms}
              disabled={isResending || isSubmitting}
            >
              {isResending ? 'SMS Gönderiliyor...' : 'Tekrar SMS Kodu Gönder'}
            </button>
            
            <button
              type="button"
              className="w-full py-2 px-4 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-lg shadow-md transition duration-150"
              onClick={() => setShowVerify(false)}
              disabled={isSubmitting}
                    >
              Geri Dön
            </button>
            </form>
          )}
      </div>
    </div>
  );
};

export default Login; 