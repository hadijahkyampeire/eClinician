/**
 * The product mark: a heartbeat crossing a clinical cross. It inherits the clinic's
 * brand colour, so an onboarded hospital gets its own mark without a new asset.
 */
export default function Logo({ size = 38 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" role="img" aria-label="eClinician">
      <defs>
        <linearGradient id="eclinician-mark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--brand-light)" />
          <stop offset="1" stopColor="var(--brand)" />
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
        stroke="var(--brand-dark)"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
