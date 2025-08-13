import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, ZoomControl, AttributionControl } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useTranslation } from 'react-i18next';

// İkonları içe aktar
import { defaultIcon, stationIcon } from '../../utils/leaflet-icons';

// Leaflet ikonlarını başlat
import '../../utils/leaflet-icons';

const RouteMap = ({ stations, currentLocation, routeColor = '#3B82F6' }) => {
  const { t } = useTranslation();
  const [mapCenter, setMapCenter] = useState([39.9333635, 32.859741]); // Varsayılan merkez (Ankara)
  const [mapZoom, setMapZoom] = useState(13);
  const [polylinePositions, setPolylinePositions] = useState([]);

  useEffect(() => {
    // Eğer duraklar varsa, polyline pozisyonlarını oluştur
    if (stations && stations.length > 0) {
      const positions = stations
        .filter(station => station.latitude && station.longitude)
        .map(station => [station.latitude, station.longitude]);
      
      setPolylinePositions(positions);
      
      // Haritayı ortadaki durağa veya tek durak varsa ona odakla
      if (positions.length > 0) {
        // Birden fazla durak varsa tüm durakları gösterecek şekilde zoom yap
        if (positions.length > 1) {
          // Harita merkezi olarak durakların orta noktasını kullan
          const middleIndex = Math.floor(positions.length / 2);
          setMapCenter(positions[middleIndex]);
          // Daha yakın zoom seviyesi kullan
          setMapZoom(13);
        } else {
          // Tek durak varsa ona odakla ve daha yakın zoom yap
          setMapCenter(positions[0]);
          setMapZoom(15);
        }
      }
    } else if (currentLocation) {
      // Durak yoksa ama konum varsa, konuma odakla
      setMapCenter([currentLocation.latitude, currentLocation.longitude]);
      setMapZoom(15);
    }
  }, [stations, currentLocation]);

  if (!stations || stations.length === 0) {
    return (
      <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 text-center">
        <p className="text-gray-500 dark:text-gray-400">{t('routes.noStationsToDisplay')}</p>
      </div>
    );
  }

  return (
    <div className="route-map-container" style={{ height: '400px', width: '100%' }}>
      <MapContainer 
        center={mapCenter} 
        zoom={mapZoom} 
        style={{ height: '100%', width: '100%' }}
        zoomControl={false} // Zoom kontrolünü kaldırıyoruz, daha sonra sağ üst köşeye ekleyeceğiz
        attributionControl={false} // Attrubition kontrolünü kaldırıyoruz
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Zoom kontrolünü sağ üst köşeye ekle */}
        <ZoomControl position="topright" />
        
        {/* Attribution kontrolünü sağ alt köşeye ekle */}
        <AttributionControl position="bottomright" prefix="&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors" />
        
        {/* Duraklar arası çizgi */}
        {polylinePositions.length > 1 && (
          <>
            {/* İlk olarak geniş ve saydam bir çizgi çizerek gölge efekti oluştur */}
            <Polyline 
              positions={polylinePositions} 
              color="#000000" 
              weight={10} 
              opacity={0.3} 
            />
            {/* Sonra ana çizgiyi çiz */}
            <Polyline 
              positions={polylinePositions} 
              color={routeColor} 
              weight={6} 
              opacity={0.9} 
              dashArray="10, 0"
            />
          </>
        )}
        
        {/* Durakları işaretle */}
        {stations.map((station, index) => {
          if (!station.latitude || !station.longitude) return null;
          
          return (
            <Marker 
              key={station.id || index}
              position={[station.latitude, station.longitude]} 
              icon={stationIcon}
            >
              <Popup>
                <div>
                  <h3 className="font-medium">{station.stationName || station.name}</h3>
                  {station.order && (
                    <p className="text-sm text-gray-600">
                      {t('routes.stationOrder')}: {station.order}
                    </p>
                  )}
                  {station.arrivalTime && (
                    <p className="text-sm text-gray-600">
                      {t('routes.arrival')}: {station.arrivalTime}
                    </p>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
        
        {/* Mevcut konumu göster */}
        {currentLocation && (
          <Marker 
            position={[currentLocation.latitude, currentLocation.longitude]} 
            icon={defaultIcon}
          >
            <Popup>
              <div>
                <h3 className="font-medium">{t('routes.yourLocation')}</h3>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
};

export default RouteMap;
