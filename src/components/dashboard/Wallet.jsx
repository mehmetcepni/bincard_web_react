import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AuthService from '../../services/auth.service';
import WalletService from '../../services/wallet.service';
import { toast } from 'react-toastify';
import TransferDetail from './TransferDetail';

const dummyTransactions = [
  {
    id: 1,
    type: 'wallet.transactionLoading',
    amount: 500,
    date: '2024-05-01 14:23',
    status: 'wallet.successful',
    icon: '⬆️',
  },
  {
    id: 2,
    type: 'wallet.withdrawal',
    amount: -120,
    date: '2024-04-28 09:10',
    status: 'wallet.successful',
    icon: '⬇️',
  },
  {
    id: 3,
    type: 'wallet.transactionLoading',
    amount: 200,
    date: '2024-04-20 18:45',
    status: 'wallet.successful',
    icon: '⬆️',
  },
];

const Wallet = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const authResult = await AuthService.showLoginConfirmModal(t('wallet.operations'), navigate);
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
        setError(err.message || t('wallet.cannotLoadInfo'));
        toast.error(err.message || t('wallet.cannotLoadInfo'));
      } finally {
        setLoading(false);
      }
    };
    fetchWallet();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 dark:from-gray-800 dark:to-gray-900 p-6 transition-colors duration-300">
        <div className="text-xl text-blue-700 dark:text-blue-400 animate-pulse">{t('wallet.loading')}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 dark:from-gray-800 dark:to-gray-900 p-6 transition-colors duration-300">
        <div className="text-xl text-red-600 dark:text-red-400">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-blue-50 to-purple-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4 md:p-8 transition-colors duration-300">
      <div className="max-w-3xl mx-auto">
        {/* Header & User Info */}
        <div className="flex items-center gap-4 mb-8">
          <div className="bg-gradient-to-br from-yellow-400 to-yellow-200 dark:from-yellow-500 dark:to-yellow-300 rounded-full p-4 shadow-lg border-4 border-white dark:border-gray-700">
            <span className="text-4xl">💳</span>
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-gray-800 dark:text-white mb-1 tracking-tight">{t('wallet.myWallet')}</h1>
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm">
              <span className="font-mono bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-2 py-1 rounded">ID: {wallet?.walletId || '-'}</span>
              <span className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-1 rounded">{wallet?.currency || '₺'}</span>
            </div>
          </div>
        </div>

        {/* Bakiye Kartı */}
        <div className="relative bg-gradient-to-r from-blue-700 via-purple-600 to-pink-500 rounded-3xl p-10 text-white mb-10 shadow-2xl overflow-hidden animate-fade-in">
          <div className="absolute right-8 top-8 opacity-20 text-8xl pointer-events-none select-none">💰</div>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <div className="text-blue-200 text-xs mb-1 uppercase tracking-widest">{t('wallet.currentBalance')}</div>
              <div className="text-6xl font-extrabold tracking-tight drop-shadow-lg transition-all duration-500">₺{wallet && wallet.balance != null ? Number(wallet.balance).toLocaleString('tr-TR', { minimumFractionDigits: 2 }) : '0,00'}</div>
              <div className="mt-3 flex flex-wrap gap-3 text-blue-100 text-xs">
                <span className="bg-white/10 px-3 py-1 rounded-full">{t('wallet.status')}: {wallet?.status || '-'}</span>
                <span className="bg-white/10 px-3 py-1 rounded-full">{t('wallet.currencyCode')}: {wallet?.currency || '-'}</span>
              </div>
            </div>
            <div className="flex flex-col gap-3 items-end">
              <button
                onClick={() => navigate('/balance-topup')}
                className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white font-semibold px-6 py-3 rounded-2xl shadow transition text-base backdrop-blur-md"
              >
                <span className="text-2xl">➕</span>
                <span>{t('wallet.topUp')}</span>
              </button>
              <button
                onClick={() => toast.info(t('wallet.sendMoneyComingSoon'))}
                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-semibold px-6 py-3 rounded-2xl shadow transition text-base backdrop-blur-md"
              >
                <span className="text-2xl">💸</span>
                <span>{t('wallet.sendMoney')}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Son İşlemler */}
        <div className="mt-12 mb-8 animate-fade-in">
          <h2 className="text-xl font-bold text-blue-700 dark:text-blue-400 mb-4 flex items-center gap-2">
            <span>🧾</span>{t('wallet.recentTransactions')}
          </h2>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-x-auto border dark:border-gray-700">
            <table className="min-w-full text-sm text-gray-700 dark:text-gray-300">
              <thead>
                <tr className="bg-blue-50 dark:bg-gray-700">
                  <th className="py-3 px-4 text-left text-gray-800 dark:text-gray-200">{t('wallet.type')}</th>
                  <th className="py-3 px-4 text-left text-gray-800 dark:text-gray-200">{t('wallet.amount')}</th>
                  <th className="py-3 px-4 text-left text-gray-800 dark:text-gray-200">{t('wallet.date')}</th>
                  <th className="py-3 px-4 text-left text-gray-800 dark:text-gray-200">{t('wallet.status')}</th>
                </tr>
              </thead>
              <tbody>
                {dummyTransactions.map(tx => (
                  <tr key={tx.id} className="border-b border-gray-200 dark:border-gray-600 last:border-b-0 hover:bg-blue-50/50 dark:hover:bg-gray-700/50 transition">
                    <td className="py-3 px-4 flex items-center gap-2 font-semibold"><span>{tx.icon}</span>{t(tx.type)}</td>
                    <td className={`py-3 px-4 font-mono ${tx.amount > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>{tx.amount > 0 ? '+' : ''}{tx.amount} ₺</td>
                    <td className="py-3 px-4">{tx.date}</td>
                    <td className="py-3 px-4">{t(tx.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Transfer Detayı (örnek) */}
        <div className="mt-12 mb-8 animate-fade-in">
          <h2 className="text-xl font-bold text-blue-700 dark:text-blue-400 mb-4 flex items-center gap-2">
            <span>🔍</span>{t('wallet.transferDetail')} ({t('wallet.example')})
          </h2>
          <TransferDetail transferId={1} />
        </div>

        {/* İşlem Geçmişi Placeholder */}
        <div className="mt-8 mb-4 text-center">
          <div className="inline-block bg-gradient-to-r from-yellow-100 to-yellow-50 dark:from-yellow-900/50 dark:to-yellow-800/50 border border-yellow-200 dark:border-yellow-700 rounded-xl p-4 text-yellow-800 dark:text-yellow-200 text-base shadow">
            <strong>🚧 {t('wallet.developmentNote')}</strong> {t('wallet.developmentMessage')}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Wallet;
