'use client';

import {
  areasForUsState,
  formatUsAreaLocation,
  neighborhoodsForUsArea,
  parseUsAreaLocation,
  US_STATE_CODES,
  usStateLabel,
  type UsStateCode,
} from '@buyseekk/shared';
import { useT } from '@/lib/i18n';

type Props = {
  category: 'AUTOS' | 'INMOBILIARIA' | string;
  location: string;
  zone: string;
  onLocationChange: (location: string) => void;
  onZoneChange: (zone: string) => void;
  className?: string;
};

function parseValue(location: string, zone: string) {
  const parsed = parseUsAreaLocation(location);
  const state = parsed?.state ?? 'FL';
  const areas = areasForUsState(state);
  const area = parsed?.area ?? areas[0] ?? 'Miami';
  const neighborhoods = neighborhoodsForUsArea(state, area);
  const neighborhood = zone || neighborhoods[0] || '';
  return { state, area, neighborhood };
}

export function UsLocationPicker({
  category,
  location,
  zone,
  onLocationChange,
  onZoneChange,
  className = '',
}: Props) {
  const t = useT();
  const isAuto = category === 'AUTOS';
  const value = parseValue(location, zone);
  const areas = areasForUsState(value.state);
  const neighborhoods = neighborhoodsForUsArea(value.state, value.area);
  const showNeighborhood = !isAuto && neighborhoods.length > 0;

  function updateState(state: UsStateCode) {
    const nextAreas = areasForUsState(state);
    const nextArea = nextAreas[0] ?? '';
    onLocationChange(formatUsAreaLocation(state, nextArea));
    if (!isAuto) {
      onZoneChange(neighborhoodsForUsArea(state, nextArea)[0] ?? '');
    } else {
      onZoneChange('');
    }
  }

  function updateArea(area: string) {
    onLocationChange(formatUsAreaLocation(value.state, area));
    if (!isAuto) {
      onZoneChange(neighborhoodsForUsArea(value.state, area)[0] ?? '');
    } else {
      onZoneChange('');
    }
  }

  return (
    <div className={`us-location-picker ${className}`.trim()}>
      <label className="block">
        <span className="text-xs font-semibold text-slate-600">{t('request.state')} *</span>
        <select
          className="input mt-1 w-full"
          value={value.state}
          onChange={(e) => updateState(e.target.value as UsStateCode)}
        >
          {US_STATE_CODES.map((code) => (
            <option key={code} value={code}>
              {usStateLabel(code)}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="text-xs font-semibold text-slate-600">{t('request.area')} *</span>
        <select
          className="input mt-1 w-full"
          value={value.area}
          onChange={(e) => updateArea(e.target.value)}
        >
          {areas.map((area) => (
            <option key={area} value={area}>
              {area}
            </option>
          ))}
        </select>
      </label>

      {showNeighborhood && (
        <label className="block">
          <span className="text-xs font-semibold text-slate-600">{t('request.neighborhood')} *</span>
          <select
            className="input mt-1 w-full"
            value={value.neighborhood}
            onChange={(e) => onZoneChange(e.target.value)}
          >
            {neighborhoods.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
      )}

      {isAuto && (
        <p className="us-location-picker__hint text-xs text-slate-500">{t('request.autoAreaHint')}</p>
      )}
    </div>
  );
}
