// Shown instantly while an admin tab loads its data, so switching tabs never waits on the server first.
export default function PanelLoading() {
  return (
    <div className="adm-skeleton" role="status" aria-live="polite">
      <span className="sr-only">Loading…</span>
      <i style={{ height: 64, maxWidth: 360 }} />
      <i />
      <i />
      <i style={{ height: 220 }} />
    </div>
  );
}
