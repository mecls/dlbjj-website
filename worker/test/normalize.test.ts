import { describe, expect, it } from "vitest";
import { normalizarEntrada } from "../src/inbound/normalize";
import { mensagemRecebida } from "./fake-gateway";

describe("normalizarEntrada", () => {
  it("texto de um DM → mensagem com telefone, texto, id e nome", () => {
    const r = normalizarEntrada(mensagemRecebida({ phone: "351911111111", text: "Olá", id: "wamid.1", name: "Rita" }));
    expect(r).toEqual({ kind: "mensagem", phone: "351911111111", chatId: "351911111111@c.us", text: "Olá", id: "wamid.1", name: "Rita" });
  });

  it("um remetente @lid usa o senderPhone resolvido pelo motor", () => {
    const r = normalizarEntrada(mensagemRecebida({ phone: "351922222222", text: "oi", lid: true }));
    expect(r).toMatchObject({ kind: "mensagem", phone: "351922222222" });
  });

  it("um @lid sem telefone resolvido é descartado com motivo", () => {
    const m = { ...mensagemRecebida({ phone: "351922222222", text: "oi", lid: true }), senderPhone: null, contact: undefined };
    expect(normalizarEntrada(m)).toEqual({ kind: "descartar", motivo: "sem telefone (@lid)" });
  });

  it("grupos e estados são descartados", () => {
    expect(normalizarEntrada({ ...mensagemRecebida({ phone: "351911111111", text: "x" }), isGroup: true })).toEqual({ kind: "descartar", motivo: "grupo" });
    expect(normalizarEntrada({ ...mensagemRecebida({ phone: "351911111111", text: "x" }), isStatusBroadcast: true })).toEqual({ kind: "descartar", motivo: "estado" });
  });

  it("foto e áudio viram os textos de sempre", () => {
    expect(normalizarEntrada(mensagemRecebida({ phone: "351911111111", text: "", type: "image" }))).toMatchObject({ text: "[foto recebida]" });
    expect(normalizarEntrada(mensagemRecebida({ phone: "351911111111", text: "legenda", type: "image" }))).toMatchObject({ text: "legenda" });
    expect(normalizarEntrada(mensagemRecebida({ phone: "351911111111", text: "", type: "audio" }))).toMatchObject({ text: "[áudio]" });
    expect(normalizarEntrada(mensagemRecebida({ phone: "351911111111", text: "", type: "ptt" }))).toMatchObject({ text: "[áudio]" });
    expect(normalizarEntrada(mensagemRecebida({ phone: "351911111111", text: "", type: "sticker" }))).toMatchObject({ text: "[mensagem não suportada]" });
  });

  it("o eco de uma mensagem nossa (fromMe) é um eco, não uma mensagem", () => {
    const r = normalizarEntrada({ ...mensagemRecebida({ phone: "351911111111", text: "Olá", id: "wamid.out" }), fromMe: true });
    expect(r).toEqual({ kind: "eco", id: "wamid.out", phone: "351911111111", chatId: "351911111111@c.us", text: "Olá" });
  });

  it("lixo não rebenta", () => {
    expect(normalizarEntrada(null)).toEqual({ kind: "descartar", motivo: "payload inválido" });
    expect(normalizarEntrada({ id: 1 })).toEqual({ kind: "descartar", motivo: "payload inválido" });
  });
});
