import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, Inter } from "next/font/google";
import { contactos, locais, marca, seo } from "@/content/site";
import "./globals.css";

/* Barlow Condensed não é variable font — os pesos têm de ser explícitos. */
const barlowCondensed = Barlow_Condensed({
  variable: "--font-barlow-condensed",
  subsets: ["latin", "latin-ext"],
  weight: ["500", "600", "700", "800"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(seo.url),
  title: {
    default: seo.titulo,
    template: `%s | ${marca.nome}`,
  },
  description: seo.descricao,
  keywords: [...seo.palavrasChave],
  authors: [{ name: marca.nomeCompleto }],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "pt_PT",
    url: seo.url,
    siteName: marca.nomeCompleto,
    title: seo.titulo,
    description: seo.descricao,
    images: [
      {
        url: "/brand/logo.png",
        width: 1024,
        height: 1024,
        alt: `Logótipo da ${marca.nome}`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: seo.titulo,
    description: seo.descricao,
    images: ["/brand/logo.png"],
  },
  icons: {
    icon: "/brand/logo.png",
    apple: "/brand/logo.png",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#231f20",
  colorScheme: "dark",
};

/**
 * Dados estruturados (JSON-LD). Ajuda o Google a mostrar a academia nas
 * pesquisas locais e no Maps — algo que o site atual não tem de todo.
 * As moradas são preenchidas automaticamente a partir de content/site.ts.
 */
function DadosEstruturados() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SportsActivityLocation",
    name: marca.nomeCompleto,
    alternateName: marca.nomeCurto,
    description: seo.descricao,
    url: seo.url,
    logo: `${seo.url}/brand/logo.png`,
    image: `${seo.url}/brand/logo.png`,
    telephone: contactos.telefoneInternacional,
    email: contactos.email,
    foundingDate: String(marca.fundadaEm),
    slogan: marca.lema,
    sameAs: [contactos.instagram, contactos.facebook],
    areaServed: locais.map((l) => ({ "@type": "Place", name: l.nome })),
    location: locais.map((l) => ({
      "@type": "Place",
      name: `${marca.nomeCurto} — ${l.nome}`,
      ...(l.morada
        ? {
            address: {
              "@type": "PostalAddress",
              streetAddress: l.morada,
              addressLocality: l.nome,
              addressCountry: "PT",
            },
          }
        : {}),
    })),
    sport: "Brazilian Jiu-Jitsu",
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
      }}
    />
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-PT"
      data-scroll-behavior="smooth"
      className={`${barlowCondensed.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="bg-dl-ink text-dl-bone flex min-h-full flex-col">
        <DadosEstruturados />
        {children}
      </body>
    </html>
  );
}
