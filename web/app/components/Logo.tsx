export function Logo({ className }: { className?: string }) {
  // The real Fides mark (from brand/logo_fides.png), background made transparent + cropped.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/fides-logo.png" alt="Fides" className={className} />;
}
