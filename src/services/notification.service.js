import axios from 'axios';
import AuthService from './auth.service';

const API_URL = 'http://localhost:8080/v1/api/';

class NotificationService {
  getNotifications(type = null, page = 0, size = 10) {
    const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
    
    if (!token) {
      console.error('Token bulunamadı. Kullanıcı oturum açmamış olabilir.');
      return Promise.reject('Oturum açmanız gerekiyor');
    }

    let url = `${API_URL}notifications?page=${page}&size=${size}`;
    if (type) {
      url += `&type=${type}`;
    }

    return axios.get(url, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
    .then(response => {
      return response.data;
    })
    .catch(error => {
      console.error('Bildirimler alınırken hata oluştu:', error);
      throw error;
    });
  }

  markAsRead(notificationId) {
    const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
    
    if (!token) {
      return Promise.reject('Oturum açmanız gerekiyor');
    }

    return axios.put(`${API_URL}notifications/${notificationId}/read`, {}, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
    .then(response => {
      return response.data;
    })
    .catch(error => {
      console.error(`Bildirim ${notificationId} okundu olarak işaretlenirken hata oluştu:`, error);
      throw error;
    });
  }

  markAllAsRead() {
    const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
    
    if (!token) {
      return Promise.reject('Oturum açmanız gerekiyor');
    }

    return axios.put(`${API_URL}notifications/read-all`, {}, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
    .then(response => {
      return response.data;
    })
    .catch(error => {
      console.error('Tüm bildirimler okundu olarak işaretlenirken hata oluştu:', error);
      throw error;
    });
  }

  deleteNotification(notificationId) {
    const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
    
    if (!token) {
      return Promise.reject('Oturum açmanız gerekiyor');
    }

    return axios.delete(`${API_URL}notifications/${notificationId}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
    .then(response => {
      return response.data;
    })
    .catch(error => {
      console.error(`Bildirim ${notificationId} silinirken hata oluştu:`, error);
      throw error;
    });
  }

  /**
   * Belirli bir bildirimin detaylarını getirir
   * @param {number} notificationId Bildirim ID
   * @returns {Promise} Bildirim detaylarını içeren promise
   */
  getNotificationDetail(notificationId) {
    const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
    
    if (!token) {
      console.error('Token bulunamadı. Kullanıcı oturum açmamış olabilir.');
      return Promise.reject('Oturum açmanız gerekiyor');
    }

    return axios.get(`${API_URL}notifications/${notificationId}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
    .then(response => {
      // Aynı zamanda bildirimi okundu olarak işaretle
      this.markAsRead(notificationId)
        .then(() => console.log(`Bildirim ${notificationId} otomatik olarak okundu olarak işaretlendi`))
        .catch(err => console.warn(`Bildirim ${notificationId} okundu olarak işaretlenemedi:`, err));
      
      return response.data;
    })
    .catch(error => {
      console.error(`Bildirim detayları alınırken hata oluştu (ID: ${notificationId}):`, error);
      throw error;
    });
  }
}

export default new NotificationService();
