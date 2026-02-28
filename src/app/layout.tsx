import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Peraturan Perpajakan Indonesia",
  description: "Pencarian peraturan perpajakan Indonesia - Database lengkap peraturan perundang-undangan perpajakan",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className="antialiased min-h-screen bg-background">
        {children}
      </body>
    </html>
  );
}
