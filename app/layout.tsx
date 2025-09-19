import type { Metadata } from "next";

import {
  OG_IMAGE_SIZE,
  TITLE_TEMPLATE,
  getDefaultOgImagePath,
  getLanguageAlternates,
  metadataBase,
  siteMetadata,
} from "@/lib/seo/config";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase,
  title: {
    default: siteMetadata.name,
    template: TITLE_TEMPLATE,
  },
  description: siteMetadata.description,
  applicationName: siteMetadata.shortName,
  keywords: siteMetadata.keywords,
  alternates: {
    canonical: "/",
    languages: getLanguageAlternates(),
  },
  openGraph: {
    type: "website",
    siteName: siteMetadata.name,
    title: siteMetadata.name,
    description: siteMetadata.description,
    url: "/",
    images: [
      {
        url: getDefaultOgImagePath(),
        width: OG_IMAGE_SIZE.width,
        height: OG_IMAGE_SIZE.height,
        alt: siteMetadata.name,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteMetadata.name,
    description: siteMetadata.description,
    images: [getDefaultOgImagePath()],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
