import { useState } from 'react';
import NotesInput from './components/NotesInput.jsx';
import SummaryPanel from './components/SummaryPanel.jsx';
import QuizPanel from './components/QuizPanel.jsx';
import { streamSummary, fetchQuiz } from './api/client.js';

export default function App() {
  const [notes, setNotes] = useState('');
const [difficulty, setDifficulty] = useState('intermediate');
  const [summary, setSummary] = useState('');
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summaryError, setSummaryError] = useState('');

  const [quiz, setQuiz] = useState(null);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [quizError, setQuizError] = useState('');

  async function handleSummarize() {
    if (notes.trim().length === 0) return;

    setSummary('');
    setSummaryError('');
    setIsSummarizing(true);

    try {
      await streamSummary(notes, difficulty, (chunk) => {
        setSummary((prev) => prev + chunk);
      });
    } catch (err) {
      setSummaryError(err.message || 'Something went wrong generating the summary.');
    } finally {
      setIsSummarizing(false);
    }
  }

  async function handleGenerateQuiz() {
    if (notes.trim().length === 0) return;

    setQuiz(null);
    setQuizError('');
    setIsGeneratingQuiz(true);

    try {
      const questions = await fetchQuiz(notes, difficulty);
      setQuiz(questions);
    } catch (err) {
      setQuizError(err.message || 'Something went wrong generating the quiz.');
    } finally {
      setIsGeneratingQuiz(false);
    }
  }

  return (
    <div className="app">
      <div className="firefly" />
      <div className="firefly" />
      <div className="firefly" />
      <div className="firefly" />
      <div className="firefly" />
      <header className="app-header">
        <h1>StudyMate AI</h1>
        <p className="app-subtitle">Paste your notes. Get a summary and a quiz in seconds.</p>
      </header>

      <main className="app-main">
        <NotesInput
          notes={notes}
          onNotesChange={setNotes}
          difficulty={difficulty}
          onDifficultyChange={setDifficulty}
          onSummarize={handleSummarize}
          onGenerateQuiz={handleGenerateQuiz}
          isSummarizing={isSummarizing}
          isGeneratingQuiz={isGeneratingQuiz}
        />

        <SummaryPanel summary={summary} isSummarizing={isSummarizing} error={summaryError} />

        <QuizPanel quiz={quiz} isGeneratingQuiz={isGeneratingQuiz} error={quizError} />
      </main>
    </div>
  );
}
