import "./globals.css";
import { Providers } from "./providers";
import "./styles/chatTokens.module.css";

export const metadata = {
  title: "LINQMI – Home",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css"
        />
        <meta name="theme-color" content="#0a2b57" />
      </head>
      <body><Providers>
        {children}</Providers></body>
    </html>
  );
}
