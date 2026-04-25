"use client";

import { useEffect, useState } from "react";
import { Loader2, Wallet } from "lucide-react";
import { ethers } from "ethers";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getMissingAddressKeys, getReadContracts, getWriteContracts } from "@/lib/contracts";
import { connectWallet, getBrowserProvider, getWalletErrorMessage, hasEthereum } from "@/lib/web3";

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
  currentAprBps: "unavailable",
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

  async function loadSnapshot(addressOverride?: string) {
    if (missingAddressKeys.length > 0 || !hasEthereum()) {
      return;
    }

    setIsLoading(true);

    try {
      const provider = getBrowserProvider();
      const { address } = await connectWallet();
      const walletAddress = addressOverride ?? address;
      const contracts = await getReadContracts(provider);

      const [agroBalance, stakeInfo] = await Promise.all([
        contracts.token.balanceOf(walletAddress),
        contracts.staking.stakeInfo(walletAddress),
      ]);

      let earned = BigInt(0);
      let currentAprBps = "unavailable";

      try {
        earned = await contracts.staking.earned(walletAddress);
      } catch {
        earned = BigInt(0);
      }

      try {
        currentAprBps = (await contracts.staking.currentAprBps()).toString();
      } catch {
        currentAprBps = "unavailable";
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
    <div className="grid" style={{ gridTemplateColumns: "minmax(0, 1.15fr) minmax(280px, 0.85fr)" }}>
      <Card>
        <CardHeader>
          <CardTitle>Stake AGRO</CardTitle>
          <CardDescription>
            Approve AGRO for the staking contract, lock tokens, and claim rewards as they accrue.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div style={{ display: "grid", gap: 16 }}>
            <div style={{ display: "grid", gap: 8 }}>
              <Label htmlFor="stake-amount">Amount</Label>
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
                {snapshot.address ? "Wallet Connected" : "Connect Wallet"}
              </Button>

              <Button
                onClick={handleStake}
                disabled={isStaking || !amount.trim() || missingAddressKeys.length > 0}
              >
                {isStaking ? <Loader2 size={16} className="animate-spin" /> : null}
                Approve + Stake
              </Button>

              <Button onClick={handleClaim} variant="outline" disabled={isClaiming || missingAddressKeys.length > 0}>
                {isClaiming ? <Loader2 size={16} className="animate-spin" /> : null}
                Claim
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Staking Status</CardTitle>
          <CardDescription>Snapshot of the connected wallet position.</CardDescription>
        </CardHeader>
        <CardContent>
          <div style={{ display: "grid", gap: 12 }}>
            <StatusRow label="Wallet" value={snapshot.address || "Not connected"} />
            <StatusRow label="AGRO balance" value={snapshot.agroBalance} />
            <StatusRow label="Staked amount" value={snapshot.stakedAmount} />
            <StatusRow label="Unclaimed" value={snapshot.unclaimedRewards} />
            <StatusRow label="Earned" value={snapshot.earned} />
            <StatusRow label="Current APR (bps)" value={snapshot.currentAprBps} />
            <StatusRow
              label="Configured contracts"
              value={
                missingAddressKeys.length === 0
                  ? "All required contract addresses are configured."
                  : `Missing NEXT_PUBLIC values for: ${missingAddressKeys.join(", ")}`
              }
            />
            <StatusRow label="Last transaction" value={txHash || "No transaction submitted yet"} breakAll />
            <StatusRow label="Error" value={error || "No errors"} tone={error ? "error" : "muted"} breakAll />
            <StatusRow label="Loading" value={isLoading ? "Refreshing on-chain state..." : "Idle"} />
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
