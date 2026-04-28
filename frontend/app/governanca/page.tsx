"use client";

import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { Loader2, Vote, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getMissingAddressKeys, getReadContracts, getWriteContracts } from "@/lib/contracts";
import { connectWallet, getBrowserProvider, getConnectedWallet, getWalletErrorMessage, hasEthereum } from "@/lib/web3";

type GovernanceSnapshot = {
  address: string;
  proposalCount: string;
  currentBlock: string;
  quorumVotes: string;
  votingDelay: string;
  votingPeriod: string;
};

type ProposalStateKey = "unknown" | "pending" | "active" | "defeated" | "succeeded" | "executed";

type ProposalSnapshot = {
  exists: boolean;
  id: string;
  proposer: string;
  snapshotBlock: string;
  deadlineBlock: string;
  forVotes: string;
  againstVotes: string;
  state: ProposalStateKey;
  executed: boolean;
};

const emptySnapshot: GovernanceSnapshot = {
  address: "",
  proposalCount: "0",
  currentBlock: "0",
  quorumVotes: "0",
  votingDelay: "0",
  votingPeriod: "0",
};

const emptyProposal: ProposalSnapshot = {
  exists: false,
  id: "0",
  proposer: "",
  snapshotBlock: "0",
  deadlineBlock: "0",
  forVotes: "0",
  againstVotes: "0",
  state: "unknown",
  executed: false,
};

const proposalStateLabels: Record<ProposalStateKey, string> = {
  unknown: "Desconhecida",
  pending: "Pendente",
  active: "Votação ativa",
  defeated: "Derrotada",
  succeeded: "Aprovada",
  executed: "Executada",
};

const LOCAL_CHAIN_ID = "31337";

export default function GovernancePage() {
  const [newAprBps, setNewAprBps] = useState("150000");
  const [proposalId, setProposalId] = useState("1");
  const [description, setDescription] = useState("Definir APR do staking para 150000 bps");
  const [snapshot, setSnapshot] = useState<GovernanceSnapshot>(emptySnapshot);
  const [proposal, setProposal] = useState<ProposalSnapshot>(emptyProposal);
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
  const hasSuccess = Boolean(txHash) && !error;
  const numericProposalId = Number(proposalId);
  const isProposalIdValid = Number.isInteger(numericProposalId) && numericProposalId > 0;
  const isLocalNetwork = process.env.NEXT_PUBLIC_CHAIN_ID === LOCAL_CHAIN_ID;

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
      const [proposalCount, quorumVotes, votingDelay, votingPeriod, currentBlock] = await Promise.all([
        contracts.dao.proposalCount(),
        contracts.dao.quorumVotes(),
        contracts.dao.votingDelay(),
        contracts.dao.votingPeriod(),
        provider.getBlockNumber(),
      ]);

      setSnapshot({
        address: walletAddress,
        proposalCount: proposalCount.toString(),
        currentBlock: currentBlock.toString(),
        quorumVotes: quorumVotes.toString(),
        votingDelay: votingDelay.toString(),
        votingPeriod: votingPeriod.toString(),
      });

      if (isProposalIdValid) {
        await loadProposal(provider, numericProposalId);
      } else {
        setProposal(emptyProposal);
      }
    } catch (loadError) {
      setError(getWalletErrorMessage(loadError));
    } finally {
      setIsLoading(false);
    }
  }

  async function loadProposal(providerOverride?: ethers.BrowserProvider, idOverride?: number) {
    const idToLoad = idOverride ?? numericProposalId;

    if (!Number.isInteger(idToLoad) || idToLoad <= 0 || missingAddressKeys.length > 0 || !hasEthereum()) {
      setProposal(emptyProposal);
      return;
    }

    try {
      const provider = providerOverride ?? getBrowserProvider();
      const contracts = await getReadContracts(provider);
      const currentBlock = await provider.getBlockNumber();
      const [proposalRaw, stateRaw, quorumVotes] = await Promise.all([
        contracts.dao.proposals(BigInt(idToLoad)),
        contracts.dao.state(BigInt(idToLoad)),
        contracts.dao.quorumVotes(),
      ]);

      const proposer = proposalRaw.proposer as string;

      if (proposer === ethers.ZeroAddress) {
        setProposal({ ...emptyProposal, id: String(idToLoad) });
        setSnapshot((previous) => ({ ...previous, currentBlock: currentBlock.toString(), quorumVotes: quorumVotes.toString() }));
        return;
      }

      setProposal({
        exists: true,
        id: String(idToLoad),
        proposer,
        snapshotBlock: proposalRaw.snapshotBlock.toString(),
        deadlineBlock: proposalRaw.deadlineBlock.toString(),
        forVotes: proposalRaw.forVotes.toString(),
        againstVotes: proposalRaw.againstVotes.toString(),
        state: mapProposalState(Number(stateRaw)),
        executed: proposalRaw.executed as boolean,
      });

      setSnapshot((previous) => ({ ...previous, currentBlock: currentBlock.toString(), quorumVotes: quorumVotes.toString() }));
    } catch (proposalError) {
      setError(getWalletErrorMessage(proposalError));
    }
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

      const stakingInterface = new ethers.Interface([
        "function setApr(uint256 newAprBps)",
      ]);

      const data = stakingInterface.encodeFunctionData("setApr", [BigInt(newAprBps)]);
      const tx = await dao.propose(staking, 0, data, description);
      const receipt = await tx.wait();
      const nextProposalId = (await dao.proposalCount()).toString();

      setTxHash(receipt?.hash ?? tx.hash);
      setProposalId(nextProposalId);
      setSnapshot((previous) => ({ ...previous, address: previous.address || signer.address }));
      await loadSnapshot(signer.address);
    } catch (proposalError) {
      setError(getWalletErrorMessage(proposalError));
    } finally {
      setIsProposing(false);
    }
  }

  async function handleVote(support: boolean) {
    setError("");
    setTxHash("");
    support ? setIsVotingFor(true) : setIsVotingAgainst(true);

    try {
      const provider = getBrowserProvider();
      const { dao, signer } = await getWriteContracts(provider);
      const tx = await dao.vote(BigInt(proposalId), support);
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
    setError("");
    setTxHash("");
    setIsExecuting(true);

    try {
      const provider = getBrowserProvider();
      const { dao, signer } = await getWriteContracts(provider);
      const tx = await dao.execute(BigInt(proposalId), { value: 0 });
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

  useEffect(() => {
    if (!hasEthereum() || missingAddressKeys.length > 0) {
      return;
    }

    if (!isProposalIdValid) {
      setProposal(emptyProposal);
      return;
    }

    void loadProposal(undefined, numericProposalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proposalId]);

  const canVote = proposal.state === "active";
  const canExecute = proposal.state === "succeeded";
  const voteDisabledReason = getVoteDisabledReason(proposal);
  const executeDisabledReason = getExecuteDisabledReason(proposal);
  const nextStep = getNextStep(proposal, snapshot, isLocalNetwork);

  return (
    <div className="page-grid">
      <Card>
        <CardHeader>
          <CardTitle>Governança</CardTitle>
          <CardDescription>
            Crie propostas de APR, vote com saldos AGRO delegados e execute atualizações aprovadas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div style={{ display: "grid", gap: 20 }}>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Button onClick={handleConnect} variant="secondary" disabled={isConnecting || !hasEthereum()}>
                {isConnecting ? <Loader2 size={16} className="animate-spin" /> : <Wallet size={16} />}
                {snapshot.address ? "Carteira conectada" : "Conectar carteira"}
              </Button>
            </div>

            <div style={{ display: "grid", gap: 12 }}>
              <Label htmlFor="new-apr-bps">Novo APR (bps)</Label>
              <p className="field-hint">Valor em basis points. Exemplo: `150000` representa uma APR alta para fins de demonstração.</p>
              <Input
                id="new-apr-bps"
                value={newAprBps}
                onChange={(event) => {
                  const value = event.target.value;
                  setNewAprBps(value);
                  setDescription(`Definir APR do staking para ${value || "0"} bps`);
                }}
                placeholder="150000"
              />

              <Label htmlFor="proposal-description">Descrição da proposta</Label>
              <p className="field-hint">Descreva a mudança com foco no efeito esperado no protocolo.</p>
              <Input
                id="proposal-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Definir APR do staking para 150000 bps"
              />

              <Button onClick={handlePropose} disabled={isProposing || missingAddressKeys.length > 0 || !newAprBps.trim()}>
                {isProposing ? <Loader2 size={16} className="animate-spin" /> : <Vote size={16} />}
                Criar proposta
              </Button>
            </div>

            <div style={{ display: "grid", gap: 12 }}>
              <Label htmlFor="proposal-id">ID da proposta</Label>
              <Input
                id="proposal-id"
                value={proposalId}
                onChange={(event) => setProposalId(event.target.value)}
                placeholder="1"
              />

              {proposal.exists ? (
                <div className="proposal-state-box">
                  <div className="proposal-state-box__header">
                    <span className={`proposal-state-badge proposal-state-badge--${proposal.state}`}>
                      {proposalStateLabels[proposal.state]}
                    </span>
                    <strong>Proposta #{proposal.id}</strong>
                  </div>
                  <div className="proposal-state-grid">
                    <StatusRow label="Bloco atual" value={snapshot.currentBlock} compact />
                    <StatusRow label="Início da votação" value={proposal.snapshotBlock} compact />
                    <StatusRow label="Fim da votação" value={proposal.deadlineBlock} compact />
                    <StatusRow label="Quórum" value={snapshot.quorumVotes} compact />
                    <StatusRow label="Votos a favor" value={proposal.forVotes} compact />
                    <StatusRow label="Votos contra" value={proposal.againstVotes} compact />
                  </div>
                </div>
              ) : isProposalIdValid ? (
                <div className="notice">Nenhuma proposta encontrada para esse ID ainda.</div>
              ) : null}

              {isLocalNetwork ? (
                <div style={{ display: "grid", gap: 10 }}>
                  <Label>Ferramentas locais</Label>
                  <p className="field-hint">No localhost, a DAO depende de novos blocos para liberar voto e execução.</p>
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <Button onClick={() => void handleMineBlocks(1)} variant="secondary" disabled={isMining}>
                      {isMining ? <Loader2 size={16} className="animate-spin" /> : null}
                      Avançar 1 bloco
                    </Button>
                    <Button onClick={() => void handleMineBlocks(2)} variant="secondary" disabled={isMining}>
                      {isMining ? <Loader2 size={16} className="animate-spin" /> : null}
                      Avançar 2 blocos
                    </Button>
                    <Button onClick={() => void handleMineBlocks(20)} variant="secondary" disabled={isMining}>
                      {isMining ? <Loader2 size={16} className="animate-spin" /> : null}
                      Avançar 20 blocos
                    </Button>
                  </div>
                </div>
              ) : null}

              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <Button onClick={() => void handleVote(true)} variant="outline" disabled={isVotingFor || missingAddressKeys.length > 0 || !canVote}>
                  {isVotingFor ? <Loader2 size={16} className="animate-spin" /> : null}
                  Votar a favor
                </Button>

                <Button
                  onClick={() => void handleVote(false)}
                  variant="outline"
                  disabled={isVotingAgainst || missingAddressKeys.length > 0 || !canVote}
                >
                  {isVotingAgainst ? <Loader2 size={16} className="animate-spin" /> : null}
                  Votar contra
                </Button>

                <Button onClick={handleExecute} disabled={isExecuting || missingAddressKeys.length > 0 || !canExecute}>
                  {isExecuting ? <Loader2 size={16} className="animate-spin" /> : null}
                  Executar
                </Button>
              </div>

              {voteDisabledReason ? <p className="field-hint">Voto indisponível: {voteDisabledReason}</p> : null}
              {executeDisabledReason ? <p className="field-hint">Execução indisponível: {executeDisabledReason}</p> : null}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Status da governança</CardTitle>
          <CardDescription>Resumo da carteira conectada e do estado da DAO.</CardDescription>
        </CardHeader>
        <CardContent>
          <div style={{ display: "grid", gap: 12 }}>
            {hasSuccess ? (
              <div className="notice notice--success">
                Ação de governança enviada. Confirme o resultado no hash e use a próxima etapa para concluir o fluxo da DAO.
              </div>
            ) : null}

            <StatusRow label="Carteira" value={snapshot.address || "Não conectada"} />
            <StatusRow label="Total de propostas" value={snapshot.proposalCount} />
            <StatusRow label="Bloco atual" value={snapshot.currentBlock} />
            <StatusRow
              label="Contratos configurados"
              value={
                missingAddressKeys.length === 0
                  ? "Todos os endereços necessários estão configurados."
                  : `Valores NEXT_PUBLIC ausentes para: ${missingAddressKeys.join(", ")}`
              }
            />
            <StatusRow label="Última transação" value={txHash || "Nenhuma transação enviada ainda"} breakAll />
            <StatusRow label="Erro" value={error || "Sem erros"} tone={error ? "error" : "muted"} breakAll />
            <StatusRow label="Carregamento" value={isLoading ? "Atualizando estado da DAO..." : "Ocioso"} />
            <StatusRow
              label="Próximo passo"
              value={nextStep}
            />
          </div>
        </CardContent>
      </Card>
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

function getVoteDisabledReason(proposal: ProposalSnapshot) {
  if (!proposal.exists) {
    return "selecione uma proposta válida";
  }

  if (proposal.state === "pending") {
    return "a proposta ainda não entrou na janela de votação";
  }

  if (proposal.state === "defeated") {
    return "a proposta já foi derrotada";
  }

  if (proposal.state === "succeeded") {
    return "a proposta já terminou e aguarda execução";
  }

  if (proposal.state === "executed") {
    return "a proposta já foi executada";
  }

  if (proposal.state === "unknown") {
    return "a proposta ainda não existe";
  }

  return "";
}

function getExecuteDisabledReason(proposal: ProposalSnapshot) {
  if (!proposal.exists) {
    return "selecione uma proposta válida";
  }

  if (proposal.state === "pending") {
    return "a votação ainda não começou";
  }

  if (proposal.state === "active") {
    return "a votação ainda está ativa";
  }

  if (proposal.state === "defeated") {
    return "a proposta não atingiu aprovação";
  }

  if (proposal.state === "executed") {
    return "a proposta já foi executada";
  }

  if (proposal.state === "unknown") {
    return "a proposta ainda não existe";
  }

  return "";
}

function getNextStep(proposal: ProposalSnapshot, snapshot: GovernanceSnapshot, isLocalNetwork: boolean) {
  if (!proposal.exists) {
    return "Conecte a carteira com votos delegados, crie a proposta e acompanhe o estado para votar e executar no momento certo.";
  }

  if (proposal.state === "pending") {
    return isLocalNetwork
      ? `A proposta está pendente. Avance blocos até passar do bloco ${proposal.snapshotBlock} para liberar o voto.`
      : `A proposta está pendente. Aguarde a rede avançar até depois do bloco ${proposal.snapshotBlock} para votar.`;
  }

  if (proposal.state === "active") {
    return `A votação está ativa até o bloco ${proposal.deadlineBlock}. Registre seu voto agora.`;
  }

  if (proposal.state === "succeeded") {
    return "A proposta foi aprovada e já pode ser executada.";
  }

  if (proposal.state === "defeated") {
    return `A proposta foi derrotada com ${proposal.forVotes} votos a favor e ${proposal.againstVotes} contra.`;
  }

  if (proposal.state === "executed") {
    return `A proposta já foi executada. O protocolo registrou a conclusão no bloco atual ${snapshot.currentBlock}.`;
  }

  return "Selecione uma proposta válida para consultar o estado da DAO.";
}

function StatusRow({
  label,
  value,
  tone = "muted",
  breakAll = false,
  compact = false,
}: {
  label: string;
  value: string;
  tone?: "muted" | "error";
  breakAll?: boolean;
  compact?: boolean;
}) {
  return (
    <div className={compact ? "status-row status-row--compact" : "status-row"}>
      <Label>{label}</Label>
      <p
        className="card__description"
        style={{
          marginTop: 6,
          color: tone === "error" ? "#fda4af" : undefined,
          overflowWrap: breakAll ? "anywhere" : undefined,
        }}
      >
        {value}
      </p>
    </div>
  );
}
