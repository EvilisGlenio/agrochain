"use client";

import { useEffect, useState } from "react";
import { Loader2, Wallet } from "lucide-react";
import { ethers } from "ethers";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getMissingAddressKeys, getReadContracts, getWriteContracts } from "@/lib/contracts";
import { connectWallet, getBrowserProvider, getConnectedWallet, getWalletErrorMessage, hasEthereum } from "@/lib/web3";

type StakingSnapshot = {
  address: string;
  agroBalance: string;
  stakedAmount: string;
  unclaimedRewards: string;
  earned: string;
  currentAprBps: string;
};

const emptySnapshot: StakingSnapshot = {
  address: "",
  agroBalance: "0",
  stakedAmount: "0",
  unclaimedRewards: "0",
  earned: "0",
  currentAprBps: "indisponível",
};

export default function StakingPage() {
  const [amount, setAmount] = useState("100");
  const [snapshot, setSnapshot] = useState<StakingSnapshot>(emptySnapshot);
  const [txHash, setTxHash] = useState("");
  const [error, setError] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isStaking, setIsStaking] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);

  const missingAddressKeys = getMissingAddressKeys();
  const hasSuccess = Boolean(txHash) && !error;
  const claimableRewards = Number(snapshot.earned);
  const canClaim = Number.isFinite(claimableRewards) && claimableRewards > 0;

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

      const [agroBalance, stakeInfo] = await Promise.all([
        contracts.token.balanceOf(walletAddress),
        contracts.staking.stakeInfo(walletAddress),
      ]);

      let earned = BigInt(0);
      let currentAprBps = "indisponível";

      try {
        earned = await contracts.staking.earned(walletAddress);
      } catch {
        earned = BigInt(0);
      }

      try {
        currentAprBps = (await contracts.staking.currentAprBps()).toString();
      } catch {
        currentAprBps = "indisponível";
      }

      setSnapshot({
        address: walletAddress,
        agroBalance: ethers.formatUnits(agroBalance, 18),
        stakedAmount: ethers.formatUnits(stakeInfo.amount, 18),
        unclaimedRewards: ethers.formatUnits(stakeInfo.unclaimed, 18),
        earned: ethers.formatUnits(earned, 18),
        currentAprBps,
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

  async function handleStake() {
    setError("");
    setTxHash("");
    setIsStaking(true);

    try {
      const provider = getBrowserProvider();
      const { token, staking, signer } = await getWriteContracts(provider);
      const stakeAmount = ethers.parseUnits(amount, 18);

      const approveTx = await token.approve(await staking.getAddress(), stakeAmount);
      await approveTx.wait();

      const stakeTx = await staking.stake(stakeAmount);
      const receipt = await stakeTx.wait();

      setSnapshot((previous) => ({ ...previous, address: previous.address || signer.address }));
      setTxHash(receipt?.hash ?? stakeTx.hash);
      await loadSnapshot(signer.address);
    } catch (stakeError) {
      setError(getWalletErrorMessage(stakeError));
    } finally {
      setIsStaking(false);
    }
  }

  async function handleClaim() {
    setError("");
    setTxHash("");
    setIsClaiming(true);

    try {
      const provider = getBrowserProvider();
      const { staking, signer } = await getWriteContracts(provider);

      const tx = await staking.claim();
      const receipt = await tx.wait();

      setTxHash(receipt?.hash ?? tx.hash);
      await loadSnapshot(signer.address);
    } catch (claimError) {
      setError(getWalletErrorMessage(claimError));
    } finally {
      setIsClaiming(false);
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
          <CardTitle>Staking de AGRO</CardTitle>
          <CardDescription>
            Aprove AGRO para o contrato de staking, bloqueie tokens e resgate recompensas acumuladas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div style={{ display: "grid", gap: 16 }}>
            <div style={{ display: "grid", gap: 8 }}>
              <Label htmlFor="stake-amount">Quantidade</Label>
              <p className="field-hint">Informe a quantidade de AGRO que deseja bloquear no contrato de staking.</p>
              <Input
                id="stake-amount"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="100"
              />
            </div>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Button onClick={handleConnect} variant="secondary" disabled={isConnecting || !hasEthereum()}>
                {isConnecting ? <Loader2 size={16} className="animate-spin" /> : <Wallet size={16} />}
                {snapshot.address ? "Carteira conectada" : "Conectar carteira"}
              </Button>

              <Button
                onClick={handleStake}
                disabled={isStaking || !amount.trim() || missingAddressKeys.length > 0}
              >
                {isStaking ? <Loader2 size={16} className="animate-spin" /> : null}
                Aprovar + fazer staking
              </Button>

              <Button onClick={handleClaim} variant="outline" disabled={isClaiming || missingAddressKeys.length > 0 || !canClaim}>
                {isClaiming ? <Loader2 size={16} className="animate-spin" /> : null}
                Resgatar
              </Button>
            </div>

            {!canClaim ? (
              <p className="field-hint">
                O resgate só é liberado quando houver recompensa acumulada. Depois de um stake recente, aguarde pelo menos um novo bloco.
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Status do staking</CardTitle>
          <CardDescription>Resumo da posição da carteira conectada.</CardDescription>
        </CardHeader>
        <CardContent>
          <div style={{ display: "grid", gap: 12 }}>
            {hasSuccess ? (
              <div className="notice notice--success">
                Transação concluída. Agora vale atualizar os dados e seguir para a governança para demonstrar voto com saldo delegado.
              </div>
            ) : null}

            <StatusRow label="Carteira" value={snapshot.address || "Não conectada"} />
            <StatusRow label="Saldo AGRO" value={snapshot.agroBalance} />
            <StatusRow label="Quantidade em staking" value={snapshot.stakedAmount} />
            <StatusRow label="Não resgatado" value={snapshot.unclaimedRewards} />
            <StatusRow label="Acumulado" value={snapshot.earned} />
            <StatusRow label="APR atual (bps)" value={snapshot.currentAprBps} />
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
            <StatusRow label="Carregamento" value={isLoading ? "Atualizando estado on-chain..." : "Ocioso"} />
            <StatusRow
              label="Próximo passo"
              value={
                hasSuccess
                  ? "Se os votos já estiverem delegados, abra a governança para criar ou votar em uma proposta."
                  : canClaim
                    ? "Já existe recompensa disponível. Você pode resgatar ou seguir para a governança se os votos já estiverem delegados."
                    : "Conecte a carteira, aprove AGRO e execute o staking. Após um stake recente, aguarde a recompensa acumular antes de resgatar."
              }
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
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
