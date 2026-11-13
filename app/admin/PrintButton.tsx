"use client";

export function PrintButton({ label = "Print" }: { label?: string }) {
  return (
    <button className="adm-btn is-primary adm-noprint" type="button" onClick={() => window.print()}>
      {label}
    </button>
  );
}
