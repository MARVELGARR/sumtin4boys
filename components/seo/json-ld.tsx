/**
 * Serialize structured data for an inline script. Escaping every `<` blocks
 * creator-controlled text from closing the script tag early.
 */
export function serializeJsonLd(data: unknown): string {
  return (JSON.stringify(data) ?? "null").replace(/</g, "\\u003c");
}

/** Renders schema.org JSON-LD in a Server Component. */
export function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}
