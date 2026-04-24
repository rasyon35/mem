import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import WaitlistForm from "@/components/WaitlistForm";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <main>
      <Navbar />
      <Hero />
      <Features />
      <WaitlistForm />
      <Footer />
    </main>
  );
}
