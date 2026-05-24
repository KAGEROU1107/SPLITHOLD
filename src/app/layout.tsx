import type { Metadata } from "next";
import { Toaster } from "react-hot-toast";
import "./globals.css";

export const metadata: Metadata = {
  title: "SplitHold",
  description: "Split bills. Track payments. No awkward chasing."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
