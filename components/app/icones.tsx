import {
  Activity,
  Bell,
  Bot,
  CalendarCheck,
  CalendarDays,
  CalendarPlus,
  Dumbbell,
  Globe,
  House,
  LayoutGrid,
  LogOut,
  Menu,
  MessageCircle,
  MessageSquare,
  RotateCcw,
  Sparkles,
  Trophy,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";

/** Nomes serializáveis (passam de server para client components) → ícone lucide. */
export type IconeNome =
  | "inicio"
  | "historico"
  | "ranking"
  | "calendario"
  | "mensagens"
  | "alunos"
  | "aulas"
  | "eventos"
  | "reativacao"
  | "perguntar"
  | "agente"
  | "whatsapp"
  | "site"
  | "sair"
  | "sino"
  | "menu"
  | "presencas"
  | "inscricoes"
  | "turma";

const MAPA: Record<IconeNome, LucideIcon> = {
  inicio: House,
  historico: Activity,
  ranking: Trophy,
  calendario: CalendarDays,
  mensagens: MessageSquare,
  alunos: Users,
  aulas: Dumbbell,
  eventos: CalendarPlus,
  reativacao: RotateCcw,
  perguntar: Sparkles,
  agente: Bot,
  whatsapp: MessageCircle,
  site: Globe,
  sair: LogOut,
  sino: Bell,
  menu: Menu,
  presencas: CalendarCheck,
  inscricoes: UserPlus,
  turma: LayoutGrid,
};

export function Icone({ nome, className }: { nome: IconeNome; className?: string }) {
  const C = MAPA[nome];
  return <C className={className} strokeWidth={1.75} aria-hidden />;
}
