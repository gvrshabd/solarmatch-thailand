export function BrandMark() {
  return (
    <span className="brand-mark">
      <svg className="brand-symbol" viewBox="0 0 64 56" aria-hidden="true">
        <g className="brand-logo-rays">
          <path d="M32 0 27.5 8h9L32 0Z" />
          <path d="m15.5 6.5 1.2 9 7.7-4.5-8.9-4.5Z" />
          <path d="m48.5 6.5-8.9 4.5 7.7 4.5 1.2-9Z" />
          <path d="M3 24.5 11.5 29v-9L3 24.5Z" />
          <path d="m61 24.5-8.5-4.5v9l8.5-4.5Z" />
          <path d="m9 41 9-1.1-4.5-7.8L9 41Z" />
          <path d="m55 41-4.5-8.9-4.5 7.8L55 41Z" />
        </g>
        <path className="brand-logo-sun" d="M15 37a20.5 20.5 0 1 1 34 0" />
        <path className="brand-logo-roof" d="M10 53 39 30M54 53 25 30" />
      </svg>
      <span className="brand-wordmark">
        <strong>SolarMatch</strong>
        <small>THAILAND</small>
      </span>
    </span>
  );
}
