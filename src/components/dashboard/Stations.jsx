import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import StationService from '../../services/station.service';
import RouteMap from '../common/RouteMap';

const Stations = () => {
  const { t } = useTranslation();
  
  // State management
  const [stations, setStations] = useState([]);
  const [favoriteStations, setFavoriteStations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('nearby');
  const [searchLoading, setSearchLoading] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [selectedStation, setSelectedStation] = useState(null);
  const [stationRoutes, setStationRoutes] = useState([]);
  const [showStationMap, setShowStationMap] = useState(false);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // Kullanıcının mevcut konumunu al
  useEffect(() => {
    getCurrentLocationHandler();
  }, []);

  // Favori durakları yükle
  useEffect(() => {
    loadFavoriteStations();
  }, []);

  // Yakındaki durakları yükle (konum alındığında)
  useEffect(() => {
    if (currentLocation && activeTab === 'nearby') {
      loadNearbyStations();
    }
  }, [currentLocation, activeTab]);

  // Konum alma
  const getCurrentLocationHandler = async () => {
    try {
      setLoading(true);
      const location = await StationService.getCurrentLocation();
      setCurrentLocation(location);
      console.log('[STATIONS] Konum alındı:', location);
    } catch (error) {
      console.error('[STATIONS] Konum alınamadı:', error);
      toast.error(error.message || t('stations.locationPermissionError'));
    } finally {
      setLoading(false);
    }
  };

  // Yakındaki durakları yükle
  const loadNearbyStations = async (page = 0, append = false) => {
    if (!currentLocation) return;

    try {
      if (!append) setLoading(true);
      
      const result = await StationService.getNearbyStations(
        currentLocation.latitude,
        currentLocation.longitude,
        null, // type filter
        page,
        10
      );

      if (result.success) {
        const newStations = result.data.content || [];
        setStations(append ? [...stations, ...newStations] : newStations);
        setCurrentPage(result.data.currentPage || page);
        setTotalPages(result.data.totalPages || 0);
        setHasMore(!result.data.last);
        
        console.log('[STATIONS] Yakındaki duraklar yüklendi:', result.data);
      } else {
        toast.error(result.message || t('stations.stationsLoadError'));
      }
    } catch (error) {
      console.error('[STATIONS] Yakındaki duraklar yüklenemedi:', error);
      toast.error(t('stations.stationsLoadError'));
    } finally {
      setLoading(false);
    }
  };

  // Favori durakları yükle
  const loadFavoriteStations = async () => {
    try {
      const result = await StationService.getFavoriteStations();
      
      if (result.success) {
        setFavoriteStations(result.data || []);
        console.log('[STATIONS] Favori duraklar yüklendi:', result.data);
      } else {
        console.warn('[STATIONS] Favori duraklar yüklenemedi:', result.message);
      }
    } catch (error) {
      console.error('[STATIONS] Favori duraklar yüklenemedi:', error);
    }
  };

  // Durak arama
  const searchStations = async (query, page = 0, append = false) => {
    if (!query.trim()) return;

    try {
      if (!append) setSearchLoading(true);
      
      const result = await StationService.searchStationsByName(query, page, 10);

      if (result.success) {
        const newStations = result.data.content || [];
        setStations(append ? [...stations, ...newStations] : newStations);
        setCurrentPage(result.data.currentPage || page);
        setTotalPages(result.data.totalPages || 0);
        setHasMore(!result.data.last);
        
        console.log('[STATIONS] Arama sonuçları:', result.data);
      } else {
        toast.error(result.message || t('stations.searchError'));
      }
    } catch (error) {
      console.error('[STATIONS] Arama hatası:', error);
      toast.error(t('stations.searchError'));
    } finally {
      setSearchLoading(false);
    }
  };

  // Arama önerileri getir
  const fetchSearchSuggestions = useCallback(async (query) => {
    if (!query.trim() || query.length < 2) {
      setSearchSuggestions([]);
      setSelectedSuggestionIndex(-1);
      return;
    }

    try {
      const result = await StationService.getSearchKeywords(query);
      
      if (result.success) {
        // Önerileri filtrele ve sırala
        const suggestions = Array.from(result.data || [])
          .filter(suggestion => suggestion.toLowerCase().includes(query.toLowerCase()))
          .sort((a, b) => {
            // Başlangıçta eşleşenler önce gelsin
            const aStartsWith = a.toLowerCase().startsWith(query.toLowerCase());
            const bStartsWith = b.toLowerCase().startsWith(query.toLowerCase());
            
            if (aStartsWith && !bStartsWith) return -1;
            if (!aStartsWith && bStartsWith) return 1;
            
            // Alfabetik sıralama
            return a.localeCompare(b, 'tr');
          })
          .slice(0, 5); // Maksimum 5 öneri
          
        setSearchSuggestions(suggestions);
        setSelectedSuggestionIndex(-1);
      }
    } catch (error) {
      console.error('[STATIONS] Öneri getirme hatası:', error);
      setSearchSuggestions([]);
      setSelectedSuggestionIndex(-1);
    }
  }, []);

  // Arama input değişikliği
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    
    if (value.trim()) {
      setShowSuggestions(true);
      fetchSearchSuggestions(value);
    } else {
      setShowSuggestions(false);
      setSearchSuggestions([]);
      setSelectedSuggestionIndex(-1);
    }
  };

  // Klavye navigasyonu
  const handleKeyDown = (e) => {
    if (!showSuggestions || searchSuggestions.length === 0) {
      if (e.key === 'Enter') {
        handleSearch();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedSuggestionIndex(prev => 
          prev < searchSuggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedSuggestionIndex(prev => 
          prev > 0 ? prev - 1 : searchSuggestions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedSuggestionIndex >= 0) {
          const selectedSuggestion = searchSuggestions[selectedSuggestionIndex];
          setSearchQuery(selectedSuggestion);
          handleSearch(selectedSuggestion);
        } else {
          handleSearch();
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
        break;
    }
  };

  // Öneri seçimi
  const selectSuggestion = (suggestion) => {
    setSearchQuery(suggestion);
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
    handleSearch(suggestion);
  };

  // Arama başlat
  const handleSearch = (query = searchQuery) => {
    if (!query.trim()) return;
    
    setActiveTab('search');
    setCurrentPage(0);
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
    searchStations(query);
  };

  // Favori toggle
  const toggleFavorite = async (stationId, isFavorite) => {
    try {
      const result = await StationService.toggleFavoriteStation(stationId, isFavorite);
      
      if (result.success) {
        toast.success(result.message);
        
        // Favori listesini güncelle
        await loadFavoriteStations();
        
        // Mevcut listede de güncelle
        setStations(prevStations => 
          prevStations.map(station => 
            station.id === stationId 
              ? { ...station, isFavorite: !isFavorite }
              : station
          )
        );
      } else {
        toast.error(result.message || 'Favori durumu değiştirilemedi');
      }
    } catch (error) {
      console.error('[STATIONS] Favori toggle hatası:', error);
      toast.error('Favori durumu değiştirilirken bir hata oluştu');
    }
  };

  // Durak detaylarını görüntüle
  const viewStationDetails = async (station) => {
    setSelectedStation(station);
    setShowStationMap(false);
    
    // Duraktan geçen rotaları getir
    try {
      const result = await StationService.getStationRoutes(station.id);
      
      if (result.success) {
        setStationRoutes(result.data || []);
      } else {
        setStationRoutes([]);
      }
    } catch (error) {
      console.error('[STATIONS] Rota bilgileri alınamadı:', error);
      setStationRoutes([]);
    }
  };

  // Daha fazla yükle
  const loadMore = () => {
    const nextPage = currentPage + 1;
    
    if (activeTab === 'nearby') {
      loadNearbyStations(nextPage, true);
    } else if (activeTab === 'search') {
      searchStations(searchQuery, nextPage, true);
    }
  };

  // Tab değiştir
  const changeTab = (tab) => {
    setActiveTab(tab);
    setCurrentPage(0);
    setStations([]);
    setHasMore(true);
    
    if (tab === 'nearby' && currentLocation) {
      loadNearbyStations();
    } else if (tab === 'favorites') {
      setStations(favoriteStations);
    }
  };

  // Durak kartı bileşeni
  const StationCard = ({ station }) => {
    const isFavorite = favoriteStations.some(fav => fav.id === station.id);
    
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 text-lg mb-1">
              {station.name}
            </h3>
            <p className="text-sm text-gray-600 mb-2">
              {StationService.getStationTypeLabel(station.type)}
            </p>
            {station.address && (
              <p className="text-sm text-gray-500 mb-2">
                📍 {station.address}
              </p>
            )}
            {currentLocation && station.latitude && station.longitude && (
              <p className="text-sm text-blue-600 font-medium">
                📏 {StationService.calculateDistance(
                  currentLocation.latitude,
                  currentLocation.longitude,
                  station.latitude,
                  station.longitude
                )}
              </p>
            )}
          </div>
          
          <button
            onClick={() => toggleFavorite(station.id, isFavorite)}
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
            onClick={() => viewStationDetails(station)}
            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            {t('stations.details')}
          </button>
          
          {station.latitude && station.longitude && (
            <button
              onClick={() => {
                // Durak detayını aç ve haritayı göster
                viewStationDetails(station);
                // Kısa bir gecikme ile modal açıldıktan sonra harita görünümünü aç
                setTimeout(() => {
                  setShowStationMap(true);
                }, 300);
              }}
              className="bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
            >
              {t('stations.directions')}
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-gray-50 dark:bg-gray-900 min-h-screen transition-colors duration-300">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{t('stations.title')}</h1>
        <p className="text-gray-600 dark:text-gray-400">{t('stations.description')}</p>
      </div>

      {/* Arama Bölümü */}
      <div className="mb-6">
        <div className="relative">
          <div className="relative">
            <input
              type="text"
              placeholder={t('stations.search')}
              value={searchQuery}
              onChange={handleSearchChange}
              onKeyDown={handleKeyDown}
              onFocus={() => {
                if (searchQuery.trim() && searchSuggestions.length > 0) {
                  setShowSuggestions(true);
                }
              }}
              onBlur={(e) => {
                // Öneri tıklamasını beklemek için gecikme
                setTimeout(() => {
                  if (!e.relatedTarget?.closest('.suggestions-dropdown')) {
                    setShowSuggestions(false);
                    setSelectedSuggestionIndex(-1);
                  }
                }, 150);
              }}
              className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              autoComplete="off"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <button
              onClick={() => handleSearch()}
              disabled={searchLoading || !searchQuery.trim()}
              className="absolute inset-y-0 right-0 pr-3 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {searchLoading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              ) : (
                <svg className="h-5 w-5 text-blue-600 hover:text-blue-700 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              )}
            </button>
          </div>
          
          {/* Arama Önerileri */}
          {showSuggestions && searchSuggestions.length > 0 && (
            <div className="suggestions-dropdown absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
              <div className="py-1">
                {searchSuggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => selectSuggestion(suggestion)}
                    className={`w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors flex items-center gap-3 ${
                      index === selectedSuggestionIndex ? 'bg-blue-50 border-r-2 border-blue-500' : ''
                    }`}
                  >
                    <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">
                        {suggestion.split(new RegExp(`(${searchQuery})`, 'gi')).map((part, i) => (
                          <span key={i} className={
                            part.toLowerCase() === searchQuery.toLowerCase() 
                              ? 'bg-yellow-200 text-yellow-800' 
                              : ''
                          }>
                            {part}
                          </span>
                        ))}
                      </div>
                    </div>
                    <svg className="h-4 w-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </button>
                ))}
              </div>
              
              {/* Klavye kısayol ipucu */}
              <div className="border-t border-gray-100 px-4 py-2 bg-gray-50 text-xs text-gray-500">
                {t('stations.keyboardShortcuts')}
              </div>
            </div>
          )}
          
          {/* Popüler Aramalar */}
          {!searchQuery && !showSuggestions && (
            <div className="mt-3">
              <p className="text-sm text-gray-600 mb-2">{t('stations.popularSearches')}</p>
              <div className="flex flex-wrap gap-2">
                {[
                  'Alaaddin Keykubat',
                  'Meram',
                  'Karatay',
                  'Selçuklu',
                  'Yeni Terminal',
                  'Konya Tren Garı'
                ].map((keyword, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setSearchQuery(keyword);
                      handleSearch(keyword);
                    }}
                    className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-blue-100 hover:text-blue-700 transition-colors"
                  >
                    {keyword}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex mb-6 border-b border-gray-200 dark:border-gray-600">
        <button
          onClick={() => changeTab('nearby')}
          className={`py-2 px-4 border-b-2 font-medium text-sm transition-colors ${
            activeTab === 'nearby'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          {t('stations.nearby')} ({stations.length})
        </button>
        <button
          onClick={() => changeTab('favorites')}
          className={`py-2 px-4 border-b-2 font-medium text-sm transition-colors ${
            activeTab === 'favorites'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          {t('stations.favorites')} ({favoriteStations.length})
        </button>
        {activeTab === 'search' && (
          <button
            onClick={() => changeTab('search')}
            className="py-2 px-4 border-b-2 border-blue-500 text-blue-600 font-medium text-sm"
          >
            {t('stations.searchResults')} ({stations.length})
          </button>
        )}
      </div>

      {/* Konum Buton */}
      {!currentLocation && (
        <div className="mb-6 text-center">
          <button
            onClick={getCurrentLocationHandler}
            disabled={loading}
            className="bg-blue-600 text-white py-2 px-6 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {loading ? t('stations.gettingLocation') : t('stations.getLocation')}
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">{t('stations.loadingStations')}</p>
        </div>
      )}

      {/* Durak Listesi */}
      {!loading && (
        <div className="space-y-4">
          {stations.map((station) => (
            <StationCard key={station.id} station={station} />
          ))}
          
          {/* Daha Fazla Yükle */}
          {hasMore && stations.length > 0 && (
            <div className="text-center pt-4">
              <button
                onClick={loadMore}
                className="bg-gray-100 text-gray-700 py-2 px-6 rounded-lg hover:bg-gray-200 transition-colors"
              >
                {t('stations.loadMore')}
              </button>
            </div>
          )}
          
          {/* Sonuç Bulunamadı */}
          {stations.length === 0 && !loading && (
            <div className="text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">🚏</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {activeTab === 'favorites' ? t('stations.noFavorites') : t('stations.noStationsFound')}
              </h3>
              <p className="text-gray-500">
                {activeTab === 'favorites' 
                  ? t('stations.noFavoritesDescription')
                  : activeTab === 'search'
                  ? t('stations.noStationsFoundDescription')
                  : t('stations.noNearbyStations')
                }
              </p>
            </div>
          )}
        </div>
      )}

      {/* Durak Detay Modal */}
      {selectedStation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-bold text-gray-900">
                  {selectedStation.name}
                </h2>
                <button
                  onClick={() => {
                    setSelectedStation(null);
                    setShowStationMap(false);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {/* Harita Görünümü */}
              {showStationMap && selectedStation.latitude && selectedStation.longitude && (
                <div className="mb-4" id="station-map-container">
                  <RouteMap 
                    stations={[selectedStation]} 
                    currentLocation={currentLocation}
                    routeColor="#3B82F6"
                  />
                </div>
              )}
              
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">{t('stations.stationType')}</p>
                  <p className="font-medium">
                    {StationService.getStationTypeLabel(selectedStation.type)}
                  </p>
                </div>
                
                {selectedStation.address && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">{t('stations.address')}</p>
                    <p className="font-medium">{selectedStation.address}</p>
                  </div>
                )}
                
                {currentLocation && selectedStation.latitude && selectedStation.longitude && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">{t('stations.distance')}</p>
                    <p className="font-medium text-blue-600">
                      {StationService.calculateDistance(
                        currentLocation.latitude,
                        currentLocation.longitude,
                        selectedStation.latitude,
                        selectedStation.longitude
                      )}
                    </p>
                  </div>
                )}
                
                {/* Geçen Rotalar */}
                {stationRoutes.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-600 mb-2">{t('stations.routesPassingThrough')}</p>
                    <div className="space-y-2">
                      {stationRoutes.map((route, index) => (
                        <div key={index} className="bg-blue-50 p-3 rounded-lg">
                          <p className="font-medium text-blue-900">{route.routeName}</p>
                          {route.direction && (
                            <p className="text-sm text-blue-600">{route.direction}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => toggleFavorite(
                    selectedStation.id, 
                    favoriteStations.some(fav => fav.id === selectedStation.id)
                  )}
                  className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  {favoriteStations.some(fav => fav.id === selectedStation.id) ? t('stations.removeFromFavorites') : t('stations.addToFavorites')}
                </button>
                
                {selectedStation.latitude && selectedStation.longitude && (
                  <button
                    onClick={() => {
                      // Harita görünümünü aç/kapa
                      setShowStationMap(prev => !prev);
                    }}
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors station-directions-button"
                  >
                    🗺️ {showStationMap ? t('stations.hideMap') : t('stations.directions')}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Stations;