import { useState } from 'react';
import { apiClient, formatLongDate } from '@transaction-report/shared';
import { Modal } from '../../atoms/modal/Modal';
import './InviteDialog.css';

interface InviteDialogProps {
  returnFocusTo?: React.RefObject<HTMLElement | null>;
  onClose: () => void;
}

interface GeneratedInvite {
  link: string;
  email: string;
  expiresAt: string;
}

export function InviteDialog({ onClose, returnFocusTo }: InviteDialogProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generated, setGenerated] = useState<GeneratedInvite | null>(null);
  const [copied, setCopied] = useState(false);

  const canCreate = Boolean(firstName.trim() && lastName.trim() && email.trim());

  const handleCreate = async () => {
    setCreating(true);
    setError(null);
    try {
      const invite = await apiClient.createInvite(email.trim(), firstName.trim(), lastName.trim());
      setGenerated({
        link: `${window.location.origin}${import.meta.env.BASE_URL}?invite=${invite.token}`,
        email: email.trim().toLowerCase(),
        expiresAt: invite.expiresAt,
      });
    } catch (err) {
      const message = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(message ?? 'Could not create the invite link');
      setCreating(false);
    }
  };

  const handleCopy = async () => {
    if (!generated) return;
    try {
      await navigator.clipboard.writeText(generated.link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Could not copy. Select the link and copy it manually');
    }
  };

  if (generated) {
    return (
      <Modal title="Invite link ready" onClose={onClose} returnFocusTo={returnFocusTo}>
        <label className="invite-dialog__field">
          <span>Send this link</span>
          <input
            type="text"
            className="invite-dialog__input"
            value={generated.link}
            readOnly
            onFocus={event => event.currentTarget.select()}
          />
        </label>

        <p className="modal-note">
          Expires {formatLongDate(generated.expiresAt)}. Anyone with this link can
          create an account. Send it only to {generated.email}.
        </p>

        {error && <div className="tab-error-text">{error}</div>}

        <div className="modal-actions">
          <button className="tab-ghost-btn" onClick={onClose}>
            Done
          </button>
          <button className="tab-primary-btn" onClick={handleCopy}>
            {copied ? 'Copied' : 'Copy link'}
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title="Invite someone" onClose={onClose} returnFocusTo={returnFocusTo}>
      <label className="invite-dialog__field">
        <span>First name</span>
        <input
          type="text"
          className="invite-dialog__input"
          value={firstName}
          onChange={event => setFirstName(event.target.value)}
          autoFocus
        />
      </label>

      <label className="invite-dialog__field">
        <span>Last name</span>
        <input
          type="text"
          className="invite-dialog__input"
          value={lastName}
          onChange={event => setLastName(event.target.value)}
        />
      </label>

      <label className="invite-dialog__field">
        <span>Email</span>
        <input
          type="email"
          className="invite-dialog__input"
          value={email}
          onChange={event => setEmail(event.target.value)}
        />
      </label>

      <p className="modal-note">
        {error ?? 'They set their own password when they open the link. It expires in 72 hours.'}
      </p>

      <div className="modal-actions">
        <button className="tab-ghost-btn" onClick={onClose} disabled={creating}>
          Cancel
        </button>
        <button className="tab-primary-btn" onClick={handleCreate} disabled={!canCreate || creating}>
          {creating ? 'Creating…' : 'Create link'}
        </button>
      </div>
    </Modal>
  );
}
