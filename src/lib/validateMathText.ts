export interface MathTextWarning {
  field: string;
  message: string;
}

const RAW_LATEX_COMMAND = /\\(?:frac|dfrac|sqrt|times|cdot|div|pm|geq|leq|neq|approx|text|left|right|begin)\b/;

export function getMathTextWarnings(text: string, field: string): MathTextWarning[] {
  const warnings: MathTextWarning[] = [];
  if (!text) return warnings;

  if (hasControlCharacters(text)) {
    warnings.push({
      field,
      message:
        "This text contains JSON control characters that often come from unescaped LaTeX backslashes. Use double backslashes in JSON, like \\\\frac.",
    });
  }

  if (hasUnmatchedDollarDelimiter(text)) {
    warnings.push({
      field,
      message: "Possible unmatched $ math delimiter. Use balanced $...$ or $$...$$.",
    });
  }

  const outsideMath = stripDelimitedMath(text);
  if (RAW_LATEX_COMMAND.test(outsideMath)) {
    warnings.push({
      field,
      message: "Raw LaTeX command appears outside math delimiters. Prefer $...$ or $$...$$ around LaTeX.",
    });
  }

  if (/\^\([^)]*\)/.test(outsideMath) || /[A-Za-z0-9]\^-?\d/.test(outsideMath)) {
    warnings.push({
      field,
      message: "Caret exponent notation will be auto-formatted, but explicit LaTeX is safer for generated content.",
    });
  }

  if (/\*\*[^*]+\*\*/.test(text)) {
    warnings.push({
      field,
      message: "Markdown bold syntax is present, but this app renders plain text plus LaTeX today.",
    });
  }

  if (hasCurrencyDelimiterConflict(text)) {
    warnings.push({
      field,
      message:
        "Dollar signs near numbers may be read as math delimiters. Prefer '65 dollars' or math-safe currency like $\\$65$.",
    });
  }

  return warnings;
}

function hasControlCharacters(text: string): boolean {
  return /[\b\f\r\v]/.test(text);
}

function hasUnmatchedDollarDelimiter(text: string): boolean {
  const withoutDisplay = text.replace(/(?<!\\)\$\$[\s\S]*?(?<!\\)\$\$/g, "");
  const matches = withoutDisplay.match(/(?<!\\)\$/g) ?? [];
  return matches.length % 2 !== 0;
}

function stripDelimitedMath(text: string): string {
  return text
    .replace(/(?<!\\)\$\$[\s\S]*?(?<!\\)\$\$/g, " ")
    .replace(/\\\[[\s\S]*?\\\]/g, " ")
    .replace(/(?<!\\)\$[\s\S]*?(?<!\\)\$/g, " ")
    .replace(/\\\([\s\S]*?\\\)/g, " ");
}

function hasCurrencyDelimiterConflict(text: string): boolean {
  const currencyHits = text.match(/(?<!\\)\$\d[\d,]*(?:\.\d{2})?/g) ?? [];
  if (currencyHits.length === 0) return false;
  const unescapedDollars = text.match(/(?<!\\)\$/g) ?? [];
  return unescapedDollars.length > currencyHits.length || currencyHits.length > 1;
}
