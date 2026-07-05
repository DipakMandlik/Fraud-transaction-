import { isAxiosError } from "axios";
import {
  ChevronDown,
  Eye,
  EyeOff,
  User,
  Lock,
  ShieldCheck,
  Zap,
  Copy,
  Check,
  Loader2,
  Code2,
} from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";

import { AuthBackground } from "@/components/layout/AuthBackground";
import { LoadingScreen } from "@/components/layout/LoadingScreen";
import { useAuth } from "@/hooks/useAuth";
import { API_BASE_URL } from "@/lib/api";
import { cn } from "@/lib/utils";

const MARK = `${import.meta.env.BASE_URL}pibythree-mark.png`;

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState(() => localStorage.getItem("remember_username") ?? "admin");
  const [password, setPassword] = useState("admin");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(() => !!localStorage.getItem("remember_username"));
  const [showCredentials, setShowCredentials] = useState(true);
  const [showApi, setShowApi] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setLoading(true);
    try {
      await login(username, password);
      if (remember) localStorage.setItem("remember_username", username);
      else localStorage.removeItem("remember_username");
      sessionStorage.setItem("justLoggedIn", "1");
      setInitializing(true);
      window.setTimeout(() => navigate("/", { replace: true }), 1400);
    } catch (err) {
      if (isAxiosError(err)) {
        if (err.response?.status === 401) {
          setError("Invalid username or password. Please try again.");
        } else if (!err.response) {
          setError("Could not reach the server. It may still be waking up — please try again in a moment.");
        } else {
          setError(`Sign-in failed (${err.response.status}): ${err.response.data?.detail ?? "please try again."}`);
        }
      } else {
        setError("Something went wrong. Please try again.");
      }
      setLoading(false);
    }
  }

  function useDemo() {
    setUsername("admin");
    setPassword("admin");
    setError(null);
    setNotice(null);
  }

  async function copyApi() {
    try {
      await navigator.clipboard.writeText(API_BASE_URL);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable — ignore */
    }
  }

  if (initializing) return <LoadingScreen />;

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden text-white">
      <AuthBackground />

      {/* Top brand bar */}
      <header className="relative z-10 flex items-center justify-between px-5 py-5 sm:px-8">
        <div className="flex flex-col">
          <img src={MARK} alt="PiByThree" className="h-9 w-auto object-contain sm:h-10" />
          <span className="mt-1 text-[10px] font-semibold tracking-wide text-sky-200/80 sm:text-xs">
            Transforming Enterprises for Future
          </span>
        </div>
        <div className="hidden items-center gap-2.5 text-right sm:flex">
          <ShieldCheck className="h-6 w-6 text-sky-300" />
          <div className="leading-tight">
            <p className="text-sm font-semibold text-white">Secure. Detect. Prevent.</p>
            <p className="text-xs text-sky-200/70">
              Protect <span className="font-semibold text-sky-300">What Matters.</span>
            </p>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-6">
        <div className="flex w-full max-w-5xl flex-col items-center gap-6 xl:flex-row xl:items-stretch xl:justify-center">
          {/* Sign-in card */}
          <div className="w-full max-w-md rounded-2xl bg-white p-7 shadow-2xl sm:p-9">
            <div className="mb-6 flex flex-col items-center text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-blue-500 shadow-lg shadow-blue-500/30">
                <ShieldCheck className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900">Investigator Sign In</h1>
              <p className="mt-1 text-sm text-slate-500">Access the Fraud Detection Platform</p>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <Field label="Username" htmlFor="username">
                <div className="relative">
                  <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your username"
                    autoFocus
                    className="h-11 w-full rounded-lg border border-slate-300 bg-white pl-10 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
                  />
                </div>
              </Field>

              <Field label="Password" htmlFor="password">
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="h-11 w-full rounded-lg border border-slate-300 bg-white pl-10 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 transition-colors hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </Field>

              <div className="flex items-center justify-between text-sm">
                <label className="flex cursor-pointer items-center gap-2 text-slate-600">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500/30"
                  />
                  Remember me
                </label>
                <button
                  type="button"
                  onClick={() => setNotice("Please contact your system administrator to reset your password.")}
                  className="font-medium text-blue-600 hover:text-blue-700"
                >
                  Forgot password?
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition-all hover:from-blue-700 hover:to-blue-600 disabled:opacity-70"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {loading ? "Signing you in..." : "Sign In"}
              </button>

              {error && (
                <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700" role="alert">
                  <span className="mt-0.5 text-red-500">⚠</span>
                  {error}
                </div>
              )}
              {notice && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 text-sm text-blue-700">{notice}</div>
              )}
            </form>
          </div>

          {/* Info cards */}
          <div className="flex w-full max-w-md flex-col gap-4 xl:max-w-xs xl:justify-center">
            <InfoCard
              icon={<User className="h-4 w-4" />}
              title="Demo Credentials"
              open={showCredentials}
              onToggle={() => setShowCredentials((v) => !v)}
            >
              <dl className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <dt className="text-slate-500">Username</dt>
                  <dd className="font-mono font-semibold text-slate-800">admin</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Password</dt>
                  <dd className="font-mono font-semibold text-slate-800">admin</dd>
                </div>
              </dl>
              <p className="mt-3 text-xs text-slate-400">Use demo credentials to explore the platform.</p>
              <button
                type="button"
                onClick={useDemo}
                className="mt-3 w-full rounded-lg border border-blue-200 bg-blue-50 py-2 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-100"
              >
                Use Demo Credentials
              </button>
            </InfoCard>

            <InfoCard
              icon={<Code2 className="h-4 w-4" />}
              title="API Endpoint"
              open={showApi}
              onToggle={() => setShowApi((v) => !v)}
            >
              <p className="mb-1.5 text-xs text-slate-400">Base URL</p>
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2">
                <span className="min-w-0 flex-1 truncate font-mono text-xs text-slate-600">{API_BASE_URL}</span>
                <button
                  type="button"
                  onClick={copyApi}
                  aria-label="Copy API endpoint"
                  className="shrink-0 rounded p-1 text-slate-400 transition-colors hover:text-blue-600"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
            </InfoCard>
          </div>
        </div>
      </main>

      {/* Feature bar + footer */}
      <footer className="relative z-10 border-t border-white/10 bg-[#060f24]/60 backdrop-blur-sm">
        <div className="mx-auto grid max-w-4xl grid-cols-1 gap-4 px-6 py-5 sm:grid-cols-3">
          <Feature icon={<Lock className="h-5 w-5" />} title="Bank-Grade Security" subtitle="End-to-end encrypted" />
          <Feature icon={<Zap className="h-5 w-5" />} title="Real-Time Protection" subtitle="Detect in milliseconds" />
          <Feature icon={<ShieldCheck className="h-5 w-5" />} title="Intelligent Detection" subtitle="AI + Rules + Behavior" />
        </div>
        <p className="pb-4 text-center text-[11px] text-sky-200/50">
          &copy; {new Date().getFullYear()} PiByThree Technologies Pvt. Ltd. All Rights Reserved.
        </p>
      </footer>
    </div>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-medium text-slate-600">
        {label}
      </label>
      {children}
    </div>
  );
}

function InfoCard({
  icon,
  title,
  open,
  onToggle,
  children,
}: {
  icon: ReactNode;
  title: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-white/95 shadow-xl backdrop-blur">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold text-blue-700"
      >
        <span className="flex items-center gap-2">
          {icon}
          {title}
        </span>
        <ChevronDown className={cn("h-4 w-4 text-slate-400 transition-transform", open && "rotate-180")} />
      </button>
      {open && <div className="border-t border-slate-100 px-4 py-3">{children}</div>}
    </div>
  );
}

function Feature({ icon, title, subtitle }: { icon: ReactNode; title: string; subtitle: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-sky-300">{icon}</span>
      <div className="leading-tight">
        <p className="text-sm font-semibold text-white">{title}</p>
        <p className="text-xs text-sky-200/60">{subtitle}</p>
      </div>
    </div>
  );
}
