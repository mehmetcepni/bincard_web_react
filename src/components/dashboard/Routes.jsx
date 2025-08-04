import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import RouteService from '../../services/route.service';
import StationService from '../../services/station.service';

const Routes = () => {
  // State management
  const [routes, setRoutes] = useState([]);
  const [favoriteRoutes, setFavoriteRoutes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'favorites', 'search', 'suggest'
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [routeDirections, setRouteDirections] = useState([]);
  const [selectedDirection, setSelectedDirection] = useState(null);
  const [directionsStations, setDirectionsStations] = useState([]);
  const [currentLocation, setCurrentLocation] = useState(null);
  
  // Rota önerisi state'leri
  const [fromStation, setFromStation] = useState('');
  const [toStation, setToStation] = useState('');
  const [routeSuggestions, setRouteSuggestions] = useState([]);
  const [suggestionLoading, setSuggestionLoading] = useState(false);

  // Component mount olduğunda rotaları yükle
  useEffect(() => {
    loadAllRoutes();
    loadFavoriteRoutes();
    getCurrentLocation();
  }, []);

  // Konum alma
  const getCurrentLocation = async () => {
    try {
      const location = await StationService.getCurrentLocation();
      setCurrentLocation(location);
      console.log('[ROUTES] Konum alındı:', location);
    } catch (error) {
      console.warn('[ROUTES] Konum alınamadı:', error.message);
    }
  };

  // Tüm rotaları yükle
  const loadAllRoutes = async () => {
    try {
      setLoading(true);
      const result = await RouteService.getAllRoutes();
      
      if (result.success) {
        setRoutes(result.data || []);
        console.log('[ROUTES] Tüm rotalar yüklendi:', result.data);
      } else {
        toast.error(result.message || 'Rotalar yüklenemedi');
      }
    } catch (error) {
      console.error('[ROUTES] Rotalar yüklenemedi:', error);
      toast.error('Rotalar yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  // Favori rotaları yükle
  const loadFavoriteRoutes = async () => {
    try {
      const result = await RouteService.getFavoriteRoutes();
      
      if (result.success) {
        setFavoriteRoutes(result.data || []);
        console.log('[ROUTES] Favori rotalar yüklendi:', result.data);
      } else {
        console.warn('[ROUTES] Favori rotalar yüklenemedi:', result.message);
      }
    } catch (error) {
      console.error('[ROUTES] Favori rotalar yüklenemedi:', error);
    }
  };

  // Rota arama
  const searchRoutes = async (query) => {
    if (!query.trim()) return;

    try {
      setSearchLoading(true);
      const result = await RouteService.searchRoutesByName(query);

      if (result.success) {
        setRoutes(result.data || []);
        console.log('[ROUTES] Arama sonuçları:', result.data);
      } else {
        toast.error(result.message || 'Arama yapılamadı');
      }
    } catch (error) {
      console.error('[ROUTES] Arama hatası:', error);
      toast.error('Arama yapılırken bir hata oluştu');
    } finally {
      setSearchLoading(false);
    }
  };

  // Arama başlat
  const handleSearch = (query = searchQuery) => {
    setActiveTab('search');
    searchRoutes(query);
  };

  // Favori toggle
  const toggleFavorite = async (routeId, isFavorite) => {
    try {
      const result = await RouteService.toggleFavoriteRoute(routeId, isFavorite);
      
      if (result.success) {
        toast.success(result.message);
        
        // Favori listesini güncelle
        await loadFavoriteRoutes();
        
        // Mevcut listede de güncelle
        setRoutes(prevRoutes => 
          prevRoutes.map(route => 
            route.id === routeId 
              ? { ...route, isFavorite: !isFavorite }
              : route
          )
        );
      } else {
        toast.error(result.message || 'Favori durumu değiştirilemedi');
      }
    } catch (error) {
      console.error('[ROUTES] Favori toggle hatası:', error);
      toast.error('Favori durumu değiştirilirken bir hata oluştu');
    }
  };

  // Rota detaylarını görüntüle
  const viewRouteDetails = async (route) => {
    console.log('[ROUTES] Rota detayları görüntüleniyor:', route);
    setSelectedRoute(route);
    setSelectedDirection(null);
    setDirectionsStations([]);
    
    // Rota yönlerini getir
    try {
      const result = await RouteService.getRouteDirections(route.id);
      
      if (result.success) {
        console.log('[ROUTES] Rota yönleri alındı:', result.data);
        setRouteDirections(result.data || []);
      } else {
        console.warn('[ROUTES] Rota yönleri alınamadı:', result.message);
        setRouteDirections([]);
      }
    } catch (error) {
      console.error('[ROUTES] Rota yönleri alınamadı:', error);
      setRouteDirections([]);
    }
  };

  // Yön seçildiğinde durakları getir
  const selectDirection = async (direction) => {
    console.log('[ROUTES] Seçilen yön:', direction);
    setSelectedDirection(direction);
    
    // DirectionType'ı kontrol et
    const directionType = direction.directionType || direction.direction || direction.type;
    
    if (!directionType) {
      console.error('[ROUTES] DirectionType bulunamadı:', direction);
      toast.error('Yön bilgisi eksik');
      return;
    }
    
    try {
      console.log('[ROUTES] API çağrısı yapılıyor:', {
        routeId: selectedRoute.id,
        directionType: directionType
      });
      
      const result = await RouteService.getStationsInDirection(
        selectedRoute.id, 
        directionType
      );
      
      if (result.success) {
        setDirectionsStations(result.data || []);
      } else {
        setDirectionsStations([]);
        toast.error(result.message || 'Duraklar getirilemedi');
      }
    } catch (error) {
      console.error('[ROUTES] Yön durakları alınamadı:', error);
      setDirectionsStations([]);
      toast.error('Duraklar yüklenirken bir hata oluştu');
    }
  };

  // Rota önerisi al
  const getRouteSuggestion = async () => {
    if (!fromStation.trim() || !toStation.trim()) {
      toast.error('Başlangıç ve bitiş noktalarını girin');
      return;
    }

    try {
      setSuggestionLoading(true);
      
      const request = {
        from: fromStation,
        to: toStation,
        currentLatitude: currentLocation?.latitude,
        currentLongitude: currentLocation?.longitude
      };
      
      const result = await RouteService.suggestRoute(request);
      
      if (result.success) {
        setRouteSuggestions(result.data?.routes || []);
        console.log('[ROUTES] Rota önerileri alındı:', result.data);
        
        if (result.data?.routes?.length === 0) {
          toast.info('Bu güzergah için rota bulunamadı');
        }
      } else {
        toast.error(result.message || 'Rota önerisi alınamadı');
        setRouteSuggestions([]);
      }
    } catch (error) {
      console.error('[ROUTES] Rota önerisi hatası:', error);
      toast.error('Rota önerisi alınırken bir hata oluştu');
      setRouteSuggestions([]);
    } finally {
      setSuggestionLoading(false);
    }
  };

  // Tab değiştir
  const changeTab = (tab) => {
    setActiveTab(tab);
    setRoutes([]);
    
    if (tab === 'all') {
      loadAllRoutes();
    } else if (tab === 'favorites') {
      setRoutes(favoriteRoutes);
    } else if (tab === 'suggest') {
      setRouteSuggestions([]);
    }
  };

  // Rota kartı bileşeni
  const RouteCard = ({ route }) => {
    const isFavorite = favoriteRoutes.some(fav => fav.id === route.id);
    const routeColor = RouteService.getRouteColor(route.id);
    
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div 
                className="w-12 h-8 rounded flex items-center justify-center text-white font-bold text-sm"
                style={{ backgroundColor: routeColor }}
              >
                {RouteService.formatRouteNumber(route.routeNumber || route.id)}
              </div>
              <h3 className="font-semibold text-gray-900 text-lg">
                {route.routeName || route.name}
              </h3>
            </div>
            
            {route.description && (
              <p className="text-sm text-gray-600 mb-2">
                {route.description}
              </p>
            )}
            
            {route.startLocation && route.endLocation && (
              <p className="text-sm text-gray-500">
                📍 {route.startLocation} ↔ {route.endLocation}
              </p>
            )}
          </div>
          
          <button
            onClick={() => toggleFavorite(route.id, isFavorite)}
            className={`p-2 rounded-full transition-colors ${
              isFavorite 
                ? 'text-red-500 hover:bg-red-50' 
                : 'text-gray-400 hover:bg-gray-50'
            }`}
          >
            <svg className="w-5 h-5" fill={isFavorite ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </button>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => viewRouteDetails(route)}
            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            Detaylar
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Rotalar</h1>
        <p className="text-gray-600">Otobüs rotalarını keşfet, rota planla</p>
      </div>

      {/* Arama Bölümü */}
      <div className="mb-6">
        <div className="relative">
          <input
            type="text"
            placeholder="Rota ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <button
            onClick={() => handleSearch()}
            disabled={searchLoading}
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
          >
            {searchLoading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            ) : (
              <svg className="h-5 w-5 text-blue-600 hover:text-blue-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex mb-6 border-b border-gray-200">
        <button
          onClick={() => changeTab('all')}
          className={`py-2 px-4 border-b-2 font-medium text-sm ${
            activeTab === 'all'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Tüm Rotalar ({routes.length})
        </button>
        <button
          onClick={() => changeTab('favorites')}
          className={`py-2 px-4 border-b-2 font-medium text-sm ${
            activeTab === 'favorites'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Favorilerim ({favoriteRoutes.length})
        </button>
        <button
          onClick={() => changeTab('suggest')}
          className={`py-2 px-4 border-b-2 font-medium text-sm ${
            activeTab === 'suggest'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Rota Önerisi
        </button>
        {activeTab === 'search' && (
          <button
            onClick={() => changeTab('search')}
            className="py-2 px-4 border-b-2 border-blue-500 text-blue-600 font-medium text-sm"
          >
            Arama Sonuçları ({routes.length})
          </button>
        )}
      </div>

      {/* Rota Önerisi Tab İçeriği */}
      {activeTab === 'suggest' && (
        <div className="mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Rota Planlayıcı</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nereden?
                </label>
                <input
                  type="text"
                  placeholder="Başlangıç durağı veya konumu"
                  value={fromStation}
                  onChange={(e) => setFromStation(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nereye?
                </label>
                <input
                  type="text"
                  placeholder="Hedef durak veya konum"
                  value={toStation}
                  onChange={(e) => setToStation(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <button
                onClick={getRouteSuggestion}
                disabled={suggestionLoading || !fromStation.trim() || !toStation.trim()}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {suggestionLoading ? 'Rotalar aranıyor...' : '🗺️ Rota Önerisi Al'}
              </button>
            </div>
            
            {/* Rota Önerileri */}
            {routeSuggestions.length > 0 && (
              <div className="mt-6">
                <h4 className="text-md font-medium text-gray-900 mb-3">Önerilen Rotalar</h4>
                <div className="space-y-3">
                  {routeSuggestions.map((suggestion, index) => (
                    <div key={index} className="bg-blue-50 p-4 rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-blue-900">
                            {suggestion.routeName}
                          </p>
                          <p className="text-sm text-blue-600">
                            Süre: {suggestion.estimatedDuration || 'Bilinmiyor'} • 
                            Mesafe: {suggestion.distance || 'Bilinmiyor'}
                          </p>
                          {suggestion.transfers && suggestion.transfers > 0 && (
                            <p className="text-sm text-orange-600 mt-1">
                              🔄 {suggestion.transfers} aktarma gerekli
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => viewRouteDetails(suggestion)}
                          className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                        >
                          Detay
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Rotalar yükleniyor...</p>
        </div>
      )}

      {/* Rota Listesi */}
      {!loading && activeTab !== 'suggest' && (
        <div className="space-y-4">
          {routes.map((route) => (
            <RouteCard key={route.id} route={route} />
          ))}
          
          {/* Sonuç Bulunamadı */}
          {routes.length === 0 && !loading && (
            <div className="text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">🚌</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {activeTab === 'favorites' ? 'Henüz favori rota yok' : 'Rota bulunamadı'}
              </h3>
              <p className="text-gray-500">
                {activeTab === 'favorites' 
                  ? 'Beğendiğin rotaları favorilere ekleyerek buradan kolayca erişebilirsin'
                  : activeTab === 'search'
                  ? 'Farklı anahtar kelimeler ile arama yapmayı dene'
                  : 'Henüz aktif rota bulunmuyor'
                }
              </p>
            </div>
          )}
        </div>
      )}

      {/* Rota Detay Modal */}
      {selectedRoute && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-12 h-8 rounded flex items-center justify-center text-white font-bold text-sm"
                    style={{ backgroundColor: RouteService.getRouteColor(selectedRoute.id) }}
                  >
                    {RouteService.formatRouteNumber(selectedRoute.routeNumber || selectedRoute.id)}
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {selectedRoute.routeName || selectedRoute.name}
                  </h2>
                </div>
                <button
                  onClick={() => setSelectedRoute(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {selectedRoute.description && (
                <p className="text-gray-600 mb-4">{selectedRoute.description}</p>
              )}
              
              {/* Rota Yönleri */}
              {routeDirections.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-md font-medium text-gray-900 mb-3">Yönler</h4>
                  <div className="space-y-2">
                    {routeDirections.map((direction, index) => {
                      console.log('[ROUTES] Render edilen yön:', direction);
                      const directionType = direction.directionType || direction.direction || direction.type;
                      return (
                        <button
                          key={index}
                          onClick={() => selectDirection(direction)}
                          className={`w-full text-left p-3 rounded-lg border transition-colors ${
                            selectedDirection?.directionType === directionType ||
                            selectedDirection?.direction === directionType ||
                            selectedDirection?.type === directionType
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          <p className="font-medium">
                            {RouteService.getDirectionTypeLabel(directionType)}
                          </p>
                          {direction.startLocation && direction.endLocation && (
                            <p className="text-sm text-gray-600">
                              {direction.startLocation} → {direction.endLocation}
                            </p>
                          )}
                          {!directionType && (
                            <p className="text-xs text-red-500">
                              Yön bilgisi eksik: {JSON.stringify(direction)}
                            </p>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {/* Seçili Yön Durakları */}
              {selectedDirection && directionsStations.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-md font-medium text-gray-900 mb-3">
                    {RouteService.getDirectionTypeLabel(selectedDirection.directionType)} Yönü Durakları
                  </h4>
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {directionsStations.map((station, index) => (
                      <div key={station.id || index} className="flex items-center gap-3 p-2 bg-gray-50 rounded">
                        <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                          {station.order || index + 1}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{station.stationName || station.name}</p>
                          {station.arrivalTime && (
                            <p className="text-xs text-gray-500">
                              Varış: {station.arrivalTime}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="flex gap-3">
                <button
                  onClick={() => toggleFavorite(
                    selectedRoute.id, 
                    favoriteRoutes.some(fav => fav.id === selectedRoute.id)
                  )}
                  className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  {favoriteRoutes.some(fav => fav.id === selectedRoute.id) 
                    ? '💔 Favoriden Çıkar' 
                    : '❤️ Favoriye Ekle'
                  }
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Routes;
