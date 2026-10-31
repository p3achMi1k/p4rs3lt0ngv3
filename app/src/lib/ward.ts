const WARD_PATTERNS: RegExp[] = [
  /ignore (all |any )?(previous|prior|above|system) (instructions|rules|prompts)/i,
  /\b(jailbreak|do anything now|dan mode)\b/i,
  /bypass (the )?(safety|filter|guardrail|classifier|moderation|policy)/i,
  /anti-?classifier/i,
  /evade (the )?(filter|detector|classifier|safety|moderation)/i,
  /disable (your |the )?(safety|filter|guard|moderation)/i,
  /\b(unfiltered|uncensored) (mode|response|output)\b/i,
  /reveal (your |the )?(system prompt|hidden instructions)/i,
];

export function wardReason(text: string): string | null {
  const sample = text.slice(0, 8000);
  for (const pattern of WARD_PATTERNS) {
    if (pattern.test(sample)) {
      return "The basilisk seals this spell. The ward refuses requests to slip past a safety system.";
    }
  }
  return null;
}
