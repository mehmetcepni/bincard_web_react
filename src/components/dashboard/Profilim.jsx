import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthService from '../../services/auth.service';

const Profilim = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState({ firstName: '', lastName: '', email: '', profilePicture: '' });
  const [photoPreview, setPhotoPreview] = useState('');
  const [photoFile, setPhotoFile] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [originalProfile, setOriginalProfile] = useState(null);

  // Profil bilgisini yükle
  const fetchProfile = async () => {
    setLoading(true);
    setError('');
    try {
      console.log('Profil bilgisi getiriliyor...');
      const data = await AuthService.getProfile();
      
      if (!data) throw new Error('Profil bilgileri alınamadı.');
      
      console.log('Alınan profil bilgisi:', data);
      console.log('Ham veri:', data._rawData);
      
      // Tüm veriyi detaylı olarak inceleyelim
      console.log('Tüm nesne özellikleri:');
      const flattenAndLog = (obj, prefix = '') => {
        for (const key in obj) {
          if (typeof obj[key] === 'object' && obj[key] !== null && key !== '_rawData') {
            flattenAndLog(obj[key], `${prefix}${key}.`);
          } else if (key !== '_rawData') {
            console.log(`- ${prefix}${key}: ${JSON.stringify(obj[key])}`);
          }
        }
      };
      flattenAndLog(data);
      
      // Backend'den gelen tüm olası alan adlarını kontrol et
      const firstName = data.firstName || '';
      const lastName = data.lastName || '';
      const email = data.email || '';
      const profilePicture = data.profilePicture || '';
      
      console.log('İşlenen profil verileri:', { firstName, lastName, email, profilePicture });
      
      const profileData = {
        firstName,
        lastName,
        email,
        profilePicture,
        // Eğer backend'den gelen özel alan adları varsa onları da sakla
        originalFieldNames: data.originalFieldNames || {
          firstName: 'firstName',
          lastName: 'lastName',
          email: 'email'
        }
      };
      
      console.log('Oluşturulan profil nesnesi:', profileData);
      
      setProfile(profileData);
      setPhotoPreview(profilePicture);
      setOriginalProfile({...profileData});
      
      // Debug: Profil fotoğrafı kontrolü
      console.log('🖼️ Profil fotoğrafı debug:', {
        profilePicture: profilePicture,
        photoPreview: profilePicture,
        hasProfilePicture: !!profilePicture,
        profilePictureLength: profilePicture?.length || 0
      });
    } catch (err) {
      console.error('Profil yükleme hatası:', err);
      setError('Profil bilgileri alınamadı: ' + (err.message || 'Bilinmeyen hata'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  // Fotoğraf seçilince önizleme göster
  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Dosya boyutu kontrolü (5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Fotoğraf boyutu 5MB\'dan küçük olmalı!');
        return;
      }
      
      // Dosya tipi kontrolü (sadece resim dosyalarına izin ver)
      if (!file.type.startsWith('image/')) {
        setError('Lütfen geçerli bir resim dosyası seçin!');
        return;
      }
      
      console.log('Fotoğraf seçildi:', {
        name: file.name,
        type: file.type,
        size: `${(file.size / 1024).toFixed(2)} KB`
      });
      
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
      setError(''); // Herhangi bir hata mesajı varsa temizle
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    console.log(`Field değişiyor: ${name} = ${value}`);
    setProfile(prev => {
      const newProfile = { ...prev, [name]: value };
      console.log('Yeni profil durumu:', newProfile);
      return newProfile;
    });
  };

  const handleCancel = () => {
    setProfile(originalProfile);
    setPhotoPreview(originalProfile?.profilePicture || '');
    setPhotoFile(null);
    setMessage('');
    setError('');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');
    try {
      if (!profile.firstName.trim() || !profile.lastName.trim()) {
        setError('Ad ve soyad boş olamaz!');
        setSaving(false);
        return;
      }
      if (!profile.email || !profile.email.includes('@')) {
        setError('Geçerli bir e-posta adresi girin!');
        setSaving(false);
        return;
      }
      
      // Ad, soyad veya e-posta değiştiyse güncelle
      if (
        profile.firstName !== originalProfile.firstName ||
        profile.lastName !== originalProfile.lastName ||
        profile.email !== originalProfile.email
      ) {
        console.log('Profil güncellenecek:', {
          firstName: profile.firstName,
          lastName: profile.lastName,
          email: profile.email
        });
        
        // Tüm olası alan adlarını içeren bir veri hazırlayalım
        // Orijinal backend alan adlarını kullanmaya çalışalım, böylece değişiklikleri doğru şekilde işleyebilir
        const updateData = {
          // Temel alanlar
          firstName: profile.firstName.trim(),
          lastName: profile.lastName.trim(),
          email: profile.email.trim(),
          
          // Orijinal alan adlarını kontrol ederek kullan
          [profile.originalFieldNames?.firstName || 'firstName']: profile.firstName.trim(),
          [profile.originalFieldNames?.lastName || 'lastName']: profile.lastName.trim(),
          [profile.originalFieldNames?.email || 'email']: profile.email.trim(),
          
          // Türkçe alan adları
          ad: profile.firstName.trim(),
          soyad: profile.lastName.trim(),
          
          // Snake case
          first_name: profile.firstName.trim(),
          last_name: profile.lastName.trim(),
          
          // Diğer varyantlar
          name: profile.firstName.trim(),
          surname: profile.lastName.trim()
        };
        
        console.log('http://localhost:8080/v1/api/user/profile adresine PUT isteği yapılıyor...');
        console.log('Gönderilen veri:', updateData);
        
        // Güncelleme isteğini gönder
        const updateResult = await AuthService.updateProfile(updateData);
        
        // Sonucu detaylıca logla
        console.log('Güncelleme sonucu:', updateResult);
        
        // Başarıyla güncellendi mi kontrol et
        if (!updateResult) {
          throw new Error('Profil güncellenirken bir hata oluştu');
        }
        
        // Hata yoksa güncelleme durumu (eğer backend ilerleme bildiriyorsa)
        if (updateResult.success === false) {
          throw new Error(updateResult.message || 'Güncelleme işlemi başarısız oldu');
        }
        
        if (updateResult.message) {
          setMessage(updateResult.message);
        }
      }
      
      // Fotoğraf değiştiyse güncelle
      if (photoFile) {
        console.log('Fotoğraf güncelleniyor:', photoFile.name, photoFile.type, photoFile.size);
        try {
          // Fotoğraf yükleme işlemini başlat
          console.log('http://localhost:8080/v1/api/user/profile/photo adresine PUT isteği yapılıyor...');
          const photoResult = await AuthService.updateProfilePhoto(photoFile);
          console.log('Fotoğraf güncelleme sonucu:', photoResult);
          
          // Başarılı yanıt alındı mı kontrol et
          if (photoResult && photoResult.message) {
            console.log('Fotoğraf başarıyla yüklendi:', photoResult.message);
            setMessage(prevMessage => 
              prevMessage ? `${prevMessage} Fotoğraf da güncellendi.` : 'Fotoğraf başarıyla güncellendi!'
            );
          } else {
            console.warn('Fotoğraf yüklendi ancak backend yanıtı eksik');
          }
        } catch (photoError) {
          console.error('Fotoğraf güncelleme hatası:', photoError);
          if (!message) {
            setError(`Profil bilgileri güncellendi ancak fotoğraf yüklenemedi: ${photoError.message}`);
          }
        }
      }
      
      // Mesaj daha önce ayarlanmadıysa varsayılan mesajı göster
      if (!message && !error) {
        setMessage('Profil başarıyla güncellendi!');
      }
      
      setPhotoFile(null);
      
      // İşlemler bittikten sonra biraz bekleyelim
      setTimeout(async () => {
        // Güncel profil bilgisini yükle
        console.log('Güncel profil bilgisi yeniden alınıyor...');
        await fetchProfile(); // Profil bilgisini tekrar yükle ki yeni değerler hemen görünsün
      }, 500); // Backend'in değişiklikleri işlemesi için biraz bekle
      
    } catch (err) {
      console.error('Profil güncelleme hatası:', err);
      setError(err.message || 'Profil güncellenemedi.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    if (isLoggingOut) return;
    
    // Kullanıcıdan onay al
    const confirmLogout = window.confirm('Çıkış yapmak istediğinizden emin misiniz?');
    if (!confirmLogout) return;
    
    setIsLoggingOut(true);
    
    try {
      console.log('🚪 Çıkış işlemi başlatılıyor...');
      
      // AuthService logout fonksiyonunu çağır (token'ları temizler)
      AuthService.logout();
      
      // Başarılı mesajı göster
      setMessage('Başarıyla çıkış yapıldı. Yönlendiriliyorsunuz...');
      
      // Ek güvenlik için manuel token temizleme
      console.log('🔒 Ek güvenlik kontrolleri yapılıyor...');
      localStorage.clear(); // Tüm localStorage'ı temizle
      sessionStorage.clear(); // Tüm sessionStorage'ı temizle
      
      // Kısa bir süre bekle ve login sayfasına yönlendir
      setTimeout(() => {
        navigate('/login', { 
          state: { 
            message: 'Başarıyla çıkış yapıldı. Güvenliğiniz için tüm oturum verileri temizlendi.', 
            type: 'success' 
          } 
        });
      }, 1500);
      
    } catch (err) {
      console.error('❌ Çıkış yapma hatası:', err);
      setError('Çıkış yapılırken bir hata oluştu.');
      setIsLoggingOut(false);
    }
  };

  if (loading) {
    return (
      <div className="relative min-h-[calc(100vh-56px)] py-8 px-4 overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
          <div className="absolute top-0 left-0 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
          <div className="absolute top-0 right-0 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-8 left-20 w-72 h-72 bg-indigo-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
        </div>
        
        <div className="relative z-10 flex items-center justify-center min-h-[80vh]">
          <div className="animate-pulse max-w-2xl mx-auto w-full">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-white/20">
              <div className="flex flex-col items-center mb-8">
                <div className="w-32 h-32 bg-gradient-to-br from-blue-200 to-purple-200 rounded-full mb-4"></div>
                <div className="h-6 bg-gradient-to-r from-blue-200 to-indigo-200 rounded w-48 mb-2"></div>
                <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-64"></div>
              </div>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="h-4 bg-gradient-to-r from-gray-200 to-blue-200 rounded w-16 mb-2"></div>
                    <div className="h-12 bg-gradient-to-r from-gray-100 to-blue-100 rounded-lg"></div>
                  </div>
                  <div>
                    <div className="h-4 bg-gradient-to-r from-gray-200 to-purple-200 rounded w-20 mb-2"></div>
                    <div className="h-12 bg-gradient-to-r from-gray-100 to-purple-100 rounded-lg"></div>
                  </div>
                </div>
                <div>
                  <div className="h-4 bg-gradient-to-r from-gray-200 to-indigo-200 rounded w-20 mb-2"></div>
                  <div className="h-12 bg-gradient-to-r from-gray-100 to-indigo-100 rounded-lg"></div>
                </div>
                <div className="flex justify-center gap-4">
                  <div className="h-12 bg-gradient-to-r from-blue-200 to-indigo-200 rounded-lg w-24"></div>
                  <div className="h-12 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg w-24"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-[calc(100vh-56px)] py-8 px-4 overflow-hidden">
      {/* Enhanced Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        {/* Floating Geometric Shapes */}
        <div className="absolute top-1/4 left-1/4 w-4 h-4 bg-blue-400 rounded-full opacity-20 animate-pulse"></div>
        <div className="absolute top-1/3 right-1/4 w-6 h-6 bg-purple-400 rounded-full opacity-15 animate-pulse animation-delay-1000"></div>
        <div className="absolute bottom-1/4 left-1/3 w-3 h-3 bg-indigo-400 rounded-full opacity-25 animate-pulse animation-delay-2000"></div>
        <div className="absolute top-1/2 right-1/3 w-5 h-5 bg-pink-400 rounded-full opacity-20 animate-pulse animation-delay-3000"></div>
        
        {/* Large Animated Blobs */}
        <div className="absolute top-0 left-0 w-72 h-72 bg-gradient-to-br from-blue-300 to-cyan-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-br from-purple-300 to-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-gradient-to-br from-indigo-300 to-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-gradient-to-br from-cyan-300 to-teal-300 rounded-full mix-blend-multiply filter blur-xl opacity-15 animate-blob animation-delay-6000"></div>
        
        {/* Grid Pattern Overlay */}
        <div className="absolute inset-0 opacity-5">
          <div className="grid grid-cols-12 gap-4 h-full">
            {[...Array(144)].map((_, i) => (
              <div key={i} className="border border-blue-300 rounded-sm"></div>
            ))}
          </div>
        </div>
      </div>
      <div className="relative z-10 max-w-2xl mx-auto">
        {/* Header Section */}
        <div className="bg-white/70 backdrop-blur-md rounded-xl shadow-lg border border-white/30 p-6 mb-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
              Profil Ayarları
            </h1>
            <p className="text-gray-700">
              Kişisel bilgilerinizi güncelleyebilir ve profil fotoğrafınızı değiştirebilirsiniz.
            </p>
          </div>
        </div>

        {/* Main Profile Card */}
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-2xl overflow-hidden border border-white/30">
          {/* Profile Header with Enhanced Background */}
          <div className="relative px-8 py-12 text-white overflow-hidden">
            {/* Multi-layer gradient background */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600"></div>
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/50 to-purple-500/50"></div>
            <div className="absolute inset-0 bg-black/10"></div>
            
            {/* Animated background elements */}
            <div className="absolute top-0 left-0 w-32 h-32 bg-white/10 rounded-full blur-xl animate-pulse"></div>
            <div className="absolute bottom-0 right-0 w-24 h-24 bg-white/5 rounded-full blur-lg animate-pulse animation-delay-2000"></div>
            <div className="absolute top-1/2 left-1/3 w-16 h-16 bg-white/5 rounded-full blur-md animate-pulse animation-delay-4000"></div>
            
            <div className="relative z-10 text-center">
              <div className="flex flex-col items-center">
                <div className="relative group mb-4">
                  <div className="w-32 h-32 rounded-full border-4 border-white/80 shadow-2xl overflow-hidden bg-white/90 backdrop-blur-sm">
                    {(photoPreview || profile.profilePicture) ? (
                      <img
                        src={photoPreview || profile.profilePicture}
                        alt="Profil Fotoğrafı"
                        className="w-full h-full object-cover transition-all duration-300 group-hover:scale-110"
                        onError={(e) => {
                          console.log('Profil fotoğrafı yüklenemedi:', e.target.src);
                          // Hata durumunda placeholder'ı göster
                          e.target.style.display = 'none';
                          const placeholder = e.target.parentNode.querySelector('.profile-placeholder');
                          if (placeholder) placeholder.style.display = 'flex';
                        }}
                      />
                    ) : (
                      <div className="profile-placeholder w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                        <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <input
                    id="profile-photo-input"
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                    onChange={handlePhotoChange}
                    disabled={saving}
                    tabIndex={0}
                    aria-label="Profil fotoğrafı yükle"
                  />
                  <div className="absolute bottom-2 right-2 bg-white/90 backdrop-blur-sm text-blue-600 rounded-full p-3 shadow-lg flex items-center justify-center z-30 pointer-events-none group-hover:scale-110 transition-all duration-300">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 rounded-full transition-all duration-300 pointer-events-none z-10"></div>
                  {/* Glow effect on hover */}
                  <div className="absolute inset-0 rounded-full group-hover:shadow-2xl group-hover:shadow-white/20 transition-all duration-300 pointer-events-none"></div>
                </div>
                <h2 className="text-2xl font-bold mb-1 drop-shadow-lg">
                  {profile.firstName || profile.lastName ? 
                    `${profile.firstName || ''} ${profile.lastName || ''}`.trim() : 
                    ''
                  }
                </h2>
                <p className="text-white/90 text-sm drop-shadow-md">{profile.email || ''}</p>
              </div>
            </div>
          </div>

          {/* Form Section */}
          <div className="p-8 bg-gradient-to-b from-white/50 to-white/80 backdrop-blur-sm">
            {/* Photo Upload Feedback */}
            {photoFile && (
              <div className="mb-6 p-4 bg-gradient-to-r from-blue-50/80 to-indigo-50/80 backdrop-blur-sm border border-blue-200/50 rounded-lg shadow-md">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center mr-3">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <span className="text-blue-800 font-medium">Yeni fotoğraf seçildi: </span>
                    <span className="text-blue-600 ml-1 font-semibold">{photoFile.name}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Error and Success Messages */}
            {error && (
              <div className="mb-6 p-4 bg-gradient-to-r from-red-50/80 to-pink-50/80 backdrop-blur-sm border border-red-200/50 rounded-lg shadow-md">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center mr-3">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <span className="text-red-800 font-medium">{error}</span>
                </div>
              </div>
            )}

            {message && (
              <div className="mb-6 p-4 bg-gradient-to-r from-green-50/80 to-emerald-50/80 backdrop-blur-sm border border-green-200/50 rounded-lg shadow-md">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center mr-3">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-green-800 font-medium">{message}</span>
                </div>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-6">
              {/* Name Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    <span className="flex items-center">
                      <svg className="w-4 h-4 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Ad
                    </span>
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-base bg-white transition-all duration-200 hover:border-gray-300"
                    value={profile.firstName}
                    onChange={handleChange}
                    autoComplete="given-name"
                    disabled={saving}
                    placeholder="Adınızı girin"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    <span className="flex items-center">
                      <svg className="w-4 h-4 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Soyad
                    </span>
                  </label>
                  <input
                    type="text"
                    name="lastName"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-base bg-white transition-all duration-200 hover:border-gray-300"
                    value={profile.lastName}
                    onChange={handleChange}
                    autoComplete="family-name"
                    disabled={saving}
                    placeholder="Soyadınızı girin"
                    required
                  />
                </div>
              </div>

              {/* Email Field */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <span className="flex items-center">
                    <svg className="w-4 h-4 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    E-posta Adresi
                  </span>
                </label>
                <input
                  type="email"
                  name="email"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-base bg-white transition-all duration-200 hover:border-gray-300"
                  value={profile.email}
                  onChange={handleChange}
                  autoComplete="email"
                  disabled={saving}
                  placeholder="E-posta adresinizi girin"
                  required
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row justify-center gap-4 pt-6">
                <button 
                  type="submit" 
                  className="px-8 py-3 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center min-w-[140px]" 
                  disabled={saving || isLoggingOut}
                >
                  {saving ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Kaydediliyor...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Değişiklikleri Kaydet
                    </>
                  )}
                </button>

                <button 
                  type="button" 
                  className="px-8 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-60 flex items-center justify-center min-w-[140px]" 
                  onClick={handleCancel} 
                  disabled={saving || isLoggingOut}
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  İptal Et
                </button>

                {/* Çıkış Yapma Butonu */}
                <button 
                  type="button" 
                  onClick={handleLogout}
                  className="px-8 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center min-w-[140px]" 
                  disabled={saving || isLoggingOut}
                >
                  {isLoggingOut ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Çıkış Yapılıyor...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Çıkış Yap
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <div className="bg-white/70 backdrop-blur-md rounded-xl shadow-lg border border-white/30 p-6 hover:shadow-xl transition-all duration-300 hover:bg-white/80">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mr-4 shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                Güvenlik
              </h3>
            </div>
            <p className="text-gray-700 text-sm leading-relaxed">
              Bilgileriniz güvenli şekilde şifrelenerek saklanır ve sadece sizinle paylaşılır.
            </p>
          </div>

          <div className="bg-white/70 backdrop-blur-md rounded-xl shadow-lg border border-white/30 p-6 hover:shadow-xl transition-all duration-300 hover:bg-white/80">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center mr-4 shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold bg-gradient-to-r from-green-600 to-emerald-800 bg-clip-text text-transparent">
                Fotoğraf İpuçları
              </h3>
            </div>
            <p className="text-gray-700 text-sm leading-relaxed">
              En iyi sonuç için yüksek çözünürlüklü, kare formatında fotoğraf kullanın (maksimum 5MB).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profilim;