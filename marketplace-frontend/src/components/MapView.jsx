// A small wrapper around @vis.gl/react-google-maps so the dashboards don't
// have to repeat boilerplate. Renders a Google Map centered on `center` with
// one or more markers, each optionally with a popup (InfoWindow). The
// surrounding <APIProvider> is mounted once in App.jsx so all maps share a
// single Google Maps script load.

import { useState } from 'react';
import { Map, AdvancedMarker, InfoWindow, useMap } from '@vis.gl/react-google-maps';

/**
 * @param {object} props
 * @param {{lat:number,lng:number}} props.center
 * @param {number} [props.zoom=15]
 * @param {Array<{position:{lat:number,lng:number}, label?:string, popup?:string, emoji?:string}>} props.markers
 * @param {string} [props.height='100%']
 * @param {string} [props.mapId]  Optional Google Cloud Map ID for AdvancedMarker styling
 */
const MapView = ({ center, zoom = 15, markers = [], height = '100%', mapId }) => {
  const [openMarkerIdx, setOpenMarkerIdx] = useState(null);

  return (
    <div style={{ width: '100%', height, position: 'relative' }}>
      <Map
        defaultCenter={center}
        defaultZoom={zoom}
        gestureHandling="greedy"
        disableDefaultUI={false}
        mapId={mapId || 'kidza-default'}
        style={{ width: '100%', height: '100%' }}
      >
        <RecenterOnChange center={center} />
        {markers.map((m, i) => (
          <AdvancedMarker
            key={i}
            position={m.position}
            onClick={() => setOpenMarkerIdx(i)}
          >
            <div style={{ fontSize: '28px', lineHeight: 1, filter: 'drop-shadow(0 4px 4px rgba(0,0,0,0.3))' }}>
              {m.emoji || '📍'}
            </div>
            {openMarkerIdx === i && m.popup && (
              <InfoWindow position={m.position} onCloseClick={() => setOpenMarkerIdx(null)}>
                <div style={{ fontSize: '13px' }}>{m.popup}</div>
              </InfoWindow>
            )}
          </AdvancedMarker>
        ))}
      </Map>
    </div>
  );
};

// When the `center` prop changes (e.g. live GPS updates from a driver),
// pan the camera smoothly instead of remounting the whole map.
const RecenterOnChange = ({ center }) => {
  const map = useMap();
  if (map && center) map.panTo(center);
  return null;
};

export default MapView;
