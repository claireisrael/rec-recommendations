import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppwriteProvider } from "@/components/providers/AppwriteProvider";

/** Exact font family used by NREP-HR-project */
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "REC Recommendations & Actions",
  description:
    "Renewable Energy Conference Recommendations — explore impactful actions and partnerships driving the energy transition.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <body
        className={`${inter.className} min-h-full flex flex-col font-sans antialiased`}
      >
        <AppwriteProvider>{children}</AppwriteProvider>
      </body>
    </html>
  );
}
