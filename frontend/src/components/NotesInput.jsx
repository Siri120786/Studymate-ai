export default function NotesInput({
  notes,
  onNotesChange,
  onSummarize,
  onGenerateQuiz,
  isSummarizing,
  isGeneratingQuiz,
}) {
  const disabled = notes.trim().length === 0;
  const busy = isSummarizing || isGeneratingQuiz;

  return (
    <section className="card card-notes">
      <label htmlFor="notes" className="card-label">
        📝 Paste your study notes
      </label>
      <textarea
        id="notes"
        className="notes-textarea"
        placeholder="Paste your notes here (lecture notes, textbook excerpts, anything you want to review)..."
        value={notes}
        onChange={(e) => onNotesChange(e.target.value)}
        rows={14}
      />
    
      <div className="button-row">
        <button
          className="btn btn-primary"
          onClick={onSummarize}
          disabled={disabled || busy}
        >
          {isSummarizing ? 'Summarizing…' : 'Get Summary'}
        </button>
        <button
          className="btn btn-secondary"
          onClick={onGenerateQuiz}
          disabled={disabled || busy}
        >
          {isGeneratingQuiz ? 'Generating…' : 'Generate Quiz'}
        </button>
      </div>
    </section>

    
  );
}
