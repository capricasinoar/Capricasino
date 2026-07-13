import { Header } from "@/components/header";
import {
  Hero,
  FeaturedGames,
  HowItWorks,
  Promos,
  Vip,
  ProvablyFair,
  FinalCta,
  Footer,
} from "@/components/sections";

export default function LandingPage() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <FeaturedGames />
        <HowItWorks />
        <Promos />
        <Vip />
        <ProvablyFair />
        <FinalCta />
      </main>
      <Footer />
    </>
  );
}
