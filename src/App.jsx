import { useEffect, useCallback, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material';
import CssBaseline from '@mui/material/CssBaseline';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { messaging, getToken } from './firebase';

import Login from './components/auth/Login';
import Register from './components/auth/Register';
import ForgotPassword from './components/auth/ForgotPassword';
import ResetPassword from './components/auth/ResetPassword';
import Dashboard from './components/dashboard/Dashboard';
// import Profile from './components/dashboard/Profile';

// Material UI teması
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
      light: '#42a5f5',
      dark: '#1565c0',
    },
    background: {
      default: '#f5f5f5',
    },
  },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
  },
});

// Router future flags
const routerFutureConfig = {
  v7_startTransition: true,
  v7_relativeSplatPath: true
};

function App() {
  const [notifMenuOpen, setNotifMenuOpen] = useState(false);
  const [notifMenuAnchor, setNotifMenuAnchor] = useState(null);

  // Bildirim izni ve FCM token işlemi
  const handleNotificationPermission = useCallback(async () => {
    setNotifMenuOpen(true);
  }, []);

  // Bildirim izni ver
  const handleGrantPermission = useCallback(async () => {
    setNotifMenuOpen(false);
    try {
      if (!('Notification' in window)) {
        alert('Tarayıcınız bildirimleri desteklemiyor.');
        return;
      }
      if (!messaging) {
        alert('Bildirim servisi başlatılamadı.');
        console.error('messaging nesnesi null veya undefined:', messaging);
        return;
      }
      const permission = await Notification.requestPermission();
      console.log('Bildirim izni sonucu:', permission);
      if (permission !== 'granted') {
        console.warn('Bildirim izni verilmedi:', permission);
        return;
      }
      // VAPID anahtarınızı buraya ekleyin
      const VAPID_KEY = 'VAPID_KEYINIZ'; // <-- BURAYA PUBLIC VAPID KEY'İNİZİ EKLEYİN
      console.log('VAPID anahtarı:', VAPID_KEY);
      console.log('messaging nesnesi:', messaging);
      try {
        const fcmToken = await getToken(messaging, { vapidKey: VAPID_KEY });
        console.log('FCM token:', fcmToken);
        if (fcmToken) {
          const accessToken = localStorage.getItem('accessToken');
          if (accessToken) {
            const apiResponse = await fetch(`http://localhost:8080/v1/api/user/update-fcm-token?fcmToken=${encodeURIComponent(fcmToken)}`, {
              method: 'PATCH',
              headers: {
                'Authorization': `Bearer ${accessToken}`
              }
            });
            const result = await apiResponse.json();
            if (result === true) {
              localStorage.setItem('fcmTokenRegistered', 'true');
              console.log('FCM token başarıyla backend\'e gönderildi.');
            } else {
              localStorage.removeItem('fcmTokenRegistered');
              console.warn('Backend false döndürdü, fcmTokenRegistered silindi.');
            }
          } else {
            console.warn('accessToken bulunamadı, FCM token backend\'e gönderilemedi.');
          }
        } else {
          console.warn('FCM token alınamadı, null veya undefined.');
        }
      } catch (err) {
        console.error('FCM token alınamadı (getToken catch):', err);
      }
    } catch (err) {
      localStorage.removeItem('fcmTokenRegistered');
      console.error('Bildirim izni veya FCM işlemi sırasında hata:', err);
    }
  }, []);

  // Bildirim iznini kaldır
  const handleRemovePermission = useCallback(async () => {
    setNotifMenuOpen(false);
    localStorage.removeItem('fcmTokenRegistered');
    // İsterseniz backend'e token silme isteği de gönderebilirsiniz
    // const accessToken = localStorage.getItem('accessToken');
    // const fcmToken = ... (localStorage'dan veya başka bir yerden alın)
    // await fetch('http://localhost:8080/v1/api/user/delete-fcm-token', { ... });
    alert('Bildirim izni kaldırıldı (tarayıcıdan manuel olarak da kaldırmanız gerekebilir).');
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {/* Bildirimler butonu ve menüsü */}
      <div style={{ position: 'fixed', top: 64, right: 16, zIndex: 9999 }}>
        <button
          onClick={handleNotificationPermission}
          style={{
            background: '#1976d2',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            padding: '10px 20px',
            fontWeight: 'bold',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
          }}
        >
          Bildirimler
        </button>
        {notifMenuOpen && (
          <div style={{
            position: 'absolute',
            top: 50,
            right: 0,
            background: 'white',
            border: '1px solid #ddd',
            borderRadius: 8,
            boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
            minWidth: 180,
            padding: 8
          }}>
            <button
              onClick={handleGrantPermission}
              style={{
                width: '100%',
                background: '#4caf50',
                color: 'white',
                border: 'none',
                borderRadius: 6,
                padding: '10px',
                marginBottom: 6,
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              Bildirim izni ver
            </button>
            <button
              onClick={handleRemovePermission}
              style={{
                width: '100%',
                background: '#f44336',
                color: 'white',
                border: 'none',
                borderRadius: 6,
                padding: '10px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              Bildirim iznini kaldır
            </button>
            <button
              onClick={() => setNotifMenuOpen(false)}
              style={{
                width: '100%',
                background: '#eee',
                color: '#333',
                border: 'none',
                borderRadius: 6,
                padding: '8px',
                marginTop: 4,
                fontWeight: 'normal',
                cursor: 'pointer'
              }}
            >
              Kapat
            </button>
          </div>
        )}
      </div>
      <Router future={routerFutureConfig}>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          {/* Dashboard routes - tüm dashboard sayfaları Dashboard component'i üzerinden yönetilir */}
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profilim" element={<Dashboard />} />
          <Route path="/news" element={<Dashboard />} />
          <Route path="/liked-news" element={<Dashboard />} />
          <Route path="/routes" element={<Dashboard />} />
          <Route path="/cards" element={<Dashboard />} />
          <Route path="/wallet" element={<Dashboard />} />
          <Route path="/payment-points" element={<Dashboard />} />
          <Route path="/feedback" element={<Dashboard />} />
          <Route path="/history" element={<Dashboard />} />
          <Route path="/debug" element={<Dashboard />} />
          {/* Redirect to dashboard as default route */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
      <ToastContainer 
        position="top-right" 
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
    </ThemeProvider>
  );
}

export default App;
