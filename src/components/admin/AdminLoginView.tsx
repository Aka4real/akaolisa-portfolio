"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Eye,
  EyeSlash,
  LockKey,
  ShieldCheck,
  TerminalWindow,
  WarningCircle,
} from "@phosphor-icons/react";
import { PROFILE } from "@/data/profile";

export interface AdminAuthStatusPayload {
  authenticated: boolean;
  username: string | null;
  expiresAt: number | null;
  viewerIp: string;
  config: {
    isProduction: boolean;
    passwordConfigured: boolean;
    secretConfigured: boolean;
    lockedOutUnconfigured: boolean;
    devFallbackActive: boolean;
    expectedUsername: string;
  };
}

interface AdminLoginViewProps {
  authStatus: AdminAuthStatusPayload;
  onAuthenticated: () => void;
}

export function AdminLoginView({
  authStatus,
  onAuthenticated,
}: AdminLoginViewProps) {
  const [username, setUsername] = useState(
    authStatus.config.expectedUsername || "admin"
  );
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting || authStatus.config.lockedOutUnconfigured) return;
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, rememberMe }),
      });

      const data = (await res.json()) as {
        authenticated?: boolean;
        error?: string;
      };

      if (!res.ok || !data.authenticated) {
        setError(data.error || "Authentication failed.");
        return;
      }

      onAuthenticated();
    } catch {
      setError("Network error while reaching /api/admin/auth.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col justify-between bg-[var(--bg-canvas)] px-4 py-8 sm:px-6">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between">
        <Link
          href="/"
          className="btn-press inline-flex items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--border-hairline)] bg-[var(--bg-surface)] px-3 py-1.5 text-xs font-medium text-[var(--ink-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--ink-primary)]"
        >
          <ArrowLeft size={14} weight="bold" aria-hidden="true" />
          Return to Portfolio
        </Link>

        <span className="font-mono text-[11px] tabular-nums text-[var(--ink-muted)]">
          Client IP: {authStatus.viewerIp}
        </span>
      </div>

      <main className="mx-auto my-8 w-full max-w-md">
        <div className="surface-elevated rounded-[var(--radius-lg)] border border-[var(--border-hairline)] p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--bg-inverse)] font-mono text-xs font-semibold text-[var(--ink-inverse)]">
              {PROFILE.monogram}
            </span>
            <div>
              <h1 className="text-lg font-semibold tracking-[-0.02em] text-[var(--ink-primary)]">
                OXAKALABS Telemetry &amp; Admin
              </h1>
              <p className="font-mono text-[11px] uppercase tracking-[0.06em] text-[var(--ink-muted)]">
                Mission Control · Restricted Access
              </p>
            </div>
          </div>

          {authStatus.config.lockedOutUnconfigured && (
            <div className="mt-6 rounded-[var(--radius-md)] border border-[var(--status-danger-border)] bg-[var(--status-danger-bg)] p-4 text-xs text-[var(--status-danger)]">
              <div className="flex items-start gap-2.5">
                <WarningCircle
                  size={16}
                  weight="bold"
                  className="mt-0.5 shrink-0"
                />
                <div className="space-y-2">
                  <p className="font-semibold">
                    Production Security Lock Active
                  </p>
                  <p className="leading-relaxed">
                    Set <code className="font-mono font-semibold">ADMIN_PASSWORD</code>{" "}
                    and{" "}
                    <code className="font-mono font-semibold">
                      ADMIN_SESSION_SECRET
                    </code>{" "}
                    in your deployment environment (Vercel / Coolify / Docker)
                    before accessing Mission Control in production.
                  </p>
                </div>
              </div>
            </div>
          )}

          {authStatus.config.devFallbackActive && (
            <div className="mt-6 rounded-[var(--radius-md)] border border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] p-3.5 text-xs text-[var(--status-warning)]">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="font-semibold">Local Development Fallback</p>
                  <p className="leading-relaxed text-[var(--ink-secondary)]">
                    <code className="font-mono">ADMIN_PASSWORD</code> is not set
                    in <code className="font-mono">.env.local</code>. Local dev
                    passphrase:{" "}
                    <code className="font-mono font-semibold text-[var(--ink-primary)]">
                      oxakalabs-dev-admin
                    </code>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPassword("oxakalabs-dev-admin")}
                  className="btn-press shrink-0 rounded-[var(--radius-xs)] border border-[var(--status-warning-border)] bg-[var(--bg-surface)] px-2.5 py-1 font-mono text-[11px] font-medium text-[var(--status-warning)] hover:bg-[var(--status-warning)] hover:text-white"
                >
                  Autofill
                </button>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label
                htmlFor="admin-username"
                className="mb-1.5 block font-mono text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--ink-secondary)]"
              >
                Admin Username
              </label>
              <input
                id="admin-username"
                type="text"
                autoComplete="username"
                required
                disabled={authStatus.config.lockedOutUnconfigured}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3.5 py-2.5 text-sm text-[var(--ink-primary)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-ring)] focus:outline-none disabled:opacity-50"
              />
            </div>

            <div>
              <label
                htmlFor="admin-password"
                className="mb-1.5 block font-mono text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--ink-secondary)]"
              >
                Passphrase
              </label>
              <div className="relative">
                <input
                  id="admin-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  disabled={authStatus.config.lockedOutUnconfigured}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter admin passphrase"
                  className="w-full rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--bg-surface)] py-2.5 pr-10 pl-3.5 text-sm text-[var(--ink-primary)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-ring)] focus:outline-none disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? "Hide passphrase" : "Show passphrase"}
                  className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded p-1 text-[var(--ink-muted)] hover:text-[var(--ink-primary)]"
                >
                  {showPassword ? <EyeSlash size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <label className="flex cursor-pointer items-center gap-2 text-xs text-[var(--ink-secondary)]">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-[var(--border-strong)] accent-[var(--accent)]"
              />
              <span>Keep signed in on this device for 7 days</span>
            </label>

            {error && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-[var(--radius-sm)] border border-[var(--status-danger-border)] bg-[var(--status-danger-bg)] px-3 py-2.5 text-xs text-[var(--status-danger)]"
              >
                <WarningCircle
                  size={15}
                  weight="bold"
                  className="mt-0.5 shrink-0"
                />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={
                submitting ||
                authStatus.config.lockedOutUnconfigured ||
                !password
              }
              className="btn-press flex w-full items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-[var(--bg-inverse)] px-4 py-2.5 text-sm font-medium text-[var(--ink-inverse)] hover:bg-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <LockKey size={16} weight="bold" aria-hidden="true" />
              {submitting ? "Verifying session..." : "Unlock Mission Control"}
            </button>
          </form>

          <div className="mt-6 flex items-center justify-between border-t border-[var(--border-hairline)] pt-4 font-mono text-[10.5px] text-[var(--ink-muted)]">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck size={13} className="text-[var(--status-positive)]" />
              HMAC-SHA256 HttpOnly Cookie
            </span>
            <span className="inline-flex items-center gap-1">
              <TerminalWindow size={12} />
              Audit Logged
            </span>
          </div>
        </div>
      </main>

      <footer className="mx-auto flex w-full max-w-5xl items-center justify-between font-mono text-[11px] text-[var(--ink-muted)]">
        <span>{PROFILE.legalName} · OXAKALABS Observability</span>
        <span>noindex · no-store</span>
      </footer>
    </div>
  );
}
