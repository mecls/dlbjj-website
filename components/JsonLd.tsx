/**
 * Renderiza um bloco de dados estruturados (JSON-LD).
 * O `.replace` é a mitigação de XSS recomendada (JSON.stringify não sanitiza).
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
