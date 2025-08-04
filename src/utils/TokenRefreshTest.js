// Token Refresh Test Senaryosu
// Bu dosya auth service'in geliştirilmiş token refresh sistemini test etmek için kullanılabilir

import AuthService from '../services/auth.service';

class TokenRefreshTest {
  constructor() {
    this.testResults = [];
  }

  // Test 1: Token süresini kontrol et
  async testTokenExpiry() {
    console.log('🧪 Test 1: Token süresi kontrolü');
    
    const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
    if (!token) {
      console.log('❌ Token bulunamadı');
      return false;
    }

    const timeToExpirySeconds = AuthService.getTokenTimeToExpiry(token);
    const timeToExpiryMinutes = AuthService.getTokenTimeToExpiryMinutes(token);
    
    console.log(`✅ Token ${timeToExpirySeconds} saniye (${timeToExpiryMinutes} dakika) sonra expire olacak`);
    
    this.testResults.push({
      test: 'Token Expiry Check',
      result: timeToExpirySeconds !== null,
      details: { timeToExpirySeconds, timeToExpiryMinutes }
    });
    
    return timeToExpirySeconds !== null;
  }

  // Test 2: Manual refresh test
  async testManualRefresh() {
    console.log('🧪 Test 2: Manual refresh testi');
    
    try {
      const result = await AuthService.manualRefreshToken();
      console.log('✅ Manual refresh sonucu:', result);
      
      this.testResults.push({
        test: 'Manual Refresh',
        result: result.success,
        details: result
      });
      
      return result.success;
    } catch (error) {
      console.log('❌ Manual refresh hatası:', error);
      
      this.testResults.push({
        test: 'Manual Refresh',
        result: false,
        details: error.message
      });
      
      return false;
    }
  }

  // Test 3: Validate and refresh test
  async testValidateAndRefresh() {
    console.log('🧪 Test 3: Validate and refresh testi');
    
    try {
      const result = await AuthService.validateAndRefreshTokens();
      console.log('✅ Validate and refresh sonucu:', result);
      
      this.testResults.push({
        test: 'Validate and Refresh',
        result: result.valid,
        details: result
      });
      
      return result.valid;
    } catch (error) {
      console.log('❌ Validate and refresh hatası:', error);
      
      this.testResults.push({
        test: 'Validate and Refresh',
        result: false,
        details: error.message
      });
      
      return false;
    }
  }

  // Test 4: Auto-refresh status check
  testAutoRefreshStatus() {
    console.log('🧪 Test 4: Auto-refresh durum kontrolü');
    
    const isRunning = window.authRefreshInterval !== null && window.authRefreshInterval !== undefined;
    const hasActivityCleanup = window.authActivityCleanup !== null && window.authActivityCleanup !== undefined;
    
    console.log(`✅ Auto-refresh çalışıyor: ${isRunning}`);
    console.log(`✅ Aktivite takibi aktif: ${hasActivityCleanup}`);
    
    this.testResults.push({
      test: 'Auto-refresh Status',
      result: isRunning,
      details: { isRunning, hasActivityCleanup }
    });
    
    return isRunning;
  }

  // Tüm testleri çalıştır
  async runAllTests() {
    console.log('🚀 Token Refresh Sistem Testi Başlıyor...');
    console.log('=====================================');
    
    const test1 = await this.testTokenExpiry();
    const test2 = await this.testManualRefresh();
    const test3 = await this.testValidateAndRefresh();
    const test4 = this.testAutoRefreshStatus();
    
    console.log('=====================================');
    console.log('📊 Test Sonuçları:');
    this.testResults.forEach((result, index) => {
      const status = result.result ? '✅' : '❌';
      console.log(`${status} Test ${index + 1} - ${result.test}: ${result.result}`);
    });
    
    const successCount = this.testResults.filter(r => r.result).length;
    const totalTests = this.testResults.length;
    
    console.log(`📈 Genel Başarı Oranı: ${successCount}/${totalTests} (${Math.round(successCount/totalTests * 100)}%)`);
    
    return {
      success: successCount === totalTests,
      successCount,
      totalTests,
      results: this.testResults
    };
  }

  // Test sonuçlarını temizle
  clearResults() {
    this.testResults = [];
  }

  // Console'dan çalıştırma talimatları
  static getInstructions() {
    return `
🔧 Token Refresh Test Sistemi

Console'dan test çalıştırmak için:

1. Tek test çalıştırma:
   const test = new TokenRefreshTest();
   await test.testTokenExpiry();
   await test.testManualRefresh();
   await test.testValidateAndRefresh();
   test.testAutoRefreshStatus();

2. Tüm testleri çalıştırma:
   const test = new TokenRefreshTest();
   const results = await test.runAllTests();

3. Auto-refresh'i manuel başlatma/durdurma:
   AuthService.startAutoRefresh();
   AuthService.stopAutoRefresh();

4. Token bilgilerini kontrol etme:
   AuthService.getTokenTimeToExpiry(localStorage.getItem('accessToken'));
   AuthService.getTokenTimeToExpiryMinutes(localStorage.getItem('accessToken'));
    `;
  }
}

// Global erişim için window'a ekle
window.TokenRefreshTest = TokenRefreshTest;

console.log(TokenRefreshTest.getInstructions());

export default TokenRefreshTest;
