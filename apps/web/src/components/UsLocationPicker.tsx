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
  const parsed = parseUsAreaLocation(location);
  const sanitized = sanitizeUsLocationSelection(
    {
      state: stateProp || parsed?.state || (allowEmpty ? '' : 'FL'),
      location,
      zone,
    },
    { allowEmpty },
  );
  const state = sanitized.state as UsStateCode | '';
  const cities = state ? launchCityLocationsForUsState(state) : [];
  const cityName = parsed?.area ?? '';
  const areas = state && cityName ? [...neighborhoodsForUsArea(state as UsStateCode, cityName)] : [];
  const cityDisabled = allowEmpty && !state;
  const areaDisabled = allowEmpty && !location;

  function emit(next: { state: string; location: string; zone: string }) {
    const clean = sanitizeUsLocationSelection(next, { allowEmpty });
    if (onStateChange && clean.state !== (stateProp || parsed?.state || '')) {
      onStateChange(clean.state);
    }
    if (clean.location !== location) onLocationChange(clean.location);
    if (clean.zone !== zone) onZoneChange(clean.zone);
  }

  function updateState(nextState: string) {
    if (!nextState) {
      onStateChange?.('');
      onLocationChange('');
      onZoneChange('');
      return;
    }
    const firstCity = launchCityLocationsForUsState(nextState)[0] ?? '';
    const nextLocation = allowEmpty ? '' : firstCity;
    emit({ state: nextState, location: nextLocation, zone: '' });
    onStateChange?.(nextState);
    onLocationChange(nextLocation);
    onZoneChange('');
  }

  function updateCity(nextLocation: string) {
    emit({ state: sanitized.state, location: nextLocation, zone: '' });
    onLocationChange(nextLocation);
    onZoneChange('');
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
          value={location}
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
          value={zone}
          disabled={areaDisabled}
          onChange={(e) => onZoneChange(e.target.value)}
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
