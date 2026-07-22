import { useState } from 'react';
import Spinner from './Spinner.jsx';

export default function QuizPanel({ quiz, isGeneratingQuiz, error }) {
  const [selections, setSelections] = useState({});
  const [submitted, setSubmitted] = useState(false);

  if (!quiz && !isGeneratingQuiz && !error) {
    return null;
  }

  function selectOption(questionIndex, option) {
    if (submitted) return;
    setSelections((prev) => ({ ...prev, [questionIndex]: option }));
  }

  function handleCheckAnswers() {
    setSubmitted(true);
  }

  function handleRetake() {
    setSelections({});
    setSubmitted(false);
  }

  const allAnswered = quiz && quiz.every((_, i) => selections[i] != null);
  const score = quiz
    ? quiz.reduce((total, q, i) => total + (selections[i] === q.correctAnswer ? 1 : 0), 0)
    : 0;

  return (
    <section className="card card-quiz">
      <h2 className="card-title">Quiz</h2>

      {error && <p className="error-text">{error}</p>}

      {isGeneratingQuiz && <Spinner label="Building your quiz…" />}

      {quiz && (
        <>
          {submitted && (
            <p className="quiz-score">
              You scored {score} / {quiz.length}
            </p>
          )}

          <ol className="quiz-list">
            {quiz.map((q, qIndex) => {
              const selected = selections[qIndex];
              return (
                <li key={qIndex} className="quiz-question">
                  <p className="quiz-question-text">{q.question}</p>
                  <ul className="quiz-options">
                    {q.options.map((option, oIndex) => {
                      const isSelected = selected === option;
                      const isCorrect = option === q.correctAnswer;

                      let optionClass = 'quiz-option';
                      if (isSelected) optionClass += ' quiz-option-selected';
                      if (submitted && isCorrect) optionClass += ' quiz-option-correct';
                      if (submitted && isSelected && !isCorrect)
                        optionClass += ' quiz-option-incorrect';

                      return (
                        <li key={oIndex}>
                          <button
                            type="button"
                            className={optionClass}
                            onClick={() => selectOption(qIndex, option)}
                            disabled={submitted}
                          >
                            {option}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                  {submitted && q.explanation && (
                    <p className="quiz-explanation">{q.explanation}</p>
                  )}
                </li>
              );
            })}
          </ol>

          <div className="button-row">
            {!submitted ? (
              <button
                className="btn btn-primary"
                onClick={handleCheckAnswers}
                disabled={!allAnswered}
              >
                Check Answers
              </button>
            ) : (
              <button className="btn btn-secondary" onClick={handleRetake}>
                Retake Quiz
              </button>
            )}
          </div>
        </>
      )}
    </section>
  );
}
