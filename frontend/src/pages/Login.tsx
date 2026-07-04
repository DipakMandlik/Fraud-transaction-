import { isAxiosError } from "axios";
import { ChevronDown, Eye, EyeOff } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import { AuthBackground } from "@/components/layout/AuthBackground";
import { LoadingScreen } from "@/components/layout/LoadingScreen";
import { Logo } from "@/components/layout/Logo";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/hooks/useAuth";
import { API_BASE_URL } from "@/lib/api";
import { cn } from "@/lib/utils";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin");
  const [showPassword, setShowPassword] = useState(false);
  const [showCredentials, setShowCredentials] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(username, password);
      sessionStorage.setItem("justLoggedIn", "1");
      setInitializing(true);
      window.setTimeout(() => navigate("/", { replace: true }), 1400);
    } catch (err) {
      if (isAxiosError(err)) {
        if (err.response?.status === 401) {
          setError("Invalid username or password");
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

  if (initializing) {
    return <LoadingScreen />;
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <AuthBackground />

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo size="lg" className="mb-5 drop-shadow-sm" />
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Fraud Detection Platform</h1>
          <p className="mt-2 max-w-sm text-sm text-slate-500">
            Real-Time AI Powered Fraud Monitoring &amp; Transaction Risk Intelligence
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-9 shadow-elevated backdrop-blur-sm transition-shadow duration-200 hover:shadow-lg">
          <h2 className="mb-1 text-lg font-semibold text-slate-900">Investigator Sign In</h2>
          <p className="mb-7 text-sm text-slate-500">Access the enterprise fraud monitoring console</p>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="username" className="mb-1.5 block text-xs font-medium text-slate-600">
                Username
              </label>
              <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} autoFocus />
            </div>
            <div>
              <label htmlFor="password" className="mb-1.5 block text-xs font-medium text-slate-600">
                Password
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 transition-colors hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-lg bg-fraud-light px-3 py-2 text-sm text-red-700" role="alert">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full transition-transform duration-150 active:scale-[0.98]"
              size="lg"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <div className="mt-6 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={() => setShowCredentials((prev) => !prev)}
              aria-expanded={showCredentials}
              className="mx-auto flex items-center gap-1.5 text-xs font-medium text-slate-400 transition-colors hover:text-slate-600"
            >
              Demo Credentials
              <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-200", showCredentials && "rotate-180")} />
            </button>
            {showCredentials && (
              <div className="mt-3 animate-fade-in rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 text-center text-xs text-slate-500">
                <p>
                  Username: <span className="font-mono font-semibold text-slate-700">admin</span>
                </p>
                <p className="mt-1">
                  Password: <span className="font-mono font-semibold text-slate-700">admin</span>
                </p>
                <p className="mt-2 border-t border-slate-200 pt-2 text-[10px] text-slate-400">
                  API endpoint: <span className="font-mono">{API_BASE_URL}</span>
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center gap-1 text-center">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>Powered by</span>
            <Logo size="sm" className="h-4" />
            <span className="font-medium text-slate-500">PiByThree Enterprise AI Solutions</span>
          </div>
          <p className="text-[11px] text-slate-400">
            &copy; {new Date().getFullYear()} PiByThree Technologies Pvt. Ltd. All Rights Reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
