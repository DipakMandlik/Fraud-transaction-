import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import { onBackendWaking } from "@/lib/api";

export function BackendWakingBanner() {
  const [waking, setWaking] = useState(false);

  useEffect(() => onBackendWaking(setWaking), []);

  if (!waking) return null;

  return (
    <div className="fixed inset-x-0 top-0 z-[60] flex animate-rise items-center justify-center gap-2 bg-gradient-to-r from-primary-700 via-primary-600 to-primary-700 px-4 py-2 text-sm font-medium text-white shadow-elevated">
      <Loader2 className="h-4 w-4 animate-spin" />
      Waking up the live backend — this can take up to a minute on first load.
    </div>
  );
}
