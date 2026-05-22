// A small wrapper around @vis.gl/react-google-maps so the dashboards don't
// have to repeat boilerplate. Renders a Google Map centered on `center` with
// markers, and optionally draws a Directions polyline from `routeFrom` to
// `routeTo`. ETA / distance are returned via the optional `onRouteUpdate`
// callback so the parent can display them.

import { useEffect, useRef, useState } from 'react';
import { Map, AdvancedMarker, InfoWindow, useMap, useMapsLibrary } from '@vis.gl/react-google-maps';

/**
 * @param {object}                 props
 * @param {{lat:number,lng:number}}  props.center
 * @param {number}                  [props.zoom=15]
 * @param {Array<{position:{lat:number,lng:number}, popup?:string, emoji?:string}>} props.markers
 * @param {string}                  [props.height='100%']
 * @param {string}                  [props.mapId]
 * @param {{lat:number,lng:number}} [props.routeFrom]   draw a route from this point
 * @param {{lat:number,lng:number}} [props.routeTo]     to this point
 * @param {(info:{durationText:string, distanceText:string, durationSec:number}) => void} [props.onRouteUpdate]
 */
const MapView = ({
  center, zoom = 15, markers = [], height = '100%', mapId,
  routeFrom, routeTo, onRouteUpdate
}) => {
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

        {/* Optional driving route + ETA between two points. */}
        {routeFrom && routeTo && (
          <Directions from={routeFrom} to={routeTo} onRouteUpdate={onRouteUpdate} />
        )}

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

// Pan to a new center when it changes (driver GPS pings) without remounting
// the underlying map, which would lose zoom + interaction state.
// Deps spell out lat/lng so the effect doesn't fire when the parent passes
// a fresh object with the same coords.
const RecenterOnChange = ({ center }) => {
  const map = useMap();
  const lat = center?.lat, lng = center?.lng;
  useEffect(() => {
    if (map && lat != null && lng != null) map.panTo({ lat, lng });
  }, [map, lat, lng]);
  return null;
};

// Asks the Directions API for a route between two points and renders it as
// a polyline. Recomputes when either endpoint moves.
const Directions = ({ from, to, onRouteUpdate }) => {
  const map = useMap();
  const routesLib = useMapsLibrary('routes');
  const serviceRef = useRef(null);
  const rendererRef = useRef(null);
  const fromLat = from?.lat, fromLng = from?.lng;
  const toLat = to?.lat, toLng = to?.lng;

  // Build the service + renderer once when the library + map are ready.
  useEffect(() => {
    if (!routesLib || !map) return;
    serviceRef.current = new routesLib.DirectionsService();
    rendererRef.current = new routesLib.DirectionsRenderer({
      map,
      suppressMarkers: true,
      preserveViewport: true,
      polylineOptions: { strokeColor: '#FFD700', strokeWeight: 5, strokeOpacity: 0.9 }
    });
    return () => {
      rendererRef.current?.setMap(null);
      rendererRef.current = null;
      serviceRef.current = null;
    };
  }, [routesLib, map]);

  // Recompute the route whenever an endpoint moves.
  useEffect(() => {
    const service = serviceRef.current;
    const renderer = rendererRef.current;
    if (!service || !renderer || fromLat == null || toLat == null) return;

    service.route({
      origin: { lat: fromLat, lng: fromLng },
      destination: { lat: toLat, lng: toLng },
      travelMode: 'DRIVING'
    }).then((result) => {
      renderer.setDirections(result);
      const leg = result.routes?.[0]?.legs?.[0];
      if (leg && onRouteUpdate) {
        onRouteUpdate({
          durationText: leg.duration?.text || '',
          distanceText: leg.distance?.text || '',
          durationSec: leg.duration?.value || 0
        });
      }
    }).catch((err) => console.error('Directions error:', err));
  }, [fromLat, fromLng, toLat, toLng, onRouteUpdate]);

  return null;
};

export default MapView;
