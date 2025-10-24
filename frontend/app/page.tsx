import Button from "@/components/ui/Button";
import Container from "@/components/ui/Container";

export default function Home() {
  return (
    <Container>
      <div className="font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20">
        <main className="flex flex-col gap-[18px] row-start-2 items-center sm:items-start">
          <h1 className="text-5xl sm:text-7xl font-bold text-center sm:text-left">
            Incus
          </h1>
          <h3 className="text-xl sm:text-3xl font-semibold text-center sm:text-left">
            Record Label and Sample Packs.
          </h3>
          <p>Incus Audio Website</p>
          <p>Website under construction.</p>
          <Button>Click me</Button>
        </main>
        <footer className="row-start-3 flex gap-[24px] flex-wrap items-center justify-center">
          <p>
            © 2025 Incus Audio | A{" "}
            <a
              href="https://www.vaxalab.co.uk"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:no-underline"
            >
              VäxaLab
            </a>{" "}
            production
          </p>
        </footer>
      </div>
    </Container>
  );
}
