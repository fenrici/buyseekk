'use client';

import {
  areasForUsState,
  formatUsAreaLocation,
  parseUsAreaLocation,
  US_STATE_CODES,
  usStateLabel,
  type UsStateCode,
} from '@buyseekk/shared';
import { useT } from '@/lib/i18n';

type Props = {
  value: string;
  onChange: (value: string) => void;
};

export function UsLocationFields({ value, onChange }: Props) {
  const t = useT();
  const parsed = parseUsAreaLocation(value);
  const state = parsed?.state ?? 'FL';
  const area = parsed?.area ?? areasForUsState(state)[0] ?? 'Miami';

  function updateState(nextState: UsStateCode) {
    const nextArea = areasForUsState(nextState)[0] ?? area;
    onChange(formatUsAreaLocation(nextState, nextArea));
  }

  function updateArea(nextArea: string) {
    onChange(formatUsAreaLocation(state, nextArea));
  }

  return (
    <div className="profile-field-grid">
      <div className="profile-field">
        <label htmlFor="profile-state">{t('profile.state')}</label>
        <select
          id="profile-state"
          className="input"
          value={state}
          onChange={(e) => updateState(e.target.value as UsStateCode)}
        >
          {US_STATE_CODES.map((code) => (
            <option key={code} value={code}>
              {usStateLabel(code)}
            </option>
          ))}
        </select>
      </div>
      <div className="profile-field">
        <label htmlFor="profile-area">{t('profile.area')}</label>
        <select id="profile-area" className="input" value={area} onChange={(e) => updateArea(e.target.value)}>
          {areasForUsState(state).map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
