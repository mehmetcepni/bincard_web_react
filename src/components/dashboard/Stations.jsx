import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import StationService from '../../services/station.service';

const Stations = () => {
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [stations, setStations] = useState([]);
  const [favoriteStations, setFavoriteStations] = useState([]);
  const [nearbyStations, setNearbyStations] = useState([]);
  const [selectedStation, setSelectedStation] = useState(null);
  const [showStationDetail, setShowStationDetail] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [activeTab, setActiveTab] = useState('nearby'); // nearby, search, favorites
  const [pagination, setPagination] = useState({
    page: 0,
    size: 10,
    totalPages: 0,
    totalElements: 0
  });

  // Sayfa yüklendiğinde konum al ve yakındaki durakları listele
  useEffect(() => {
    initializeStations();
    loadFavoriteStations();
  }, []);

  const initializeStations = async () => {
    try {
      setLoading(true);
      
      // Kullanıcının konumunu al
      const location = await StationService.getCurrentLocation();
      setUserLocation(location);
      
      // Yakındaki durakları getir
      await loadNearbyStations(location.latitude, location.longitude);
      
    } catch (error) {
      console.error('Konum alınamadı:', error);
      toast.error(error.message || 'Konum bilgisi alınamadı');
    } finally {
      setLoading(false);
    }
  };

  const loadNearbyStations = async (lat, lng, page = 0) => {
    try {
      setLoading(true);
      
      const response = await StationService.getNearbyStations(lat, lng, null, page, pagination.size);
      
      if (response.success) {
        setNearbyStations(response.data.content || []);
        setPagination({
          ...pagination,
          page: response.data.page || 0,
          totalPages: response.data.totalPages || 0,
          totalElements: response.data.totalElements || 0
        });
      } else {
        toast.error(response.message || 'Yakındaki duraklar yüklenemedi');
      }
    } catch (error) {
      console.error('Yakındaki duraklar yüklenemedi:', error);
      toast.error('Yakındaki duraklar yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const loadFavoriteStations = async () => {
    try {
      const response = await StationService.getFavoriteStations();
      
      if (response.success) {
        setFavoriteStations(response.data || []);
      } else {
        console.error('Favori duraklar yüklenemedi:', response.message);
      }
    } catch (error) {
      console.error('Favori duraklar yüklenemedi:', error);
    }
  };

  const searchStations = async (query, page = 0) => {
    if (!query.trim()) {
      setStations([]);
      return;
    }

    try {
      setLoading(true);
      
      const response = await StationService.searchStationsByName(query, page, pagination.size);
      
      if (response.success) {
        setStations(response.data.content || []);
        setPagination({
          ...pagination,
          page: response.data.page || 0,
          totalPages: response.data.totalPages || 0,
          totalElements: response.data.totalElements || 0
        });
      } else {
        toast.error(response.message || 'Arama sonuçları alınamadı');
      }
    } catch (error) {
      console.error('Arama başarısız:', error);
      toast.error('Arama yapılırken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const getSearchSuggestions = async (query) => {
    if (!query.trim() || query.length < 2) {
      setSearchSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    try {
      const response = await StationService.getSearchKeywords(query);
      
      if (response.success && Array.isArray(response.data)) {
        setSearchSuggestions(response.data.slice(0, 5)); // İlk 5 öneri
        setShowSuggestions(true);
      }
    } catch (error) {
      console.error('Arama önerileri alınamadı:', error);
    }
  };

  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    // Debounce ile arama önerilerini al
    clearTimeout(window.searchTimeout);
    window.searchTimeout = setTimeout(() => {
      getSearchSuggestions(query);
    }, 300);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setShowSuggestions(false);
    setActiveTab('search');
    searchStations(searchQuery);
  };

  const handleSuggestionClick = (suggestion) => {
    setSearchQuery(suggestion);
    setShowSuggestions(false);
    setActiveTab('search');
    searchStations(suggestion);
  };

  const toggleFavorite = async (stationId) => {
    try {
      const isFavorite = favoriteStations.some(station => station.id === stationId);
      
      const response = await StationService.toggleFavoriteStation(stationId, isFavorite);
      
      if (response.success) {
        toast.success(response.message);
        // Favori listesini yenile
        await loadFavoriteStations();
      } else {
        toast.error(response.message || 'Favori işlemi başarısız');
      }
    } catch (error) {
      console.error('Favori işlemi hatası:', error);
      toast.error('Favori işlemi yapılırken hata oluştu');
    }
  };

  const showStationDetails = async (stationId) => {
    try {
      setLoading(true);
      
      const response = await StationService.getStationById(stationId);
      
      if (response.success) {
        setSelectedStation(response.data);
        setShowStationDetail(true);
      } else {
        toast.error(response.message || 'Durak detayları alınamadı');
      }
    } catch (error) {
      console.error('Durak detayları alınamadı:', error);
      toast.error('Durak detayları yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const getCurrentStations = () => {
    switch (activeTab) {
      case 'nearby':
        return nearbyStations;
      case 'search':
        return stations;
      case 'favorites':
        return favoriteStations;
      default:
        return [];
    }
  };

  const StationCard = ({ station }) => {
    const isFavorite = favoriteStations.some(fav => fav.id === station.id);
    const distance = userLocation ? 
      StationService.calculateDistance(
        userLocation.latitude, 
        userLocation.longitude, 
        station.latitude, 
        station.longitude
      ) : null;

    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <h3 className="font-semibold text-gray-800 text-lg">{station.name}</h3>
            <p className="text-sm text-gray-500 mt-1">
              {StationService.getStationTypeLabel(station.type)}
            </p>
            {distance && (
              <p className="text-xs text-blue-600 mt-1">📍 {distance} uzaklıkta</p>
            )}
          </div>
          <button
            onClick={() => toggleFavorite(station.id)}
            className={`p-2 rounded-lg transition-colors ${
              isFavorite 
                ? 'text-red-500 bg-red-50 hover:bg-red-100' 
                : 'text-gray-400 bg-gray-50 hover:bg-gray-100'
            }`}
            title={isFavorite ? 'Favorilerden çıkar' : 'Favorilere ekle'}
          >
            {isFavorite ? '❤️' : '🤍'}
          </button>
        </div>

        {station.address && (
          <p className="text-sm text-gray-600 mb-3">📍 {station.address}</p>
        )}

        <div className="flex gap-2">
          <button
            onClick={() => showStationDetails(station.id)}
            className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
          >
            Detaylar
          </button>
          {station.latitude && station.longitude && (
            <button
              onClick={() => {
                const url = `https://maps.google.com/maps?q=${station.latitude},${station.longitude}`;
                window.open(url, '_blank');
              }}
              className="bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
            >
              🗺️ Harita
            </button>
          )}
        </div>
      </div>
    );
  };

  const StationDetailModal = ({ station, onClose }) => {
    const [routes, setRoutes] = useState([]);
    const [loadingRoutes, setLoadingRoutes] = useState(false);

    useEffect(() => {
      if (station?.id) {
        loadStationRoutes();
      }
    }, [station]);

    const loadStationRoutes = async () => {
      try {
        setLoadingRoutes(true);
        const response = await StationService.getStationRoutes(station.id);
        
        if (response.success) {
          setRoutes(response.data || []);
        }
      } catch (error) {
        console.error('Durak rotaları yüklenemedi:', error);
      } finally {
        setLoadingRoutes(false);
      }
    };

    if (!station) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800">{station.name}</h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              {StationService.getStationTypeLabel(station.type)}
            </p>
          </div>

          <div className="p-6">
            {station.address && (
              <div className="mb-4">
                <h3 className="font-semibold text-gray-700 mb-2">📍 Adres</h3>
                <p className="text-gray-600">{station.address}</p>
              </div>
            )}

            {station.description && (
              <div className="mb-4">
                <h3 className="font-semibold text-gray-700 mb-2">ℹ️ Açıklama</h3>
                <p className="text-gray-600">{station.description}</p>
              </div>
            )}

            <div className="mb-4">
              <h3 className="font-semibold text-gray-700 mb-2">🚌 Geçen Rotalar</h3>
              {loadingRoutes ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                  <span className="ml-2 text-gray-600">Rotalar yükleniyor...</span>
                </div>
              ) : routes.length > 0 ? (
                <div className="grid gap-2">
                  {routes.map((route, index) => (
                    <div key={index} className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-800">{route.name}</span>
                        <span className="text-sm text-gray-500">{route.code}</span>
                      </div>
                      {route.direction && (
                        <p className="text-sm text-gray-600 mt-1">
                          Yön: {route.direction}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">Bu duraktan geçen rota bulunamadı.</p>
              )}
            </div>

            <div className="flex gap-2 pt-4 border-t border-gray-200">
              {station.latitude && station.longitude && (
                <button
                  onClick={() => {
                    const url = `https://maps.google.com/maps?q=${station.latitude},${station.longitude}`;
                    window.open(url, '_blank');
                  }}
                  className="flex-1 bg-blue-500 text-white py-3 px-4 rounded-lg hover:bg-blue-600 transition-colors font-medium"
                >
                  🗺️ Haritada Göster
                </button>
              )}
              <button
                onClick={onClose}
                className="flex-1 bg-gray-200 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Duraklar</h1>
        <p className="text-gray-600">Yakındaki durakları keşfedin, arama yapın ve favorilerinize ekleyin.</p>
      </div>

      {/* Arama Kutusu */}
      <div className="mb-6 relative">
        <form onSubmit={handleSearchSubmit} className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Durak adı ara..."
            className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </form>

        {/* Arama Önerileri */}
        {showSuggestions && searchSuggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg mt-1 z-10">
            {searchSuggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(suggestion)}
                className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
              >
                <span className="text-gray-700">{suggestion}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
        <button
          onClick={() => setActiveTab('nearby')}
          className={`flex-1 py-2 px-4 rounded-lg text-center font-medium transition-colors ${
            activeTab === 'nearby'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          📍 Yakındakiler ({nearbyStations.length})
        </button>
        <button
          onClick={() => setActiveTab('search')}
          className={`flex-1 py-2 px-4 rounded-lg text-center font-medium transition-colors ${
            activeTab === 'search'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          🔍 Arama ({stations.length})
        </button>
        <button
          onClick={() => setActiveTab('favorites')}
          className={`flex-1 py-2 px-4 rounded-lg text-center font-medium transition-colors ${
            activeTab === 'favorites'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          ⭐ Favoriler ({favoriteStations.length})
        </button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span className="ml-3 text-gray-600">Yükleniyor...</span>
        </div>
      )}

      {/* Durak Listesi */}
      {!loading && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {getCurrentStations().map((station) => (
            <StationCard key={station.id} station={station} />
          ))}
        </div>
      )}

      {/* Boş Durum */}
      {!loading && getCurrentStations().length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🚏</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {activeTab === 'nearby' && 'Yakında durak bulunamadı'}
            {activeTab === 'search' && (searchQuery ? 'Arama sonucu bulunamadı' : 'Durak aramak için yukarıdaki kutuyu kullanın')}
            {activeTab === 'favorites' && 'Henüz favori durak eklememişsiniz'}
          </h3>
          <p className="text-gray-600">
            {activeTab === 'nearby' && 'Konumunuz yakınında durak bulunmuyor.'}
            {activeTab === 'search' && searchQuery && 'Farklı arama terimleri deneyebilirsiniz.'}
            {activeTab === 'favorites' && 'Durakları favorilere eklemek için ❤️ butonunu kullanın.'}
          </p>
        </div>
      )}

      {/* Pagination (sadece arama ve yakındakiler için) */}
      {!loading && activeTab !== 'favorites' && pagination.totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-6">
          <button
            onClick={() => {
              const newPage = Math.max(0, pagination.page - 1);
              if (activeTab === 'nearby' && userLocation) {
                loadNearbyStations(userLocation.latitude, userLocation.longitude, newPage);
              } else if (activeTab === 'search') {
                searchStations(searchQuery, newPage);
              }
            }}
            disabled={pagination.page === 0}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 transition-colors"
          >
            Önceki
          </button>
          
          <span className="px-4 py-2 text-gray-600">
            {pagination.page + 1} / {pagination.totalPages}
          </span>
          
          <button
            onClick={() => {
              const newPage = Math.min(pagination.totalPages - 1, pagination.page + 1);
              if (activeTab === 'nearby' && userLocation) {
                loadNearbyStations(userLocation.latitude, userLocation.longitude, newPage);
              } else if (activeTab === 'search') {
                searchStations(searchQuery, newPage);
              }
            }}
            disabled={pagination.page >= pagination.totalPages - 1}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 transition-colors"
          >
            Sonraki
          </button>
        </div>
      )}

      {/* Durak Detay Modalı */}
      {showStationDetail && selectedStation && (
        <StationDetailModal
          station={selectedStation}
          onClose={() => {
            setShowStationDetail(false);
            setSelectedStation(null);
          }}
        />
      )}
    </div>
  );
};

export default Stations;
