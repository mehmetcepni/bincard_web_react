# Bincard Web React Cüzdan Uygulaması

Bu proje, React ve Vite kullanılarak geliştirilmiş modern bir cüzdan (wallet) ve ödeme noktası web uygulamasıdır. Backend tarafı Java Spring Boot ile geliştirilmiştir.

## Özellikler

- **Kullanıcı Girişi ve Kayıt:** SMS doğrulama ve yeni cihaz algılama ile güvenli giriş.
- **Cüzdan (Wallet) Yönetimi:**
  - Bakiye görüntüleme
  - Para yükleme (kredi kartı ile)
  - Gerçek zamanlı bakiye güncellemesi
- **İşlem Geçmişi:**
  - Cüzdan aktiviteleri ve filtrelenebilir işlem geçmişi
- **Ödeme Noktaları:**
  - Harita üzerinde yakın ödeme noktalarını görüntüleme
  - Detaylı ödeme noktası bilgileri (modal ile)
  - Haritada odaklanma
- **Modern ve Duyarlı Arayüz:**
  - Mobil ve masaüstü uyumlu tasarım
  - Kullanıcı dostu formlar ve bildirimler
- **Hata Yönetimi:**
  - Anlaşılır hata mesajları ve kullanıcıya geri bildirim

## Kullanılan Teknolojiler

- **Frontend:**
  - React
  - Vite
  - Tailwind CSS
  - react-toastify (bildirimler için)
  - react-router-dom (sayfa yönlendirme)
  - Harita için popüler JS kütüphanesi (örn. Leaflet veya Google Maps API)
- **Backend:**
  - Java Spring Boot
  - RESTful API
  - SMS doğrulama ve ödeme servisleri entegrasyonu

## Kurulum ve Çalıştırma

1. **Bağımlılıkları Yükleyin:**
   ```bash
   npm install
   ```
2. **Geliştirme Sunucusunu Başlatın:**
   ```bash
   npm run dev
   ```
3. **Backend'i başlatmayı unutmayın!** (Java Spring Boot projesi ayrı dizindedir.)

## Klasör Yapısı (Özet)

- `src/components/auth/` — Giriş, kayıt, şifre işlemleri
- `src/components/dashboard/` — Cüzdan, ödeme noktaları, profil, haberler
- `src/services/` — API servisleri (auth, wallet, news, payment-point)

## Katkı ve Geliştirme

Pull request'ler ve katkılar memnuniyetle karşılanır. Lütfen kod standartlarına ve proje yapısına uygun geliştirme yapınız.

## Lisans

Bu proje MIT lisansı ile lisanslanmıştır.
