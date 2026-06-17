import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LearningOS - National Learning Operating System",
  description:
    "AI-enabled learning platform integrated with India Digital Public Infrastructure for personalized education",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
