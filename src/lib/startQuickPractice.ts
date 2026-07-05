import type { Section } from "@/types";
import {
  buildPracticeSessionRequest,
  getPracticeModeInfo,
  savePracticeSessionContext,
  type PracticePoolMode,
  type PracticeSessionContext,
} from "@/lib/practiceModes";
import { createLocalSession } from "@/lib/localProgress";

// Kicks off a practice session for a single subtopic with a fixed count.
// Returns the session ID so the caller can router.push to /practice/{id}.
// Throws with a readable message if the session can't be created (e.g.
// bank has no questions matching the status filter).
export async function startQuickPractice(
  section: Section,
  subtopicId: string,
  questionCount = 5,
  mode: PracticePoolMode = "smart",
  context?: Partial<PracticeSessionContext>
): Promise<string> {
  const { session } = createLocalSession(
    buildPracticeSessionRequest({
      section,
      subtopics: [subtopicId],
      questionCount,
      mode,
    })
  );
  const sessionId = session.id;
  savePracticeSessionContext(sessionId, {
    ...context,
    mode,
    modeLabel: getPracticeModeInfo(mode).shortLabel,
    section,
    subtopics: [subtopicId],
    questionCount,
    sourceSection: context?.sourceSection ?? section,
    sourceSubtopic: context?.sourceSubtopic ?? subtopicId,
    sourceMode: context?.sourceMode ?? mode,
  });
  return sessionId;
}
