import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LocalPagina } from "@/components/LocalPagina";
import { localPorSlug } from "@/content/site";

const local = localPorSlug("queluz");

export const metadata: Metadata = local
  ? {
      title: { absolute: local.seoTitulo },
      description: local.seoDescricao,
      alternates: { canonical: `/${local.slug}` },
      openGraph: {
        url: `/${local.slug}`,
        title: local.seoTitulo,
        description: local.seoDescricao,
      },
    }
  : {};

export default function QueluzPage() {
  if (!local) notFound();
  return <LocalPagina local={local} />;
}
