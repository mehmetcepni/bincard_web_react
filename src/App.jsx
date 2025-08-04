import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import AuthService from './services/auth.service';

import Login from './components/auth/Login';
import Register from './components/auth/Register';
import ForgotPassword from './components/auth/ForgotPassword';
import ResetPassword from './components/auth/ResetPassword';
import Dashboard from './components/dashboard/Dashboard';
import BalanceTopUp from './components/dashboard/BalanceTopUp';

// Router future flags
const routerFutureConfig = {
  v7_startTransition: true,
  v7_relativeSplatPath: true
};

function App() {
  // Uygulama yüklendiğinde auto-refresh başlat
  useEffect(() => {
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

  return (
    <div className="min-h-screen bg-gray-50">
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
          
          {/* Balance Top Up - Separate page */}
          <Route path="/balance-topup" element={<BalanceTopUp />} />
          
          {/* Default route */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
        
        {/* KonyaKart stilinde Toast Container - Dark mode destekli */}
        <ToastContainer 
          position="top-right" 
          autoClose={4000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          toastClassName="!bg-white dark:!bg-gray-800 !shadow-lg !rounded-xl !border !border-gray-200 dark:!border-gray-600"
          bodyClassName="!text-gray-800 dark:!text-gray-200 !font-medium"
          progressClassName="!bg-[#005bac]"
          theme="colored"
        />
      </Router>
    </div>
  );
}

export default App;
