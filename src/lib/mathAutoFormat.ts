/**
 * Converts high-confidence plain-text math into LaTeX-delimited strings for
 * MathText/KaTeX. The goal is a safe assist, not a full parser.
 */

const LATEX_COMMANDS = [
  "frac",
  "dfrac",
  "sqrt",
  "sum",
  "prod",
  "int",
  "sin",
  "cos",
  "tan",
  "log",
  "ln",
  "pi",
  "theta",
  "alpha",
  "beta",
  "gamma",
  "times",
  "div",
  "pm",
  "mp",
  "geq",
  "leq",
  "neq",
  "approx",
  "infty",
  "partial",
  "begin",
  "left",
  "right",
  "cdot",
  "circ",
  "vec",
  "hat",
  "bar",
  "overline",
  "text",
];

export function autoFormatMath(text: string, section?: string): string {
  if (section === "reading" || !text.trim()) return text;

  let result = text;

  result = wrapRawLatex(result);
  result = formatFunctions(result);
  result = formatExponents(result);
  result = formatMixedNumbers(result);
  result = formatNumericFractions(result);
  result = formatSymbols(result);
  result = formatMatrices(result);
  result = mergeAdjacentMath(result);

  return result;
}

function formatFunctions(text: string): string {
  let result = text;
  result = result.replace(/sqrt\(([^)]+)\)/gi, (_, inner) => `$\\sqrt{${inner}}$`);
  result = result.replace(/log_(\w+)\(([^)]+)\)/gi, (_, base, inner) => `$\\log_{${base}}(${inner})$`);
  result = result.replace(/(?<![a-zA-Z])log\(([^)]+)\)/gi, (_, inner) => `$\\log(${inner})$`);
  result = result.replace(/(?<![a-zA-Z])ln\(([^)]+)\)/gi, (_, inner) => `$\\ln(${inner})$`);
  result = result.replace(/(?<![a-zA-Z])(sin|cos|tan)\(([^)]+)\)/gi, (_, fn, inner) => `$\\${fn.toLowerCase()}(${inner})$`);
  return result;
}

function formatMixedNumbers(text: string): string {
  return replaceOutsideMath(text, /\b(\d+)\s+and\s+(\d+)\s*\/\s*(\d+)\b/g, (_, whole, num, den) => {
    return `${whole} and $\\frac{${num}}{${den}}$`;
  });
}

function formatNumericFractions(text: string): string {
  return replaceOutsideMath(
    text,
    /(?<![\d/])\b(\d+)\s*\/\s*(\d+)\b(?!\s*\/?\d)/g,
    (_, num, den) => `$\\frac{${num}}{${den}}$`
  );
}

function formatExponents(text: string): string {
  let result = text;

  result = replaceOutsideMath(
    result,
    /(?<![A-Za-z0-9_$])([A-Za-z]|\d+(?:\.\d+)?)\^\((-?\d+)\s*\/\s*(\d+)\)/g,
    (_, base, num, den) => {
      const sign = num.startsWith("-") ? "-" : "";
      const absNum = num.replace(/^-/, "");
      return `$${base}^{${sign}\\frac{${absNum}}{${den}}}$`;
    }
  );

  result = replaceOutsideMath(
    result,
    /(?<![A-Za-z0-9_$])([A-Za-z]|\d+(?:\.\d+)?)\^\((-?\d+(?:\.\d+)?)\)/g,
    (_, base, exp) => `$${base}^{${exp}}$`
  );

  result = replaceOutsideMath(
    result,
    /(?<![A-Za-z0-9_$])([A-Za-z]|\d+(?:\.\d+)?)\^(-?\d+(?:\.\d+)?)/g,
    (_, base, exp) => `$${base}^{${exp}}$`
  );

  return result;
}

function formatSymbols(text: string): string {
  let result = text;
  result = replaceOutsideMath(result, /(?<!=)>=(?!=)/g, () => "$\\geq$");
  result = replaceOutsideMath(result, /(?<!=)<=(?!=)/g, () => "$\\leq$");
  result = replaceOutsideMath(result, /!=(?!=)/g, () => "$\\neq$");
  result = replaceOutsideMath(result, /\u00b1/g, () => "$\\pm$");
  result = replaceOutsideMath(result, /\u00d7/g, () => "$\\times$");
  result = replaceOutsideMath(result, /(?<![a-zA-Z])\u03c0(?![a-zA-Z])/g, () => "$\\pi$");
  return result;
}

function formatMatrices(text: string): string {
  return replaceOutsideMath(text, /\[([^\[\]]+;[^\[\]]+)\]/g, (_, inner) => {
    const rows = inner.split(";").map((row: string) =>
      row.split(",").map((v: string) => v.trim()).join(" & ")
    );
    return `$\\begin{pmatrix} ${rows.join(" \\\\ ")} \\end{pmatrix}$`;
  });
}

function wrapRawLatex(text: string): string {
  if (!hasRawLatexCommand(text)) return text;

  let result = "";
  let i = 0;
  let cursor = 0;

  while (i < text.length) {
    if (!isInsideExplicitMath(text, i) && text[i] === "\\" && startsLatexCommand(text, i)) {
      const start = findLatexExpressionStart(text, i);
      if (start < cursor) {
        i++;
        continue;
      }
      const end = findLatexExpressionEnd(text, start);
      const expr = text.slice(start, end).trim();
      result += text.slice(cursor, start);
      result += `$${expr}$`;
      cursor = end;
      i = end;
      continue;
    }

    i++;
  }

  result += text.slice(cursor);
  return result;
}

function isInsideExplicitMath(text: string, index: number): boolean {
  const before = text.slice(0, index);
  const displayCount = (before.match(/(?<!\\)\$\$/g) ?? []).length;
  const inlineCount = (before.replace(/(?<!\\)\$\$/g, "").match(/(?<!\\)\$/g) ?? []).length;
  return displayCount % 2 === 1 || inlineCount % 2 === 1;
}

function hasRawLatexCommand(text: string): boolean {
  return LATEX_COMMANDS.some((cmd) => text.includes(`\\${cmd}`));
}

function startsLatexCommand(text: string, index: number): boolean {
  return LATEX_COMMANDS.some((cmd) => text.startsWith(`\\${cmd}`, index));
}

function findLatexExpressionStart(text: string, commandIndex: number): number {
  let start = commandIndex;
  while (start > 0 && /[A-Za-z0-9.{}()[\]^_+\-=*/]/.test(text[start - 1])) {
    start--;
  }
  return start;
}

function findLatexExpressionEnd(text: string, start: number): number {
  let i = start;
  let braceDepth = 0;

  while (i < text.length) {
    const ch = text[i];
    if (ch === "$" && text[i - 1] !== "\\") break;

    if (ch === "{") braceDepth++;
    if (ch === "}") {
      if (braceDepth === 0) break;
      braceDepth--;
    }

    const allowed = /[A-Za-z0-9.{}()[\]^_+\-=*/\\,\s]/.test(ch);
    if (!allowed && braceDepth === 0) break;

    i++;

    if (braceDepth === 0) {
      const next = text[i];
      if (!next) break;
      if (/[.,;:!?]/.test(next)) break;
      if (/\s/.test(next)) {
        const rest = text.slice(i);
        if (!/^\s*(?:[+\-=*/]|\^\{|\\[A-Za-z])/.test(rest)) break;
      }
    }
  }

  return i;
}

function replaceOutsideMath(
  text: string,
  pattern: RegExp,
  replacer: (...args: string[]) => string
): string {
  const pieces = splitByMath(text);
  return pieces
    .map((piece) => {
      if (piece.math) return piece.value;
      return piece.value.replace(pattern, (...args) => replacer(...(args as string[])));
    })
    .join("");
}

function splitByMath(text: string): Array<{ value: string; math: boolean }> {
  const pieces: Array<{ value: string; math: boolean }> = [];
  let i = 0;
  let start = 0;

  while (i < text.length) {
    if (text.startsWith("$$", i)) {
      const end = findUnescaped(text, "$$", i + 2);
      if (end !== -1) {
        if (start < i) pieces.push({ value: text.slice(start, i), math: false });
        pieces.push({ value: text.slice(i, end + 2), math: true });
        i = end + 2;
        start = i;
        continue;
      }
    }

    if (text[i] === "$" && text[i - 1] !== "\\") {
      const end = findUnescaped(text, "$", i + 1);
      if (end !== -1) {
        if (start < i) pieces.push({ value: text.slice(start, i), math: false });
        pieces.push({ value: text.slice(i, end + 1), math: true });
        i = end + 1;
        start = i;
        continue;
      }
    }

    i++;
  }

  if (start < text.length) pieces.push({ value: text.slice(start), math: false });
  return pieces.length > 0 ? pieces : [{ value: text, math: false }];
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

function mergeAdjacentMath(text: string): string {
  let prev = "";
  let current = text;
  while (prev !== current) {
    prev = current;
    current = current
      .replace(/\$([^$]+)\$(\s*[+\-=<>*/]\s*)\$([^$]+)\$/g, (_, a, op, b) => `$${a}${op}${b}$`)
      .replace(/\$([^$]+)\$\s+x\s+\$([^$]+)\$/g, (_, a, b) => `$${a} \\times ${b}$`);
  }
  return current;
}
