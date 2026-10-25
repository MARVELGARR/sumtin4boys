/**
 * Renders schema.org JSON-LD in a Server Component.
 *
 * `<` is escaped so a creator-controlled display name or bio can never close
 * the script tag early.
 */
export function JsonLd({ data }: { data: unknown }) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
