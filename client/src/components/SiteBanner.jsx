export default function SiteBanner({ compact = false }) {
  return (
    <div className={`site-banner${compact ? ' compact' : ''}`}>
      <img src="/header-banner.svg" alt="BuildTrack Cloud banner" />
    </div>
  );
}
