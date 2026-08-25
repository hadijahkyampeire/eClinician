/**
 * The product mark: a heartbeat crossing a clinical cross.
 *
 * It blends the two colours in play rather than picking one. The tile runs from the
 * department the signed-in user works in, through the clinic's own brand — so the mark
 * always contains the colour of whatever surrounds it and never sits against the sidebar
 * looking borrowed from another product, while the hospital's colour still owns most of
 * it. The heartbeat carries the same gradient darkened, so it reads at both ends.
 */
export default function Logo({ size = 38 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" role="img" aria-label="eClinician">
      <defs>
        <linearGradient id="eclinician-mark" x1="0" y1="0" x2="1" y2="1">
          {/* The department holds the first third outright, so the mark reads as this
              part of the clinic before it fades into the hospital's own colour. */}
          <stop offset="0" stopColor="var(--dept)" />
          <stop offset="0.3" stopColor="var(--dept)" />
          <stop offset="0.72" stopColor="var(--brand-light)" />
          <stop offset="1" stopColor="var(--brand)" />
        </linearGradient>
        <linearGradient id="eclinician-pulse" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="var(--dept-dark)" />
          <stop offset="1" stopColor="var(--brand-dark)" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="11" fill="url(#eclinician-mark)" />
      <path
        d="M17 9.5h6a1.5 1.5 0 0 1 1.5 1.5v4h4a1.5 1.5 0 0 1 1.5 1.5v6a1.5 1.5 0 0 1-1.5 1.5h-4v4a1.5 1.5 0 0 1-1.5 1.5h-6a1.5 1.5 0 0 1-1.5-1.5v-4h-4A1.5 1.5 0 0 1 10 23v-6a1.5 1.5 0 0 1 1.5-1.5h4v-4A1.5 1.5 0 0 1 17 9.5Z"
        fill="#fff"
        opacity="0.95"
      />
      <path
        d="M8 20h5.2l2.4-4.6L19.4 25l2.6-5h8"
        fill="none"
        stroke="url(#eclinician-pulse)"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
