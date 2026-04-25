import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "AgroChain",
  description: "AgroChain MVP dashboard for token, NFT, staking, and DAO flows.",
};

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/mint", label: "Mint" },
  { href: "/staking", label: "Staking" },
  { href: "/governanca", label: "Governanca" },
];

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <div className="app-shell">
          <header className="app-header">
            <div className="app-header__inner">
              <div className="brand">
                <h1 className="brand__title">AgroChain</h1>
                <p className="brand__subtitle">Token, NFT, staking and DAO MVP</p>
              </div>

              <nav className="nav" aria-label="Primary">
                {navItems.map((item) => (
                  <Link key={item.href} href={item.href} className="nav__link">
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>
          </header>

          <main className="app-content">{children}</main>
        </div>
      </body>
    </html>
  );
}
