# 🌍 Çoklu Dil Desteği (Multi-Language Support)

Bu proje artık **Türkçe** ve **İngilizce** dil desteği ile gelmektedir.

## 🚀 Özellikler

- ✅ **Otomatik Dil Algılama**: Tarayıcı diline göre otomatik dil seçimi
- ✅ **Manuel Dil Değiştirme**: Kullanıcılar istediği zaman dil değiştirebilir
- ✅ **Kalıcı Dil Tercihi**: Seçilen dil localStorage'da saklanır
- ✅ **Responsive Tasarım**: Mobil ve desktop'ta dil değiştirici
- ✅ **Tüm Bileşenler**: Tüm sayfalar ve bileşenler çeviri desteği ile

## 🎯 Kullanım

### Dil Değiştirme

1. **Desktop**: Header'da sağ üst köşede dil butonları bulunur
2. **Mobil**: Sidebar menüsünde dil seçenekleri mevcuttur

### Desteklenen Diller

- 🇹🇷 **Türkçe (TR)** - Varsayılan dil
- 🇺🇸 **İngilizce (EN)** - İkinci dil

## 📁 Dosya Yapısı

```
src/
├── locales/
│   ├── tr.json          # Türkçe çeviriler
│   └── en.json          # İngilizce çeviriler
├── i18n.js              # i18n konfigürasyonu
└── components/
    └── common/
        └── LanguageSwitcher.jsx  # Dil değiştirme bileşeni
```

## 🔧 Teknik Detaylar

### Kullanılan Kütüphaneler

- `react-i18next`: React için i18n kütüphanesi
- `i18next`: Ana i18n kütüphanesi
- `i18next-browser-languagedetector`: Otomatik dil algılama

### Çeviri Anahtarları

Çeviriler şu kategorilerde organize edilmiştir:

- `common`: Genel kullanım metinleri
- `navigation`: Navigasyon menü öğeleri
- `auth`: Kimlik doğrulama sayfaları
- `feedback`: Geri bildirim sayfası
- `wallet`: Cüzdan sayfası
- `routes`: Rota sayfaları
- `stations`: İstasyon sayfaları
- `news`: Haber sayfaları
- `settings`: Ayarlar sayfası
- `profile`: Profil sayfası

### Yeni Çeviri Ekleme

1. `src/locales/tr.json` dosyasına Türkçe çeviriyi ekleyin
2. `src/locales/en.json` dosyasına İngilizce çeviriyi ekleyin
3. Bileşende `useTranslation` hook'unu kullanın
4. `t('key.path')` ile çeviriyi çağırın

### Örnek Kullanım

```jsx
import { useTranslation } from 'react-i18next';

const MyComponent = () => {
  const { t } = useTranslation();
  
  return (
    <div>
      <h1>{t('common.title')}</h1>
      <p>{t('common.description')}</p>
    </div>
  );
};
```

## 🌟 Özellikler

### Otomatik Dil Algılama
- Tarayıcı dili otomatik algılanır
- Eğer desteklenmeyen bir dil ise Türkçe varsayılan olarak kullanılır

### Dil Tercihi Saklama
- Kullanıcının seçtiği dil localStorage'da saklanır
- Sayfa yenilendiğinde tercih korunur

### Responsive Tasarım
- Desktop: Header'da dil butonları
- Mobil: Sidebar'da dil seçenekleri

## 🔄 Güncelleme

Yeni dil eklemek için:

1. `src/locales/` klasörüne yeni dil dosyası ekleyin (örn: `fr.json`)
2. `src/i18n.js` dosyasında resources'a yeni dili ekleyin
3. `LanguageSwitcher.jsx` bileşenine yeni dil butonunu ekleyin

## 📝 Notlar

- Tüm metinler çeviri dosyalarında tutulur
- Emoji'ler ve özel karakterler desteklenir
- Çeviriler dinamik olarak yüklenir
- Performans için lazy loading kullanılır

## 🐛 Sorun Giderme

Eğer çeviri görünmüyorsa:
1. Tarayıcı konsolunu kontrol edin
2. Çeviri anahtarının doğru yazıldığından emin olun
3. Dil dosyalarının doğru formatta olduğunu kontrol edin

---

**Geliştirici**: Bu sistem sayesinde uygulama artık uluslararası kullanıcılara açık ve kolayca yeni diller eklenebilir. 