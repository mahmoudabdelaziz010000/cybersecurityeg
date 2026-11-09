/** Search results show about 155-160 characters of a meta description; longer text is cut mid-sentence. */
export const MAX_DESCRIPTION = 160;

/** Shorten a description to `max` characters at a word boundary, ending with an ellipsis. Short text is unchanged. */
export function fitDescription(text: string, max = MAX_DESCRIPTION): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,;:.\-–—]+$/, "")}…`;
}
