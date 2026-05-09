import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Roundpics — World Cup 2026 Predictions",
  description: "Predict the World Cup 2026 with your friends and family. Free, fun, no gambling.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
