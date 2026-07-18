/**
 * ============================================================================
 *  DL-BJJ — FONTE ÚNICA DE CONTEÚDO
 * ============================================================================
 *  Todo o texto do site vive neste ficheiro. Para alterar qualquer coisa,
 *  edita aqui — não é preciso mexer nos componentes.
 *
 *  Procura por "TODO:" para encontrar tudo o que falta preencher.
 *  No terminal:  grep -rn "TODO:" content/site.ts
 * ============================================================================
 */

/* ---------------------------------------------------------------- CONTACTOS */

export const contactos = {
  telefone: "925 797 266",
  telefoneInternacional: "+351 925 797 266",
  /** Só dígitos, com indicativo do país. Usado nos links wa.me e tel: */
  telefoneDigitos: "351925797266",
  email: "academiadlbjj@gmail.com",
  instagram: "https://www.instagram.com/academiadlbjj/",
  instagramHandle: "@academiadlbjj",
  facebook: "https://www.facebook.com/profile.php?id=100091435681550",
} as const;

/** Mensagem pré-preenchida do WhatsApp. Aparece já escrita no telemóvel do lead. */
export const whatsappMensagem = `Olá! Vi o site da Academia DL-BJJ e gostaria de marcar uma aula experimental grátis.

Nome:
Modalidade (Jiu-Jitsu / NoGi / MMA):
Local (Queluz / São Brás):`;

export const whatsappUrl = `https://wa.me/${contactos.telefoneDigitos}?text=${encodeURIComponent(
  whatsappMensagem,
)}`;

/* -------------------------------------------------------------------- MARCA */

export const marca = {
  nome: "Academia DL-BJJ",
  nomeCompleto: "Academia Daniel Lopes — Brazilian Jiu-Jitsu",
  nomeCurto: "DL-BJJ",
  fundadaEm: 2016,
  lema: "A firmeza da pegada tem que ser a mesma do caráter.",
  valores: ["Honra", "Disciplina", "Hierarquia"],
} as const;

/* --------------------------------------------------------------------- HERO */

export const hero = {
  sobretitulo: `Desde ${marca.fundadaEm} · Queluz & São Brás`,
  titulo: "Jiu-Jitsu para toda a família",
  destaque: "toda a família",
  subtitulo:
    "Formamos campeões no tatame e na vida. Do mais pequeno ao mais graúdo, ensinamos a arte suave — e a arte do caráter e da humildade.",
  ctaPrimario: "Marcar aula grátis",
  ctaSecundario: "Ver programas",
  /**
   * Foto de fundo do hero (foto real da comunidade no tatame). Para trocar por
   * outra, coloca-a em public/fotos/ e muda o caminho. Se for `null`, é usada a
   * textura de tijolo como fundo temporário.
   */
  imagem: "/fotos/hero-familia.jpg" as string | null,
  imagemAlt: "Alunos e professores da Academia DL-BJJ reunidos no tatame",
} as const;

/* ------------------------------------------------------------- PROVA SOCIAL */

export const provaSocial = {
  /** Ambos os perfis (Queluz e São Brás) estão a 5,0 ★ no Google. */
  googleRating: 5.0 as number | null,
  /** Queluz (23) + São Brás (27) = 50 avaliações no total. */
  googleReviewCount: 50 as number | null,
  googleUrl:
    "https://www.google.com/maps/place/Academia+dl+bjj+queluz/@38.7553468,-9.2555377,17z/data=!4m8!3m7!1s0xd1f37b3d9be0d51:0x2e4cdb4b737859ae!9m1!1b1" as
    | string
    | null,
} as const;

/* ------------------------------------------------------------------- SOBRE */

export const sobre = {
  etiqueta: "A Academia",
  titulo: "Mais que uma equipa, uma família",
  paragrafos: [
    `A Academia DL-BJJ (Daniel Lopes) é uma academia de jiu-jitsu brasileiro. Desde ${marca.fundadaEm} formamos desde o mais pequeno ao mais graúdo não só a arte suave como ensinamos também a arte do caráter e da humildade. Temos como missão formar campeões no tatame e na vida.`,
    "Contamos com professores e instrutores altamente instruídos para a formação de crianças, jovens e adultos de todas as idades que têm como objetivo competir ou evoluir a sua condição física, autoconfiança e defesa pessoal.",
  ],
  assinatura: "Conte connosco.",
} as const;

/* --------------------------------------------------------------- PROFESSOR */

export const professor = {
  nome: "Daniel Lopes",
  /** TODO: BIO — graduação exata. ex.: "Faixa Preta 2.º Grau" */
  graduacao: null as string | null,
  /** TODO: BIO — linhagem / professor. ex.: "Linhagem: Carlos Gracie Jr. › ..." */
  linhagem: null as string | null,
  /**
   * TODO: BIO — escrever 2-3 parágrafos sobre o percurso do Daniel:
   * quando começou, com quem treinou, títulos e competições, porque abriu
   * a academia em 2016, e o que o move como professor.
   */
  bio: [] as string[],
  /** TODO: BIO — títulos e conquistas. ex.: ["Campeão Nacional 2019", ...] */
  titulos: [] as string[],
  foto: "/fotos/daniel-lopes.jpg" as string | null,
} as const;

/* -------------------------------------------------------------- PROGRAMAS */

export type Programa = {
  id: string;
  nome: string;
  descricao: string;
  publico: string;
  imagem: string;
  /** "contain" = recorte transparente (cutout); "cover" = foto real. */
  imagemModo?: "contain" | "cover";
  /** Enquadramento da foto em modo "cover" (ex.: "object-top", "object-center"). */
  imagemPos?: string;
  destaque?: boolean;
};

export const programas: Programa[] = [
  {
    id: "jiu-jitsu",
    nome: "Jiu-Jitsu com Kimono",
    descricao:
      "A base da arte suave. Técnica, alavanca e estratégia — onde o mais pequeno aprende a superar o mais forte. Turmas para crianças, jovens e adultos.",
    publico: "Dos 4 anos aos 60+",
    imagem: "/programas/gi-evento.jpg",
    imagemModo: "cover",
    imagemPos: "object-center",
    destaque: true,
  },
  {
    id: "nogi",
    nome: "NoGi",
    descricao:
      "Jiu-Jitsu sem kimono. Mais rápido, mais dinâmico e a ponte natural para o grappling e o MMA. Ideal para quem quer ritmo e condição física.",
    publico: "Jovens e adultos",
    imagem: "/programas/nogi.png",
  },
  {
    id: "mma",
    nome: "Treino Funcional MMA",
    descricao:
      "Força, explosão e resistência aplicadas ao combate. Um treino completo que constrói o corpo e a mente para o tatame e para a vida.",
    publico: "Jovens e adultos",
    imagem: "/programas/mma.png",
  },
  {
    id: "defesa-pessoal-feminina",
    nome: "Defesa Pessoal Feminina",
    descricao:
      "Um espaço só para mulheres, para aprender a defender-se com confiança. Técnicas simples e eficazes de defesa pessoal, num ambiente seguro e sem intimidação.",
    publico: "Só para mulheres",
    imagem: "/programas/defesa-feminina.jpg",
    imagemModo: "cover",
    imagemPos: "object-top",
  },
];

export const aulasPrivadas = {
  nome: "Aulas Privadas",
  descricao:
    "Atenção individual, ao teu ritmo. Ideal para quem está a começar, para quem prepara uma competição, ou para quem prefere treinar em privado.",
  cta: "Falar sobre aulas privadas",
} as const;

/* ------------------------------------------------------------- BENEFÍCIOS */

/** `icone` = nome de um ícone lucide-react (ver components/Beneficios.tsx). */
export const beneficios = [
  { icone: "ShieldCheck", titulo: "Defesa pessoal", descricao: "Ferramentas reais para te protegeres — e para não teres de o fazer." },
  { icone: "Brain", titulo: "Disciplina", descricao: "O tatame ensina o que os livros não ensinam: constância e respeito." },
  { icone: "Dumbbell", titulo: "Define o corpo", descricao: "Um treino de corpo inteiro que te transforma sem dares por isso." },
  { icone: "HeartPulse", titulo: "Saúde do coração", descricao: "Trabalho cardiovascular constante, sessão após sessão." },
  { icone: "Wind", titulo: "Combate a ansiedade", descricao: "Uma hora no tatame e o stress do dia fica à porta." },
  { icone: "TrendingUp", titulo: "Condição física", descricao: "Força, mobilidade e resistência que se notam fora do tatame." },
  { icone: "Users", titulo: "Comunidade", descricao: "Socializa, cria laços e traz qualidade à alimentação e à rotina." },
] as const;

/* --------------------------------------------------------------- HORÁRIOS */

export type Aula = {
  turma: string;
  dias: string;
  horario: string;
  /** Usado para colorir a etiqueta. */
  tipo: "kids" | "jiu-jitsu" | "mma" | "misto";
};

export type Local = {
  id: string;
  nome: string;
  /** Morada completa (rua, número, código postal, localidade). */
  morada: string | null;
  /** Link do Google Maps para o botão "Como chegar". */
  mapsUrl: string | null;
  /** URL de embed do Google Maps (Partilhar › Incorporar um mapa). */
  mapsEmbed: string | null;
  /** Foto opcional do espaço (alternativa ao mapa). */
  foto: string | null;
  aulas: Aula[];
};

export const locais: Local[] = [
  {
    id: "queluz",
    nome: "Queluz",
    morada: "Av. da República 97, 2745-213 Queluz",
    mapsUrl:
      "https://www.google.com/maps/dir/?api=1&destination=Academia%20DL%20BJJ%20Queluz",
    mapsEmbed:
      "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d12445.492612926973!2d-9.267472101573189!3d38.7551445461482!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0xd1f37b3d9be0d51%3A0x2e4cdb4b737859ae!2sAcademia%20dl%20bjj%20queluz!5e0!3m2!1spt-PT!2spt!4v1784370554826!5m2!1spt-PT!2spt",
    foto: null,
    aulas: [
      { turma: "Mirim 1, 2, 3", dias: "Terça e Quinta", horario: "18:30 – 19:30", tipo: "kids" },
      { turma: "Infantil – Juvenil", dias: "Terça e Quinta", horario: "19:30 – 20:30", tipo: "kids" },
      { turma: "MMA", dias: "Terça e Quinta", horario: "20:30 – 22:00", tipo: "mma" },
      { turma: "Misto (Mirim, Infantil e Juvenil)", dias: "Sábado", horario: "10:00 – 11:00", tipo: "misto" },
      { turma: "MMA", dias: "Sábado", horario: "11:00 – 12:00", tipo: "mma" },
    ],
  },
  {
    id: "sao-bras",
    nome: "São Brás",
    morada: "R. Camilo Pessanha 2A esquerdo, 2700-139 Amadora",
    mapsUrl:
      "https://www.google.com/maps/dir/?api=1&destination=Academia%20DL%20BJJ%20Casal%20de%20S%C3%A3o%20Br%C3%A1s",
    mapsEmbed:
      "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d12445.492612926973!2d-9.267472101573189!3d38.7551445461482!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0xd1ecd8e1ff8f137%3A0x6e452180255deacc!2sACADEMIA%20DL%20BJJ%20001-%20CASAL%20DE%20S%C3%83O%20BR%C3%81S!5e0!3m2!1spt-PT!2spt!4v1784370580078!5m2!1spt-PT!2spt",
    foto: null,
    aulas: [
      { turma: "Jiu-Jitsu", dias: "Segunda a Sexta", horario: "20:30 – 22:00", tipo: "jiu-jitsu" },
    ],
  },
];

/* ----------------------------------------------------------------- PREÇOS */

export type Plano = {
  nome: string;
  preco: string | null;
  periodo: string;
  descricao: string;
  inclui: string[];
  destaque?: boolean;
};

/**
 * TODO: PREÇOS — preencher os valores reais e ajustar/remover planos.
 * Se preferires não mostrar preços publicamente, põe `mostrarPrecos: false`
 * e a secção desaparece do site automaticamente.
 */
export const precos = {
  mostrarPrecos: true,
  etiqueta: "Mensalidades",
  titulo: "Planos simples, sem surpresas",
  subtitulo: "A primeira aula é sempre grátis. Sem fidelização, sem letras pequenas.",
  nota: "TODO: PREÇOS — confirmar se há taxa de inscrição, desconto de família/irmãos e se o kimono está incluído.",
  planos: [
    {
      nome: "1× por semana",
      preco: null, // TODO: PREÇOS — ex.: "30"
      periodo: "/mês",
      descricao: "Para começar sem pressão.",
      inclui: ["1 treino por semana", "Aula experimental grátis", "Sem fidelização"],
    },
    {
      nome: "2× por semana",
      preco: null, // TODO: PREÇOS
      periodo: "/mês",
      descricao: "O ritmo ideal para evoluir a sério.",
      inclui: ["2 treinos por semana", "Aula experimental grátis", "Acesso a seminários", "Sem fidelização"],
      destaque: true,
    },
    {
      nome: "Ilimitado",
      preco: null, // TODO: PREÇOS
      periodo: "/mês",
      descricao: "Para quem quer viver o tatame.",
      inclui: ["Treinos ilimitados", "Todas as modalidades", "Acesso a seminários", "Apoio à competição"],
    },
  ] as Plano[],
} as const;

/* ------------------------------------------------------------ TESTEMUNHOS */

export type Testemunho = {
  texto: string;
  autor: string;
  /** Nº de estrelas (1–5). */
  rating: number;
  /** Origem da avaliação. */
  fonte: "Google";
  /** Local a que se refere. */
  local: string;
};

/**
 * Avaliações reais retiradas dos perfis Google da academia (Queluz e São Brás),
 * ambos a 5,0 ★. A pontuação foi mantida fiel; só ajustei ligeiramente a
 * pontuação/maiúsculas para leitura. Para adicionar mais, é só copiar do Google.
 */
export const testemunhos: Testemunho[] = [
  {
    texto:
      "Mais que uma equipa, uma família. Juntar atividade física, companheirismo e camaradagem é sem dúvida dentro desta academia.",
    autor: "Pedro Silva",
    rating: 5,
    fonte: "Google",
    local: "Queluz",
  },
  {
    texto:
      "Ginásio com um espaço excelente, os professores sempre bem educados e gentis. Recomendo para treinar sem preocupação com a segurança do seu filho — o tratamento com as crianças é impecável!",
    autor: "Emílio Alves de Pinto",
    rating: 5,
    fonte: "Google",
    local: "São Brás",
  },
  {
    texto:
      "Super top! Ótimo clima, ótima localização! Professores super competentes, quem faz uma aula se apaixona!!!",
    autor: "Luiz Gustavo Pereira",
    rating: 5,
    fonte: "Google",
    local: "Queluz",
  },
  {
    texto:
      "Depois de 8 anos parado, encontrei um lugar igual à minha casa do Brasil. Tenho pouco tempo na DL-BJJ mas já me sinto em casa, eu e o meu filho. Agradecemos os ensinamentos. Oss!",
    autor: "Wellington Ferreira",
    rating: 5,
    fonte: "Google",
    local: "São Brás",
  },
  {
    texto:
      "Sem palavras!! Professores e colegas de equipa excepcionais — disciplina, respeito, exercícios, técnicas... Uma experiência única. Sou aluno e indico. Oss!",
    autor: "Emerson Morais",
    rating: 5,
    fonte: "Google",
    local: "Queluz",
  },
  {
    texto:
      "Muito bom, super acessíveis, bom ambiente. Só tenho a agradecer — o meu filho é feliz nos treinos. Muito obrigada pela dedicação e esforço.",
    autor: "Ana Rita Vieira",
    rating: 5,
    fonte: "Google",
    local: "São Brás",
  },
];

/* ---------------------------------------------------------------- ESPAÇOS */

export type Espaco = { src: string; legenda: string };

/**
 * Fotos reais dos espaços, por ordem de "visita" (entrada → tatames → salas).
 * Para trocar ou acrescentar, coloca a foto em public/fotos/espacos/ e adiciona
 * aqui. Há mais fotos originais guardadas em ./fotos-originais (fora do site).
 */
export const espacos: Espaco[] = [
  { src: "/fotos/espacos/e01-rececao.jpg", legenda: "Receção" },
  { src: "/fotos/espacos/e02-tatame-principal.jpg", legenda: "Tatame principal" },
  { src: "/fotos/espacos/e03-tatame.jpg", legenda: "Tatame" },
  { src: "/fotos/espacos/e04-sala-tatame.jpg", legenda: "Sala de treino" },
  { src: "/fotos/espacos/e05-sala-treino.jpg", legenda: "Sala ampla" },
  { src: "/fotos/espacos/e06-sala-espelhos.jpg", legenda: "Sala de espelhos" },
  { src: "/fotos/espacos/e07-mma.jpg", legenda: "Treino de MMA" },
  { src: "/fotos/espacos/e08-comunidade.jpg", legenda: "A nossa comunidade" },
];

/* -------------------------------------------------------------- PARCEIROS */

export const parceiros = [
  { nome: "Bom Café", logo: "/parceiros/bomcafe.png", url: "https://www.instagram.com/bomcafe_1/" },
  { nome: "Croissant de Viena", logo: "/parceiros/croissant-viena.png", url: "https://instagram.com/croissant_de_viena" },
  { nome: "GC Estrelas da Amadora", logo: "/parceiros/estrelas-amadora.png", url: "https://instagram.com/gc_estrelasdaamadora" },
] as const;

/* ------------------------------------------------------------- NAVEGAÇÃO */

export const navegacao = [
  { label: "A Academia", href: "#academia" },
  { label: "Programas", href: "#programas" },
  { label: "Espaços", href: "#espacos" },
  { label: "Locais", href: "#locais" },
] as const;

/* ------------------------------------------------------------- CTA FINAL */

export const ctaFinal = {
  sobretitulo: "Primeira aula grátis",
  titulo: "Venha experimentar uma aula grátis!",
  subtitulo:
    "Traga roupa confortável. O resto é connosco. Sem compromisso, sem inscrição — só o tatame e você.",
  cta: "Marcar pelo WhatsApp",
} as const;

/* ------------------------------------------------------------------- SEO */

export const seo = {
  titulo: "Academia DL-BJJ — Jiu-Jitsu Brasileiro em Queluz e São Brás",
  descricao:
    `Academia de Jiu-Jitsu Brasileiro em Queluz e São Brás desde ${marca.fundadaEm}. Aulas para crianças, jovens e adultos. Honra, Disciplina, Hierarquia. Primeira aula grátis.`,
  /** TODO: SEO — trocar pelo domínio final quando estiver decidido. */
  url: "https://dlbjj.pt",
  palavrasChave: [
    "jiu-jitsu Queluz",
    "BJJ Queluz",
    "jiu-jitsu São Brás",
    "Brazilian Jiu-Jitsu Sintra",
    "artes marciais Queluz",
    "jiu-jitsu para crianças",
    "defesa pessoal Queluz",
    "MMA Queluz",
    "Academia Daniel Lopes",
  ],
} as const;
