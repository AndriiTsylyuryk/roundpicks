import type { Metadata } from "next";
import { Anton, Montserrat, Poppins } from "next/font/google";
import "./globals.css";

const anton = Anton({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-ui",
  display: "swap",
});

const poppins = Poppins({
  weight: ["300", "400", "500", "600"],
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Roundpicks — World Cup 2026 Predictions",
  description: "Predict the World Cup 2026 with your friends and family. Free, fun, no gambling.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${anton.variable} ${montserrat.variable} ${poppins.variable}`}>
      <body>{children}</body>
    </html>
  );
}
