import { Suspense, type ReactNode } from "react";
import { requireAdmin } from "@/lib/admin/auth";
import { AdminFrame } from "../AdminFrame";

// The session is read at request time, so the whole panel streams in behind this boundary.
export default function PanelLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<div className="adm-content"><div className="adm-skeleton"><i /><i /><i /></div></div>}>
      <PanelGate>{children}</PanelGate>
    </Suspense>
  );
}

async function PanelGate({ children }: { children: ReactNode }) {
  await requireAdmin();
  return <AdminFrame>{children}</AdminFrame>;
}
