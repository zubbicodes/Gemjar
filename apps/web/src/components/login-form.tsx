"use client";

import {
  AlertCircle,
  ArrowRight,
  Check,
  Copy,
  KeyRound,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/stores/cart";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4100/api/v1";
type Mode = "credentials" | "enroll" | "verify" | "recovery";

export function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const [email, setEmail] = useState("admin@gemjar.test");
  const [password, setPassword] = useState("GemjarDemo!2026");
  const [mode, setMode] = useState<Mode>("credentials");
  const [ticket, setTicket] = useState("");
  const [secret, setSecret] = useState("");
  const [code, setCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [destination, setDestination] = useState("/admin");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function finish(fallback = destination) {
    const requested = search.get("next");
    router.push(
      requested?.startsWith("/") && !requested.startsWith("//")
        ? requested
        : fallback,
    );
    router.refresh();
  }

  async function post(path: string, payload: object) {
    const response = await fetch(`${API_URL}${path}`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await response.json();
    if (!response.ok)
      throw new Error(
        Array.isArray(body.message)
          ? body.message.join(". ")
          : body.message || "Sign in failed",
      );
    return body;
  }

  async function submitCredentials(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const body = await post("/auth/login", { email, password });
      const target =
        body.user.kind === "ADMIN"
          ? "/admin"
          : body.user.kind === "AGENT"
            ? "/agent"
            : body.user.kind === "B2B"
              ? "/trade"
              : "/account";
      setDestination(target);
      if (body.state === "AUTHENTICATED") {
        if (body.user.kind === "CONSUMER")
          await useCartStore.getState().mergeAfterLogin();
        finish(target);
        return;
      }
      if (body.state !== "MFA_REQUIRED")
        throw new Error("Unexpected authentication state");
      setTicket(body.challengeToken);
      if (body.enrollmentRequired) {
        const setup = await post("/auth/mfa/setup", {
          ticket: body.challengeToken,
        });
        setSecret(setup.secret);
        setMode("enroll");
      } else setMode("verify");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Sign in failed");
    } finally {
      setBusy(false);
    }
  }

  async function submitCode(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const body = await post(
        mode === "enroll" ? "/auth/mfa/confirm" : "/auth/mfa/verify",
        { ticket, code },
      );
      if (body.recoveryCodes?.length) {
        setRecoveryCodes(body.recoveryCodes);
        setMode("recovery");
      } else {
        if (body.user?.kind === "CONSUMER")
          await useCartStore.getState().mergeAfterLogin();
        finish();
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Verification failed");
    } finally {
      setBusy(false);
    }
  }

  if (mode === "recovery")
    return (
      <div className="surface mt-8 p-6 text-left sm:p-8">
        <div className="grid size-11 place-items-center rounded-full bg-emerald-100 text-emerald-800">
          <Check className="size-5" />
        </div>
        <h2 className="mt-5 font-display text-3xl font-semibold">
          Save your recovery codes
        </h2>
        <p className="mt-2 text-xs leading-5 text-ink/50">
          Each code works once if your authenticator is unavailable. Store them
          in a password manager; they will not be shown again.
        </p>
        <div className="mt-5 grid grid-cols-2 gap-2 rounded-2xl bg-ink/[.04] p-4 font-mono text-xs">
          {recoveryCodes.map((recoveryCode) => (
            <span key={recoveryCode}>{recoveryCode}</span>
          ))}
        </div>
        <Button className="mt-6 w-full" size="lg" onClick={() => finish()}>
          I have saved these codes <ArrowRight className="size-4" />
        </Button>
      </div>
    );

  if (mode === "enroll" || mode === "verify")
    return (
      <form onSubmit={submitCode} className="surface mt-8 p-6 text-left sm:p-8">
        <div className="grid size-11 place-items-center rounded-full bg-forest/10 text-forest">
          <ShieldCheck className="size-5" />
        </div>
        <h2 className="mt-5 font-display text-3xl font-semibold">
          {mode === "enroll" ? "Protect this account" : "Two-step verification"}
        </h2>
        <p className="mt-2 text-xs leading-5 text-ink/50">
          {mode === "enroll"
            ? "Add the secret below to Google Authenticator, Microsoft Authenticator, 1Password or another TOTP app."
            : "Enter the six-digit code from your authenticator, or use one of your recovery codes."}
        </p>
        {mode === "enroll" && (
          <div className="mt-5 rounded-2xl border border-forest/15 bg-forest/[.035] p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-ink/40">
              Manual setup secret
            </p>
            <div className="mt-2 flex items-center gap-2">
              <code className="min-w-0 flex-1 break-all text-xs font-bold tracking-wider">
                {secret}
              </code>
              <button
                type="button"
                className="grid size-9 shrink-0 place-items-center rounded-full bg-white"
                onClick={async () => {
                  await navigator.clipboard.writeText(secret);
                  setCopied(true);
                }}
                aria-label="Copy setup secret"
              >
                {copied ? (
                  <Check className="size-4 text-emerald-700" />
                ) : (
                  <Copy className="size-4" />
                )}
              </button>
            </div>
          </div>
        )}
        <label className="mt-5 block text-xs font-bold">
          Authenticator or recovery code
          <input
            className="field mt-2 font-mono tracking-[.18em]"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            minLength={6}
            maxLength={20}
            required
            autoFocus
          />
        </label>
        {error && <ErrorMessage message={error} />}
        <Button className="mt-6 w-full" size="lg" disabled={busy}>
          <KeyRound className="size-4" />
          {busy
            ? "Verifying…"
            : mode === "enroll"
              ? "Enable MFA"
              : "Verify and continue"}
          <ArrowRight className="size-4" />
        </Button>
        <button
          type="button"
          onClick={() => {
            setMode("credentials");
            setCode("");
            setError("");
          }}
          className="mt-4 w-full text-center text-[10px] font-bold text-ink/45"
        >
          Use a different account
        </button>
      </form>
    );

  return (
    <form
      onSubmit={submitCredentials}
      className="surface mt-8 p-6 text-left sm:p-8"
    >
      <label className="text-xs font-bold">
        Email address
        <input
          className="field mt-2"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </label>
      <label className="mt-5 block text-xs font-bold">
        Password
        <input
          className="field mt-2"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </label>
      {error && <ErrorMessage message={error} />}
      <Button className="mt-6 w-full" size="lg" disabled={busy}>
        <LockKeyhole className="size-4" />
        {busy ? "Signing in…" : "Sign in securely"}
        <ArrowRight className="size-4" />
      </Button>
      <p className="mt-4 text-center text-[10px] leading-4 text-ink/38">
        Demonstration credentials are pre-filled. If this environment enforces
        multi-factor authentication, privileged accounts are asked to enrol an
        authenticator on first sign-in.
      </p>
      <div className="mt-4 flex justify-center gap-4 text-xs font-bold text-forest">
        <a href="/register">Create account</a>
        <a href="/forgot-password">Forgot password?</a>
      </div>
    </form>
  );
}

function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="mt-5 flex gap-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-800">
      <AlertCircle className="size-4 shrink-0" />
      {message}
    </div>
  );
}
