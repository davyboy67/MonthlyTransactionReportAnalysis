import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { apiClient } from "@transaction-report/shared";
import type { InvitePreview } from "@transaction-report/shared";
import { Surface } from "../../atoms/surface/Surface";
import "./AcceptInvitePage.css";

interface AcceptInvitePageProps {
  token: string;
  onAccepted: () => void;
  onCancel: () => void;
}

const MIN_PASSWORD_LENGTH = 12;

export function AcceptInvitePage({ token, onAccepted, onCancel }: AcceptInvitePageProps) {
  const [invite, setInvite] = useState<InvitePreview | null>(null);
  const [checking, setChecking] = useState(true);
  const [invalidReason, setInvalidReason] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    apiClient
      .validateInvite(token)
      .then((preview) => {
        if (!cancelled) setInvite(preview);
      })
      .catch((err) => {
        if (cancelled) return;
        const message = (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error;
        setInvalidReason(message ?? "This invite link is not valid");
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const longEnough = password.length >= MIN_PASSWORD_LENGTH;
  const matches = password === confirm;
  const canSubmit = longEnough && matches && !submitting;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await apiClient.redeemInvite(token, password);
      onAccepted();
    } catch (err) {
      const message = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(message ?? "Could not set up your account");
      setSubmitting(false);
    }
  };

  return (
    <main className="accept-invite-page">
      <Surface className="accept-invite-card">
        {checking && <p className="accept-invite-card__subtitle">Checking your invite…</p>}

        {!checking && invalidReason && (
          <>
            <h1 className="accept-invite-card__title">Invite unavailable</h1>
            <p className="accept-invite-card__subtitle">{invalidReason}</p>
            <button className="tab-ghost-btn" onClick={onCancel}>
              Back to sign in
            </button>
          </>
        )}

        {!checking && invite && (
          <>
            <h1 className="accept-invite-card__title">Hi {invite.firstName}</h1>
            <p className="accept-invite-card__subtitle">
              Choose a password to finish setting up your account.
            </p>

            <p className="accept-invite-card__email">{invite.email}</p>

            <form className="accept-invite-card__form" onSubmit={handleSubmit}>
              <label className="accept-invite-card__label">
                Password
                <input
                  type="password"
                  className="accept-invite-card__input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  autoFocus
                />
              </label>

              <label className="accept-invite-card__label">
                Confirm password
                <input
                  type="password"
                  className="accept-invite-card__input"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                />
              </label>

              <p className="accept-invite-card__hint">
                {!longEnough
                  ? `At least ${MIN_PASSWORD_LENGTH} characters.`
                  : !matches
                    ? "Both passwords must match."
                    : "Looks good."}
              </p>

              {error && <div className="tab-error-text">{error}</div>}

              <button
                type="submit"
                className="tab-primary-btn accept-invite-card__submit"
                disabled={!canSubmit}
              >
                {submitting ? "Setting up…" : "Create account"}
              </button>
            </form>
          </>
        )}
      </Surface>
    </main>
  );
}
