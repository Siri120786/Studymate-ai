import { useState } from 'react';
import Spinner from './Spinner.jsx';

export default function SummaryPanel({ summary, isSummarizing, error }) {
  const [copied, setCopied] = useState(false);

  if (!summary && !isSummarizing && !error) {
    return null;
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API can fail in insecure contexts / older browsers.
      // Fail silently in the UI rather than throwing.
    }
  }

  return (
    <section className="card card-summary">
      <div className="card-header-row">
        <h2 className="card-title">Summary</h2>
        {summary && (
          <button className="btn btn-ghost btn-small" onClick={handleCopy}>
            {copied ? 'Copied!' : 'Copy'}
          </button>
        )}
      </div>

      {error && <p className="error-text">{error}</p>}

      {isSummarizing && !summary && <Spinner label="Generating summary…" />}

      {summary && <p className="summary-text">{summary}</p>}
    </section>
  );
}
