import AuthService from './auth.service';

const API_URL = 'http://localhost:8080/v1/api/feedback';

class FeedbackService {
  
  // Feedback gönder
  async sendFeedback(feedbackData) {
    try {
      // Token'ı AuthService'deki yöntemle al
      const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
      if (!token) {
        throw new Error('Oturum açmanız gerekiyor.');
      }

      const formData = new FormData();
      
      // Backend'in beklediği field'ları ekle
      formData.append('type', feedbackData.type);
      formData.append('subject', feedbackData.subject);
      formData.append('message', feedbackData.message);
      formData.append('source', 'web');
      
      // Fotoğraf varsa ekle
      if (feedbackData.photo) {
        formData.append('photo', feedbackData.photo);
      }

      console.log('📝 Feedback gönderiliyor:', {
        type: feedbackData.type,
        subject: feedbackData.subject,
        hasPhoto: !!feedbackData.photo,
        photoName: feedbackData.photo?.name,
        photoSize: feedbackData.photo?.size
      });

      const response = await fetch(`${API_URL}/send`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          // FormData kullanırken Content-Type header'ı ekleme - browser otomatik ekler
        },
        body: formData,
      });

      const responseText = await response.text();
      console.log('📝 Feedback response:', {
        status: response.status,
        statusText: response.statusText,
        responseText: responseText
      });

      if (!response.ok) {
        let errorMessage = 'Geri bildirim gönderilemedi';
        
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          // Response JSON değilse, statusText'i kullan
          errorMessage = response.statusText || errorMessage;
        }
        
        if (response.status === 401) {
          // Token geçersizse yenile
          AuthService.logout();
          throw new Error('Oturumunuz sona erdi. Lütfen tekrar giriş yapın.');
        }
        
        throw new Error(errorMessage);
      }

      // Response'u parse et
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (e) {
        // Response JSON değilse, basit bir success message dön
        result = { message: 'Geri bildiriminiz başarıyla gönderildi!' };
      }

      console.log('✅ Feedback başarıyla gönderildi:', result);
      return result;

    } catch (error) {
      console.error('❌ Feedback gönderme hatası:', error);
      throw error;
    }
  }

  // Feedback türlerini getir (frontend'de tanımlı)
  getFeedbackTypes() {
    return [
      { id: 'SUGGESTION', label: 'Öneri', icon: '💡' },
      { id: 'COMPLAINT', label: 'Şikayet', icon: '⚠️' },
      { id: 'TECHNICAL_ISSUE', label: 'Teknik Sorun', icon: '🔧' },
      { id: 'OTHER', label: 'Diğer', icon: '📝' },
    ];
  }

  // Dosya validasyonu
  validateFile(file) {
    if (!file) return { valid: true };

    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/avi', 'video/mov', 'video/wmv'
    ];

    if (file.size > maxSize) {
      return {
        valid: false,
        error: 'Dosya boyutu 10MB\'dan büyük olamaz.'
      };
    }

    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: 'Sadece fotoğraf (JPEG, PNG, GIF, WebP) ve video (MP4, AVI, MOV, WMV) dosyaları yüklenebilir.'
      };
    }

    return { valid: true };
  }
}

export default new FeedbackService();
