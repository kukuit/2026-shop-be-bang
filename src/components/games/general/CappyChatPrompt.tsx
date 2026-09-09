import styles from './CappyChatPrompt.module.css'

export default function CappyChatPrompt({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Trò chuyện cùng Cappy"
      className={`${styles.prompt} fixed bottom-20 right-4 z-50 flex w-32 flex-col items-center rounded-2xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-400`}
    >
      <span className="rounded-2xl border border-sky-100 bg-white px-3 py-2 text-sm font-bold text-sky-700 shadow-md">
        Cappy đây!
      </span>
      <svg
        viewBox="0 0 110 115"
        aria-hidden="true"
        className={`${styles.cappy} h-28 w-28 drop-shadow-md`}
      >
        <ellipse cx="51" cy="107" rx="32" ry="5" fill="#637d4b" opacity=".16" />
        <path d="M37 93v10m27-10v10" stroke="#835d3e" strokeWidth="12" strokeLinecap="round" />
        <rect x="29" y="48" width="48" height="48" rx="20" fill="#c29970" />
        <path d="M31 71l-8 13" stroke="#b28660" strokeWidth="12" strokeLinecap="round" />
        <g className={styles.arm}>
          <path
            d="M74 69q18-4 17-23"
            fill="none"
            stroke="#c29970"
            strokeWidth="12"
            strokeLinecap="round"
          />
          <ellipse cx="91" cy="44" rx="8" ry="10" fill="#e0b98d" />
          <path d="M86 40v4m5-6v5m5-3v4" stroke="#b28660" strokeWidth="1.5" strokeLinecap="round" />
        </g>
        <circle cx="34" cy="31" r="9" fill="#b28660" />
        <circle cx="70" cy="31" r="9" fill="#b28660" />
        <rect x="27" y="27" width="53" height="45" rx="20" fill="#c29970" />
        <rect x="29" y="44" width="53" height="25" rx="12" fill="#e0b98d" />
        <circle cx="43" cy="43" r="3" fill="#483a2d" />
        <circle cx="66" cy="43" r="3" fill="#483a2d" />
        <path
          d="M51 56q5 5 10 0"
          fill="none"
          stroke="#614532"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path d="M29 28q2-24 25-24t24 24" fill="#e4ce96" />
        <path d="M30 23h47" stroke="#927347" strokeWidth="6" />
        <path d="M22 29h62" stroke="#e4ce96" strokeWidth="8" strokeLinecap="round" />
        <path d="M31 70l19 8 24-8" fill="none" stroke="#38a6ca" strokeWidth="6" />
        <path d="M49 78l-4 13 12-3-4-10" fill="#38a6ca" />
      </svg>
    </button>
  )
}
