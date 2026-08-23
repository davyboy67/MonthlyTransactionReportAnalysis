import { useState } from 'react';
import { apiClient } from '@transaction-report/shared';
import { Modal } from '../../atoms/modal/Modal';

interface SettingsDialogProps {
  returnFocusTo?: React.RefObject<HTMLElement | null>;
  payDay: number;
  onSaved: (payDay: number) => void;
  onClose: () => void;
}

export function SettingsDialog({ payDay, onSaved, onClose, returnFocusTo }: SettingsDialogProps) {
  const [value, setValue] = useState(payDay);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid = value >= 1 && value <= 31;

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const profile = await apiClient.updateSettings(value);
      onSaved(profile.payDay);
      onClose();
    } catch {
      setError('Could not save your settings');
      setSaving(false);
    }
  };

  return (
    <Modal title="Settings" onClose={onClose} returnFocusTo={returnFocusTo}>
      <label className="modal-field">
        <span>Pay day of the month</span>
        <input
          type="number"
          min={1}
          max={31}
          value={value}
          onChange={event => setValue(Number(event.target.value))}
        />
      </label>

      <p className="modal-note">
        {error ?? 'Used as the default when a month has no pay day of its own.'}
      </p>

      <div className="modal-actions">
        <button className="tab-ghost-btn" onClick={onClose} disabled={saving}>
          Cancel
        </button>
        <button className="tab-primary-btn" onClick={handleSave} disabled={!valid || saving}>
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </Modal>
  );
}
