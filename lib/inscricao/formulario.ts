import { locais } from "@/content/site";
import { FAIXA_LABEL, FAIXAS } from "@/lib/alunos/faixas";
import { MODALIDADE_LABEL } from "@/lib/bot/flow";
import { escapar } from "@/lib/html";
import { MODALIDADES } from "./validar";

/**
 * O formulário público como HTML (string), com CSS próprio. Uma só fonte para
 * a página (GET, via dangerouslySetInnerHTML) e para a resposta 422 do route
 * handler — o Next não deixa usar react-dom/server na app, e duplicar o
 * formulário em duas linguagens era pedir para divergirem.
 */
export interface TurmaOpcao {
  id: string;
  local_slug: string;
  turma: string;
  dias: string;
  horario: string;
}

export const ESTILO_FORMULARIO = `
.f{display:grid;gap:14px;background:#fff;border:1px solid #e6e8ec;border-radius:14px;padding:20px}
.f label{display:grid;gap:4px;font-size:.9rem}.f input,.f select,.f textarea{font:inherit;padding:10px;border:1px solid #e6e8ec;border-radius:8px;width:100%}
.f fieldset{border:1px solid #e6e8ec;border-radius:10px;padding:12px 14px;display:grid;gap:12px}.f legend{font-weight:600;padding:0 6px}
.f .erro{color:#b91c1c;font-size:.85rem}.f .aviso{background:#fef2f2;border:1px solid #fecaca;color:#991b1b;padding:10px 12px;border-radius:8px}
.f .check{display:flex;gap:10px;align-items:flex-start}.f .check input{width:auto;margin-top:4px}
.f button{background:#ED1C24;color:#fff;border:0;border-radius:10px;padding:12px;font:inherit;font-weight:600;cursor:pointer}
.f small{color:#6b7280}`;

export function formularioHtml(o: { action: string; valores: Record<string, string>; erros: Record<string, string>; turmas: TurmaOpcao[] }): string {
  const v = (k: string) => escapar(o.valores[k] ?? "");
  const erro = (k: string) => (o.erros[k] ? `<span class="erro">${escapar(o.erros[k])}</span>` : "");
  const input = (nome: string, rotulo: string, attrs = "", ajuda = "") =>
    `<label>${rotulo}<input name="${nome}" value="${v(nome)}" ${attrs}>${ajuda ? `<small>${ajuda}</small>` : ""}${erro(nome)}</label>`;
  const area = (nome: string, rotulo: string, linhas = 3) => `<label>${rotulo}<textarea name="${nome}" rows="${linhas}">${v(nome)}</textarea>${erro(nome)}</label>`;
  const select = (nome: string, rotulo: string, opcoes: [string, string][], porOmissao = "") => {
    const atual = o.valores[nome] || porOmissao;
    return `<label>${rotulo}<select name="${nome}">${opcoes
      .map(([val, txt]) => `<option value="${escapar(val)}"${val === atual ? " selected" : ""}>${escapar(txt)}</option>`)
      .join("")}</select>${erro(nome)}</label>`;
  };
  const check = (nome: string, texto: string) =>
    `<label class="check"><input type="checkbox" name="${nome}"${o.valores[nome] === "on" ? " checked" : ""}><span>${texto}<br>${erro(nome)}</span></label>`;

  const nomeLocal = (slug: string) => locais.find((l) => l.slug === slug)?.nome ?? slug;

  return `<form class="f" action="${escapar(o.action)}" method="post">
${Object.keys(o.erros).length ? '<div class="aviso">Corrige os campos assinalados.</div>' : ""}
<fieldset><legend>Quem se inscreve</legend>
${input("nome", "Nome completo", "required")}
${input("data_nascimento", "Data de nascimento", 'type="date" required')}
${input("phone", "Telemóvel (WhatsApp)", 'inputmode="numeric" required', "Só dígitos, com indicativo. Ex.: 351912345678")}
${input("email", "Email", 'type="email"')}
${input("morada", "Morada")}
${input("nif", "NIF", 'inputmode="numeric"')}
</fieldset>
<fieldset><legend>Encarregado de educação (obrigatório para menores de 18)</legend>
${input("enc_nome", "Nome")}
${input("enc_telefone", "Telemóvel", 'inputmode="numeric"')}
${input("enc_relacao", "Relação (mãe, pai, …)")}
</fieldset>
<fieldset><legend>Saúde e emergência</legend>
${input("contacto_emergencia_nome", "Contacto de emergência — nome")}
${input("contacto_emergencia_telefone", "Contacto de emergência — telemóvel", 'inputmode="numeric"')}
${area("condicoes_saude", "Condições de saúde ou lesões a ter em conta")}
</fieldset>
<fieldset><legend>Treino</legend>
${select("local_slug", "Espaço", locais.map((l) => [l.slug, l.nome]), locais[0].slug)}
${select("modalidade", "Modalidade", MODALIDADES.map((m) => [m, MODALIDADE_LABEL[m]]), "jiu-jitsu")}
${select("faixa", "Faixa atual", FAIXAS.map((f) => [f, FAIXA_LABEL[f]]), "branca")}
${select("graus", "Graus", ["0", "1", "2", "3", "4"].map((g) => [g, g]), "0")}
${select("turma_preferida", "Aula preferida (opcional)", [["", "—"], ...o.turmas.map((t): [string, string] => [t.id, `${nomeLocal(t.local_slug)} · ${t.turma} · ${t.dias} ${t.horario.slice(0, 5)}`])])}
${area("experiencia_previa", "Experiência anterior", 2)}
</fieldset>
<fieldset><legend>Consentimentos</legend>
${check("consentimento_rgpd", "Autorizo a Academia DL-BJJ a tratar estes dados para a gestão da minha inscrição e das aulas (RGPD). <strong>Obrigatório.</strong>")}
${check("consentimento_imagem", "Autorizo o uso de fotografias/vídeos dos treinos nas redes sociais da academia (opcional).")}
</fieldset>
<button type="submit">Concluir inscrição</button>
</form>`;
}
