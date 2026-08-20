'use client';

import {
  launchCityLocationsForUsState,
  launchStatesForUsRequests,
  neighborhoodsForUsArea,
  parseUsAreaLocation,
  sanitizeUsLocationSelection,
  usStateLabel,
  type UsStateCode,
} from '@buyseekk/shared';
import { useT } from '@/lib/i18n';

type Props = {
  mode?: 'form' | 'filter';
  location: string;
  zone: string;
  state?: string;
  onLocationChange: (location: string) => void;
  onZoneChange: (zone: string) => void;
  onStateChange?: (state: string) => void;
  className?: string;
};

export function UsLocationPicker({
  mode = 'form',
  location,
  zone,
  state: stateProp,
  onLocationChange,
  onZoneChange,
  onStateChange,
  className = '',
}: Props) {
  const t = useT();
  const allowEmpty = mode === 'filter';
  const parsedProp = parseUsAreaLocation(location);
  const sanitized = sanitizeUsLocationSelection(
    {
      state: stateProp || parsedProp?.state || (allowEmpty ? '' : 'FL'),
      location,
      zone,
    },
    { allowEmpty },
  );
  const state = sanitized.state as UsStateCode | '';
  const cities = state ? launchCityLocationsForUsState(state) : [];
  const selectedLocation = sanitized.location || location;
  const selectedCity = parseUsAreaLocation(selectedLocation)?.area ?? '';
  const areas =
    state && selectedCity ? [...neighborhoodsForUsArea(state as UsStateCode, selectedCity)] : [];
  const cityDisabled = allowEmpty && !state;
  const areaDisabled = allowEmpty && !selectedLocation;

  function updateState(nextState: string) {
    if (!nextState) {
      onStateChange?.('');
      onLocationChange('');
      onZoneChange('');
      return;
    }
    const firstCity = allowEmpty ? '' : launchCityLocationsForUsState(nextState)[0] ?? '';
    const clean = sanitizeUsLocationSelection(
      { state: nextState, location: firstCity, zone: '' },
      { allowEmpty },
    );
    onStateChange?.(clean.state);
    onLocationChange(clean.location);
    onZoneChange(clean.zone);
  }

  function updateCity(nextLocation: string) {
    const clean = sanitizeUsLocationSelection(
      { state: sanitized.state, location: nextLocation, zone: '' },
      { allowEmpty },
    );
    if (onStateChange && clean.state !== sanitized.state) onStateChange(clean.state);
    onLocationChange(clean.location);
    onZoneChange(clean.zone);
  }

  function updateZone(nextZone: string) {
    const clean = sanitizeUsLocationSelection(
      { state: sanitized.state, location: selectedLocation, zone: nextZone },
      { allowEmpty },
    );
    if (clean.location !== location) onLocationChange(clean.location);
    onZoneChange(clean.zone);
  }

  return (
    <div className={`us-location-picker${className ? ` ${className}` : ''}`}>
      <label className="us-location-picker__field">
        <span className="us-location-picker__label">{t('request.state')}{mode === 'form' ? ' *' : ''}</span>
        <select
          className="input us-location-picker__select"
          value={sanitized.state}
          onChange={(e) => updateState(e.target.value)}
        >
          {allowEmpty && <option value="">{t('seller.allStates')}</option>}
          {launchStatesForUsRequests().map((code) => (
            <option key={code} value={code}>
              {usStateLabel(code)}
            </option>
          ))}
        </select>
      </label>

      <label className="us-location-picker__field">
        <span className="us-location-picker__label">{t('request.city')}{mode === 'form' ? ' *' : ''}</span>
        <select
          className="input us-location-picker__select"
          value={selectedLocation}
          disabled={cityDisabled}
          onChange={(e) => updateCity(e.target.value)}
        >
          {allowEmpty && <option value="">{t('seller.allCities')}</option>}
          {cities.map((city) => {
            const parsedCity = parseUsAreaLocation(city);
            return (
              <option key={city} value={city}>
                {parsedCity?.area ?? city}
              </option>
            );
          })}
        </select>
      </label>

      <label className="us-location-picker__field">
        <span className="us-location-picker__label">{t('request.zone')}{mode === 'form' ? ' *' : ''}</span>
        <select
          className="input us-location-picker__select"
          value={sanitized.zone}
          disabled={areaDisabled}
          onChange={(e) => updateZone(e.target.value)}
        >
          {allowEmpty ? (
            <option value="">{t('seller.allZones')}</option>
          ) : (
            <option value="">{t('request.anyArea')}</option>
          )}
          {areas.map((area) => (
            <option key={area} value={area}>
              {area}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
