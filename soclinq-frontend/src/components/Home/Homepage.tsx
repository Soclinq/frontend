import Header from "@/components/Home/Header";
import Hero from "@/components/Home/Hero";
import Features from "@/components/Home/Features";
import Empower from "@/components/Home/Empower";
import PartnerCTA from "@/components/Home/PartnerCTA";
import MobileSecuritySection from "./MobileSecuritySection";
import ComparisonSection from "./ComparisonSection";
import Footer from "@/components/Home/Footer";
import SosPopup from "@/components/Home/SosPopup";
import AuthModal from "@/components/Home/AuthModal";
import HowItWorks from "./HowItWorks";
export default function HomePage() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <Features />
        <HowItWorks />
        <Empower />
        <MobileSecuritySection />
        <PartnerCTA />

        <ComparisonSection />
      </main>
      <Footer />
      <SosPopup />
      <AuthModal />
    </>
  );
}
