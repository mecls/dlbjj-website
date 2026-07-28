import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, Inter } from "next/font/google";
import { marca, seo } from "@/content/site";
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
        width: 1191,
        height: 1191,
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
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#231f20",
  colorScheme: "dark",
};

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
        {children}
      </body>
    </html>
  );
}
