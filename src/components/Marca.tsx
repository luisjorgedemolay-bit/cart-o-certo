export function Marca({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M6 9C6 9 7 3 12 3C17 3 18 9 18 9"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path d="M5 9H19L16.5 18H7.5L5 9Z" fill="currentColor" />
      <rect x="4.5" y="7.6" width="15" height="1.6" rx="0.8" fill="currentColor" />
      <rect x="10.2" y="10.6" width="1.3" height="5.3" fill="var(--color-primary)" />
      <rect x="12.5" y="10.6" width="1.3" height="5.3" fill="var(--color-primary)" />
      <circle cx="18.4" cy="5.6" r="3.2" fill="#d89b28" stroke="var(--color-primary)" strokeWidth="0.6" />
      <path
        d="M18.4 4.1V7.1M16.9 5.6H19.9M17.5 4.7L19.3 6.5M17.5 6.5L19.3 4.7"
        stroke="white"
        strokeWidth="0.55"
        strokeLinecap="round"
      />
    </svg>
  );
}
