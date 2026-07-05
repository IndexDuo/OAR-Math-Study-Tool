import type { QuestionRow, Section } from "@/types";
import { getSubtopicLabel } from "@/lib/constants";

type RoutableQuestion = Pick<QuestionRow, "subtopic" | "tags"> & {
  section?: Section;
};

export interface StoredQuestionRoute {
  topicSlug?: string;
  topicTitle?: string;
  subtopicSlug: string;
  subtopicTitle?: string;
  reviewLabel?: string;
  recommendedLessonSlug?: string;
}

const TAGS = {
  topicSlug: "review_route_topic_slug:",
  topicTitle: "review_route_topic_title:",
  subtopicSlug: "review_route_subtopic_slug:",
  subtopicTitle: "review_route_subtopic_title:",
  reviewLabel: "review_label:",
  recommendedLessonSlug: "recommended_lesson_slug:",
};

export function getStoredQuestionRoute(question: RoutableQuestion): StoredQuestionRoute {
  const topicTitle = readTag(question.tags, TAGS.topicTitle);
  const subtopicTitle = readTag(question.tags, TAGS.subtopicTitle);

  return {
    topicSlug: readTag(question.tags, TAGS.topicSlug),
    topicTitle,
    subtopicSlug: readTag(question.tags, TAGS.subtopicSlug) ?? question.subtopic,
    subtopicTitle,
    reviewLabel: readTag(question.tags, TAGS.reviewLabel),
    recommendedLessonSlug: readTag(question.tags, TAGS.recommendedLessonSlug),
  };
}

export function getQuestionReviewLabel(question: RoutableQuestion): string {
  const route = getStoredQuestionRoute(question);
  if (route.reviewLabel) return route.reviewLabel;
  if (route.topicTitle && route.subtopicTitle) {
    return `${route.topicTitle} -> ${route.subtopicTitle}`;
  }
  return route.subtopicTitle ?? getSubtopicLabel(route.subtopicSlug);
}

export function getQuestionReviewTopicLabel(question: RoutableQuestion): string {
  const route = getStoredQuestionRoute(question);
  return route.topicTitle ?? route.topicSlug ?? "Other";
}

export function getQuestionReviewSubtopicLabel(question: RoutableQuestion): string {
  const route = getStoredQuestionRoute(question);
  return route.subtopicTitle ?? getSubtopicLabel(route.subtopicSlug);
}

export function getQuestionReviewTopicSlug(question: RoutableQuestion): string {
  const route = getStoredQuestionRoute(question);
  return route.topicSlug ?? route.subtopicSlug;
}

export function getQuestionReviewSubtopicSlug(question: RoutableQuestion): string {
  return getStoredQuestionRoute(question).subtopicSlug;
}

function readTag(tags: string[] | null | undefined, prefix: string): string | undefined {
  const raw = tags?.find((tag) => tag.startsWith(prefix))?.slice(prefix.length).trim();
  return raw || undefined;
}
