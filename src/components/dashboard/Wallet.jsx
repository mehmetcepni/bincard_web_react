import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthService from '../../services/auth.service';
import WalletService from '../../services/wallet.service';
import { toast } from 'react-toastify';

const Wallet = () => {
  const navigate = useNavigate();
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Para yükleme için state
  const [topUpAmount, setTopUpAmount] = useState('');
  const [cardInfo, setCardInfo] = useState({ cardNumber: '', cardHolder: '', expireMonth: '', expireYear: '', cvc: '' });
  const [isTopUpLoading, setIsTopUpLoading] = useState(false);

  // Sayfa yüklendiğinde auth kontrolü yap
  useEffect(() => {
    const checkAuth = async () => {
      try {
        console.log('🔐 [WALLET] Auth kontrolü yapılıyor...');
        const authResult = await AuthService.showLoginConfirmModal('Cüzdan işlemlerini', navigate);
        console.log('🔐 [WALLET] Auth modal sonucu:', authResult);
        
        if (!authResult && !AuthService.isAuthenticated()) {
          // Kullanıcı giriş yapmak istemedi, ana sayfaya yönlendir
          console.log('🔄 [WALLET] Kullanıcı giriş yapmak istemedi, dashboard\'a yönlendiriliyor...');
          navigate('/dashboard');
        } else {
          console.log('✅ [WALLET] Auth kontrolü tamamlandı, cüzdan yüklendi');
        }
      } catch (error) {
        console.error('❌ [WALLET] Auth kontrolü hatası:', error);
        navigate('/dashboard');
      }
    };

    if (!AuthService.isAuthenticated()) {
      checkAuth();
    } else {
      console.log('✅ [WALLET] Kullanıcı zaten giriş yapmış, cüzdan yükleniyor...');
    }
  }, [navigate]);

  // Cüzdan bilgisini backend'den çek
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

  // İşlem butonları için auth kontrolü
  const handleAuthRequired = async (action) => {
    try {
      console.log('🔐 [WALLET] İşlem için auth kontrolü:', action);
      
      if (!AuthService.isAuthenticated()) {
        const authResult = await AuthService.showLoginConfirmModal(action, navigate);
        console.log('🔐 [WALLET] İşlem auth modal sonucu:', authResult);
        return authResult;
      }
      
      console.log('✅ [WALLET] Kullanıcı zaten giriş yapmış, işlem devam ediyor');
      return true;
    } catch (error) {
      console.error('❌ [WALLET] İşlem auth kontrolü hatası:', error);
      return false;
    }
  };

  const handleBalanceLoad = async () => {
    if (await handleAuthRequired('Bakiye yükleme işlemini')) {
      // Bakiye yükleme işlemi
      toast.success('Bakiye yükleme sayfasına yönlendiriliyor...', {
        position: 'top-center',
        autoClose: 2000
      });
    }
  };

  const handleSendMoney = async () => {
    if (await handleAuthRequired('Para gönderme işlemini')) {
      // Para gönderme işlemi
      toast.success('Para gönderme sayfasına yönlendiriliyor...', {
        position: 'top-center',
        autoClose: 2000
      });
    }
  };

  // Cüzdana para yükle
  const handleTopUp = async (e) => {
    e.preventDefault();
    setIsTopUpLoading(true);
    try {
      const result = await WalletService.topUpWallet({ amount: topUpAmount, cardInfo });
      toast.success(result.message || '3D doğrulama başlatıldı. Yönlendirme yapılıyor.');
      if (result.data && result.data.startsWith('<!doctype html')) {
        // 3D secure için yeni pencere aç
        const win = window.open('', '_blank');
        win.document.open();
        win.document.write(result.data);
        win.document.close();
      }
    } catch (err) {
      toast.error(err.message || 'Para yükleme işlemi başarısız.');
    } finally {
      setIsTopUpLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 p-6">
        <div className="text-xl text-blue-700 animate-pulse">Cüzdan yükleniyor...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 p-6">
        <div className="text-xl text-red-600">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 to-purple-100 p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center gap-3">
          <div className="bg-gradient-to-br from-yellow-400 to-yellow-200 rounded-full p-3 shadow-md">
            <span className="text-3xl">💛</span>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-1 tracking-tight">Cüzdanım</h1>
            <p className="text-gray-600 text-sm">Bakiye yönetimi ve işlem geçmişi</p>
          </div>
        </div>

        {/* Bakiye Kartı */}
        <div className="relative bg-gradient-to-r from-blue-700 via-purple-600 to-pink-500 rounded-3xl p-8 text-white mb-8 shadow-2xl overflow-hidden">
          <div className="absolute right-6 top-6 opacity-30 text-7xl pointer-events-none select-none">💳</div>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <div className="text-blue-200 text-xs mb-1 uppercase tracking-widest">Mevcut Bakiye</div>
              <div className="text-5xl font-extrabold tracking-tight drop-shadow-lg">₺{wallet && wallet.balance != null ? Number(wallet.balance).toFixed(2) : '0.00'}</div>
              <div className="mt-2 flex flex-wrap gap-4 text-blue-100 text-xs">
                <span className="bg-white/10 px-3 py-1 rounded-full">Durum: {wallet?.status || '-'}</span>
                <span className="bg-white/10 px-3 py-1 rounded-full">Para Birimi: {wallet?.currency || '-'}</span>
                <span className="bg-white/10 px-3 py-1 rounded-full">Cüzdan ID: {wallet?.walletId || '-'}</span>
              </div>
            </div>
            <div className="flex flex-col gap-2 items-end">
              <button
                onClick={() => setTopUpAmount(wallet?.balance ? wallet.balance : '')}
                className="bg-white/20 hover:bg-white/30 text-white font-semibold px-5 py-2 rounded-xl shadow transition text-sm"
              >
                <span className="mr-2">➕</span>Bakiye Yükle
              </button>
              <button
                onClick={() => toast.info('Para gönderme özelliği yakında!')}
                className="bg-white/10 hover:bg-white/20 text-white font-semibold px-5 py-2 rounded-xl shadow transition text-sm"
              >
                <span className="mr-2">💸</span>Para Gönder
              </button>
            </div>
          </div>
        </div>

        {/* Para Yükleme Formu */}
        <form onSubmit={handleTopUp} className="max-w-lg mx-auto mt-10 p-6 bg-white/90 rounded-2xl shadow-xl space-y-5 border border-blue-100">
          <h2 className="text-xl font-bold text-blue-700 mb-2 flex items-center gap-2"><span>➕</span>Cüzdana Para Yükle</h2>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">Tutar (₺)</label>
            <input type="number" min="1" step="0.01" value={topUpAmount} onChange={e => setTopUpAmount(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-base bg-white" required disabled={isTopUpLoading} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">Kart Numarası</label>
              <input type="text" maxLength={16} value={cardInfo.cardNumber} onChange={e => setCardInfo({ ...cardInfo, cardNumber: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-base bg-white" required disabled={isTopUpLoading} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">Kart Sahibi</label>
              <input type="text" value={cardInfo.cardHolder} onChange={e => setCardInfo({ ...cardInfo, cardHolder: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-base bg-white" required disabled={isTopUpLoading} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">Son Kullanma Ay</label>
              <input type="text" maxLength={2} value={cardInfo.expireMonth} onChange={e => setCardInfo({ ...cardInfo, expireMonth: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-base bg-white" required disabled={isTopUpLoading} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">Son Kullanma Yıl</label>
              <input type="text" maxLength={2} value={cardInfo.expireYear} onChange={e => setCardInfo({ ...cardInfo, expireYear: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-base bg-white" required disabled={isTopUpLoading} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">CVC</label>
              <input type="text" maxLength={4} value={cardInfo.cvc} onChange={e => setCardInfo({ ...cardInfo, cvc: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-base bg-white" required disabled={isTopUpLoading} />
            </div>
          </div>
          <button type="submit" className="w-full py-2 px-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-lg shadow-md transition disabled:opacity-60 text-lg" disabled={isTopUpLoading}>{isTopUpLoading ? 'Yükleniyor...' : 'Para Yükle'}</button>
        </form>

        {/* İşlem Geçmişi Bölümü için yer */}
        <div className="mt-12 mb-4 text-center text-gray-400 text-sm italic">İşlem geçmişi yakında burada görünecek.</div>

        {/* Placeholder Note */}
        <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3 max-w-lg mx-auto text-xs text-yellow-800 text-center">
          <strong>🚧 Geliştirme Aşamasında:</strong> Bu sayfa henüz tamamlanmamış bir protiptir. Yakında gerçek cüzdan işlevleri eklenecektir.
        </div>
      </div>
    </div>
  );
};

export default Wallet;
