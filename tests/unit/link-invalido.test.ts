import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/link-invalido/route";
import { CABECALHO_KIND, CABECALHO_MOTIVO } from "@/lib/link-invalido";

/**
 * O proxy reescreve para esta rota com `kind` e `motivo`. Um `next dev` sem
 * `-H` deita fora a query da reescrita, por isso os dois vão TAMBÉM em
 * cabeçalhos de pedido — e a rota tem de os ler de lá.
 */
describe("página de link inválido", () => {
  const pede = (headers: Record<string, string>, query = "") => GET(new NextRequest(`http://app.test/api/link-invalido${query}`, { headers }));

  it("lê kind e motivo dos cabeçalhos quando a query não chega", async () => {
    const r = await pede({ [CABECALHO_KIND]: "perfil", [CABECALHO_MOTIVO]: "usado" });
    expect(r.status).toBe(410);
    expect(await r.text()).toContain("Este link expirou");
    const r2 = await pede({ [CABECALHO_KIND]: "perfil", [CABECALHO_MOTIVO]: "desconhecido" });
    expect(r2.status).toBe(404);
  });
  it("continua a aceitar a query", async () => {
    const r = await pede({}, "?kind=inscricao&motivo=usado");
    expect(r.status).toBe(410);
    expect(await r.text()).toContain("Este link já não é válido");
  });
});
