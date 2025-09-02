import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext"; 
import { Header } from "@/components/layout/Header";
 
const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Logicortex",
  description: "Autonomous Application Security Platform",
};


export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-900`}>
        <AuthProvider>
          <Header /> 
          <main className="pt-16"> 
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
