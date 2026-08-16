import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Creative Campaign OS",
  description: "SaaS de otimizacao de campanhas da Creative Marketing"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
