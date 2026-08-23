import { useState } from "react";
import type { FormEvent } from "react";
import { apiClient } from "@transaction-report/shared";
import { Surface } from "../../atoms/surface/Surface";
import "./LoginPage.css";

interface LoginPageProps {
  onLoggedIn: () => void;
}

export function LoginPage({ onLoggedIn }: LoginPageProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setSubmitting(true);
    setError(null);
    try {
      await apiClient.login(email, password);
      onLoggedIn();
    } catch {
      setError("Invalid email or password");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="login-page">
      <Surface className="login-card">
        <h1 className="login-card__title">Transaction Report</h1>
        <p className="login-card__subtitle">Sign in to view your dashboard</p>

        <form className="login-card__form" onSubmit={handleSubmit}>
          <label className="login-card__label">
            Email
            <input
              type="text"
              inputMode="email"
              spellCheck={false}
              autoCapitalize="none"
              className="login-card__input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              autoFocus
            />
          </label>

          <label className="login-card__label">
            Password
            <input
              type="password"
              className="login-card__input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </label>

          {error && (
            <div className="tab-error-text" role="alert">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="tab-primary-btn login-card__submit"
            disabled={submitting || !email || !password}
          >
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="login-card__demo-hint">
          Demo login: email <strong>admin</strong>, password <strong>admin</strong>
        </p>
      </Surface>
    </main>
  );
}
