export default function SiteBanner({ compact = false, onLogout = null }) {
  return (
    <div className={`site-banner${compact ? ' compact' : ''}`}>
      <img src="/header-banner.png" alt="Project Services and Security Systems Project Scheduling banner" />
      {onLogout && (
        <button className="ghost-button compact banner-logout" onClick={onLogout} type="button">
          Logout
        </button>
      )}
    </div>
  );
}
