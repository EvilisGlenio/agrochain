"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Loader2, TrendingUp, Wallet } from "lucide-react";
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

  const availableBalance = parseToken(snapshot.agroBalance);
  const stakedBalance = parseToken(snapshot.stakedAmount);
  const claimableRewards = parseToken(snapshot.earned);
  const unclaimedRewards = parseToken(snapshot.unclaimedRewards);
  const inputAmount = parseToken(amount);
  const aprPercent = formatApr(snapshot.currentAprBps);
  const annualEstimate = inputAmount > 0 && snapshot.currentAprBps !== "indisponível"
    ? (inputAmount * Number(snapshot.currentAprBps)) / 10_000
    : 0;
  const nextPosition = inputAmount > 0 ? stakedBalance + inputAmount : stakedBalance;
  const sliderMax = Math.max(availableBalance, 1);
  const stakePercent = availableBalance > 0 ? Math.min((inputAmount / availableBalance) * 100, 100) : 0;
  const canClaim = claimableRewards > 0;

  const statusItems = useMemo(() => {
    return [
      {
        tone: snapshot.address ? "success" : "pending",
        title: "Carteira conectada",
        detail: snapshot.address || "Conecte a carteira para interagir com o contrato.",
      },
      {
        tone: missingAddressKeys.length === 0 ? "success" : "pending",
        title: "Contratos prontos",
        detail: missingAddressKeys.length === 0 ? "Todos os enderecos estao configurados." : `Faltam enderecos: ${missingAddressKeys.join(", ")}`,
      },
      {
        tone: canClaim ? "warning" : stakedBalance > 0 ? "success" : "pending",
        title: "Recompensa pendente",
        detail: canClaim
          ? `Ha ${formatCompact(claimableRewards)} AGRO disponiveis para resgate.`
          : stakedBalance > 0
            ? "Posicao ativa. Aguarde novos blocos para acumular recompensa antes de resgatar."
            : "Nenhuma recompensa disponivel ainda.",
      },
      {
        tone: hasSuccess ? "success" : "pending",
        title: "Ultima transacao",
        detail: hasSuccess ? txHash : "Nenhuma transacao recente.",
      },
    ] as const;
  }, [snapshot.address, missingAddressKeys, canClaim, stakedBalance, hasSuccess, txHash, claimableRewards]);

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

      const tx = await staking.claim({ gasLimit: 200_000 });
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
    <div className="staking-layout">
      <section className="staking-header">
        <div>
          <h1 className="mint-title">Staking de AGRO</h1>
          <p className="mint-subtitle">Bloqueie tokens, acompanhe recompensas e use o saldo delegado para governanca quando fizer sentido.</p>
        </div>
        <div className="mint-wallet-pill">
          <span className="status-dot status-dot--success" />
          {snapshot.address ? `${snapshot.address.slice(0, 6)}...${snapshot.address.slice(-4)} · Sepolia` : "Sepolia · carteira nao conectada"}
        </div>
      </section>

      <section className="staking-metrics">
        <MetricCard label="Saldo disponivel" value={formatCompact(availableBalance)} caption="AGRO disponiveis" />
        <MetricCard label="Em staking" value={formatCompact(stakedBalance)} caption="AGRO bloqueados" />
        <MetricCard label="Recompensa acumulada" value={formatCompact(claimableRewards)} caption={canClaim ? "crescendo" : "aguardando acumulacao"} highlight />
        <MetricCard label="APR atual" value={aprPercent} caption={`${snapshot.currentAprBps === "indisponível" ? "indisponível" : `${formatCompact(Number(snapshot.currentAprBps))} bps`} · ao ano`} />
      </section>

      <div className="staking-grid">
        <div className="staking-main">
          <Card className="staking-panel">
            <CardHeader>
              <CardTitle>Adicionar ao staking</CardTitle>
              <CardDescription>Escolha a quantidade de AGRO, veja a estimativa anual e confirme o fluxo de approve seguido de stake.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="field-stack">
                <div className="field-inline-header">
                  <Label htmlFor="stake-amount">Quantidade de AGRO</Label>
                  <button type="button" className="hint-pill hint-pill--button" onClick={() => setAmount(trimAmount(availableBalance))}>
                    Maximo
                  </button>
                </div>
                <div className="stake-input-row">
                  <Input
                    id="stake-amount"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    placeholder="100"
                  />
                  <span className="stake-input-row__suffix">AGRO</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max={sliderMax}
                  step="1"
                  value={Math.min(inputAmount, sliderMax)}
                  onChange={(event) => setAmount(event.target.value)}
                  className="stake-slider"
                />
                <div className="slider-labels">
                  <span>0</span>
                  <span>{Math.round(stakePercent)}%</span>
                  <span>Max {formatCompact(availableBalance)}</span>
                </div>
              </div>

              <div className="stake-estimate-box">
                <EstimateRow label="Rendimento estimado / ano" value={`${formatCompact(annualEstimate)} AGRO`} />
                <EstimateRow label="Posicao apos staking" value={`${formatCompact(nextPosition)} AGRO`} />
              </div>

              <div className="staking-actions">
                <Button onClick={handleConnect} variant="secondary" disabled={isConnecting || !hasEthereum()}>
                  {isConnecting ? <Loader2 size={16} className="animate-spin" /> : <Wallet size={16} />}
                  {snapshot.address ? "Carteira conectada" : "Conectar carteira"}
                </Button>

                <Button onClick={handleStake} size="lg" disabled={isStaking || !amount.trim() || missingAddressKeys.length > 0 || inputAmount <= 0}>
                  {isStaking ? <Loader2 size={16} className="animate-spin" /> : null}
                  Aprovar + fazer staking
                </Button>
              </div>

              <p className="field-hint">Duas transacoes: approve do token AGRO e depois stake no contrato. Gas pago apenas em Sepolia testnet.</p>
            </CardContent>
          </Card>

          <Card className="staking-panel">
            <CardHeader>
              <div className="field-inline-header">
                <div>
                  <CardTitle>Recompensas disponiveis</CardTitle>
                  <CardDescription>Use este bloco para resgatar o que ja acumulou ou seguir para a governanca.</CardDescription>
                </div>
                <span className={`status-tag ${canClaim ? "status-tag--success" : "status-tag--pending"}`}>
                  {canClaim ? "Disponivel" : "Aguardando"}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="reward-highlight">
                <div>
                  <strong className="reward-highlight__value">{formatCompact(claimableRewards)}</strong>
                  <span className="reward-highlight__unit">AGRO</span>
                </div>
                <p className="card__description">{canClaim ? "acumulando" : "sem recompensa disponivel no momento"}</p>
              </div>

              <div className="dual-cta-grid">
                <Button onClick={handleClaim} variant="outline" size="lg" disabled={isClaiming || missingAddressKeys.length > 0 || !canClaim}>
                  {isClaiming ? <Loader2 size={16} className="animate-spin" /> : null}
                  Resgatar recompensas
                </Button>
                <Link href="/governanca" className="dual-cta-link">
                  Ir para governanca
                </Link>
              </div>

              {!canClaim ? (
                <p className="field-hint">O resgate so e liberado quando houver recompensa acumulada. Depois de um stake recente, aguarde novos blocos.</p>
              ) : null}
            </CardContent>
          </Card>
        </div>

        <div className="staking-side">
          <Card className="staking-panel">
            <CardHeader>
              <CardTitle>Sua posicao</CardTitle>
              <CardDescription>Resumo objetivo do estado atual da carteira conectada.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="position-progress">
                <div className="position-progress__head">
                  <span>Participacao da carteira</span>
                  <strong>{formatCompact(stakedBalance > 0 ? Math.min((stakedBalance / Math.max(availableBalance + stakedBalance, 1)) * 100, 100) : 0)}%</strong>
                </div>
                <div className="position-progress__bar">
                  <span style={{ width: `${Math.min((stakedBalance / Math.max(availableBalance + stakedBalance, 1)) * 100, 100)}%` }} />
                </div>
              </div>

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
            </CardContent>
          </Card>

          <Card className="staking-panel">
            <CardHeader>
              <CardTitle>Como funciona</CardTitle>
              <CardDescription>Fluxo minimo para explicar staking na demo sem sobrecarregar o usuario.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="how-it-works-list">
                <HowStep index="1" text="Aprove o contrato para movimentar seus AGRO." />
                <HowStep index="2" text="Faca o stake para bloquear saldo e iniciar o acumulo de recompensa." />
                <HowStep index="3" text="Resgate quando quiser ou use AGRO para participar da governanca." />
              </div>
            </CardContent>
          </Card>

          <Card className="staking-panel">
            <CardHeader>
              <CardTitle>Status da tela</CardTitle>
              <CardDescription>Feedback contextual do fluxo sem expor estados tecnicos desnecessarios.</CardDescription>
            </CardHeader>
            <CardContent>
              {hasSuccess ? (
                <div className="notice notice--success">
                  Transacao concluida. Agora vale atualizar os dados e seguir para a governanca para demonstrar voto com saldo delegado.
                </div>
              ) : null}

              <div style={{ display: "grid", gap: 12 }}>
                <StatusRow label="Carteira" value={snapshot.address || "Nao conectada"} />
                <StatusRow label="Saldo AGRO" value={`${formatCompact(availableBalance)} AGRO`} />
                <StatusRow label="Em staking" value={`${formatCompact(stakedBalance)} AGRO`} />
                <StatusRow label="Recompensa pendente" value={`${formatCompact(unclaimedRewards)} AGRO`} />
                <StatusRow label="Ultima transacao" value={txHash || "Nenhuma transacao enviada ainda"} breakAll />
                <StatusRow label="Erro" value={error || "Sem erros"} tone={error ? "error" : "muted"} breakAll />
                <StatusRow
                  label="Proximo passo"
                  value={
                    hasSuccess
                      ? "Se os votos ja estiverem delegados, abra a governanca para criar ou votar em uma proposta."
                      : canClaim
                        ? "Ja existe recompensa disponivel. Voce pode resgatar ou seguir para a governanca."
                        : "Aguarde a recompensa acumular depois do stake ou siga para a governanca se o objetivo for demonstrar votos delegados."
                  }
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
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

function HowStep({ index, text }: { index: string; text: string }) {
  return (
    <div className="how-step">
      <span className="how-step__index">{index}</span>
      <p>{text}</p>
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

function parseToken(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatCompact(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: value >= 1000 ? 0 : value >= 10 ? 3 : 4,
  }).format(value);
}

function formatApr(value: string) {
  if (value === "indisponível") {
    return "indisponível";
  }

  return `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(Number(value) / 10_000)}%`;
}

function trimAmount(value: number) {
  return value > 0 ? value.toFixed(0) : "0";
}
