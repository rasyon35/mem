import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import WaitlistForm from "@/components/WaitlistForm";
import Footer from "@/components/Footer";

function App() {
  return (
    <>
      <div className="glow-mesh" />
      <main>
        <Navbar />
        <Hero />
        <Features />
        <WaitlistForm />
        <Footer />
      </main>
    </>
  );
}

export default App;
