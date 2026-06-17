import { Bricolage_Grotesque, Sora, JetBrains_Mono } from "next/font/google";
import ProtectionProvider from "@/components/ui/ProtectionProvider";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  variable: "--font-bricolage",
  display: "swap",
});

const sora = Sora({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-sora",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jetbrains",
  display: "swap",
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`light ${bricolage.variable} ${sora.variable} ${jetbrains.variable}`}
    >
      <body>
        {/* Runs before paint to avoid flash of wrong theme */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(localStorage.getItem('zk-theme')==='dark')document.documentElement.classList.remove('light')}catch(e){}`,
          }}
        />
        <ProtectionProvider />
        {children}
      </body>
    </html>
  );
}
