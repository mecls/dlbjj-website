"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Icone, type IconeNome } from "./icones";

export interface NavItem {
  href: string;
  label: string;
  icone: IconeNome;
  badge?: number;
  exact?: boolean;
}

export interface NavSection {
  caption?: string;
  items: NavItem[];
}

function ativo(pathname: string, item: NavItem): boolean {
  if (item.exact || item.href === "/") return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function Item({ item, pathname }: { item: NavItem; pathname: string }) {
  const on = ativo(pathname, item);
  const externo = item.href.startsWith("http");
  const classes = cn(
    "flex h-10 items-center gap-3 rounded-lg px-3 text-[15px] text-app-text transition hover:bg-app-soft",
    on && "bg-app-soft font-medium",
  );
  const conteudo = (
    <>
      <Icone nome={item.icone} className="size-[18px] shrink-0 text-app-icon" />
      <span className="truncate">{item.label}</span>
      {item.badge ? (
        <span data-badge={item.badge} className="ml-auto rounded-full bg-app-accent px-1.5 text-[11px] font-semibold leading-5 text-white">
          {item.badge}
        </span>
      ) : null}
    </>
  );
  return externo ? (
    <a href={item.href} className={classes} target="_blank" rel="noreferrer">
      {conteudo}
    </a>
  ) : (
    <Link href={item.href} className={classes} aria-current={on ? "page" : undefined}>
      {conteudo}
    </Link>
  );
}

export function SidebarNav({ nav, rodape }: { nav: NavSection[]; rodape?: NavItem[] }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-1 flex-col">
      {nav.map((s, i) => (
        <div key={i} className={cn(i > 0 && "mt-6")}>
          {s.caption ? <p className="mb-2 px-3 text-[11px] font-medium uppercase tracking-wider text-app-muted">{s.caption}</p> : null}
          <ul className="space-y-0.5">
            {s.items.map((item) => (
              <li key={item.href}>
                <Item item={item} pathname={pathname} />
              </li>
            ))}
          </ul>
        </div>
      ))}
      {rodape && rodape.length > 0 ? (
        <ul className="mt-auto space-y-0.5 pt-6">
          {rodape.map((item) => (
            <li key={item.href}>
              <Item item={item} pathname={pathname} />
            </li>
          ))}
        </ul>
      ) : null}
    </nav>
  );
}
