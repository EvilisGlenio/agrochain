import Link from "next/link";

const sections = [
  {
    title: "Mint Lot NFT",
    description: "Create a lot NFT with token URI and product type metadata.",
    href: "/mint",
  },
  {
    title: "Stake AGRO",
    description: "Approve AGRO, stake tokens, and claim staking rewards.",
    href: "/staking",
  },
  {
    title: "DAO Governance",
    description: "Create proposals, vote with delegated balances, and execute updates.",
    href: "/governanca",
  },
];

export default function HomePage() {
  return (
    <>
      <section className="hero">
        <span className="hero__eyebrow">Agro MVP on-chain workflow</span>
        <h2 className="hero__title">A minimal interface for the AgroChain demo flow.</h2>
        <p className="hero__description">
          This frontend is intentionally compact. It focuses on the core interactions required to
          demonstrate the token, lot NFT, staking, and governance flows on localhost or Sepolia.
        </p>
      </section>

      <section className="grid">
        {sections.map((section) => (
          <article key={section.href} className="card">
            <h3 className="card__title">{section.title}</h3>
            <p className="card__description">{section.description}</p>
            <Link href={section.href} className="card__link">
              Open page
            </Link>
          </article>
        ))}
      </section>
    </>
  );
}
