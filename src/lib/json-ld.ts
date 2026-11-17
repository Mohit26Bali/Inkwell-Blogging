/**
 * Serializes data for a <script type="application/ld+json"> tag.
 *
 * Plain JSON.stringify output is NOT safe inside a <script> element: a value such as
 * `</script><script>alert(1)</script>` (a post title, an author's display name, ...) would end the tag
 * early and run attacker-controlled script for every reader of the page. Escaping `<`, `>` and `&`
 * (and the two JS line-separator characters) as \uXXXX keeps the JSON identical once parsed, but makes
 * it impossible to close the tag or open a comment.
 */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}
