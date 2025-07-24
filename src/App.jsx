import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material';
import CssBaseline from '@mui/material/CssBaseline';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import AuthService from './services/auth.service';

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

  // Uygulama yüklendiğinde theme ayarını kontrol et ve uygula
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    }
    
    // Eğer kullanıcı authenticated ise auto-refresh'i başlat
    if (AuthService.isAuthenticated()) {
      console.log('[APP] Kullanıcı authenticated, auto-refresh başlatılıyor');
      AuthService.startAutoRefresh();
    }
    
    // Cleanup function - component unmount olduğunda auto-refresh'i durdur
    return () => {
      AuthService.stopAutoRefresh();
    };
  }, []);

  // SADECE sekme/tarayıcı tamamen kapanırken logout yap, sayfa yenilemede değil
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      // Bu sadece sekme/tarayıcı kapanırken çalışır, sayfa yenilemede çalışmaz
      if (e.type === 'beforeunload') {
        // Sadece gerçekten kapanıyorsa logout yap
        // Sayfa yenilemede logout yapma
        return;
      }
    };

    const handleVisibilityChange = () => {
      // Sekme gizlendiğinde/gösterildiğinde logout yapma
      // Bu özelliği kaldırıyoruz çünkü UX için kötü
    };

    // Bu event listener'ları kaldırıyoruz çünkü sayfa yenilemede sorun çıkarıyorlar
    // window.addEventListener('beforeunload', handleBeforeUnload);
    // window.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      // window.removeEventListener('beforeunload', handleBeforeUnload);
      // window.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router future={routerFutureConfig}>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          {/* Dashboard routes - tüm dashboard sayfaları Dashboard component'i üzerinden yönetilir */}
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/news" element={<Dashboard />} />
          <Route path="/liked-news" element={<Dashboard />} />
          <Route path="/routes" element={<Dashboard />} />
          <Route path="/cards" element={<Dashboard />} />
          <Route path="/wallet" element={<Dashboard />} />
          <Route path="/payment-points" element={<Dashboard />} />
          <Route path="/feedback" element={<Dashboard />} />
          <Route path="/settings" element={<Dashboard />} />
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
