/**
 * Construtores de dados estruturados (JSON-LD / schema.org).
 * - Homepage: uma Organization (organização-mãe).
 * - Cada página de local: um SportsActivityLocation ligado à Organization.
 * Sem aggregateRating/Review (as avaliações vivem no Google Business Profile).
 */
import {
  contactos,
  horarioFuncionamento,
  locais,
  marca,
  seo,
  type Local,
} from "@/content/site";

const ORG_ID = `${seo.url}/#organizacao`;

/** dias.pt → schema.org DayOfWeek, mantendo a ordem da semana. */
const DIAS_SEMANA: { pt: string; en: string }[] = [
  { pt: "segunda", en: "Monday" },
  { pt: "terça", en: "Tuesday" },
  { pt: "quarta", en: "Wednesday" },
  { pt: "quinta", en: "Thursday" },
  { pt: "sexta", en: "Friday" },
  { pt: "sábado", en: "Saturday" },
  { pt: "domingo", en: "Sunday" },
];

/** Dias (schema.org) em que o local tem aulas, ordenados de segunda a domingo. */
function diasDeFuncionamento(local: Local): string[] {
  const texto = local.aulas
    .map((a) => a.dias.toLowerCase())
    .join(" | ");
  return DIAS_SEMANA.filter(({ pt }) => texto.includes(pt)).map(({ en }) => en);
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": ORG_ID,
    name: marca.nomeCompleto,
    alternateName: marca.nomeCurto,
    url: seo.url,
    logo: `${seo.url}/brand/logo.png`,
    image: `${seo.url}/brand/logo.png`,
    description: seo.descricao,
    telephone: contactos.telefoneInternacional,
    email: contactos.email,
    foundingDate: String(marca.fundadaEm),
    slogan: marca.lema,
    sameAs: [contactos.instagram, contactos.facebook],
    areaServed: [...new Set(locais.map((l) => l.localidade))].map((nome) => ({
      "@type": "Place",
      name: nome,
    })),
    subOrganization: locais.map((l) => ({
      "@id": `${seo.url}/${l.slug}#academia`,
    })),
  };
}

export function locationJsonLd(local: Local) {
  const dias = diasDeFuncionamento(local);
  return {
    "@context": "https://schema.org",
    "@type": "SportsActivityLocation",
    "@id": `${seo.url}/${local.slug}#academia`,
    name: `${marca.nome} — ${local.nome}`,
    description: local.seoDescricao,
    url: `${seo.url}/${local.slug}`,
    image: `${seo.url}/brand/logo.png`,
    telephone: contactos.telefoneInternacional,
    email: contactos.email,
    sport: "Brazilian Jiu-Jitsu",
    address: {
      "@type": "PostalAddress",
      streetAddress: local.rua,
      postalCode: local.codigoPostal,
      addressLocality: local.localidade,
      addressCountry: "PT",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: local.coordenadas.lat,
      longitude: local.coordenadas.lng,
    },
    ...(local.mapsUrl ? { hasMap: local.mapsUrl } : {}),
    ...(dias.length
      ? {
          openingHoursSpecification: {
            "@type": "OpeningHoursSpecification",
            dayOfWeek: dias,
            opens: horarioFuncionamento.abre,
            closes: horarioFuncionamento.fecha,
          },
        }
      : {}),
    sameAs: [contactos.instagram, contactos.facebook],
    parentOrganization: { "@id": ORG_ID },
  };
}
