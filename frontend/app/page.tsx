import Hero from "@/components/Hero";
import LatestReleases from "@/components/LatestReleases";
import StoreSection from "@/components/StoreSection";
import Divide from "@/components/ui/Divide";

export default function Home() {
  return (
    <>
      <Hero />
      <Divide />
      <LatestReleases />
      <Divide />
      <StoreSection />
    </>
  );
}
