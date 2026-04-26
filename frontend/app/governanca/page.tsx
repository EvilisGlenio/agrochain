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
};

const emptySnapshot: GovernanceSnapshot = {
  address: "",
  proposalCount: "0",
};

export default function GovernancePage() {
  const [newAprBps, setNewAprBps] = useState("150000");
  const [proposalId, setProposalId] = useState("1");
  const [description, setDescription] = useState("Definir APR do staking para 150000 bps");
  const [snapshot, setSnapshot] = useState<GovernanceSnapshot>(emptySnapshot);
  const [txHash, setTxHash] = useState("");
  const [error, setError] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isProposing, setIsProposing] = useState(false);
  const [isVotingFor, setIsVotingFor] = useState(false);
  const [isVotingAgainst, setIsVotingAgainst] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);

  const missingAddressKeys = getMissingAddressKeys();
  const hasSuccess = Boolean(txHash) && !error;

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
      const proposalCount = await contracts.dao.proposalCount();

      setSnapshot({
        address: walletAddress,
        proposalCount: proposalCount.toString(),
      });
    } catch (loadError) {
      setError(getWalletErrorMessage(loadError));
    } finally {
      setIsLoading(false);
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

      setTxHash(receipt?.hash ?? tx.hash);
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

  useEffect(() => {
    if (!hasEthereum() || missingAddressKeys.length > 0) {
      return;
    }

    void loadSnapshot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <Button onClick={() => void handleVote(true)} variant="outline" disabled={isVotingFor || missingAddressKeys.length > 0}>
                  {isVotingFor ? <Loader2 size={16} className="animate-spin" /> : null}
                  Votar a favor
                </Button>

                <Button
                  onClick={() => void handleVote(false)}
                  variant="outline"
                  disabled={isVotingAgainst || missingAddressKeys.length > 0}
                >
                  {isVotingAgainst ? <Loader2 size={16} className="animate-spin" /> : null}
                  Votar contra
                </Button>

                <Button onClick={handleExecute} disabled={isExecuting || missingAddressKeys.length > 0}>
                  {isExecuting ? <Loader2 size={16} className="animate-spin" /> : null}
                  Executar
                </Button>
              </div>
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
              value={
                hasSuccess
                  ? "Se você criou a proposta, avance para votação. Se ela já passou, finalize com a execução."
                  : "Conecte a carteira com votos delegados, crie a proposta e siga para votação e execução."
              }
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

function StatusRow({
  label,
  value,
  tone = "muted",
  breakAll = false,
}: {
  label: string;
  value: string;
  tone?: "muted" | "error";
  breakAll?: boolean;
}) {
  return (
    <div>
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
