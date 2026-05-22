// Address autocomplete bound to a styled <input>. Uses Google's Places
// JS library, restricted to addresses inside Kenya (country=ke). On select,
// reports the human-readable address plus exact lat/lng — so the cart can
// fill the delivery address AND set dropoff coordinates from a single field.
//
// Notes:
// - We use the legacy `google.maps.places.Autocomplete` because it works
//   with any plain <input>. The newer `PlaceAutocompleteElement` is a web
//   component with its own styling that wouldn't match our .input-modern.

import { useEffect, useRef } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';

const PlaceAutocomplete = ({
  value,
  onChange,                // (text) — fired on every keystroke
  onPlaceSelected,         // ({ address, lat, lng }) — fired when user picks a suggestion
  placeholder,
  className = 'input-modern',
  style
}) => {
  const inputRef = useRef(null);
  const autocompleteRef = useRef(null);
  const places = useMapsLibrary('places');

  useEffect(() => {
    if (!places || !inputRef.current) return;

    autocompleteRef.current = new places.Autocomplete(inputRef.current, {
      componentRestrictions: { country: 'ke' },
      fields: ['formatted_address', 'geometry', 'name'],
      types: ['geocode'] // street addresses and admin areas
    });

    const listener = autocompleteRef.current.addListener('place_changed', () => {
      const place = autocompleteRef.current.getPlace();
      if (!place?.geometry?.location) return;

      const lat = place.geometry.location.lat();
      const lng = place.geometry.location.lng();
      const address = place.formatted_address || place.name || '';
      onPlaceSelected?.({ address, lat, lng });
      onChange?.(address);
    });

    return () => listener?.remove();
  }, [places, onChange, onPlaceSelected]);

  return (
    <input
      ref={inputRef}
      type="text"
      className={className}
      style={style}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      autoComplete="off"
    />
  );
};

export default PlaceAutocomplete;
