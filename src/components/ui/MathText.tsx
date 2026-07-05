"use client";

import { useMemo } from "react";
import katex from "katex";
import { autoFormatMath } from "@/lib/mathAutoFormat";

interface Props {
  text: string;
  className?: string;
  /** Render as a block-level element (display math). Default: inline. */
  block?: boolean;
  /** Question section — "reading" skips auto-format entirely. */
  section?: string;
}

/**
 * Renders text that may contain LaTeX math expressions.
 *
 * Supported delimiters:
 *   - Inline math:  $...$  or  \(...\)
 *   - Display math: $$...$$ or \[...\]
 *
 * If no delimiters are found, attempts to auto-detect plain-text math patterns
 * (fractions, exponents, sqrt, trig, etc.) and wrap them in LaTeX delimiters.
 *
 * If KaTeX fails to parse an expression, the raw LaTeX string is shown instead.
 */
export default function MathText({ text, className, block, section }: Props) {
  const parts = useMemo(() => {
    const initial = parseSegments(text);

    // If delimiters were found, keep them, but still auto-format plain text
    // around them. This lets "$x$ and 27^(4/3)" render both parts.
    if (initial.length > 1 || initial[0]?.type !== "text") {
      return initial.flatMap((part) => {
        if (part.type !== "text") return [part];
        const formatted = autoFormatMath(part.value, section);
        return formatted === part.value ? [part] : parseSegments(formatted);
      });
    }

    // No delimiters — try auto-formatting plain-text math patterns.
    const formatted = autoFormatMath(text, section);
    if (formatted === text) {
      return initial; // No changes — still plain text.
    }

    return parseSegments(formatted);
  }, [text, section]);

  // Fast path: pure plain text, no math at all.
  if (parts.length === 1 && parts[0].type === "text") {
    return block ? (
      <div className={className}>{text}</div>
    ) : (
      <span className={className}>{text}</span>
    );
  }

  const Tag = block ? "div" : "span";

  return (
    <Tag className={className}>
      {parts.map((part, i) => {
        if (part.type === "text") {
          return <span key={i}>{part.value}</span>;
        }
        // Math segment — render with KaTeX.
        try {
          const html = katex.renderToString(part.value, {
            displayMode: part.type === "display",
            throwOnError: false,
            trust: false,
          });
          return (
            <span
              key={i}
              dangerouslySetInnerHTML={{ __html: html }}
            />
          );
        } catch {
          // Fallback: show raw LaTeX in monospace.
          return (
            <code key={i} className="text-accent-amber">
              {part.value}
            </code>
          );
        }
      })}
    </Tag>
  );
}

// ---- Parser ----

interface Segment {
  type: "text" | "inline" | "display";
  value: string;
}

/**
 * Split text into plain text and math segments.
 *
 * Priority order (checked first → last):
 *   1. $$ ... $$ or \[ ... \]  → display math
 *   2. $ ... $  or \( ... \)   → inline math
 *
 * Single $ delimiters require the opening $ to NOT be followed by a space
 * and the closing $ to NOT be preceded by a space, to avoid false positives
 * on currency ("costs $5").
 */
function parseSegments(text: string): Segment[] {
  const segments: Segment[] = [];
  let buffer = "";
  let i = 0;

  function flushText() {
    if (buffer) {
      segments.push({ type: "text", value: buffer });
      buffer = "";
    }
  }

  while (i < text.length) {
    if (text.startsWith("$$", i)) {
      const end = findUnescaped(text, "$$", i + 2);
      if (end !== -1) {
        flushText();
        segments.push({ type: "display", value: text.slice(i + 2, end).trim() });
        i = end + 2;
        continue;
      }
    }

    if (text.startsWith("\\[", i)) {
      const end = text.indexOf("\\]", i + 2);
      if (end !== -1) {
        flushText();
        segments.push({ type: "display", value: text.slice(i + 2, end).trim() });
        i = end + 2;
        continue;
      }
    }

    if (text.startsWith("\\(", i)) {
      const end = text.indexOf("\\)", i + 2);
      if (end !== -1) {
        flushText();
        segments.push({ type: "inline", value: text.slice(i + 2, end).trim() });
        i = end + 2;
        continue;
      }
    }

    if (text[i] === "$" && text[i - 1] !== "\\") {
      const end = findUnescaped(text, "$", i + 1);
      if (end !== -1) {
        const inner = text.slice(i + 1, end);
        const hasTightDelimiters = inner.trim() === inner && inner.length > 0;
        if (hasTightDelimiters && !looksLikeCurrencyText(inner)) {
          flushText();
          segments.push({ type: "inline", value: inner.trim() });
          i = end + 1;
          continue;
        }
      }
    }

    buffer += text[i];
    i++;
  }

  flushText();

  return segments.length > 0 ? segments : [{ type: "text", value: text }];
}

function findUnescaped(text: string, needle: string, start: number): number {
  let index = text.indexOf(needle, start);
  while (index !== -1) {
    if (!isEscaped(text, index)) return index;
    index = text.indexOf(needle, index + needle.length);
  }
  return -1;
}

function isEscaped(text: string, index: number): boolean {
  let slashCount = 0;
  for (let i = index - 1; i >= 0 && text[i] === "\\"; i--) slashCount++;
  return slashCount % 2 === 1;
}

function looksLikeCurrencyText(inner: string): boolean {
  const compact = inner.trim();
  if (/^\d[\d,]*(?:\.\d{2})?$/.test(compact)) return true;
  return /^\d[\d,]*(?:\.\d{2})?\s+(?:and|or|to|from|after|before|with)\b/i.test(compact);
}
