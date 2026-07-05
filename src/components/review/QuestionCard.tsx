import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck, faXmark, faBookmark } from "@fortawesome/free-solid-svg-icons";
import { getSectionMeta } from "@/lib/constants";
import { getQuestionReviewLabel } from "@/lib/questionRouting";
import type { AnswerWithQuestion } from "@/types";
import MathText from "@/components/ui/MathText";

interface Props {
  answer: AnswerWithQuestion;
}

export default function QuestionCard({ answer }: Props) {
  const section = getSectionMeta(answer.section);
  const subtopic = getQuestionReviewLabel(answer);
  const date = new Date(answer.answered_at).toLocaleDateString();
  const isCorrect = answer.is_correct;

  return (
    <article
      className="card"
      aria-label={`Question from ${date} — ${isCorrect ? "correct" : "incorrect"}`}
    >
      <header className="flex flex-wrap items-center gap-2 text-xs">
        <span
          className="chip"
          style={{
            backgroundColor: `${section.color}18`,
            color: section.color,
            borderColor: `${section.color}40`,
          }}
        >
          {section.shortLabel}
        </span>
        <span className="chip border-line bg-hover text-ink-secondary">
          {subtopic}
        </span>
        <span className="chip border-line bg-hover text-ink-muted capitalize">
          {answer.difficulty}
        </span>
        <span
          className={`chip ${
            isCorrect
              ? "border-accent-green/40 bg-accent-green/10 text-accent-green"
              : "border-accent-red/40 bg-accent-red/10 text-accent-red"
          }`}
        >
          <FontAwesomeIcon
            icon={isCorrect ? faCheck : faXmark}
            className="h-3 w-3"
            aria-hidden
          />
          {isCorrect ? "Correct" : "Incorrect"}
        </span>
        {answer.is_flagged && (
          <span className="chip border-accent-amber/40 bg-accent-amber/10 text-accent-amber">
            <FontAwesomeIcon icon={faBookmark} className="h-3 w-3" aria-hidden />
            Flagged
          </span>
        )}
        <span className="ml-auto text-[11px] text-ink-muted">{date}</span>
      </header>

      <MathText section={answer.section} text={answer.question_text} className="mt-3 text-sm text-ink-primary" />

      <div className="mt-3 space-y-1.5 text-xs">
        <p>
          <span className="text-ink-muted">Your answer: </span>
          {answer.user_answer ? (
            <MathText
              section={answer.section}
              text={answer.user_answer}
              className={isCorrect ? "text-accent-green" : "text-accent-red"}
            />
          ) : (
            <span className={isCorrect ? "text-accent-green" : "text-accent-red"}>
              (unanswered)
            </span>
          )}
        </p>
        {!isCorrect && (
          <p>
            <span className="text-ink-muted">Correct: </span>
            <MathText section={answer.section} text={answer.correct_answer} className="text-accent-green" />
          </p>
        )}
      </div>

      {answer.formula && (
        <div className="mt-3 rounded-md bg-white/[0.03] px-3 py-2 text-sm text-ink-primary">
          <MathText section={answer.section} text={answer.formula} block />
        </div>
      )}

      {answer.explanation && (
        <details className="mt-3 rounded-lg border border-line bg-hover p-3 text-xs">
          <summary className="cursor-pointer font-semibold text-accent-teal">
            Explanation
          </summary>
          <MathText section={answer.section} text={answer.explanation} className="explanation-text mt-2 text-ink-secondary" />
        </details>
      )}
    </article>
  );
}
