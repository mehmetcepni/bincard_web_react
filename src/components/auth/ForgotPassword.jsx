import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import AuthService from '../../services/auth.service';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import bincardLogo from '../../assets/bincard-logo.jpg';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [telephone, setTelephone] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 10000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const validate = () => {
    if (!/^0[0-9]{10}$/.test(telephone)) return 'Telefon numarası 0 ile başlamalı ve 11 haneli olmalı';
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    const err = validate();
    if (err) { setError(err); return; }
    setIsSubmitting(true);
    setError('');
    try {
      console.log('Şifre sıfırlama kodu gönderiliyor:', telephone);
      
      const response = await AuthService.forgotPassword(telephone);
      
      console.log('ForgotPassword response:', response);
      
      if (response && response.success !== false) {
        // Backend'den gelen başarı mesajını göster
        const successMessage = response.message || 'Doğrulama kodu gönderildi!';
        setError('');
        toast.success(successMessage, {
          position: 'top-center',
          autoClose: 2000,
          onClose: () => {
            navigate('/reset-password', {
              state: {
                telephone,
                message: 'Lütfen telefonunuza gönderilen kodu giriniz.'
              }
            });
          }
        });
      } else {
        // Backend'den gelen hata mesajını göster
        const errorMessage = response?.message || 'Şifre sıfırlama işlemi başarısız oldu';
        throw new Error(errorMessage);
      }
    } catch (err) {
      console.log('ForgotPassword catch error:', err);
      
      // AuthService'den dönen hata objesini kontrol et
      if (err && typeof err === 'object' && err.message) {
        const errorMessage = err.message;
        setError(errorMessage);
        toast.error(errorMessage, {
          position: 'top-center',
          autoClose: 5000
        });
        return;
      }
      
      const errorMessage = err.message || err || 'Şifre sıfırlama işlemi başarısız oldu. Lütfen daha sonra tekrar deneyin.';
      setError(errorMessage);
      toast.error(errorMessage, {
        position: 'top-center',
        autoClose: 5000
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 to-blue-300 p-4">
      <div className="w-full max-w-md bg-white/90 rounded-2xl shadow-2xl p-8">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="mx-auto w-20 h-20 rounded-3xl overflow-hidden mb-4 shadow-lg">
            <img 
              src={bincardLogo} 
              alt="BinCard Logo" 
              className="w-full h-full object-cover"
            />
          </div>
          <h1 className="text-3xl font-bold text-blue-700 tracking-tight">Şifre Sıfırlama</h1>
        </div>
        <p className="text-center text-gray-600 mb-4">Şifrenizi sıfırlamak için telefon numaranızı girin. Size bir doğrulama kodu göndereceğiz.</p>
        {error && (
          <div className="mb-4 text-red-600 bg-red-100 border border-red-200 rounded px-4 py-2 text-sm animate-shake">{error}</div>
        )}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">Telefon Numarası</label>
            <input
              type="tel"
              name="telephone"
              maxLength={11}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-base bg-white"
              placeholder="05xxxxxxxxx"
              value={telephone}
              onChange={e => setTelephone(e.target.value)}
              disabled={isSubmitting}
              autoComplete="tel"
            />
          </div>
          <button
            type="submit"
            className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md transition duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Gönderiliyor...' : 'Doğrulama Kodu Gönder'}
          </button>
          <div className="flex justify-center text-sm mt-2">
            <Link to="/login" className="text-blue-600 hover:underline">Giriş sayfasına dön</Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ForgotPassword; 