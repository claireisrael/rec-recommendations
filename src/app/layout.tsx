import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { AppwriteProvider } from "@/components/providers/AppwriteProvider";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-poppins",
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
    <html lang="en" className={`${poppins.variable} h-full`}>
      <body className="min-h-full flex flex-col font-sans antialiased">
        <AppwriteProvider>{children}</AppwriteProvider>
      </body>
    </html>
  );
}
