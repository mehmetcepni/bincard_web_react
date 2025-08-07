import React, { useState } from 'react';
import { toast } from 'react-toastify';

const Feedback = () => {
  const { t } = useTranslation();

  const FEEDBACK_TYPES = [
    { id: 'SUGGESTION', label: t('feedback.types.SUGGESTION') },
    { id: 'COMPLAINT', label: t('feedback.types.COMPLAINT') },
    { id: 'TECHNICAL_ISSUE', label: t('feedback.types.TECHNICAL_ISSUE') },
    { id: 'OTHER', label: t('feedback.types.OTHER') },
  ];

  const [type, setType] = useState('SUGGESTION');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [photo, setPhoto] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSubmitted(false);
    try {
      const formData = new FormData();
      formData.append('type', type);
      formData.append('subject', subject);
      formData.append('message', message);
      formData.append('source', 'web');
      if (photo) formData.append('photo', photo);

      const res = await fetch('http://localhost:8080/v1/api/feedback/send', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      if (!res.ok) throw new Error(t('feedback.error'));
      setSubmitted(true);
      setSubject('');
      setMessage('');
      setType('SUGGESTION');
      setPhoto(null);
      toast.success(t('feedback.success'));
    } catch (err) {
      toast.error(err.message || t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">{t('feedback.title')}</h1>
          <p className="text-gray-600">{t('feedback.subtitle')}</p>
        </div>
        {submitted && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <span className="text-green-600 text-xl mr-3">✅</span>
              <p className="text-green-800 font-medium">
                {t('feedback.successMessage')}
              </p>
            </div>
          </div>
        )}
        <div className="bg-white rounded-xl shadow-md p-6">
          <form onSubmit={handleSubmit} className="space-y-6" encType="multipart/form-data">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('feedback.type')}</label>
              <div className="flex flex-wrap gap-3">
                {FEEDBACK_TYPES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setType(t.id)}
                    className={`px-4 py-2 rounded-lg border-2 transition-all font-medium text-sm
                      ${type === t.id ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 bg-gray-50 hover:border-blue-300'}`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('feedback.subject')}</label>
              <input
                type="text"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={t('feedback.placeholders.subject')}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('feedback.message')}</label>
              <textarea
                rows={6}
                value={message}
                onChange={e => setMessage(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder={t('feedback.placeholders.message')}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('feedback.photo')}</label>
              <input
                type="file"
                accept="image/*,video/*"
                onChange={e => setPhoto(e.target.files[0])}
                className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              {photo && (
                <div className="mt-2 text-xs text-gray-500">Seçilen dosya: {photo.name}</div>
              )}
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors flex items-center justify-center space-x-2 disabled:opacity-60"
              disabled={loading}
            >
              <span>📤</span>
              <span>{loading ? t('feedback.submitting') : t('feedback.submit')}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Feedback;
