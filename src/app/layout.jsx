import { Inter } from "next/font/google";
import "./globals.css";
import { AppwriteProvider } from "@/components/providers/AppwriteProvider";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata = {
  title: "REC Recommendations & Actions",
  description:
    "Renewable Energy Conference Recommendations — explore impactful actions and partnerships driving the energy transition.",
};

/**
 * @param {{ children: import("react").ReactNode }} props
 */
export default function RootLayout({ children }) {
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
