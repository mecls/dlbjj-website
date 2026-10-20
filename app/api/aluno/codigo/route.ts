import { NextRequest, NextResponse } from "next/server";
import { alunosDoTelefone } from "@/lib/alunos/consultas";
import { emitirCodigo, sessaoEmBaixo } from "@/lib/aluno/codigos";
import { COOKIE_ENTRAR, opcoesCookie, VALIDADE_ENTRAR_S } from "@/lib/aluno/sessao";
import { sendOutbound } from "@/lib/bot/outbound";
import { botEnabled } from "@/lib/bot/state";
import { supabaseConfigured } from "@/lib/config";
import { normalizarTelefone } from "@/lib/inscricao/validar";
import { ipDe, permitido } from "@/lib/limites";

export const runtime = "nodejs";

/**
 * Passo 1 do login do aluno (design §5.1): pede um código pelo WhatsApp.
 * Conhecido ou não, a resposta é a mesma (não se revela quem é aluno); os
 * limites valem para qualquer número; sem bot ou sem sessão não sai nada.
 */
export async function POST(req: NextRequest) {
  if (!supabaseConfigured()) return new NextResponse("Serviço indisponível", { status: 503 });
  const fd = await req.formData();
  const phone = normalizarTelefone(String(fd.get("telefone") ?? ""));
  const ir = (q: string) => NextResponse.redirect(new URL(`/aluno/entrar${q}`, req.url), 303);

  if (!phone) return ir("?erro=telefone");
  if (
    !(await permitido("codigo-ip", ipDe(req.headers), 10, 900)) ||
    !(await permitido("codigo-telefone", phone, 3, 3600)) ||
    !(await permitido("codigo-global", "academia", 30, 86_400))
  ) {
    return ir("?erro=limite");
  }
  if (!(await botEnabled())) return ir("?erro=bot");
  if (await sessaoEmBaixo()) return ir("?erro=sessao");

  const alunos = await alunosDoTelefone(phone);
  if (alunos.length > 0) {
    const codigo = await emitirCodigo(phone);
    await sendOutbound({
      leadId: null,
      alunoId: alunos[0].id,
      to: phone,
      role: "bot",
      kind: "sistema",
      body: `O teu código para entrar na área de aluno DL-BJJ é *${codigo}*. Vale 10 minutos. Se não pediste este código, ignora esta mensagem.`,
    });
  }
  const res = ir("?passo=codigo");
  res.cookies.set(COOKIE_ENTRAR, phone, opcoesCookie(VALIDADE_ENTRAR_S));
  return res;
}
