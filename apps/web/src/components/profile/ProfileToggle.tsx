'use client';

type Props = {
  label: string;
  description?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
};

export function ProfileToggle({ label, description, checked, disabled, onChange }: Props) {
  return (
    <label className={`profile-toggle ${disabled ? 'profile-toggle--disabled' : ''}`}>
      <span className="profile-toggle__text">
        <span className="profile-toggle__label">{label}</span>
        {description && <span className="profile-toggle__desc">{description}</span>}
      </span>
      <span className="profile-toggle__control">
        <input
          type="checkbox"
          className="profile-toggle__input"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className="profile-toggle__track" aria-hidden />
      </span>
    </label>
  );
}
