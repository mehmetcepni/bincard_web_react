import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleMap, Marker, InfoWindow, useJsApiLoader } from '@react-google-maps/api';
import { useTranslation } from 'react-i18next';
import AuthService from '../../services/auth.service';
import { toast } from 'react-toastify';

const GOOGLE_MAPS_API_KEY = 'AIzaSyBRYfrvFsxgARSM_iE7JA1EHu1nSpaWAxc';

const mapContainerStyle = {
  width: '100%',
  height: '400px',
};

const defaultCenter = { lat: 39.925533, lng: 32.866287 }; // Ankara

const PaymentPoints = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const PLACE_TYPES = [
    { label: t('paymentPoints.placeTypes.paymentPoint'), value: 'payment_point' },
    { label: t('paymentPoints.placeTypes.supermarket'), value: 'supermarket' },
    { label: t('paymentPoints.placeTypes.convenienceStore'), value: 'convenience_store' },
    { label: t('paymentPoints.placeTypes.restaurant'), value: 'restaurant' },
    { label: t('paymentPoints.placeTypes.bank'), value: 'bank' },
    { label: t('paymentPoints.placeTypes.atm'), value: 'atm' },
    { label: t('paymentPoints.placeTypes.postOffice'), value: 'post_office' },
  ];
  const [userLocation, setUserLocation] = useState(null);
  const [locationPermission, setLocationPermission] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [places, setPlaces] = useState([]);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState(PLACE_TYPES[0].value);
  const [map, setMap] = useState(null);

  // Google Maps API yükleyici
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: ['places'],
  });

  // Auth kontrolü (değişmedi)
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const authResult = await AuthService.showLoginConfirmModal('Ödeme noktalarını görüntüleme işlemini', navigate);
        if (!authResult && !AuthService.isAuthenticated()) {
          navigate('/dashboard');
        }
      } catch (error) {
        navigate('/dashboard');
      }
    };
    if (!AuthService.isAuthenticated()) {
      checkAuth();
    }
  }, [navigate]);

  // Konum izni iste
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          setLocationPermission('granted');
        },
        () => setLocationPermission('denied')
      );
    } else {
      setLocationPermission('not-available');
    }
  }, []);

  // Google Places API ile yerleri ara
  const fetchPlaces = (center, type, keyword) => {
    if (!window.google || !center) return;
    setLoading(true);
    const service = new window.google.maps.places.PlacesService(map);
    const request = {
      location: center,
      radius: 10000, // 10km
      type: type !== 'payment_point' ? type : undefined,
      keyword: type === 'payment_point' ? 'payment point,ödeme merkezi,fatura ödeme,payment center' : keyword || undefined,
    };
    service.nearbySearch(request, (results, status) => {
      if (status === window.google.maps.places.PlacesServiceStatus.OK) {
        setPlaces(results);
      } else {
        setPlaces([]);
        toast.info(t('paymentPoints.noResultsFound'));
      }
      setLoading(false);
    });
  };

  // Konum veya filtre değişince otomatik ara
  useEffect(() => {
    if (isLoaded && userLocation && map) {
      fetchPlaces(userLocation, selectedType, searchTerm);
    }
    // eslint-disable-next-line
  }, [isLoaded, userLocation, selectedType, map]);

  // Arama butonu
  const handleSearch = () => {
    if (userLocation && map) {
      fetchPlaces(userLocation, selectedType, searchTerm);
    }
  };

  if (!isLoaded) {
    return <div className="flex items-center justify-center min-h-[80vh]">{t('paymentPoints.loadingMap')}</div>;
  }

  return (
    <div className="py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header ve filtreler */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <h1 className="text-2xl font-bold text-blue-800 mb-4">{t('paymentPoints.title')}</h1>
          <div className="flex flex-col md:flex-row gap-4 mb-4">
              <input
                type="text"
                placeholder={t('paymentPoints.searchPlaceholder')}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            <select
              value={selectedType}
              onChange={e => setSelectedType(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg"
            >
              {PLACE_TYPES.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
                <button
              onClick={handleSearch}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
            >
              {t('paymentPoints.search')}
                  </button>
          </div>
        </div>
        {/* Harita */}
        <div className="mb-8 rounded-2xl overflow-hidden shadow-lg border border-gray-200" style={{background: '#f8fafc'}}>
          <div className="w-full" style={{height: 'min(350px,40vw)', minHeight: 200, maxHeight: 400}}>
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              center={userLocation || defaultCenter}
              zoom={userLocation ? 13 : 6}
              onLoad={mapInstance => setMap(mapInstance)}
            >
              {/* Kullanıcı konumu */}
              {userLocation && (
                <Marker position={userLocation} icon={{ url: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png' }} />
              )}
              {/* Yerler */}
              {places.map(place => (
                  <Marker
                  key={place.place_id}
                  position={{ lat: place.geometry.location.lat(), lng: place.geometry.location.lng() }}
                  onClick={() => setSelectedPlace(place)}
                />
              ))}
              {/* InfoWindow */}
              {selectedPlace && (
                <InfoWindow
                  position={{ lat: selectedPlace.geometry.location.lat(), lng: selectedPlace.geometry.location.lng() }}
                  onCloseClick={() => setSelectedPlace(null)}
                >
                  <div style={{ minWidth: 180, maxWidth: 240 }}>
                    <div className="font-bold text-base text-blue-800 mb-1">{selectedPlace.name}</div>
                    <div className="text-xs text-gray-600 mb-1">{selectedPlace.vicinity}</div>
                    {selectedPlace.types && (
                      <div className="flex flex-wrap gap-1 mb-1">
                        {selectedPlace.types.slice(0, 3).map((t, i) => (
                          <span key={i} className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-semibold">{t.replace(/_/g, ' ')}</span>
                        ))}
                      </div>
                    )}
                    {selectedPlace.rating && (
                      <div className="text-xs text-yellow-700 mb-1">{t('paymentPoints.rating')}: {selectedPlace.rating} ⭐</div>
                    )}
                    <a
                      href={`https://www.google.com/maps/place/?q=place_id:${selectedPlace.place_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 underline text-xs"
                    >
                      {t('paymentPoints.openInGoogleMaps')}
                    </a>
                  </div>
                </InfoWindow>
              )}
            </GoogleMap>
          </div>
        </div>
        {/* Sonuç Listesi */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {places.map(place => (
            <div key={place.place_id} className="bg-white rounded-xl shadow-md overflow-hidden transition-transform hover:shadow-lg hover:-translate-y-1">
              <div className="h-48 overflow-hidden relative flex items-center justify-center bg-gray-100">
                {place.photos && place.photos.length > 0 ? (
                  <img
                    src={place.photos[0].getUrl({ maxWidth: 400, maxHeight: 200 })}
                    alt={place.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <img
                    src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop"
                    alt={place.name}
                  className="w-full h-full object-cover"
                />
                )}
              </div>
              <div className="p-4">
                <h3 className="text-lg font-bold text-gray-800 mb-2 line-clamp-1">{place.name}</h3>
                <div className="text-sm text-gray-600 mb-2">{place.vicinity}</div>
                {place.rating && (
                  <div className="text-xs text-yellow-700 mb-2">{t('paymentPoints.rating')}: {place.rating} ⭐</div>
                )}
                <div className="flex flex-wrap gap-1 mb-2">
                  {place.types && place.types.slice(0, 2).map((t, i) => (
                    <span key={i} className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">{t.replace(/_/g, ' ')}</span>
                  ))}
                </div>
                <a
                  href={`https://www.google.com/maps/place/?q=place_id:${place.place_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block mt-2 text-blue-600 underline text-xs"
                >
                  {t('paymentPoints.openInGoogleMaps')}
                </a>
              </div>
            </div>
          ))}
        </div>
        {/* Sonuç yoksa */}
        {places.length === 0 && !loading && (
          <div className="bg-white rounded-xl shadow-md p-8 text-center mt-8">
            <h3 className="text-xl font-bold text-gray-800 mb-2">{t('paymentPoints.noResultsFound')}</h3>
            <p className="text-gray-600 mb-4">{t('paymentPoints.noResultsDescription')}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentPoints;