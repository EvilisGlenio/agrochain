import Link from "next/link";

const config = {
  network: process.env.NEXT_PUBLIC_NETWORK_NAME ?? "desconhecida",
  chainId: process.env.NEXT_PUBLIC_CHAIN_ID ?? "desconhecido",
  addresses: {
    token: process.env.NEXT_PUBLIC_AGRO_TOKEN ?? "",
    nft: process.env.NEXT_PUBLIC_AGRO_NFT ?? "",
    staking: process.env.NEXT_PUBLIC_AGRO_STAKING ?? "",
    dao: process.env.NEXT_PUBLIC_AGRO_DAO ?? "",
  },
};

const contractStatus = Object.entries(config.addresses).map(([key, value]) => ({
  key,
  configured: Boolean(value),
}));

const configuredCount = contractStatus.filter((item) => item.configured).length;

const sections = [
  {
    eyebrow: "Token utilitário",
    title: "AGRO conecta recompensas, voto e participação econômica.",
    description:
      "O token AGRO é a base econômica do MVP. Ele permite staking, delegação de votos e distribuição de recompensas dentro do fluxo on-chain.",
    cta: "Ver staking",
    href: "/staking",
  },
  {
    eyebrow: "Rastreabilidade",
    title: "Transforme lotes agro em registros digitais rastreáveis.",
    description:
      "A emissão do NFT registra o lote agro com URI e tipo de produto, criando uma camada auditável para procedência e organização da produção.",
    cta: "Emitir NFT",
    href: "/mint",
  },
  {
    eyebrow: "Incentivos",
    title: "Recompense participantes que bloqueiam AGRO no protocolo.",
    description:
      "Usuários podem aprovar AGRO, fazer staking e resgatar recompensas calculadas a partir da lógica do protocolo e da leitura de preço via oracle.",
    cta: "Fazer staking",
    href: "/staking",
  },
  {
    eyebrow: "Governança",
    title: "A comunidade decide ajustes do protocolo por votação.",
    description:
      "A DAO usa saldos delegados do AGRO para abrir propostas, votar e executar mudanças, como ajustes de APR no contrato de staking.",
    cta: "Abrir governança",
    href: "/governanca",
  },
];

const highlights = [
  { value: "ERC-20", label: "Token AGRO com votos delegáveis" },
  { value: "ERC-721", label: "NFTs de lote com metadados" },
  { value: "DAO", label: "Propostas, voto e execução" },
  { value: "Oracle", label: "Chainlink no fluxo de staking" },
];

const steps = [
  {
    index: "01",
    title: "Emita um NFT de lote",
    description: "Registre um lote com URI pública e tipo do produto para iniciar a demonstração de rastreabilidade.",
    href: "/mint",
    cta: "Ir para lotes",
  },
  {
    index: "02",
    title: "Faça staking de AGRO",
    description: "Aprove o token, bloqueie saldo e acompanhe recompensas para demonstrar incentivos econômicos.",
    href: "/staking",
    cta: "Ir para recompensas",
  },
  {
    index: "03",
    title: "Participe da governança",
    description: "Crie uma proposta de APR, vote com saldo delegado e execute a decisão aprovada pela DAO.",
    href: "/governanca",
    cta: "Ir para governança",
  },
];

export default function HomePage() {
  return (
    <>
      <section className="hero">
        <span className="hero__eyebrow">Fluxo agro on-chain</span>
        <h2 className="hero__title">Rastreabilidade e governança para cadeias agro em Web3.</h2>
        <p className="hero__description">
          Registre lotes como NFTs, incentive participação com AGRO e permita decisões coletivas
          via DAO em uma demonstração objetiva para localhost ou Sepolia.
        </p>

        <div className="hero__actions">
          <Link href="/mint" className="card__link">
            Começar demonstração
          </Link>
          <Link href="/governanca" className="hero__link">
            Explorar governança
          </Link>
        </div>
      </section>

      <section className="highlights" aria-label="Resumo do projeto">
        {highlights.map((item) => (
          <article key={item.label} className="highlight">
            <strong className="highlight__value">{item.value}</strong>
            <p className="highlight__label">{item.label}</p>
          </article>
        ))}
      </section>

      <section className="overview">
        <div className="overview__intro">
          <span className="hero__eyebrow">Sobre o projeto</span>
          <h3 className="overview__title">Um MVP acadêmico para mostrar utilidade prática de blockchain no agro.</h3>
          <p className="hero__description">
            A AgroChain conecta rastreabilidade de lotes, incentivos econômicos e tomada de decisão
            coletiva em uma única base on-chain. O foco da interface é reduzir atrito na demonstração
            do fluxo completo.
          </p>
        </div>
      </section>

      <section className="status-panel" aria-label="Ambiente atual">
        <div className="status-panel__header">
          <span className="hero__eyebrow">Ambiente atual</span>
          <h3 className="status-panel__title">Contexto rápido para validar a demo antes de interagir com os contratos.</h3>
        </div>

        <div className="status-grid">
          <article className="status-card">
            <span className="status-card__label">Rede</span>
            <strong className="status-card__value">{config.network}</strong>
          </article>
          <article className="status-card">
            <span className="status-card__label">Chain ID</span>
            <strong className="status-card__value">{config.chainId}</strong>
          </article>
          <article className="status-card">
            <span className="status-card__label">Contratos prontos</span>
            <strong className="status-card__value">{configuredCount}/4</strong>
          </article>
        </div>

        <div className="contract-list">
          {contractStatus.map((item) => (
            <article key={item.key} className="contract-pill">
              <span>{item.key.toUpperCase()}</span>
              <strong>{item.configured ? "Configurado" : "Pendente"}</strong>
            </article>
          ))}
        </div>
      </section>

      <section className="journey" aria-label="Como funciona">
        <div className="journey__header">
          <span className="hero__eyebrow">Como funciona</span>
          <h3 className="overview__title">Um fluxo guiado para a banca entender o valor do protocolo.</h3>
        </div>

        <div className="journey__steps">
          {steps.map((step) => (
            <article key={step.index} className="step-card">
              <span className="step-card__index">{step.index}</span>
              <h4 className="step-card__title">{step.title}</h4>
              <p className="card__description">{step.description}</p>
              <Link href={step.href} className="card__link">
                {step.cta}
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="feature-list">
        {sections.map((section) => (
          <article key={section.title} className="feature-card">
            <span className="feature-card__eyebrow">{section.eyebrow}</span>
            <h3 className="feature-card__title">{section.title}</h3>
            <p className="card__description">{section.description}</p>
            <Link href={section.href} className="card__link">
              {section.cta}
            </Link>
          </article>
        ))}
      </section>
    </>
  );
}
