/**
 * Large, cheerful bread illustration for the supporter-facing landing hero.
 * Drawn with the same toy accents as the icon set so it can sit on any app
 * surface without loading a photo.
 */
export function BreadHeroArt({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 480 480"
      role="img"
      aria-label="A cheerful loaf of bread with a torn slice, steam and little sparkles"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <radialGradient id="bread-hero-glow" cx="50%" cy="45%" r="50%">
          <stop offset="0%" stopColor="var(--toy-lime)" stopOpacity=".55" />
          <stop offset="100%" stopColor="var(--toy-lime)" stopOpacity="0" />
        </radialGradient>
        <filter id="bread-hero-shadow" x="-30%" y="-30%" width="160%" height="180%">
          <feDropShadow
            dx="0"
            dy="10"
            stdDeviation="0"
            floodColor="var(--toy-ink)"
            floodOpacity=".12"
          />
        </filter>
      </defs>

      {/* Soft green halo + rays */}
      <circle cx="240" cy="238" r="222" fill="url(#bread-hero-glow)" />
      <g stroke="var(--toy-leaf)" strokeWidth="5" strokeLinecap="round" opacity=".22">
        <path d="M240 20v26M240 434v26M20 238h26M434 238h26" />
        <path d="M84 82l19 19M396 394l19 19M396 82l-19 19M84 394l-19 19" />
        <path d="M132 38l10 24M348 442l-10-24M442 132l-24 10M38 348l24-10" />
        <path d="M38 132l24 10M442 348l-24-10M132 442l10-24M348 38l-10 24" />
      </g>

      {/* Ground shadow */}
      <ellipse
        cx="240"
        cy="410"
        rx="158"
        ry="24"
        fill="var(--toy-ink)"
        opacity=".09"
      />

      {/* Plate */}
      <circle
        cx="240"
        cy="300"
        r="148"
        fill="var(--toy-cream)"
        stroke="var(--toy-leaf)"
        strokeWidth="8"
      />
      <circle
        cx="240"
        cy="300"
        r="131"
        fill="var(--toy-paper)"
        stroke="var(--toy-lime)"
        strokeWidth="6"
      />

      {/* Steam */}
      <g
        stroke="var(--toy-coral)"
        strokeWidth="7"
        strokeLinecap="round"
        opacity=".65"
      >
        <path d="M184 148c-14-16 14-26 0-44" />
        <path d="M240 136c-14-18 14-30 0-50" />
        <path d="M296 148c14-16-14-26 0-44" />
      </g>

      {/* Torn slice, leaning at the right */}
      <g filter="url(#bread-hero-shadow)" transform="rotate(12 352 306)">
        <path
          d="M322 258c0-12 10-22 22-22h38c12 0 22 10 22 22v84c0 10-8 18-18 18h-46c-10 0-18-8-18-18v-84Z"
          fill="var(--toy-bread)"
          stroke="var(--toy-ink)"
          strokeWidth="8"
          strokeLinejoin="round"
        />
        <path
          d="M338 258c0-7 5-12 12-12h28c7 0 12 5 12 12v70c0 7-5 12-12 12h-28c-7 0-12-5-12-12v-70Z"
          fill="var(--toy-cream)"
          stroke="var(--toy-bread-dark)"
          strokeWidth="5"
          strokeLinejoin="round"
        />
        <path
          d="M350 266c8 10 20 10 28 0M350 292c8 10 20 10 28 0M350 318c8 10 20 10 28 0"
          stroke="var(--toy-bread-dark)"
          strokeWidth="4"
          strokeLinecap="round"
          opacity=".55"
        />
      </g>

      {/* Main loaf */}
      <g filter="url(#bread-hero-shadow)">
        <path
          d="M108 286c0-78 56-130 132-130s132 52 132 130v40c0 36-28 64-64 64H172c-36 0-64-28-64-64v-40Z"
          fill="var(--toy-bread)"
          stroke="var(--toy-ink)"
          strokeWidth="9"
          strokeLinejoin="round"
        />
        <path
          d="M148 270c6-50 42-78 92-78s86 28 92 78"
          stroke="var(--toy-bread-dark)"
          strokeWidth="8"
          strokeLinecap="round"
        />
        <path
          d="M164 232c10-12 24-18 40-18M236 208c12 0 24 3 34 9"
          stroke="var(--toy-cream)"
          strokeWidth="7"
          strokeLinecap="round"
          opacity=".75"
        />

        {/* Score marks */}
        <path
          d="M180 260c14 10 28 10 42 0M258 260c14 10 28 10 42 0"
          stroke="var(--toy-bread-dark)"
          strokeWidth="5"
          strokeLinecap="round"
          opacity=".7"
        />

        {/* Face */}
        <circle cx="192" cy="310" r="7" fill="var(--toy-ink)" />
        <circle cx="288" cy="310" r="7" fill="var(--toy-ink)" />
        <circle cx="171" cy="330" r="10" fill="var(--toy-coral)" opacity=".55" />
        <circle cx="309" cy="330" r="10" fill="var(--toy-coral)" opacity=".55" />
        <path
          d="M218 334c14 14 30 14 44 0"
          stroke="var(--toy-ink)"
          strokeWidth="8"
          strokeLinecap="round"
        />
        <path
          d="M214 216c7-7 14-7 21 0M245 216c7-7 14-7 21 0"
          stroke="var(--toy-bread-dark)"
          strokeWidth="5"
          strokeLinecap="round"
          opacity=".45"
        />
      </g>

      {/* Teal and coral stickers around the plate */}
      <g>
        <path
          d="M76 246l6 16 16 6-16 6-6 16-6-16-16-6 16-6 6-16Z"
          fill="var(--toy-lime)"
          stroke="var(--toy-ink)"
          strokeWidth="4"
          strokeLinejoin="round"
        />
        <path
          d="M398 196l4.5 12 12 4.5-12 4.5-4.5 12-4.5-12-12-4.5 12-4.5 4.5-12Z"
          fill="var(--toy-coral)"
          stroke="var(--toy-ink)"
          strokeWidth="4"
          strokeLinejoin="round"
        />
        <path
          d="M116 382l4 11 11 4-11 4-4 11-4-11-11-4 11-4 4-11Z"
          fill="var(--toy-bread)"
          stroke="var(--toy-ink)"
          strokeWidth="3.5"
          strokeLinejoin="round"
        />
        <path
          d="M377 374c-10-10-24-4-24 8 0 12 24 24 24 24s24-12 24-24c0-12-14-18-24-8Z"
          fill="var(--toy-coral)"
          stroke="var(--toy-ink)"
          strokeWidth="4"
          strokeLinejoin="round"
        />
      </g>

      {/* Crumb details on the plate */}
      <g fill="var(--toy-bread-dark)" opacity=".35">
        <circle cx="132" cy="304" r="4" />
        <circle cx="154" cy="324" r="3" />
        <circle cx="362" cy="318" r="3.5" />
        <circle cx="344" cy="340" r="2.5" />
      </g>
    </svg>
  );
}
