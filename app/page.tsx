import { Beneficios } from "@/components/Beneficios";
import { CtaFinal } from "@/components/CtaFinal";
import { Espacos } from "@/components/Espacos";
import { Footer } from "@/components/Footer";
import { Hero } from "@/components/Hero";
import { Locais } from "@/components/Locais";
import { Nav } from "@/components/Nav";
import { Parceiros } from "@/components/Parceiros";
import { Programas } from "@/components/Programas";
import { Sobre } from "@/components/Sobre";
import { Testemunhos } from "@/components/Testemunhos";
import { Valores } from "@/components/Valores";
import { WhatsAppFlutuante } from "@/components/WhatsAppFlutuante";

export default function Home() {
  return (
    <>
      <Nav />

      <main id="conteudo" className="flex-1">
        {/* Emoção — quem somos e porquê */}
        <Hero />
        <Valores />
        <Sobre />

        {/* Oferta — o que fazemos */}
        <Programas />
        <Beneficios />

        {/* Prova — o espaço, a comunidade, onde treinar */}
        <Espacos />
        <Testemunhos />
        <Locais />

        {/* Conversão */}
        <CtaFinal />
        <Parceiros />
      </main>

      <Footer />
      <WhatsAppFlutuante />
    </>
  );
}
