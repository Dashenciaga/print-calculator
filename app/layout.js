import localFont from "next/font/local";
import "./globals.css";

// Cera Pro — монгол кирилл (Ө, Ү), ₮ тэмдэгтэй. Regular байхгүй тул 400 жин Medium-ээр харагдана.
const cera = localFont({
  src: [
    { path: "./fonts/CeraPro-Light.woff2",  weight: "300", style: "normal" },
    { path: "./fonts/CeraPro-Medium.woff2", weight: "500", style: "normal" },
    { path: "./fonts/CeraPro-Bold.woff2",   weight: "700", style: "normal" },
    { path: "./fonts/CeraPro-Black.woff2",  weight: "900", style: "normal" },
  ],
  variable: "--font-cera",
  display: "swap",
  fallback: ["system-ui", "-apple-system", "Segoe UI", "sans-serif"],
});

export const metadata = {
  title: "PrintCalc Pro — Хэвлэлийн тооцоолуур",
  description: "Хэвлэлийн зардал, үнийн саналыг хэдхэн секундэд гаргана.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="mn" className={`${cera.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
