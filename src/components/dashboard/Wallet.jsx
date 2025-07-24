import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthService from '../../services/auth.service';
import WalletService from '../../services/wallet.service';
import { toast } from 'react-toastify';
import TransferDetail from './TransferDetail';

const dummyTransactions = [
  {
    id: 1,
    type: 'Yükleme',
    amount: 500,
    date: '2024-05-01 14:23',
    status: 'Başarılı',
    icon: '⬆️',
  },
  {
    id: 2,
    type: 'Gönderim',
    amount: -120,
    date: '2024-04-28 09:10',
    status: 'Başarılı',
    icon: '⬇️',
  },
  {
    id: 3,
    type: 'Yükleme',
    amount: 200,
    date: '2024-04-20 18:45',
    status: 'Başarılı',
    icon: '⬆️',
  },
];

const Wallet = () => {
  const navigate = useNavigate();
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [topUpAmount, setTopUpAmount] = useState('');
  const [cardInfo, setCardInfo] = useState({ cardNumber: '', cardHolder: '', expireMonth: '', expireYear: '', cvc: '' });
  const [isTopUpLoading, setIsTopUpLoading] = useState(false);
  const [showTopUpForm, setShowTopUpForm] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const authResult = await AuthService.showLoginConfirmModal('Cüzdan işlemlerini', navigate);
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
      toast.success(result.message || '3D doğrulama başlatıldı. Yönlendirme yapılıyor.');
      if (result.data && result.data.startsWith('<!doctype html')) {
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
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-blue-50 to-purple-100 p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header & User Info */}
        <div className="flex items-center gap-4 mb-8">
          <div className="bg-gradient-to-br from-yellow-400 to-yellow-200 rounded-full p-4 shadow-lg border-4 border-white">
            <span className="text-4xl">💳</span>
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-gray-800 mb-1 tracking-tight">Cüzdanım</h1>
            <div className="flex items-center gap-2 text-gray-500 text-sm">
              <span className="font-mono bg-gray-100 px-2 py-1 rounded">ID: {wallet?.walletId || '-'}</span>
              <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded">{wallet?.currency || '₺'}</span>
            </div>
          </div>
        </div>

        {/* Bakiye Kartı */}
        <div className="relative bg-gradient-to-r from-blue-700 via-purple-600 to-pink-500 rounded-3xl p-10 text-white mb-10 shadow-2xl overflow-hidden animate-fade-in">
          <div className="absolute right-8 top-8 opacity-20 text-8xl pointer-events-none select-none">💰</div>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <div className="text-blue-200 text-xs mb-1 uppercase tracking-widest">Mevcut Bakiye</div>
              <div className="text-6xl font-extrabold tracking-tight drop-shadow-lg transition-all duration-500">₺{wallet && wallet.balance != null ? Number(wallet.balance).toLocaleString('tr-TR', { minimumFractionDigits: 2 }) : '0,00'}</div>
              <div className="mt-3 flex flex-wrap gap-3 text-blue-100 text-xs">
                <span className="bg-white/10 px-3 py-1 rounded-full">Durum: {wallet?.status || '-'}</span>
                <span className="bg-white/10 px-3 py-1 rounded-full">Para Birimi: {wallet?.currency || '-'}</span>
              </div>
            </div>
            <div className="flex flex-col gap-3 items-end">
              <button
                onClick={() => setShowTopUpForm(true)}
                className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white font-semibold px-6 py-3 rounded-2xl shadow transition text-base backdrop-blur-md"
              >
                <span className="text-2xl">➕</span>
                <span>Bakiye Yükle</span>
              </button>
              <button
                onClick={() => toast.info('Para gönderme özelliği yakında!')}
                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-semibold px-6 py-3 rounded-2xl shadow transition text-base backdrop-blur-md"
              >
                <span className="text-2xl">💸</span>
                <span>Para Gönder</span>
              </button>
            </div>
          </div>
        </div>

        {/* Para Yükleme Formu */}
        {showTopUpForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
            <div className="relative max-w-xl w-full mx-4 bg-white/90 rounded-3xl shadow-2xl p-8 border border-blue-100 animate-fade-in">
              <button
                type="button"
                onClick={() => setShowTopUpForm(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-red-500 text-2xl font-bold focus:outline-none"
                aria-label="Kapat"
              >
                ×
              </button>
              <form onSubmit={handleTopUp} className="space-y-6">
                <h2 className="text-2xl font-bold text-blue-700 mb-2 flex items-center gap-2"><span>➕</span>Cüzdana Para Yükle</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700">Tutar (₺)</label>
                    <input type="number" min="1" step="0.01" value={topUpAmount} onChange={e => setTopUpAmount(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-lg bg-white" required disabled={isTopUpLoading} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700">Kart Numarası</label>
                    <input type="text" maxLength={16} value={cardInfo.cardNumber} onChange={e => {
                      const value = e.target.value;
                      if (/^\d*$/.test(value)) {
                        setCardInfo({ ...cardInfo, cardNumber: value });
                      }
                    }} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-lg bg-white" required disabled={isTopUpLoading} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700">Kart Sahibi</label>
                    <input type="text" value={cardInfo.cardHolder} onChange={e => {
                      const value = e.target.value;
                      // Sadece harf (Türkçe dahil) ve boşluk karakterlerini kabul et
                      if (/^[a-zA-ZçÇğĞıİöÖşŞüÜ\s]*$/.test(value)) {
                        setCardInfo({ ...cardInfo, cardHolder: value });
                      }
                    }} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-lg bg-white" required disabled={isTopUpLoading} />
                  </div>
                  <div className="flex gap-4">
                    <div className="w-1/2">
                      <label className="block text-sm font-medium mb-1 text-gray-700">SKT Ay</label>
                      <input type="text" maxLength={2} value={cardInfo.expireMonth} onChange={e => {
                        const value = e.target.value;
                        if (/^\d*$/.test(value)) {
                          setCardInfo({ ...cardInfo, expireMonth: value });
                        }
                      }} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-lg bg-white" required disabled={isTopUpLoading} />
                    </div>
                    <div className="w-1/2">
                      <label className="block text-sm font-medium mb-1 text-gray-700">SKT Yıl</label>
                      <input type="text" maxLength={2} value={cardInfo.expireYear} onChange={e => {
                        const value = e.target.value;
                        if (/^\d*$/.test(value)) {
                          setCardInfo({ ...cardInfo, expireYear: value });
                        }
                      }} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-lg bg-white" required disabled={isTopUpLoading} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700">CVC</label>
                    <input type="text" maxLength={4} value={cardInfo.cvc} onChange={e => {
                      const value = e.target.value;
                      // Sadece rakamları kabul et
                      if (/^\d*$/.test(value)) {
                        setCardInfo({ ...cardInfo, cvc: value });
                      }
                    }} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-lg bg-white" required disabled={isTopUpLoading} />
                  </div>
                </div>
                <button type="submit" className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold rounded-xl shadow-md transition disabled:opacity-60 text-xl flex items-center justify-center gap-2" disabled={isTopUpLoading}>{isTopUpLoading ? 'Yükleniyor...' : <><span role="img" aria-label="card">💳</span>Para Yükle</>}</button>
              </form>
            </div>
          </div>
        )}

        {/* Son İşlemler */}
        <div className="mt-12 mb-8 animate-fade-in">
          <h2 className="text-xl font-bold text-blue-700 mb-4 flex items-center gap-2">
            <span>🧾</span>Son İşlemler
          </h2>
          <div className="bg-white rounded-2xl shadow-lg overflow-x-auto">
            <table className="min-w-full text-sm text-gray-700">
              <thead>
                <tr className="bg-blue-50">
                  <th className="py-3 px-4 text-left">Tür</th>
                  <th className="py-3 px-4 text-left">Tutar</th>
                  <th className="py-3 px-4 text-left">Tarih</th>
                  <th className="py-3 px-4 text-left">Durum</th>
                </tr>
              </thead>
              <tbody>
                {dummyTransactions.map(tx => (
                  <tr key={tx.id} className="border-b last:border-b-0 hover:bg-blue-50/50 transition">
                    <td className="py-3 px-4 flex items-center gap-2 font-semibold"><span>{tx.icon}</span>{tx.type}</td>
                    <td className={`py-3 px-4 font-mono ${tx.amount > 0 ? 'text-green-600' : 'text-red-500'}`}>{tx.amount > 0 ? '+' : ''}{tx.amount} ₺</td>
                    <td className="py-3 px-4">{tx.date}</td>
                    <td className="py-3 px-4">{tx.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Transfer Detayı (örnek) */}
        <div className="mt-12 mb-8 animate-fade-in">
          <h2 className="text-xl font-bold text-blue-700 mb-4 flex items-center gap-2">
            <span>🔍</span>Transfer Detayı (Örnek)
          </h2>
          <TransferDetail transferId={1} />
        </div>

        {/* İşlem Geçmişi Placeholder */}
        <div className="mt-8 mb-4 text-center">
          <div className="inline-block bg-gradient-to-r from-yellow-100 to-yellow-50 border border-yellow-200 rounded-xl p-4 text-yellow-800 text-base shadow">
            <strong>🚧 Geliştirme Aşamasında:</strong> Bu sayfa henüz tamamlanmamış bir protiptir. Yakında gerçek cüzdan işlevleri ve işlem geçmişi burada görünecek.
          </div>
        </div>
      </div>
    </div>
  );
};

export default Wallet;
