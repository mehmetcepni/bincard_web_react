import React, { useState } from 'react';

const Feedback = () => {
  const [feedbackType, setFeedbackType] = useState('suggestion');
  const [rating, setRating] = useState(0);
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const feedbackTypes = [
    { id: 'suggestion', label: 'Öneri', icon: '💡', color: 'blue' },
    { id: 'complaint', label: 'Şikayet', icon: '😞', color: 'red' },
    { id: 'compliment', label: 'Övgü', icon: '👏', color: 'green' },
    { id: 'bug', label: 'Hata Bildirimi', icon: '🐛', color: 'yellow' }
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">💬 Geri Bildirim</h1>
          <p className="text-gray-600">Görüşleriniz bizim için değerli. Deneyiminizi paylaşın!</p>
        </div>

        {/* Success Message */}
        {submitted && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <span className="text-green-600 text-xl mr-3">✅</span>
              <p className="text-green-800 font-medium">
                Geri bildiriminiz başarıyla gönderildi! Teşekkür ederiz.
              </p>
            </div>
          </div>
        )}

        {/* Feedback Form */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Feedback Type Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Geri bildirim türü seçin:
              </label>
              <div className="grid grid-cols-2 gap-3">
                {feedbackTypes.map(type => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setFeedbackType(type.id)}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      feedbackType === type.id
                        ? `border-${type.color}-500 bg-${type.color}-50`
                        : 'border-gray-200 hover:border-gray-300 bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <span className="text-xl">{type.icon}</span>
                      <span className="font-medium text-gray-800">{type.label}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Rating */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Genel memnuniyet dereceniz (1-5):
              </label>
              <div className="flex space-x-2">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="text-2xl transition-colors"
                  >
                    {star <= rating ? '⭐' : '☆'}
                  </button>
                ))}
              </div>
            </div>

            {/* Message */}
            <div>
              <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-3">
                Mesajınız:
              </label>
              <textarea
                id="message"
                rows={6}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="Deneyiminizi, önerilerinizi veya yaşadığınız sorunları detaylı olarak açıklayın..."
                required
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors flex items-center justify-center space-x-2"
            >
              <span>📤</span>
              <span>Geri Bildirimi Gönder</span>
            </button>
          </form>
        </div>

        {/* FAQ Section */}
        <div className="mt-8 bg-white rounded-xl shadow-md p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">🙋‍♀️ Sık Sorulan Sorular</h3>
          <div className="space-y-4">
            <div className="border-b border-gray-100 pb-3">
              <h4 className="font-semibold text-gray-800 mb-1">Geri bildirimlerime ne zaman yanıt alacağım?</h4>
              <p className="text-gray-600 text-sm">Genellikle 24-48 saat içinde size geri dönüş yapıyoruz.</p>
            </div>
            <div className="border-b border-gray-100 pb-3">
              <h4 className="font-semibold text-gray-800 mb-1">Anonim geri bildirim verebilir miyim?</h4>
              <p className="text-gray-600 text-sm">Evet, kimlik bilgilerinizi paylaşmak zorunda değilsiniz.</p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-800 mb-1">Acil durumlar için nasıl iletişim kurabilirim?</h4>
              <p className="text-gray-600 text-sm">Acil durumlar için 7/24 destek hattımızı arayabilirsiniz: 444 BİN KART</p>
            </div>
          </div>
        </div>

        {/* Placeholder Note */}
        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800 text-sm">
            <strong>🚧 Geliştirme Aşamasında:</strong> Bu sayfa henüz tamamlanmamış bir protiptir. 
            Yakında gerçek geri bildirim sistemi entegre edilecektir.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Feedback;
