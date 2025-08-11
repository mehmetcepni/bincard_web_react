import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AuthService from '../../services/auth.service';

const DeleteAccount = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    password: '',
    reason: '',
    confirmDeletion: false
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Form değişikliklerini handle et
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Error mesajını temizle
    if (error) setError('');
  };

  // Form validasyonu
  const validateForm = () => {
    if (!formData.password.trim()) {
      setError('Şifre alanı boş olamaz');
      return false;
    }
    
    if (!formData.reason.trim()) {
      setError('Silme nedeni belirtilmelidir');
      return false;
    }
    
    if (formData.reason.length > 500) {
      setError('Silme nedeni 500 karakteri geçemez');
      return false;
    }
    
    if (!formData.confirmDeletion) {
      setError('Hesap silme işlemini onaylamalısınız');
      return false;
    }
    
    return true;
  };

  // Hesap silme işlemi
  const handleDeleteAccount = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Form validasyonu
      if (!validateForm()) {
        setLoading(false);
        return;
      }

      // API çağrısı
      const result = await AuthService.deleteAccount(
        formData.password,
        formData.reason,
        formData.confirmDeletion
      );

      if (result.success) {
        // Başarılı mesaj göster ve ana sayfaya yönlendir
        alert(result.message || 'Hesabınız başarıyla silindi. İyi günler dileriz.');
        navigate('/');
      } else {
        setError(result.message || 'Hesap silme işlemi başarısız oldu');
      }
    } catch (error) {
      console.error('Hesap silme hatası:', error);
      setError(error.message || 'Hesap silme işlemi sırasında bir hata oluştu');
    } finally {
      setLoading(false);
      setShowConfirmModal(false);
    }
  };

  // Form submit
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      setShowConfirmModal(true);
    }
  };

  // Onay modal'ını kapat
  const handleCloseModal = () => {
    setShowConfirmModal(false);
  };

  return (
    <div className="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow-md">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Hesabı Sil</h2>
        <p className="text-gray-600">Bu işlem geri alınamaz. Lütfen dikkatli olun.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Şifre */}
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            Mevcut Şifreniz *
          </label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
            placeholder="Şifrenizi girin"
            disabled={loading}
          />
        </div>

        {/* Silme Nedeni */}
        <div>
          <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-1">
            Silme Nedeni *
          </label>
          <textarea
            id="reason"
            name="reason"
            value={formData.reason}
            onChange={handleInputChange}
            rows={4}
            maxLength={500}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
            placeholder="Hesabınızı neden silmek istiyorsunuz?"
            disabled={loading}
          />
          <div className="text-right text-xs text-gray-500 mt-1">
            {formData.reason.length}/500 karakter
          </div>
        </div>

        {/* Onay Checkbox */}
        <div className="flex items-start">
          <input
            type="checkbox"
            id="confirmDeletion"
            name="confirmDeletion"
            checked={formData.confirmDeletion}
            onChange={handleInputChange}
            className="mt-1 h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
            disabled={loading}
          />
          <label htmlFor="confirmDeletion" className="ml-2 text-sm text-gray-700">
            Hesabımı kalıcı olarak silmek istediğimi onaylıyorum. Bu işlemin geri alınamaz olduğunu biliyorum.
          </label>
        </div>

        {/* Hata Mesajı */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            <div className="flex">
              <svg className="w-5 h-5 text-red-400 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span className="text-sm">{error}</span>
            </div>
          </div>
        )}

        {/* Butonlar */}
        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
            disabled={loading}
          >
            İptal
          </button>
          <button
            type="submit"
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading}
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                İşleniyor...
              </div>
            ) : (
              'Hesabı Sil'
            )}
          </button>
        </div>
      </form>

      {/* Onay Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Son Onay</h3>
              <p className="text-gray-600 mb-6">
                Hesabınızı kalıcı olarak silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleCloseModal}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
                  disabled={loading}
                >
                  İptal
                </button>
                <button
                  onClick={handleDeleteAccount}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
                  disabled={loading}
                >
                  {loading ? 'Siliniyor...' : 'Evet, Sil'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeleteAccount;
