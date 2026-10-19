/** Páginas HTML simples servidas por route handlers (sem o layout da app). */
export const ESTILO_BASE = `*{box-sizing:border-box}body{margin:0;font-family:system-ui,-apple-system,sans-serif;background:#f5f5f5;color:#171717;padding:16px}
main{max-width:36rem;margin:0 auto}h1{font-size:1.5rem;margin:0 0 .5rem}p{line-height:1.5}.marca{color:#ED1C24;font-weight:800;letter-spacing:.1em;font-size:.75rem}
.escuro{background:#231F20;color:#fff;min-height:100vh;display:flex;align-items:center;justify-content:center}.escuro main{text-align:center;max-width:28rem}.escuro p{color:#ddd}`;

export function paginaHtml(titulo: string, corpo: string, opts: { escuro?: boolean; estilo?: string } = {}): string {
  return `<!doctype html>
<html lang="pt-PT"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>${titulo} — Academia DL-BJJ</title>
<style>${ESTILO_BASE}${opts.estilo ?? ""}</style></head>
<body class="${opts.escuro ? "escuro" : ""}">${corpo}</body></html>`;
}

export function paginaAviso(titulo: string, texto: string): string {
  return paginaHtml(titulo, `<main><div class="marca">DL-BJJ</div><h1>${titulo}</h1><p>${texto}</p></main>`, { escuro: true });
}

export function escapar(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
