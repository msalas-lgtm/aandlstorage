const PATHS = {
  home: <path d="m3 11 9-8 9 8M5 10v10h14V10M9 20v-6h6v6" />,
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" />
    </>
  ),
  box: <path d="m3 7 9-4 9 4v11l-9 4-9-4V7Zm0 0 9 4 9-4M12 11v11" />,
  users: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20v-1a6.5 6.5 0 0 1 13 0v1M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14a6 6 0 0 1 3.5 5.5V20" />
    </>
  ),
  chart: <path d="M4 20V10m6 10V4m6 16v-7m5 7H3" />,
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="m3 8 9 6 9-6" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c3 3.2 3 14.8 0 18M12 3c-3 3.2-3 14.8 0 18" />
    </>
  ),
  chevron: <path d="m6 9 6 6 6-6" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.5 4.5" />
    </>
  ),
  external: <path d="M7 17 17 7M8 7h9v9" />,
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" />
    </>
  ),
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  plus: <path d="M12 5v14M5 12h14" />,
  edit: <path d="m4 20 1-4L16.5 4.5a2.1 2.1 0 0 1 3 3L8 19l-4 1ZM14 7l3 3" />,
  trash: <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6" />,
  logout: <path d="M10 4H5v16h5M15 8l4 4-4 4M19 12H9" />,
  tasks: <path d="M9 6h11M9 12h11M9 18h11M4 6l1.2 1.2L7 5.5M4 12l1.2 1.2L7 11.5M4 18l1.2 1.2L7 17.5" />,
  bell: <path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15L6 16Zm4 4a2 2 0 0 0 4 0" />,
  money: (
    <>
      <rect x="2.5" y="6" width="19" height="12" rx="2.5" />
      <circle cx="12" cy="12" r="2.6" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  arrowUp: <path d="M12 19V5m-6 6 6-6 6 6" />,
  arrowDown: <path d="M12 5v14m-6-6 6 6 6-6" />,
  image: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2.5" />
      <circle cx="9" cy="10" r="1.8" />
      <path d="m4 18 5-5 4 4 3-3 4 4" />
    </>
  ),
  file: <path d="M7 3h7l5 5v13H7V3Zm7 0v5h5M10 13h6M10 17h6" />,
} as const;

export type AdminIconName = keyof typeof PATHS;

export function AdminIcon({ name, size = 18 }: { name: AdminIconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ width: size, height: size }}
    >
      {PATHS[name]}
    </svg>
  );
}
