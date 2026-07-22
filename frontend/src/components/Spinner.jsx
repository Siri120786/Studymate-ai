export default function Spinner({ label }) {
  return (
    <div className="spinner-row" role="status" aria-live="polite">
      <span className="spinner" />
      {label && <span className="spinner-label">{label}</span>}
    </div>
  );
}
