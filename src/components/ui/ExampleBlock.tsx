"use client";

import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faEyeSlash } from "@fortawesome/free-solid-svg-icons";
import MathText from "./MathText";
import type { Section } from "@/types";

interface Props {
  content: string;
  solution?: string;
  section: Section;
}

function splitLegacyExample(content: string): { visible: string; hidden: string } {
  const splitIdx = content.indexOf("\n\n");
  return splitIdx === -1
    ? { visible: "", hidden: content }
    : {
        visible: content.slice(0, splitIdx),
        hidden: content.slice(splitIdx + 2),
      };
}

function Paragraphs({ text, section }: { text: string; section: Section }) {
  return (
    <>
      {text.split(/\n{2,}/).map((paragraph, j) => (
        <MathText key={j} text={paragraph} section={section} className="block whitespace-pre-line" />
      ))}
    </>
  );
}

// Structured example blocks should provide `content` for the visible prompt
// and `solution` for hidden reveal content. Older pages must keep the exact
// original first-blank-line split behavior so existing math examples do not
// reveal step-by-step solutions early.
export default function ExampleBlock({ content, solution, section }: Props) {
  const [revealed, setRevealed] = useState(false);

  const structured = typeof solution === "string" && solution.trim().length > 0;
  const legacy = structured ? null : splitLegacyExample(content);
  const problemText = structured ? content.trim() : legacy?.visible ?? "";
  const solutionText = structured ? solution.trim() : legacy?.hidden ?? "";

  return (
    <div className="text-sm leading-relaxed text-ink-secondary space-y-3">
      {problemText && (
        <div className="space-y-2">
          <Paragraphs text={problemText} section={section} />
        </div>
      )}

      {solutionText && (
        <>
          {!revealed ? (
            <button
              type="button"
              onClick={() => setRevealed(true)}
              className="group relative w-full overflow-hidden rounded-lg border border-dashed border-accent-green/40 bg-accent-green/5 px-4 py-6 text-center transition-colors hover:bg-accent-green/10"
            >
              <span className="flex items-center justify-center gap-2 text-sm font-semibold text-accent-green">
                <FontAwesomeIcon icon={faEye} className="h-4 w-4" aria-hidden />
                Show solution
              </span>
              <span className="mt-1 block text-[11px] text-ink-muted">
                Try it yourself first — click when ready
              </span>
            </button>
          ) : (
            <div className="space-y-2 rounded-lg border border-accent-green/30 bg-accent-green/5 p-4">
              <button
                type="button"
                onClick={() => setRevealed(false)}
                className="mb-2 flex items-center gap-1 text-[11px] text-ink-muted hover:text-ink-primary"
              >
                <FontAwesomeIcon icon={faEyeSlash} className="h-3 w-3" aria-hidden />
                Hide solution
              </button>
              <Paragraphs text={solutionText} section={section} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
