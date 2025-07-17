import AuthService from './auth.service';

const BASE_URL = 'http://localhost:8080/v1/api';

class WalletService {
  // Kullanıcının cüzdan bilgisini getir
  async getMyWallet() {
    try {
      const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
      const response = await fetch(`${BASE_URL}/wallet/my-wallet`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` })
        }
      });
      if (!response.ok) {
        if (response.status === 401) {
          AuthService.logout();
          throw new Error('Oturum süresi doldu. Lütfen tekrar giriş yapın.');
        }
        throw new Error(`Cüzdan bilgisi alınamadı: ${response.status}`);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('❌ Cüzdan servisi hatası:', error);
      throw error;
    }
  }

  // Cüzdana para yükle (3D secure başlatır)
  async topUpWallet({ amount, cardInfo }) {
    try {
      const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
      const payload = {
        amount,
        cardNumber: cardInfo.cardNumber,
        cardExpiry: cardInfo.expireMonth + '/' + cardInfo.expireYear,
        cardCvc: cardInfo.cvc
      };
      const response = await fetch(`${BASE_URL}/wallet/top-up`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` })
        },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Para yükleme işlemi başarısız.');
      }
      return data;
    } catch (err) {
      throw err;
    }
  }

  // Cüzdan işlem geçmişi (aktiviteleri) getir
  async getWalletActivities({ type, start, end, page = 0, size = 20, sort = 'activityDate,desc' }) {
    try {
      const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
      const params = new URLSearchParams({
        ...(type && { type }),
        ...(start && { start }),
        ...(end && { end }),
        page,
        size,
        sort
      });
      const response = await fetch(`${BASE_URL}/wallet/activities?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` })
        }
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'İşlem geçmişi getirilemedi.');
      }
      return data.data;
    } catch (err) {
      throw err;
    }
  }
}

export default new WalletService(); 