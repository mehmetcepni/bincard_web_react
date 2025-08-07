import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  Grid,
  Paper,
  Alert,
  InputAdornment,
  IconButton,
} from '@mui/material';
import { Lock, Visibility, VisibilityOff, Sms } from '@mui/icons-material';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import AuthService from '../../services/auth.service';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const ResetPassword = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const formik = useFormik({
    initialValues: {
      verificationCode: '',
      newPassword: '',
      confirmPassword: '',
    },
    validationSchema: Yup.object({
      verificationCode: Yup.string()
        .required(t('auth.verificationCodeRequired')),
      newPassword: Yup.string()
        .min(6, t('auth.passwordMinLength'))
        .required(t('auth.newPasswordRequired')),
      confirmPassword: Yup.string()
        .oneOf([Yup.ref('newPassword'), null], t('auth.passwordsDoNotMatch'))
        .required(t('auth.confirmPasswordRequired')),
    }),
    onSubmit: async (values) => {
      try {
        console.log('Şifre sıfırlama işlemi başlatılıyor...');
        
        // 1. Adım: Doğrulama kodunu kontrol et ve resetToken al
        console.log('Doğrulama kodu kontrol ediliyor:', { code: '[GİZLİ]' });
        
        const verifyResponse = await AuthService.passwordVerifyCode({
          code: values.verificationCode
        });
        
        console.log('Kod doğrulama yanıtı:', verifyResponse);
        
        if (!verifyResponse || verifyResponse.success === false) {
          const errorMessage = verifyResponse?.message || 'Doğrulama kodu hatalı veya süresi dolmuş.';
          throw new Error(errorMessage);
        }
        
        // Backend'den resetToken'ı al
        let resetToken = verifyResponse.resetToken;
        
        // Backend resetToken'ı message alanında döndürüyor
        if (!resetToken && verifyResponse.message) {
          // UUID formatını kontrol et
          if (typeof verifyResponse.message === 'string' && 
              /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/i.test(verifyResponse.message)) {
            resetToken = verifyResponse.message;
          }
        }
        
        if (!resetToken) {
          throw new Error('Doğrulama kodu geçersiz. Lütfen tekrar deneyin.');
        }
        
        console.log('Reset token alındı:', resetToken);

        // 2. Adım: Yeni şifreyi belirle
        console.log('Yeni şifre belirleniyor...');
        
        const resetResponse = await AuthService.passwordReset({
          resetToken: resetToken,
          newPassword: values.newPassword
        });
        
        console.log('Şifre sıfırlama yanıtı:', resetResponse);
        
        if (resetResponse && resetResponse.success !== false) {
          // Backend'den gelen başarı mesajını göster
          const successMessage = resetResponse.message || 'Şifreniz başarıyla değiştirildi!';
          setError('');
          toast.success(successMessage, {
            position: "top-center",
            autoClose: 2000,
            onClose: () => {
              navigate('/login', {
                state: { 
                  message: 'Şifreniz başarıyla değiştirildi! Lütfen yeni şifrenizle giriş yapın.',
                  type: 'success'
                }
              });
            }
          });
        } else {
          // Backend'den gelen hata mesajını göster
          const errorMessage = resetResponse?.message || 'Şifre sıfırlama işlemi başarısız oldu.';
          throw new Error(errorMessage);
        }
      } catch (err) {
        console.error('Şifre sıfırlama hatası:', err);
        
        // AuthService'den dönen hata objesini kontrol et
        if (err && typeof err === 'object' && err.message) {
          const errorMessage = err.message;
          setError(errorMessage);
          toast.error(errorMessage, {
            position: "top-center",
            autoClose: 5000
          });
          return;
        }
        
        const errorMessage = err.message || 'Şifre sıfırlama işlemi başarısız oldu. Lütfen daha sonra tekrar deneyin.';
        setError(errorMessage);
        toast.error(errorMessage, {
          position: "top-center",
          autoClose: 5000
        });
      }
    },
  });

  const handleResendCode = async () => {
    try {
      console.log('SMS kodu tekrar gönderiliyor...');
      
      const telephone = location.state?.telephone;
      if (!telephone) {
        throw new Error('Telefon numarası bulunamadı');
      }

      const response = await AuthService.forgotPassword(telephone);
      
      console.log('SMS tekrar gönderme yanıtı:', response);
      
      if (response && response.success !== false) {
        // Backend'den gelen başarı mesajını göster
        const successMessage = response.message || 'Doğrulama kodu tekrar gönderildi!';
        setError('');
        toast.info(successMessage, {
          position: "top-center",
          autoClose: 5000
        });
      } else {
        // Backend'den gelen hata mesajını göster
        const errorMessage = response?.message || 'SMS kodu gönderilemedi';
        throw new Error(errorMessage);
      }
    } catch (err) {
      console.log('SMS tekrar gönderme hatası:', err);
      
      // AuthService'den dönen hata objesini kontrol et
      if (err && typeof err === 'object' && err.message) {
        const errorMessage = err.message;
        setError(errorMessage);
        toast.error(errorMessage, {
          position: "top-center",
          autoClose: 5000
        });
        return;
      }
      
      const errorMessage = err.message || err || 'SMS kodu gönderilirken bir hata oluştu';
      setError(errorMessage);
      toast.error(errorMessage, {
        position: "top-center",
        autoClose: 5000
      });
    }
  };

  if (!location.state?.telephone) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          background: 'linear-gradient(135deg, #1976d2 0%, #64b5f6 100%)',
          padding: { xs: 2, sm: 4 }
        }}
      >
        <Container maxWidth="sm" sx={{ display: 'flex', alignItems: 'center' }}>
          <Paper
            elevation={10}
            sx={{
              width: '100%',
              padding: 4,
              borderRadius: 2,
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(10px)'
            }}
          >
            <Alert severity="error" sx={{ mb: 2 }}>
              Geçersiz sayfa erişimi. Lütfen şifre sıfırlama işlemini baştan başlatın.
            </Alert>
            <Link to="/forgot-password" style={{ textDecoration: 'none' }}>
              <Button
                fullWidth
                variant="contained"
                size="large"
                sx={{
                  height: 48,
                  background: 'linear-gradient(45deg, #1976d2 30%, #64b5f6 90%)',
                  boxShadow: '0 3px 5px 2px rgba(33, 150, 243, .3)',
                  '&:hover': {
                    background: 'linear-gradient(45deg, #1565c0 30%, #42a5f5 90%)',
                  }
                }}
              >
                Şifre Sıfırlama Sayfasına Git
              </Button>
            </Link>
          </Paper>
        </Container>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        background: 'linear-gradient(135deg, #1976d2 0%, #64b5f6 100%)',
        padding: { xs: 2, sm: 4 }
      }}
    >
      <Container maxWidth="sm" sx={{ display: 'flex', alignItems: 'center' }}>
        <Paper
          elevation={10}
          sx={{
            width: '100%',
            padding: 4,
            borderRadius: 2,
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)'
          }}
        >
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Typography
              component="h1"
              variant="h4"
              sx={{
                fontWeight: 700,
                color: '#1976d2',
                mb: 1
              }}
            >
              BinCard
            </Typography>
            <Typography variant="subtitle1" color="text.secondary" gutterBottom>
              Yeni Şifre Oluştur
            </Typography>
          </Box>

          {location.state?.message && (
            <Alert severity="info" sx={{ mb: 2 }}>
              {location.state.message}
            </Alert>
          )}

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={formik.handleSubmit}>
            <TextField
              fullWidth
              margin="normal"
              id="verificationCode"
              name="verificationCode"
              label="Doğrulama Kodu"
              value={formik.values.verificationCode}
              onChange={formik.handleChange}
              error={formik.touched.verificationCode && Boolean(formik.errors.verificationCode)}
              helperText={formik.touched.verificationCode && formik.errors.verificationCode}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Sms color="primary" />
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 2 }}
            />

            <Button
              fullWidth
              variant="text"
              onClick={handleResendCode}
              sx={{
                mb: 3,
                color: '#1976d2',
                '&:hover': {
                  backgroundColor: 'rgba(25, 118, 210, 0.04)',
                }
              }}
            >
              Kodu Tekrar Gönder
            </Button>

            <TextField
              fullWidth
              margin="normal"
              id="newPassword"
              name="newPassword"
              label="Yeni Şifre"
              type={showPassword ? 'text' : 'password'}
              value={formik.values.newPassword}
              onChange={formik.handleChange}
              error={formik.touched.newPassword && Boolean(formik.errors.newPassword)}
              helperText={formik.touched.newPassword && formik.errors.newPassword}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Lock color="primary" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              margin="normal"
              id="confirmPassword"
              name="confirmPassword"
              label="Yeni Şifre Tekrarı"
              type={showConfirmPassword ? 'text' : 'password'}
              value={formik.values.confirmPassword}
              onChange={formik.handleChange}
              error={formik.touched.confirmPassword && Boolean(formik.errors.confirmPassword)}
              helperText={formik.touched.confirmPassword && formik.errors.confirmPassword}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Lock color="primary" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      edge="end"
                    >
                      {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 3 }}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              sx={{
                mb: 3,
                height: 48,
                background: 'linear-gradient(45deg, #1976d2 30%, #64b5f6 90%)',
                boxShadow: '0 3px 5px 2px rgba(33, 150, 243, .3)',
                '&:hover': {
                  background: 'linear-gradient(45deg, #1565c0 30%, #42a5f5 90%)',
                }
              }}
            >
              Şifreyi Değiştir
            </Button>

            <Grid container justifyContent="center">
              <Grid item>
                <Link to="/login" style={{ textDecoration: 'none' }}>
                  <Button
                    variant="text"
                    sx={{
                      color: '#1976d2',
                      '&:hover': {
                        backgroundColor: 'rgba(25, 118, 210, 0.04)',
                      }
                    }}
                  >
                    Giriş sayfasına dön
                  </Button>
                </Link>
              </Grid>
            </Grid>
          </form>
        </Paper>
      </Container>
    </Box>
  );
};

export default ResetPassword; 