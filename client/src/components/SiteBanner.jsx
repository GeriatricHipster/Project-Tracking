export default function SiteBanner({ compact = false }) {
  return (
    <div className={`site-banner${compact ? ' compact' : ''}`}>
      <img
        src="/header-banner.png?v=20260713-task-delete-banner"
        alt="Project Services and Security Systems Project Scheduling banner"
      />
    </div>
  );
}
