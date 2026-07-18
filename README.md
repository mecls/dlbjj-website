# Academia DL-BJJ — Landing Page

Nova landing page para a Academia Daniel Lopes (Brazilian Jiu-Jitsu), em
**português de Portugal**. Feita em **Next.js 16 + Tailwind CSS v4**, com as
cores oficiais da marca (vermelho `#ED1C24` e preto `#231F20`, retiradas do
logótipo).

---

## Começar

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # build de produção (site 100% estático)
```

---

## ✅ O que falta preencher (antes de publicar)

**Todo o conteúdo do site está num único ficheiro: [`content/site.ts`](content/site.ts).**
Não é preciso mexer nos componentes. Cada campo em falta está marcado com
`TODO:` e aparece como um aviso vermelho no próprio site enquanto estiver vazio.

Para ver o que ainda falta:

```bash
grep -n "TODO:" content/site.ts
```

### Já preenchido ✓

- **Foto principal (hero)** — foto real da comunidade no tatame
- **Moradas** de Queluz e São Brás
- **Mapas Google** dos dois locais + botão "Como chegar"
- **Foto do Daniel Lopes** — retrato profissional
- **Avaliações do Google** — 6 avaliações reais (Queluz + São Brás), com
  estrelas e selo "via Google"
- **Nota do Google** — 5,0 ★ · 50 avaliações
- **Espaços** — nova secção com 8 fotos reais e "passeio" pelo espaço

### Ainda falta

| O que falta | Onde | Impacto |
|-------------|------|---------|
| **Bio do Daniel Lopes** + graduação/títulos | `professor` | Fator de confiança |
| **Domínio final** para SEO | `seo.url` | Trocar quando estiver decidido |
| **Preços** (opcional — secção está desligada) | `precos` | Ver nota abaixo |

> Cada aviso vermelho no site **desaparece sozinho** assim que o campo for
> preenchido. Quando não houver mais avisos, o site está pronto.

**Nota sobre preços:** a secção de mensalidades foi removida a pedido. Os dados
continuam em `content/site.ts` (`precos`) e o componente em `components/Precos.tsx`,
por isso é fácil repô-la mais tarde (ver "Secções removidas" abaixo).

### Onde colocar as fotos

Todas as fotos vão para `public/fotos/`. Depois, é só apontar o caminho no
`content/site.ts` (ex.: `imagem: "/fotos/hero.jpg"`). Preferir sempre fotos
**landscape** (mais largas que altas), exceto o retrato do Daniel (vertical).

---

## Como está organizado

```
content/site.ts        ← TODO o texto e dados do site (editar aqui)
app/
  layout.tsx           ← metadados SEO (pt-PT), fontes, dados estruturados
  page.tsx             ← ordem das secções
  globals.css          ← cores da marca e estilos base
components/            ← uma secção por ficheiro (Hero, Programas, Espacos, ...)
public/
  brand/               ← logótipo e textura (do site atual)
  programas/           ← imagens gi / nogi / mma (do site atual)
  parceiros/           ← logótipos dos parceiros
  fotos/               ← hero.jpg, daniel-lopes.jpg
  fotos/espacos/       ← fotos da secção "Espaços" (e01…e08)
fotos-originais/        ← 40 fotos originais do WhatsApp (fora do site, não publicadas)
```

---

## Secções removidas (fáceis de repor)

Foram removidas a pedido, mas o código e os dados ficam guardados:

- **Horários** — `components/Horarios.tsx`
- **Mensalidades / Preços** — `components/Precos.tsx`

Para repor uma delas: voltar a importá-la e a renderizá-la em `app/page.tsx`, e
(se quiser no menu) adicionar a entrada em `navegacao` no `content/site.ts`.

---

## O que melhora face ao site atual (dlbjj.pt)

- **Botão "Aula grátis" que converte**: abre o WhatsApp (925 797 266) com uma
  mensagem já escrita, em vez de não levar a lado nenhum.
- **Botão flutuante de WhatsApp** sempre à mão.
- **Avaliações reais do Google** com estrelas e nota 5,0 ★ (50 avaliações).
- **Espaços** — "passeio" pelo espaço com fotos reais e visor em ecrã inteiro.
- **SEO local**: idioma correto (o site atual estava marcado como inglês),
  dados estruturados para o Google Maps, e palavras-chave de Queluz/São Brás.
- **Design** dark e cinematográfico, fiel à faixa e ao monograma da marca.

---

## Publicar (Vercel — recomendado)

O site é estático e faz deploy num clique:

```bash
npm i -g vercel
vercel            # pré-visualização
vercel --prod     # produção
```

Depois é só apontar o domínio `dlbjj.pt` para o projeto na Vercel.
Antes de publicar, atualizar `seo.url` em `content/site.ts` com o domínio final.
# dlbjj-website
