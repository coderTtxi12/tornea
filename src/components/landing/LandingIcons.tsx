type IconProps = { className?: string };

export function IconLeagues({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 6h16v3H4V6zm0 5h10v3H4v-3zm0 5h16v3H4v-3z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="18" cy="8" r="2" fill="currentColor" opacity="0.6" />
    </svg>
  );
}

export function IconTeams({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="17" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M14 20c0-2.5 1.5-4.5 4-5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconFixture({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3 9h18M8 4v4M16 4v4" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 14h3v3H8v-3zm5 0h3v3h-3v-3z" fill="currentColor" opacity="0.5" />
    </svg>
  );
}

export function IconLive({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="3" fill="currentColor" />
      <path d="M12 4v2M12 18v2M4 12h2M18 12h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function IconVenues({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3L4 9v12h16V9l-8-6z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M9 21v-6h6v6" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export const FEATURE_ICONS = {
  leagues: IconLeagues,
  teams: IconTeams,
  fixture: IconFixture,
  live: IconLive,
  venues: IconVenues,
} as const;
