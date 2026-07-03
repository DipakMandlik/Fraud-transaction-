import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import { LoadingScreen } from "@/components/layout/LoadingScreen";
import { Logo } from "@/components/layout/Logo";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/hooks/useAuth";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(username, password);
      setInitializing(true);
      window.setTimeout(() => navigate("/", { replace: true }), 1400);
    } catch {
      setError("Invalid username or password");
      setLoading(false);
    }
  }

  if (initializing) {
    return <LoadingScreen />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-primary-900 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 rounded-2xl bg-white p-3 shadow-elevated">
            <Logo size="lg" />
          </div>
          <h1 className="text-2xl font-bold text-white">PiBy3 Fraud Intelligence Platform</h1>
          <p className="mt-1 text-sm text-slate-300">Transforming Enterprises for the Future</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-elevated">
          <h2 className="mb-1 text-lg font-semibold text-slate-900">Investigator Sign In</h2>
          <p className="mb-6 text-sm text-slate-500">Access the enterprise fraud monitoring console</p>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-600">Username</label>
              <Input value={username} onChange={(e) => setUsername(e.target.value)} autoFocus />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-600">Password</label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>

            {error && (
              <div className="rounded-lg bg-fraud-light px-3 py-2 text-sm text-red-700">{error}</div>
            )}

            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <p className="mt-5 text-center text-xs text-slate-400">Default administrator credentials: admin / admin</p>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          &copy; {new Date().getFullYear()} PiBy3. Enterprise AI Solutions.
        </p>
      </div>
    </div>
  );
}
