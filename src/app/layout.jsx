import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { AppwriteProvider } from "@/components/providers/AppwriteProvider";

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
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable} h-full`}
    >
      <body
        className={`${GeistSans.className} min-h-full flex flex-col font-sans`}
      >
        <AppwriteProvider>{children}</AppwriteProvider>
      </body>
    </html>
  );
}
