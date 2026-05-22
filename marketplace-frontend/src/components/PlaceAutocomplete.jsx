// Address autocomplete using the new google.maps.places.PlaceAutocompleteElement
// web component. The legacy google.maps.places.Autocomplete class is not
// available to GCP projects created after 2025-03-01, so we use this one.
//
// Important: the element is created exactly once (when the Places library
// loads) and never recreated. If the callbacks were in the useEffect deps,
// every parent re-render would unmount and remount the element — and since
// each keystroke fires onTextChange → parent setState → re-render, that
// would make typing wipe the input. We use refs to read the latest
// callbacks without making them dependencies.

import { useEffect, useRef } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';

const PlaceAutocomplete = ({
  onPlaceSelected,         // ({ address, lat, lng })
  onTextChange,            // (text)
  placeholder = 'Start typing an address…',
  className = 'input-modern',
  style
}) => {
  const containerRef = useRef(null);
  const elementRef = useRef(null);
  const places = useMapsLibrary('places');

  // Latest-ref pattern: the element binds to these once, but always sees
  // the current parent callbacks via the ref's `.current`.
  const onPlaceSelectedRef = useRef(onPlaceSelected);
  const onTextChangeRef = useRef(onTextChange);
  onPlaceSelectedRef.current = onPlaceSelected;
  onTextChangeRef.current = onTextChange;

  useEffect(() => {
    if (!places || !containerRef.current) return;

    // PlaceAutocompleteElement uses `includedRegionCodes` (ISO 3166-1 Alpha-2),
    // not the legacy `componentRestrictions.country`.
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
        onPlaceSelectedRef.current?.({
          address,
          lat: place.location.lat(),
          lng: place.location.lng()
        });
        onTextChangeRef.current?.(address);
      } catch (err) {
        console.error('PlaceAutocomplete select error:', err);
      }
    };

    const onInput = (event) => {
      const v = event.target?.value ?? '';
      onTextChangeRef.current?.(v);
    };

    el.addEventListener('gmp-select', onSelect);
    el.addEventListener('input', onInput);

    return () => {
      el.removeEventListener('gmp-select', onSelect);
      el.removeEventListener('input', onInput);
      el.remove();
      elementRef.current = null;
    };
    // NOTE: deliberately not depending on the callbacks or className/style —
    // the element should be created once when the Places lib resolves and
    // live for the component's lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [places]);

  return <div ref={containerRef} data-placeholder={placeholder} style={{ width: '100%' }} />;
};

export default PlaceAutocomplete;
