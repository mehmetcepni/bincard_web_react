import React, { useEffect, useState } from 'react';
import walletService from '../../services/wallet.service';

const statusColors = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
  FAILED: 'bg-gray-100 text-gray-600',
};

const statusLabels = {
  PENDING: 'Beklemede',
  COMPLETED: 'Tamamlandı',
  CANCELLED: 'İptal Edildi',
  FAILED: 'Başarısız',
};

const formatDateTime = (dt) => {
  if (!dt) return '-';
  const d = new Date(dt);
  return d.toLocaleString('tr-TR', { dateStyle: 'medium', timeStyle: 'short' });
};

const TransferDetail = ({ transferId }) => {
  const [transfer, setTransfer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    walletService.getTransferDetail(transferId)
      .then(setTransfer)
      .catch(err => setError(err.message || 'Transfer detayı alınamadı.'))
      .finally(() => setLoading(false));
  }, [transferId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mr-4"></div>
        <span className="text-blue-700 font-medium">Transfer detayı yükleniyor...</span>
      </div>
    );
  }
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-6 text-center">
        <div className="mb-2 font-bold text-lg">Hata</div>
        <div>{error}</div>
      </div>
    );
  }
  if (!transfer) return null;

  return (
    <div className="max-w-md mx-auto bg-white rounded-2xl shadow-2xl p-8 border border-gray-100 mt-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a5 5 0 00-10 0v2a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 17v.01" />
          </svg>
          <span className="text-xl font-bold text-blue-700">Transfer Detayı</span>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColors[transfer.status] || 'bg-gray-100 text-gray-600'}`}>
          {statusLabels[transfer.status] || transfer.status}
        </span>
      </div>
      <div className="flex flex-col items-center mb-6">
        <div className="text-4xl font-extrabold text-green-600 mb-2">₺{transfer.amount}</div>
        <div className="text-gray-500 text-sm">Transfer ID: <span className="font-mono">{transfer.id}</span></div>
      </div>
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="text-gray-700 font-medium">Başlatılma Zamanı:</span>
          <span className="ml-auto text-gray-900">{formatDateTime(transfer.initiatedAt)}</span>
        </div>
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-3-3v6" />
          </svg>
          <span className="text-gray-700 font-medium">Durum:</span>
          <span className="ml-auto text-gray-900">{statusLabels[transfer.status] || transfer.status}</span>
        </div>
      </div>
    </div>
  );
};

export default TransferDetail; 