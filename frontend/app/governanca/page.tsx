"use client";

import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { Loader2, Vote, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getDaoContract, getMissingAddressKeys, getReadContracts, getWriteContracts } from "@/lib/contracts";
import { connectWallet, getBrowserProvider, getWalletErrorMessage, hasEthereum } from "@/lib/web3";

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
  const [description, setDescription] = useState("Set staking APR to 150000 bps");
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
      const daoInterface = getDaoContract(signer);
      void daoInterface;

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
    <div className="grid" style={{ gridTemplateColumns: "minmax(0, 1.15fr) minmax(280px, 0.85fr)" }}>
      <Card>
        <CardHeader>
          <CardTitle>Governanca</CardTitle>
          <CardDescription>
            Create APR proposals, vote with delegated AGRO balances, and execute successful updates.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div style={{ display: "grid", gap: 20 }}>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Button onClick={handleConnect} variant="secondary" disabled={isConnecting || !hasEthereum()}>
                {isConnecting ? <Loader2 size={16} className="animate-spin" /> : <Wallet size={16} />}
                {snapshot.address ? "Wallet Connected" : "Connect Wallet"}
              </Button>
            </div>

            <div style={{ display: "grid", gap: 12 }}>
              <Label htmlFor="new-apr-bps">New APR (bps)</Label>
              <Input
                id="new-apr-bps"
                value={newAprBps}
                onChange={(event) => {
                  const value = event.target.value;
                  setNewAprBps(value);
                  setDescription(`Set staking APR to ${value || "0"} bps`);
                }}
                placeholder="150000"
              />

              <Label htmlFor="proposal-description">Proposal description</Label>
              <Input
                id="proposal-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Set staking APR to 150000 bps"
              />

              <Button onClick={handlePropose} disabled={isProposing || missingAddressKeys.length > 0 || !newAprBps.trim()}>
                {isProposing ? <Loader2 size={16} className="animate-spin" /> : <Vote size={16} />}
                Create Proposal
              </Button>
            </div>

            <div style={{ display: "grid", gap: 12 }}>
              <Label htmlFor="proposal-id">Proposal ID</Label>
              <Input
                id="proposal-id"
                value={proposalId}
                onChange={(event) => setProposalId(event.target.value)}
                placeholder="1"
              />

              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <Button onClick={() => void handleVote(true)} variant="outline" disabled={isVotingFor || missingAddressKeys.length > 0}>
                  {isVotingFor ? <Loader2 size={16} className="animate-spin" /> : null}
                  Vote For
                </Button>

                <Button
                  onClick={() => void handleVote(false)}
                  variant="outline"
                  disabled={isVotingAgainst || missingAddressKeys.length > 0}
                >
                  {isVotingAgainst ? <Loader2 size={16} className="animate-spin" /> : null}
                  Vote Against
                </Button>

                <Button onClick={handleExecute} disabled={isExecuting || missingAddressKeys.length > 0}>
                  {isExecuting ? <Loader2 size={16} className="animate-spin" /> : null}
                  Execute
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Governance Status</CardTitle>
          <CardDescription>Minimal snapshot for the connected wallet and DAO state.</CardDescription>
        </CardHeader>
        <CardContent>
          <div style={{ display: "grid", gap: 12 }}>
            <StatusRow label="Wallet" value={snapshot.address || "Not connected"} />
            <StatusRow label="Proposal count" value={snapshot.proposalCount} />
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
            <StatusRow label="Loading" value={isLoading ? "Refreshing DAO state..." : "Idle"} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function getDaoProposalTarget() {
  const target = process.env.NEXT_PUBLIC_AGRO_STAKING ?? "";

  if (!target) {
    throw new Error("Missing NEXT_PUBLIC_AGRO_STAKING");
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
