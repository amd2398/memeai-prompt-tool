
import type { Metadata } from "next";
import "./globals.css";
import AppThemeProvider from "./theme-provider";

export const metadata: Metadata = {
  title: "MemeAI | Prompt Tool",
  description: "Create, manage, and run AI prompt chains.",
};

export default function RootLayout({
                                     children,
                                   }: Readonly<{
  children: React.ReactNode;
}>) {
  return (
      <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
      <AppThemeProvider>
        {children}
      </AppThemeProvider>
      </body>
      </html>
  );
}
