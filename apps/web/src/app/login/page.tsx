import { Suspense } from "react";
import { BrandMark } from "@/components/brand-mark";
import { LoginForm } from "@/components/login-form";

export const metadata = { title: "Sign in" };

export default function LoginPage() {
  return <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[#eae5da] px-5 py-12"><div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_15%,rgba(189,166,109,.24),transparent_32%),radial-gradient(circle_at_12%_85%,rgba(18,55,47,.12),transparent_35%)]" /><div className="relative w-full max-w-md"><div className="flex justify-center"><BrandMark /></div><div className="mt-10 text-center"><p className="eyebrow">Secure workspace</p><h1 className="mt-3 font-display text-5xl font-semibold tracking-[-.04em]">Welcome back.</h1><p className="mt-3 text-sm leading-6 text-ink/50">Sign in to your Gemjar account or operational workspace.</p></div><Suspense><LoginForm /></Suspense></div></main>;
}
