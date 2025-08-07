import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AuthService from '../../services/auth.service';
import WalletService from '../../services/wallet.service';
import { toast } from 'react-toastify';

const BalanceTopUp = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [topUpAmount, setTopUpAmount] = useState('');
  const [cardInfo, setCardInfo] = useState({ 
    cardNumber: '', 
    cardHolder: '', 
    expireMonth: '', 
    expireYear: '', 
    cvc: '' 
  });
  const [isTopUpLoading, setIsTopUpLoading] = useState(false);
  const [paymentWindowRef, setPaymentWindowRef] = useState(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const authResult = await AuthService.showLoginConfirmModal(t('wallet.topUpOperation'), navigate);
        if (!authResult && !AuthService.isAuthenticated()) {
          navigate('/dashboard');
        }
      } catch (error) {
        navigate('/dashboard');
      }
    };
    if (!AuthService.isAuthenticated()) {
      checkAuth();
    }
  }, [navigate]);

  // 3D Secure ödeme penceresi takibi
  useEffect(() => {
    let checkInterval;
    
    if (paymentWindowRef) {
      // Ödeme penceresinin kapanıp kapanmadığını kontrol et
      checkInterval = setInterval(() => {
        if (paymentWindowRef.closed) {
          console.log('[BALANCE_TOPUP] ' + t('wallet.paymentWindowClosed'));
          clearInterval(checkInterval);
          setPaymentWindowRef(null);
          setIsTopUpLoading(false);
          
          // Kısa bir gecikme sonrası cüzdan sekmesine yönlendir
          setTimeout(() => {
            toast.success(t('wallet.paymentCompleted'));
            navigate('/wallet');
          }, 1000);
        }
      }, 1000); // Her saniye kontrol et
    }

    return () => {
      if (checkInterval) {
        clearInterval(checkInterval);
      }
    };
  }, [paymentWindowRef, navigate]);

  useEffect(() => {
    const fetchWallet = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await WalletService.getMyWallet();
        setWallet(data);
      } catch (err) {
        setError(err.message || 'Cüzdan bilgisi alınamadı');
        toast.error(err.message || 'Cüzdan bilgisi alınamadı');
      } finally {
        setLoading(false);
      }
    };
    fetchWallet();
  }, []);

  const handleTopUp = async (e) => {
    e.preventDefault();
    setIsTopUpLoading(true);
    try {
      const result = await WalletService.topUpWallet({ amount: topUpAmount, cardInfo });
      
      if (result.data && result.data.startsWith('<!doctype html')) {
        toast.success(t('wallet.payment3DStarted'));
        
        // Yeni pencerede 3D secure sayfasını aç ve referansını sakla
        const paymentWindow = window.open('', '_blank');
        paymentWindow.document.open();
        paymentWindow.document.write(result.data);
        paymentWindow.document.close();
        
        // Pencere referansını state'e kaydet
        setPaymentWindowRef(paymentWindow);
        
        // Focus event'i de ekleyelim (alternatif kontrol)
        const handleFocus = () => {
          // Ana pencere focus aldığında kontrol et
          setTimeout(() => {
            if (paymentWindow.closed) {
              window.removeEventListener('focus', handleFocus);
              console.log('[BALANCE_TOPUP] Ana pencere focus, ödeme penceresi kapalı');
            }
          }, 500);
        };
        window.addEventListener('focus', handleFocus);
        
      } else {
        toast.success(result.message || t('wallet.topUpSuccessful'));
        setIsTopUpLoading(false);
        // Eğer 3D secure olmadan direkt başarılı olduysa da cüzdan sekmesine yönlendir
        setTimeout(() => {
          navigate('/wallet');
        }, 1500);
      }
    } catch (err) {
      toast.error(err.message || t('wallet.topUpFailed'));
      setIsTopUpLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 p-6">
        <div className="text-xl text-blue-700 animate-pulse">Cüzdan bilgileri yükleniyor...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 p-6">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-red-500 text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Hata Oluştu</h2>
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={() => navigate('/wallet')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded-lg transition-colors"
          >
            Cüzdana Dön
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-blue-50 to-purple-100 p-4 md:p-8 animate-fade-in">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8 animate-slide-down">
          <button 
            onClick={() => navigate('/wallet')}
            className="p-3 rounded-xl bg-white/80 hover:bg-white shadow-lg hover:shadow-xl transition-all duration-200 group"
          >
            <svg className="w-6 h-6 text-gray-600 group-hover:text-gray-800 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="bg-gradient-to-br from-green-400 to-green-200 rounded-full p-4 shadow-xl border-4 border-white">
            <span className="text-4xl">💰</span>
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-gray-800 mb-1 tracking-tight">Bakiye Yükle</h1>
            <p className="text-gray-600">Kartınıza güvenli şekilde bakiye yükleyin</p>
          </div>
        </div>

        {/* Mevcut Bakiye Bilgisi */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-6 text-white mb-8 shadow-xl animate-slide-up">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-blue-200 text-sm mb-1">Mevcut Bakiye</div>
              <div className="text-3xl font-bold">
                ₺{wallet && wallet.balance != null ? Number(wallet.balance).toLocaleString('tr-TR', { minimumFractionDigits: 2 }) : '0,00'}
              </div>
            </div>
            <div className="text-6xl opacity-20">💳</div>
          </div>
        </div>

        {/* Bakiye Yükleme Formu */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100 animate-slide-up" style={{animationDelay: '0.1s'}}>
          <form onSubmit={handleTopUp} className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-2 flex items-center justify-center gap-2">
                <span>💳</span>{t('wallet.cardInfo')}
              </h2>
              <p className="text-gray-600">{t('wallet.cardInfoDescription')}</p>
            </div>

            {/* Tutar */}
            <div className="bg-gray-50 rounded-xl p-6">
              <label className="block text-sm font-semibold mb-2 text-gray-700">{t('wallet.topUpAmount')}</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 text-lg">₺</span>
                <input 
                  type="number" 
                  min="1" 
                  step="0.01" 
                  value={topUpAmount} 
                  onChange={e => setTopUpAmount(e.target.value)} 
                  className="w-full pl-8 pr-4 py-4 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent text-xl font-semibold bg-white" 
                  placeholder={t('wallet.enterAmount')}
                  required 
                  disabled={isTopUpLoading} 
                />
              </div>
              {/* Hızlı Tutar Seçenekleri */}
              <div className="flex flex-wrap gap-2 mt-3">
                {[25, 50, 100, 200, 500].map(amount => (
                  <button
                    key={amount}
                    type="button"
                    onClick={() => setTopUpAmount(amount.toString())}
                    className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    disabled={isTopUpLoading}
                  >
                    ₺{amount}
                  </button>
                ))}
              </div>
            </div>

            {/* Kart Bilgileri */}
            <div className="grid grid-cols-1 gap-6">
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">{t('wallet.cardNumber')}</label>
                <input 
                  type="text" 
                  maxLength={16} 
                  value={cardInfo.cardNumber} 
                  onChange={e => {
                    const value = e.target.value.replace(/\D/g, '');
                    if (value.length <= 16) {
                      setCardInfo({ ...cardInfo, cardNumber: value });
                    }
                  }} 
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent text-lg bg-white" 
                  placeholder="1234 5678 9012 3456"
                  required 
                  disabled={isTopUpLoading} 
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">{t('wallet.cardHolder')}</label>
                <input 
                  type="text" 
                  value={cardInfo.cardHolder} 
                  onChange={e => {
                    const value = e.target.value;
                    if (/^[a-zA-ZçÇğĞıİöÖşŞüÜ\s]*$/.test(value)) {
                      setCardInfo({ ...cardInfo, cardHolder: value.toUpperCase() });
                    }
                  }} 
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent text-lg bg-white" 
                  placeholder={t('wallet.cardHolder').toUpperCase()}
                  required 
                  disabled={isTopUpLoading} 
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700">{t('wallet.expiryMonth')}</label>
                  <input 
                    type="text" 
                    maxLength={2} 
                    value={cardInfo.expireMonth} 
                    onChange={e => {
                      const value = e.target.value.replace(/\D/g, '');
                      if (value.length <= 2 && (value === '' || (parseInt(value) >= 1 && parseInt(value) <= 12))) {
                        setCardInfo({ ...cardInfo, expireMonth: value });
                      }
                    }} 
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent text-lg text-center bg-white" 
                    placeholder="MM"
                    required 
                    disabled={isTopUpLoading} 
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700">{t('wallet.expiryYear')}</label>
                  <input 
                    type="text" 
                    maxLength={2} 
                    value={cardInfo.expireYear} 
                    onChange={e => {
                      const value = e.target.value.replace(/\D/g, '');
                      if (value.length <= 2) {
                        setCardInfo({ ...cardInfo, expireYear: value });
                      }
                    }} 
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent text-lg text-center bg-white" 
                    placeholder="YY"
                    required 
                    disabled={isTopUpLoading} 
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700">{t('wallet.cvv')}</label>
                  <input 
                    type="text" 
                    maxLength={4} 
                    value={cardInfo.cvc} 
                    onChange={e => {
                      const value = e.target.value.replace(/\D/g, '');
                      if (value.length <= 4) {
                        setCardInfo({ ...cardInfo, cvc: value });
                      }
                    }} 
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent text-lg text-center bg-white" 
                    placeholder="CVC"
                    required 
                    disabled={isTopUpLoading} 
                  />
                </div>
              </div>
            </div>

            {/* Güvenlik Bilgisi */}
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="text-green-500 text-xl">🔒</div>
                <div>
                  <h3 className="font-semibold text-green-800">{t('wallet.securePayment')}</h3>
                  <p className="text-green-700 text-sm mt-1">
                    {t('wallet.securePaymentDescription')}
                  </p>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button 
              type="submit" 
              className="w-full py-4 px-6 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white font-bold rounded-xl shadow-lg transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed text-xl flex items-center justify-center gap-3" 
              disabled={isTopUpLoading}
            >
              {isTopUpLoading ? (
                <>
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                  {t('common.loading')}
                </>
              ) : (
                <>
                  <span>💳</span>
                  {t('wallet.continuePayment')}
                </>
              )}
            </button>

            {/* İptal Butonu */}
            <button 
              type="button"
              onClick={() => navigate('/wallet')}
              className="w-full py-3 px-6 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-colors"
              disabled={isTopUpLoading}
            >
              {t('common.cancel')}
            </button>
          </form>
        </div>

        {/* Bilgilendirme */}
        <div className="mt-8 text-center">
          <div className="inline-block bg-blue-50 border border-blue-200 rounded-xl p-4 text-blue-800 text-sm shadow">
            <strong>ℹ️ {t('wallet.topUpInfo')}</strong> {t('wallet.topUpInfoMessage')}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BalanceTopUp;
