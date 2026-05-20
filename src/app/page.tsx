import { Nav } from "@/components/landing/Nav";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Mission } from "@/components/landing/Mission";
import { Tournaments } from "@/components/landing/Tournaments";
import { CTA } from "@/components/landing/CTA";
import { Footer } from "@/components/landing/Footer";

export default function LandingPage() {
  return (
    <main>
      <Nav />
      <Hero />
      <HowItWorks />
      <Mission />
      <Tournaments />
      <CTA />
      <Footer />
    </main>
  );
}
