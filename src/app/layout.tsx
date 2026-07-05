import type { Metadata } from "next";
import "./globals.css";
import "katex/dist/katex.min.css";
import { config as faConfig } from "@fortawesome/fontawesome-svg-core";
import "@fortawesome/fontawesome-svg-core/styles.css";
import Sidebar from "@/components/layout/Sidebar";
import MobileNav from "@/components/layout/MobileNav";
import Header from "@/components/layout/Header";

// Prevent Font Awesome from auto-injecting CSS (we import the CSS above).
faConfig.autoAddCss = false;

export const metadata: Metadata = {
  title: "OAR Math Study Tool",
  description:
    "Unofficial math-only study tool for OAR preparation.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-navy-950 text-ink-primary">
        <a href="#main-content" className="sr-only sr-only-focusable">
          Skip to content
        </a>
        <div className="flex min-h-screen">
          <Sidebar />
          <div className="flex min-h-screen flex-1 flex-col lg:pl-64">
            <Header />
            <main
              id="main-content"
              className="flex-1 px-4 pb-24 pt-4 sm:px-6 lg:px-10 lg:pb-10"
            >
              {children}
              <p className="mt-10 border-t border-line pt-4 text-xs leading-relaxed text-ink-muted">
                Unofficial study tool. Not affiliated with, endorsed by, or sponsored by
                the U.S. Navy, OAR, ASTB, or any testing body.
                <span className="mt-2 block">
                  No account is required and progress is stored locally in your browser.
                </span>
              </p>
            </main>
          </div>
        </div>
        <MobileNav />
      </body>
    </html>
  );
}
