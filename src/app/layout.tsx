import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SignalPage - Role-Specific Landing Pages for Job Seekers",
  description: "Create role-specific landing pages that prove you did your homework. Show companies exactly why you're a great fit with tailored content, a 30/60/90 day plan, and AI-powered insights.",
  openGraph: {
    title: "SignalPage - Stand Out From Generic Applicants",
    description: "Create role-specific landing pages that prove you did your homework.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
