import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "SMMPanel - Social Media Marketing Services",
    template: "%s | SMMPanel",
  },
  description: "Professional social media marketing services panel for creators, businesses, and resellers.",
  keywords: ["SMM", "social media marketing", "followers", "engagement", "promotion"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
