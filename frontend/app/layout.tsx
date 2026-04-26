import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "AgroChain",
  description: "Painel MVP da AgroChain para fluxos de token, NFT, staking e DAO.",
};

const navItems = [
  { href: "/", label: "Painel" },
  { href: "/mint", label: "Lotes" },
  { href: "/staking", label: "Recompensas" },
  { href: "/governanca", label: "Governança" },
];

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>
        <div className="app-shell">
          <header className="app-header">
            <div className="app-header__inner">
              <div className="brand">
                <h1 className="brand__title">AgroChain</h1>
                <p className="brand__subtitle">Token, NFT, staking e DAO</p>
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
