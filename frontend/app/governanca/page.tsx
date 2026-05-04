"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import { Loader2, Vote, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getMissingAddressKeys, getReadContracts, getWriteContracts } from "@/lib/contracts";
import { connectWallet, getBrowserProvider, getConnectedWallet, getWalletErrorMessage, hasEthereum } from "@/lib/web3";

type ProposalStateKey = "unknown" | "pending" | "active" | "defeated" | "succeeded" | "executed";

type GovernanceSnapshot = {
  address: string;
  proposalCount: number;
  currentBlock: number;
  quorumVotes: number;
  proposalThreshold: number;
  votingPower: number;
  currentAprBps: number;
};

type ProposalCardData = {
  id: number;
  title: string;
  description: string;
  state: ProposalStateKey;
  snapshotBlock: number;
  deadlineBlock: number;
  forVotes: number;
  againstVotes: number;
  hasVoted: boolean;
  executed: boolean;
  quorumReached: boolean;
};

const emptySnapshot: GovernanceSnapshot = {
  address: "",
  proposalCount: 0,
  currentBlock: 0,
  quorumVotes: 0,
  proposalThreshold: 0,
  votingPower: 0,
  currentAprBps: 0,
};

const LOCAL_CHAIN_ID = "31337";

const stateLabels: Record<ProposalStateKey, string> = {
  unknown: "Desconhecida",
  pending: "Pendente",
  active: "Em votação",
  defeated: "Derrotada",
  succeeded: "Aprovada",
  executed: "Executada",
};

export default function GovernancePage() {
  const [aprPercentInput, setAprPercentInput] = useState("15");
  const [description, setDescription] = useState("Definir APR do staking para 15%");
  const [selectedProposalId, setSelectedProposalId] = useState<number | null>(null);
  const [snapshot, setSnapshot] = useState<GovernanceSnapshot>(emptySnapshot);
  const [proposals, setProposals] = useState<ProposalCardData[]>([]);
  const [txHash, setTxHash] = useState("");
  const [error, setError] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isProposing, setIsProposing] = useState(false);
  const [isVotingFor, setIsVotingFor] = useState(false);
  const [isVotingAgainst, setIsVotingAgainst] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isMining, setIsMining] = useState(false);

  const missingAddressKeys = getMissingAddressKeys();
  const isLocalNetwork = process.env.NEXT_PUBLIC_CHAIN_ID === LOCAL_CHAIN_ID;
  const selectedProposal = proposals.find((item) => item.id === selectedProposalId) ?? null;
  const aprBpsValue = Math.round(Number(aprPercentInput || "0") * 10_000);
  const canCreateProposal = snapshot.votingPower >= snapshot.proposalThreshold && aprBpsValue > 0;
  const canVote = selectedProposal?.state === "active" && !selectedProposal.hasVoted;
  const canExecute = selectedProposal?.state === "succeeded";

  const metrics = useMemo(() => {
    return [
      { label: "Total de propostas", value: snapshot.proposalCount.toString(), caption: "na DAO" },
      { label: "Bloco atual", value: formatCompact(snapshot.currentBlock), caption: "Sepolia" },
      { label: "Seu poder de voto", value: formatToken(snapshot.votingPower), caption: "AGRO delegados", highlight: true },
      { label: "APR em vigor", value: formatApr(snapshot.currentAprBps), caption: snapshot.currentAprBps ? `${formatCompact(snapshot.currentAprBps)} bps` : "sem leitura" },
    ];
  }, [snapshot]);

  const statusItems = useMemo(() => {
    return [
      {
        tone: missingAddressKeys.length === 0 ? "success" : "pending",
        title: "Contratos prontos",
        detail: missingAddressKeys.length === 0 ? "Todos os enderecos estao configurados." : `Faltam enderecos: ${missingAddressKeys.join(", ")}`,
      },
      {
        tone: snapshot.address ? "success" : "pending",
        title: "Carteira conectada",
        detail: snapshot.address || "Conecte a carteira para interagir com a DAO.",
      },
      {
        tone: selectedProposal?.state === "active" ? "warning" : selectedProposal?.state === "executed" ? "success" : "pending",
        title: selectedProposal ? `Proposta #${selectedProposal.id}` : "Nenhuma proposta selecionada",
        detail: selectedProposal ? getProposalStatusMessage(selectedProposal) : "Selecione uma proposta para acompanhar o ciclo de governanca.",
      },
      {
        tone: txHash ? "success" : "pending",
        title: "Ultima transacao",
        detail: txHash || "Nenhuma tx recente.",
      },
    ] as const;
  }, [missingAddressKeys, snapshot.address, selectedProposal, txHash]);

  async function loadSnapshot(addressOverride?: string) {
    if (missingAddressKeys.length > 0 || !hasEthereum()) {
      return;
    }

    setIsLoading(true);

    try {
      const provider = getBrowserProvider();
      const connectedWallet = await getConnectedWallet();

      if (!connectedWallet && !addressOverride) {
        return;
      }

      const walletAddress = addressOverride ?? connectedWallet!.address;
      const contracts = await getReadContracts(provider);

      const [proposalCount, quorumVotes, proposalThreshold, currentBlock, votingPower, currentAprBps] = await Promise.all([
        contracts.dao.proposalCount(),
        contracts.dao.quorumVotes(),
        contracts.dao.proposalThreshold(),
        provider.getBlockNumber(),
        contracts.token.getVotes(walletAddress),
        contracts.staking.currentAprBps().catch(() => BigInt(0)),
      ]);

      const nextSnapshot = {
        address: walletAddress,
        proposalCount: Number(proposalCount),
        currentBlock,
        quorumVotes: Number(ethers.formatUnits(quorumVotes, 18)),
        proposalThreshold: Number(ethers.formatUnits(proposalThreshold, 18)),
        votingPower: Number(ethers.formatUnits(votingPower, 18)),
        currentAprBps: Number(currentAprBps),
      };

      setSnapshot(nextSnapshot);

      const proposalsLoaded = await loadProposalCards(provider, Number(proposalCount), walletAddress, nextSnapshot.quorumVotes);
      setProposals(proposalsLoaded);
      setSelectedProposalId((current) => current ?? proposalsLoaded[0]?.id ?? null);
    } catch (loadError) {
      setError(getWalletErrorMessage(loadError));
    } finally {
      setIsLoading(false);
    }
  }

  async function loadProposalCards(provider: ethers.BrowserProvider, proposalCount: number, walletAddress: string, quorumVotes: number) {
    const contracts = await getReadContracts(provider);
    const stakingInterface = new ethers.Interface(["function setApr(uint256 newAprBps)"]);

    const loaded = await Promise.all(
      Array.from({ length: proposalCount }, async (_, index) => {
        const id = proposalCount - index;
        const [proposalRaw, stateRaw, hasVoted] = await Promise.all([
          contracts.dao.proposals(BigInt(id)),
          contracts.dao.state(BigInt(id)),
          contracts.dao.hasVoted(BigInt(id), walletAddress),
        ]);

        let title = `Proposta #${id}`;
        let descriptionText = `Acompanhamento do ciclo da proposta ${id}.`;

        try {
          const decoded = stakingInterface.decodeFunctionData("setApr", proposalRaw.data as string);
          const aprBps = Number(decoded[0]);
          const aprPercent = aprBps / 10_000;
          title = `Definir APR do staking para ${formatCompact(aprPercent)}%`;
          descriptionText = proposalRaw.executed
            ? `Aprovada e executada no protocolo.`
            : mapProposalState(Number(stateRaw)) === "active"
              ? `Encerramento no bloco ${proposalRaw.deadlineBlock.toString()}`
              : `Ciclo registrado entre os blocos ${proposalRaw.snapshotBlock.toString()} e ${proposalRaw.deadlineBlock.toString()}`;
        } catch {
          title = `Proposta #${id}`;
        }

        const forVotes = Number(ethers.formatUnits(proposalRaw.forVotes, 18));
        const againstVotes = Number(ethers.formatUnits(proposalRaw.againstVotes, 18));

        return {
          id,
          title,
          description: descriptionText,
          state: mapProposalState(Number(stateRaw)),
          snapshotBlock: Number(proposalRaw.snapshotBlock),
          deadlineBlock: Number(proposalRaw.deadlineBlock),
          forVotes,
          againstVotes,
          hasVoted,
          executed: proposalRaw.executed as boolean,
          quorumReached: forVotes >= quorumVotes,
        } satisfies ProposalCardData;
      })
    );

    return loaded;
  }

  async function handleConnect() {
    setError("");
    setTxHash("");
    setIsConnecting(true);

    try {
      const { address } = await connectWallet();
      await loadSnapshot(address);
    } catch (connectError) {
      setError(getWalletErrorMessage(connectError));
    } finally {
      setIsConnecting(false);
    }
  }

  async function handlePropose() {
    setError("");
    setTxHash("");
    setIsProposing(true);

    try {
      const provider = getBrowserProvider();
      const { dao, signer } = await getWriteContracts(provider);
      const staking = getDaoProposalTarget();
      const stakingInterface = new ethers.Interface(["function setApr(uint256 newAprBps)"]);
      const data = stakingInterface.encodeFunctionData("setApr", [BigInt(aprBpsValue)]);
      const tx = await dao.propose(staking, 0, data, description);
      const receipt = await tx.wait();

      setTxHash(receipt?.hash ?? tx.hash);
      await loadSnapshot(signer.address);
    } catch (proposalError) {
      setError(getWalletErrorMessage(proposalError));
    } finally {
      setIsProposing(false);
    }
  }

  async function handleVote(support: boolean) {
    if (!selectedProposal) {
      return;
    }

    setError("");
    setTxHash("");
    support ? setIsVotingFor(true) : setIsVotingAgainst(true);

    try {
      const provider = getBrowserProvider();
      const { dao, signer } = await getWriteContracts(provider);
      const tx = await dao.vote(BigInt(selectedProposal.id), support);
      const receipt = await tx.wait();

      setTxHash(receipt?.hash ?? tx.hash);
      await loadSnapshot(signer.address);
    } catch (voteError) {
      setError(getWalletErrorMessage(voteError));
    } finally {
      setIsVotingFor(false);
      setIsVotingAgainst(false);
    }
  }

  async function handleExecute() {
    if (!selectedProposal) {
      return;
    }

    setError("");
    setTxHash("");
    setIsExecuting(true);

    try {
      const provider = getBrowserProvider();
      const { dao, signer } = await getWriteContracts(provider);
      const tx = await dao.execute(BigInt(selectedProposal.id), { value: 0 });
      const receipt = await tx.wait();

      setTxHash(receipt?.hash ?? tx.hash);
      await loadSnapshot(signer.address);
    } catch (executeError) {
      setError(getWalletErrorMessage(executeError));
    } finally {
      setIsExecuting(false);
    }
  }

  async function handleMineBlocks(blocks: number) {
    setError("");
    setIsMining(true);

    try {
      const provider = getBrowserProvider();
      await provider.send("hardhat_mine", [ethers.toQuantity(blocks)]);
      await loadSnapshot();
    } catch (mineError) {
      setError(getWalletErrorMessage(mineError));
    } finally {
      setIsMining(false);
    }
  }

  useEffect(() => {
    if (!hasEthereum() || missingAddressKeys.length > 0) {
      return;
    }

    void loadSnapshot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="governance-layout">
      <section className="staking-header">
        <div>
          <h1 className="mint-title">Governança</h1>
          <p className="mint-subtitle">Vote em propostas e execute decisões aprovadas pela DAO com contexto claro e ações orientadas por estado.</p>
        </div>
        <div className="mint-wallet-pill">
          <span className="status-dot status-dot--success" />
          {snapshot.address ? `${snapshot.address.slice(0, 6)}...${snapshot.address.slice(-4)} · Sepolia` : "Sepolia · carteira nao conectada"}
        </div>
      </section>

      <section className="staking-metrics governance-metrics">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} label={metric.label} value={metric.value} caption={metric.caption} highlight={metric.highlight} />
        ))}
      </section>

      <div className="governance-tabs">
        <button className="governance-tab governance-tab--active" type="button">Propostas</button>
        <button className="governance-tab" type="button" disabled>Historico</button>
        <button className="governance-tab" type="button" disabled>Delegacao</button>
      </div>

      <div className="staking-grid governance-grid">
        <div className="staking-main">
          <Card className="staking-panel">
            <CardHeader>
              <div className="field-inline-header">
                <div>
                  <CardTitle>Nova proposta</CardTitle>
                  <CardDescription>Informe o novo APR em percentual anual. A conversao para basis points ocorre automaticamente.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mint-form-grid">
                <div className="field-stack">
                  <Label htmlFor="new-apr-percent">APR proposto (%)</Label>
                  <Input
                    id="new-apr-percent"
                    value={aprPercentInput}
                    onChange={(event) => {
                      const value = event.target.value;
                      setAprPercentInput(value);
                      setDescription(`Definir APR do staking para ${value || "0"}%`);
                    }}
                    placeholder="15"
                  />
                  <p className="field-hint">Equivale a {formatCompact(aprBpsValue)} bps.</p>
                </div>
                <div className="field-stack">
                  <Label htmlFor="proposal-description">Descricao</Label>
                  <Input
                    id="proposal-description"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder="Definir APR do staking para 15%"
                  />
                </div>
              </div>

              <div className="stake-estimate-box">
                <EstimateRow label="Threshold para propor" value={`${formatToken(snapshot.proposalThreshold)} AGRO`} />
                <EstimateRow label="Seu poder de voto" value={`${formatToken(snapshot.votingPower)} AGRO`} />
              </div>

              <div className="staking-actions">
                <Button onClick={handleConnect} variant="secondary" disabled={isConnecting || !hasEthereum()}>
                  {isConnecting ? <Loader2 size={16} className="animate-spin" /> : <Wallet size={16} />}
                  {snapshot.address ? "Carteira conectada" : "Conectar carteira"}
                </Button>

                <Button onClick={handlePropose} size="lg" disabled={isProposing || missingAddressKeys.length > 0 || !canCreateProposal}>
                  {isProposing ? <Loader2 size={16} className="animate-spin" /> : <Vote size={16} />}
                  Criar proposta
                </Button>
              </div>

              {!canCreateProposal ? <p className="field-hint">Voce precisa ter votos delegados acima do threshold para criar proposta.</p> : null}
            </CardContent>
          </Card>

          <div className="proposal-list">
            {proposals.length === 0 ? (
              <Card className="staking-panel">
                <CardContent>
                  <p className="card__description">Nenhuma proposta registrada ainda.</p>
                </CardContent>
              </Card>
            ) : (
              proposals.map((item) => {
                const totalVotes = item.forVotes + item.againstVotes;
                const forPercent = totalVotes > 0 ? (item.forVotes / totalVotes) * 100 : item.state === "executed" ? 100 : 0;
                const againstPercent = totalVotes > 0 ? (item.againstVotes / totalVotes) * 100 : 0;
                const isSelected = selectedProposalId === item.id;

                return (
                  <article key={item.id} className={`proposal-card${isSelected ? " proposal-card--selected" : ""}`} onClick={() => setSelectedProposalId(item.id)}>
                    <div className="proposal-card__top">
                      <span className={`proposal-state-badge proposal-state-badge--${item.state}`}>{stateLabels[item.state]}</span>
                      <span className="card__description">Proposta #{item.id}</span>
                    </div>
                    <h3 className="proposal-card__title">{item.title}</h3>
                    <p className="card__description">{item.description}</p>

                    <div className="proposal-vote-summary">
                      <span className="proposal-vote-summary__for">A favor · {formatToken(item.forVotes)} AGRO{totalVotes > 0 ? ` · ${Math.round(forPercent)}%` : ""}</span>
                      <span className="proposal-vote-summary__against">Contra · {formatToken(item.againstVotes)} AGRO{totalVotes > 0 ? ` · ${Math.round(againstPercent)}%` : ""}</span>
                    </div>

                    <div className="proposal-vote-bar">
                      <span className="proposal-vote-bar__for" style={{ width: `${forPercent}%` }} />
                      <span className="proposal-vote-bar__against" style={{ width: `${againstPercent}%` }} />
                    </div>

                    <div className="proposal-meta-grid">
                      <MetaMini label="Inicio da votacao" value={`bloco ${formatCompact(item.snapshotBlock)}`} />
                      <MetaMini label="Fim da votacao" value={`bloco ${formatCompact(item.deadlineBlock)}`} />
                      <MetaMini label="Quorum minimo" value={`${formatToken(snapshot.quorumVotes)} AGRO · ${item.quorumReached ? "atingido" : "pendente"}`} />
                    </div>

                    {item.state === "active" ? (
                      <div className="proposal-inline-callout">
                        Seu poder de voto disponivel: <strong>{formatToken(snapshot.votingPower)} AGRO</strong> · {item.hasVoted ? "voce ja votou nesta proposta" : "voce ainda nao votou nesta proposta"}
                      </div>
                    ) : null}

                    <div className="proposal-actions-row">
                      <Button onClick={() => void handleVote(true)} variant="outline" disabled={isVotingFor || item.state !== "active" || item.hasVoted || selectedProposalId !== item.id}>
                        {isVotingFor && selectedProposalId === item.id ? <Loader2 size={16} className="animate-spin" /> : null}
                        Votar a favor
                      </Button>
                      <Button onClick={() => void handleVote(false)} variant="outline" disabled={isVotingAgainst || item.state !== "active" || item.hasVoted || selectedProposalId !== item.id}>
                        {isVotingAgainst && selectedProposalId === item.id ? <Loader2 size={16} className="animate-spin" /> : null}
                        Votar contra
                      </Button>
                      <Button onClick={handleExecute} disabled={isExecuting || item.state !== "succeeded" || selectedProposalId !== item.id}>
                        {isExecuting && selectedProposalId === item.id ? <Loader2 size={16} className="animate-spin" /> : null}
                        Executar
                      </Button>
                    </div>

                    <p className="field-hint">{getActionHint(item)}</p>
                  </article>
                );
              })
            )}
          </div>
        </div>

        <div className="staking-side">
          <Card className="staking-panel">
            <CardHeader>
              <CardTitle>Seu poder de voto</CardTitle>
              <CardDescription>Contexto direto para decidir se voce pode propor, votar ou executar.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="reward-highlight">
                <div>
                  <strong className="reward-highlight__value">{formatToken(snapshot.votingPower)}</strong>
                  <span className="reward-highlight__unit">AGRO</span>
                </div>
                <p className="card__description">tokens delegados para voto</p>
              </div>

              <div className="position-progress">
                <div className="position-progress__head">
                  <span>Threshold para propor</span>
                  <strong>{snapshot.proposalThreshold > 0 ? `${Math.min((snapshot.votingPower / snapshot.proposalThreshold) * 100, 100).toFixed(1)}%` : "0%"}</strong>
                </div>
                <div className="position-progress__bar">
                  <span style={{ width: `${snapshot.proposalThreshold > 0 ? Math.min((snapshot.votingPower / snapshot.proposalThreshold) * 100, 100) : 0}%` }} />
                </div>
              </div>

              <Link href="/staking" className="dual-cta-link">Delegar mais AGRO</Link>
            </CardContent>
          </Card>

          <Card className="staking-panel">
            <CardHeader>
              <CardTitle>Status da DAO</CardTitle>
              <CardDescription>Resumo operacional do momento da governanca.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="status-checklist">
                {statusItems.map((item) => (
                  <div key={item.title} className="status-checklist__item">
                    <span className={`status-dot status-dot--${item.tone}`} />
                    <div>
                      <strong>{item.title}</strong>
                      <p className="card__description">{item.detail}</p>
                    </div>
                  </div>
                ))}
              </div>

              {txHash ? <div className="notice notice--success">Acao de governanca enviada. Confirme o resultado no hash e siga para a proxima etapa do ciclo.</div> : null}
            </CardContent>
          </Card>

          <Card className="staking-panel">
            <CardHeader>
              <CardTitle>Ciclo de governanca</CardTitle>
              <CardDescription>Resumo pedagógico do fluxo para a banca e para usuarios novos em Web3.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="how-it-works-list">
                <HowStep index="1" text="Criar proposta com novo parametro e justificativa." />
                <HowStep index="2" text="Votacao aberta pelo periodo de blocos definido." />
                <HowStep index="3" text="Quorum atingido e proposta aprovada libera execucao." />
                <HowStep index="4" text="Parametro atualizado no protocolo on-chain." />
              </div>

              {isLocalNetwork ? (
                <div className="local-tools-box">
                  <strong>Ferramentas locais</strong>
                  <div className="local-tools-actions">
                    <Button onClick={() => void handleMineBlocks(1)} variant="secondary" disabled={isMining}>
                      {isMining ? <Loader2 size={16} className="animate-spin" /> : null}
                      Avancar 1 bloco
                    </Button>
                    <Button onClick={() => void handleMineBlocks(20)} variant="secondary" disabled={isMining}>
                      {isMining ? <Loader2 size={16} className="animate-spin" /> : null}
                      Avancar 20 blocos
                    </Button>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function getDaoProposalTarget() {
  const target = process.env.NEXT_PUBLIC_AGRO_STAKING ?? "";

  if (!target) {
    throw new Error("NEXT_PUBLIC_AGRO_STAKING ausente");
  }

  return target;
}

function mapProposalState(state: number): ProposalStateKey {
  switch (state) {
    case 1:
      return "pending";
    case 2:
      return "active";
    case 3:
      return "defeated";
    case 4:
      return "succeeded";
    case 5:
      return "executed";
    default:
      return "unknown";
  }
}

function getProposalStatusMessage(proposal: ProposalCardData) {
  if (proposal.state === "active") {
    return `Aguardando votos ate o bloco ${formatCompact(proposal.deadlineBlock)}.`;
  }

  if (proposal.state === "succeeded") {
    return "Aprovada e pronta para execucao.";
  }

  if (proposal.state === "executed") {
    return "Fluxo encerrado com execucao registrada em cadeia.";
  }

  if (proposal.state === "pending") {
    return `Aguardando abertura da votacao no bloco ${formatCompact(proposal.snapshotBlock)}.`;
  }

  return "Proposta acompanhada pela interface.";
}

function getActionHint(proposal: ProposalCardData) {
  if (proposal.state === "executed") {
    return "Proposta ja executada.";
  }

  if (proposal.state === "active") {
    return proposal.hasVoted ? "Seu voto ja foi registrado nesta proposta." : "Votacao aberta. Registre seu voto antes do deadline.";
  }

  if (proposal.state === "succeeded") {
    return "Execucao liberada apos quorum e aprovacao.";
  }

  if (proposal.state === "pending") {
    return "A votacao ainda nao comecou.";
  }

  if (proposal.state === "defeated") {
    return "Proposta derrotada ou sem quorum suficiente.";
  }

  return "Acompanhe o estado da proposta.";
}

function MetricCard({ label, value, caption, highlight = false }: { label: string; value: string; caption: string; highlight?: boolean }) {
  return (
    <article className={`metric-card${highlight ? " metric-card--highlight" : ""}`}>
      <span className="metric-card__label">{label}</span>
      <strong className="metric-card__value">{value}</strong>
      <p className="metric-card__caption">{caption}</p>
    </article>
  );
}

function EstimateRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="estimate-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function MetaMini({ label, value }: { label: string; value: string }) {
  return (
    <div className="proposal-meta-box">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function HowStep({ index, text }: { index: string; text: string }) {
  return (
    <div className="how-step">
      <span className="how-step__index">{index}</span>
      <p>{text}</p>
    </div>
  );
}

function formatCompact(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    notation: value >= 1_000_000 ? "compact" : "standard",
    maximumFractionDigits: value >= 1000 ? 1 : value >= 10 ? 2 : 3,
  }).format(value);
}

function formatToken(value: number) {
  return `${formatCompact(value)} AGRO`;
}

function formatApr(bps: number) {
  return `${formatCompact(bps / 10_000)}%`;
}
