export default function Home() {
  return (
    <div className="font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20">
      <main className="flex flex-col gap-[18px] row-start-2 items-center sm:items-start">
        <h1 className="text-5xl sm:text-7xl font-bold text-center sm:text-left">
          Incus
        </h1>
        <h3 className="text-xl sm:text-3xl font-semibold text-center sm:text-left">Turning bold ideas into scalable platforms.</h3>
        <p>Incus Audio Website</p>
        <p>Website under construction.</p>
      </main>
      <footer className="row-start-3 flex gap-[24px] flex-wrap items-center justify-center">
       <p>
        © 2025 Incus | Built by VäxaLab
       </p>
      </footer>
    </div>
  );
}
