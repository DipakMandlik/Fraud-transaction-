/** Subtle enterprise backdrop for the login screen: a soft blue mesh glow
 * plus a faint dot-grid, evoking a secure network without being flashy. */
export function AuthBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden bg-slate-50">
      <svg className="absolute inset-0 h-full w-full opacity-60" aria-hidden="true">
        <defs>
          <pattern id="auth-grid" width="36" height="36" patternUnits="userSpaceOnUse">
            <circle cx="1.5" cy="1.5" r="1.5" fill="#CBD5E1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#auth-grid)" />
      </svg>
      <div className="absolute -left-32 -top-32 h-[28rem] w-[28rem] rounded-full bg-primary-100 opacity-60 blur-3xl" />
      <div className="absolute -bottom-32 -right-32 h-[28rem] w-[28rem] rounded-full bg-sky/20 opacity-60 blur-3xl" />
      <div className="absolute left-1/2 top-1/2 h-[32rem] w-[32rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary-50 opacity-40 blur-3xl" />
    </div>
  );
}
