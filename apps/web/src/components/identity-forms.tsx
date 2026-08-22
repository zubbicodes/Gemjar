"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
const API_URL = process.env.NEXT_PUBLIC_API_URL || "/api/v1";
async function post(path: string, payload: unknown) {
  const response = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(
      Array.isArray(body.message)
        ? body.message.join(". ")
        : body.message || "Request failed",
    );
  return body;
}
export function RegistrationForm() {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const body = await post(
        "/auth/register",
        Object.fromEntries(new FormData(event.currentTarget)),
      );
      setMessage(
        body.verificationToken
          ? `Account created. Development verification token: ${body.verificationToken}`
          : "Account created. Check your email to verify it.",
      );
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Registration failed");
    }
  }
  return (
    <Identity
      title="Create your Gemjar account"
      message={message}
      error={error}
    >
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <input
          className="field"
          name="firstName"
          placeholder="First name"
          required
        />
        <input
          className="field"
          name="lastName"
          placeholder="Last name"
          required
        />
        <input
          className="field sm:col-span-2"
          name="email"
          type="email"
          placeholder="Email"
          required
        />
        <input
          className="field sm:col-span-2"
          name="password"
          type="password"
          minLength={12}
          placeholder="Password: upper, lower, number"
          required
        />
        <Button className="sm:col-span-2" type="submit">
          Create account
        </Button>
      </form>
    </Identity>
  );
}
export function PasswordRecoveryForm() {
  const search = useSearchParams();
  const [token, setToken] = useState(search.get("token") || "");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  async function request(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const body = await post(
        "/auth/password/forgot",
        Object.fromEntries(new FormData(event.currentTarget)),
      );
      if (body.resetToken) setToken(body.resetToken);
      setMessage("If the account exists, reset instructions were sent.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Request failed");
    }
  }
  async function reset(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await post(
        "/auth/password/reset",
        Object.fromEntries(new FormData(event.currentTarget)),
      );
      setMessage("Password reset. You can sign in now.");
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Reset failed");
    }
  }
  return (
    <Identity title="Reset your password" message={message} error={error}>
      {!token ? (
        <form onSubmit={request} className="space-y-4">
          <input
            className="field"
            name="email"
            type="email"
            placeholder="Email"
            required
          />
          <Button className="w-full" type="submit">
            Send reset instructions
          </Button>
        </form>
      ) : (
        <form onSubmit={reset} className="space-y-4">
          <input type="hidden" name="token" value={token} />
          <input
            className="field"
            name="password"
            type="password"
            minLength={12}
            placeholder="New password"
            required
          />
          <Button className="w-full" type="submit">
            Reset password
          </Button>
        </form>
      )}
    </Identity>
  );
}
export function EmailVerificationForm() {
  const search = useSearchParams();
  const [token, setToken] = useState(search.get("token") || "");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  async function verify(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await post("/auth/email/verify", { token });
      setMessage("Email verified. You can now sign in.");
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Verification failed");
    }
  }
  return (
    <Identity title="Verify your email" message={message} error={error}>
      <form onSubmit={verify} className="space-y-4">
        <input
          className="field font-mono"
          value={token}
          onChange={(event) => setToken(event.target.value)}
          placeholder="Verification token"
          required
        />
        <Button className="w-full" type="submit">
          Verify email
        </Button>
      </form>
    </Identity>
  );
}
function Identity({
  title,
  message,
  error,
  children,
}: {
  title: string;
  message: string;
  error: string;
  children: React.ReactNode;
}) {
  return (
    <main className="grid min-h-screen place-items-center bg-mist px-5 py-16">
      <section className="surface w-full max-w-lg p-7">
        <Link href="/" className="font-display text-2xl font-semibold">
          Gemjar
        </Link>
        <h1 className="mt-8 font-display text-4xl font-semibold">{title}</h1>
        {message && (
          <p className="my-4 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800">
            {message}
          </p>
        )}
        {error && (
          <p
            role="alert"
            className="my-4 rounded-xl bg-rose-50 p-3 text-xs text-rose-800"
          >
            {error}
          </p>
        )}
        <div className="mt-6">{children}</div>
        <Link
          className="mt-6 block text-center text-xs font-bold text-forest underline"
          href="/login"
        >
          Back to sign in
        </Link>
      </section>
    </main>
  );
}
