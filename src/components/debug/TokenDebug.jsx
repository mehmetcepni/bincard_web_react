import React, { useState } from 'react';
import NewsService from '../../services/news.service';

const TokenDebug = () => {
  const [testResult, setTestResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const testNewsAPI = async () => {
    setLoading(true);
    setTestResult(null);

    try {
      console.log('🧪 News API test başlatılıyor...');
      const news = await NewsService.getActiveNews();
      setTestResult({
        success: true,
        message: 'News API başarıyla çalıştı!',
        data: news
      });
    } catch (error) {
      setTestResult({
        success: false,
        message: error.message,
        error: error
      });
    } finally {
      setLoading(false);
    }
  };

  const checkTokens = () => {
    const accessToken = localStorage.getItem('accessToken');
    const token = localStorage.getItem('token');
    const refreshToken = localStorage.getItem('refreshToken');

    console.log('🔍 Current Tokens:', {
      accessToken: accessToken ? `${accessToken.substring(0, 20)}...` : 'Yok',
      token: token ? `${token.substring(0, 20)}...` : 'Yok',
      refreshToken: refreshToken ? `${refreshToken.substring(0, 20)}...` : 'Yok'
    });

    return { accessToken, token, refreshToken };
  };

  const clearTokens = async () => {
    // AuthService'ten import edelim
    const AuthService = (await import('../../services/auth.service')).default;
    
    // Deep clean - tüm auth verilerini temizle
    AuthService.clearAllTokens();
    
    console.log('🗑️ Tüm tokenlar ve auth verileri temizlendi');
    setTestResult({
      success: true,
      message: '🗑️ Tüm tokenlar temizlendi',
      data: { cleared: true }
    });
  };

  const deleteUser = async () => {
    if (!window.confirm('⚠️ UYARI: Bu işlem kullanıcı hesabını kalıcı olarak silecek!\n\nDevam etmek istediğinize emin misiniz?')) {
      return;
    }

    setLoading(true);
    setTestResult(null);

    try {
      console.log('🗑️ Kullanıcı hesabı siliniyor...');
      
      // AuthService'ten import edelim
      const AuthService = (await import('../../services/auth.service')).default;
      
      // Backend'e hesap silme isteği gönder
      const result = await AuthService.deleteAccount();
      
      setTestResult({
        success: true,
        message: '🗑️ Kullanıcı hesabı başarıyla silindi! Login sayfasına yönlendiriliyorsunuz...',
        data: result
      });

      // AuthService.deleteAccount() zaten logout yapıyor, ekstra yönlendirme yapmaya gerek yok

    } catch (error) {
      console.error('❌ Kullanıcı silme hatası:', error);
      
      // Eğer 401 hatası ise zaten logout yapılmış
      if (error.message.includes('Oturum süresi dolmuş') || error.message.includes('tekrar giriş yapın')) {
        setTestResult({
          success: false,
          message: '⚠️ ' + error.message,
          error: error
        });
        // 2 saniye sonra login sayfasına yönlendir
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
      } else {
        setTestResult({
          success: false,
          message: `Kullanıcı hesabı silme hatası: ${error.message}`,
          error: error
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const tokens = checkTokens();

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">🔧 Token Debug Panel</h2>
      
      <div className="space-y-4">
        {/* Token Durumu */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">📋 Token Durumu</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Access Token:</span>
              <span className={tokens.accessToken ? 'text-green-600' : 'text-red-600'}>
                {tokens.accessToken ? '✅ Mevcut' : '❌ Yok'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Token (legacy):</span>
              <span className={tokens.token ? 'text-green-600' : 'text-red-600'}>
                {tokens.token ? '✅ Mevcut' : '❌ Yok'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Refresh Token:</span>
              <span className={tokens.refreshToken ? 'text-green-600' : 'text-red-600'}>
                {tokens.refreshToken ? '✅ Mevcut' : '❌ Yok'}
              </span>
            </div>
          </div>
        </div>

        {/* Test Butonları */}
        <div className="flex space-x-3">
          <button
            onClick={testNewsAPI}
            disabled={loading}
            className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
          >
            {loading ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                <span>Test Ediliyor...</span>
              </>
            ) : (
              <>
                <span>🧪</span>
                <span>News API Test Et</span>
              </>
            )}
          </button>

          <button
            onClick={clearTokens}
            className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
          >
            <span>🗑️</span>
            <span>Tokenları Temizle</span>
          </button>

          <button
            onClick={deleteUser}
            disabled={loading}
            className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg flex items-center space-x-2 border-2 border-red-500 font-bold"
          >
            <span>💀</span>
            <span>Kullanıcıyı Sil</span>
          </button>

          <button
            onClick={deleteUser}
            className="bg-red-700 hover:bg-red-800 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
          >
            <span>🗑️</span>
            <span>Kullanıcıyı Sil</span>
          </button>
        </div>

        {/* Tehlikeli İşlemler Uyarısı */}
        <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-2 text-red-800">⚠️ Tehlikeli İşlemler</h3>
          <p className="text-sm text-red-700 mb-2">
            <strong>Kullanıcıyı Sil</strong> butonu test kullanıcısını kalıcı olarak silecektir. Bu işlem geri alınamaz!
          </p>
          <ul className="text-xs text-red-600 list-disc list-inside space-y-1">
            <li>Tüm kullanıcı verileri silinir</li>
            <li>Tüm token'lar geçersiz hale gelir</li>
            <li>Login sayfasına yönlendirilirsiniz</li>
            <li>Bu işlem backend'e silme isteği gönderir</li>
          </ul>
        </div>

        {/* Test Sonucu */}
        {testResult && (
          <div className={`p-4 rounded-lg ${testResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <h3 className="text-lg font-semibold mb-2">
              {testResult.success ? '✅ Test Başarılı' : '❌ Test Başarısız'}
            </h3>
            <p className="text-sm mb-2">{testResult.message}</p>
            {testResult.success && testResult.data && (
              <div className="text-xs text-gray-600">
                <p>Getirilen haber sayısı: {testResult.data.length}</p>
              </div>
            )}
          </div>
        )}

        {/* Konsol Uyarısı */}
        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
          <p className="text-sm text-yellow-800">
            <strong>💡 İpucu:</strong> Detaylı debug bilgileri için browser'ın Developer Tools &gt; Console sekmesini kontrol edin.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TokenDebug;
