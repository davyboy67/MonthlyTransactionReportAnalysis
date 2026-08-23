import { useSyncExternalStore } from 'react';
import { Sun, Moon, Desktop } from '@phosphor-icons/react';
import {
  getPreference,
  setPreference,
  subscribe,
  type ThemePreference,
} from '../../../theme/themeStore';

const OPTIONS: Array<{
  value: ThemePreference;
  label: string;
  Icon: typeof Sun;
}> = [
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'dark', label: 'Dark', Icon: Moon },
  { value: 'system', label: 'System', Icon: Desktop },
];

/**
 * Three-way theme control. Lives inside the account menu rather than the topbar
 * so it costs no layout and stays out of the way of the daily read.
 */
export function ThemeControl() {
  const preference = useSyncExternalStore(subscribe, getPreference, () => 'light' as ThemePreference);

  return (
    <div className="dashboard__theme">
      <span className="dashboard__theme-label" id="theme-control-label">
        Theme
      </span>
      <div
        className="dashboard__theme-options"
        role="group"
        aria-labelledby="theme-control-label"
      >
        {OPTIONS.map(({ value, label, Icon }) => (
          <button
            key={value}
            type="button"
            className="dashboard__theme-option"
            aria-pressed={preference === value}
            onClick={() => setPreference(value)}
          >
            <Icon size={13} aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
