// Address autocomplete using the new google.maps.places.PlaceAutocompleteElement
// web component. The legacy google.maps.places.Autocomplete class is not
// available to GCP projects created after 2025-03-01, so we use this one.
//
// The new element is a Custom Element with shadow DOM that draws its own
// input + suggestion dropdown. We give it a className so it inherits our
// .input-modern styling; the dropdown panel is styled by Google.
//
// Events:
// - "gmp-select" fires when the user picks a suggestion. We resolve the
//   Place reference into formattedAddress + location and pass that up.

import { useEffect, useRef } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';

const PlaceAutocomplete = ({
  onPlaceSelected,         // ({ address, lat, lng }) — fired when user picks a suggestion
  onTextChange,            // (text) — fired as the user types
  placeholder = 'Start typing an address…',
  className = 'input-modern',
  style
}) => {
  const containerRef = useRef(null);
  const elementRef = useRef(null);
  const places = useMapsLibrary('places');

  useEffect(() => {
    if (!places || !containerRef.current) return;

    // PlaceAutocompleteElement uses `includedRegionCodes` (array of ISO
    // 3166-1 Alpha-2), not the legacy `componentRestrictions.country`.
    const el = new places.PlaceAutocompleteElement({
      includedRegionCodes: ['ke']
    });
    el.className = className;
    if (style) Object.assign(el.style, style);

    containerRef.current.replaceChildren(el);
    elementRef.current = el;

    const onSelect = async (event) => {
      try {
        const place = event.placePrediction.toPlace();
        await place.fetchFields({ fields: ['displayName', 'formattedAddress', 'location'] });
        const address = place.formattedAddress || place.displayName || '';
        onPlaceSelected?.({
          address,
          lat: place.location.lat(),
          lng: place.location.lng()
        });
        onTextChange?.(address);
      } catch (err) {
        console.error('PlaceAutocomplete select error:', err);
      }
    };

    // The web component bubbles 'input' events from its internal text field.
    const onInput = (event) => {
      const v = event.target?.value ?? '';
      onTextChange?.(v);
    };

    el.addEventListener('gmp-select', onSelect);
    el.addEventListener('input', onInput);

    return () => {
      el.removeEventListener('gmp-select', onSelect);
      el.removeEventListener('input', onInput);
      el.remove();
      elementRef.current = null;
    };
  }, [places, onPlaceSelected, onTextChange, className, style]);

  return <div ref={containerRef} data-placeholder={placeholder} style={{ width: '100%' }} />;
};

export default PlaceAutocomplete;
