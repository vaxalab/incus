import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import CustomCursor from "@/components/ui/CustomCursor";
import Header from "@/components/Header";
import Container from "@/components/ui/Container";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Incus Audio",
  description: "Record Label and Sample Packs.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Container>
          <main className="flex flex-col min-h-screen">
            <Header />
            <div className="flex-1">{children}</div>
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
          </main>
        </Container>

        <CustomCursor />
      </body>
    </html>
  );
}
