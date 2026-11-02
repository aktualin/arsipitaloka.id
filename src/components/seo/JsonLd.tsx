/**
 * Komponen JSON-LD (schema.org).
 *
 * Dipakai di Server Component. Isi JSON di-escape (`<` → `<`) supaya
 * aman disisipkan ke dalam tag `<script>`.
 */
export default function JsonLd({ data }: { data: unknown }) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");

  return (
    <script
      type="application/ld+json"
      // Data structured data memang perlu ditulis apa adanya sebagai JSON.
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
