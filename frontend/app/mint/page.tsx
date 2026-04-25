"use client";

import { useState } from "react";
import { Loader2, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getNftContract, getMissingAddressKeys } from "@/lib/contracts";
import { connectWallet, getBrowserProvider, getWalletErrorMessage, hasEthereum } from "@/lib/web3";

export default function MintPage() {
  const [address, setAddress] = useState<string>("");
  const [tokenUri, setTokenUri] = useState("https://example.com/metadata/lote-1.json");
  const [productType, setProductType] = useState("queijo");
  const [txHash, setTxHash] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMinting, setIsMinting] = useState(false);

  const missingAddressKeys = getMissingAddressKeys();

  async function handleConnect() {
    setError("");
    setTxHash("");
    setIsConnecting(true);

    try {
      const { address: connectedAddress } = await connectWallet();
      setAddress(connectedAddress);
    } catch (connectError) {
      setError(getWalletErrorMessage(connectError));
    } finally {
      setIsConnecting(false);
    }
  }

  async function handleMint() {
    setError("");
    setTxHash("");
    setIsMinting(true);

    try {
      const provider = getBrowserProvider();
      const signer = await provider.getSigner();
      const nft = getNftContract(signer);

      const tx = await nft.mintLot(tokenUri, productType);
      const receipt = await tx.wait();

      setAddress(await signer.getAddress());
      setTxHash(receipt?.hash ?? tx.hash);
    } catch (mintError) {
      setError(getWalletErrorMessage(mintError));
    } finally {
      setIsMinting(false);
    }
  }

  return (
    <div className="page-grid">
      <Card>
        <CardHeader>
          <CardTitle>Mint Lot NFT</CardTitle>
          <CardDescription>
            Create a unique agro lot NFT by providing a metadata URI and a product type.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div style={{ display: "grid", gap: 16 }}>
            <div style={{ display: "grid", gap: 8 }}>
              <Label htmlFor="token-uri">Token URI</Label>
              <Input
                id="token-uri"
                value={tokenUri}
                onChange={(event) => setTokenUri(event.target.value)}
                placeholder="https://example.com/metadata/lote-1.json"
              />
            </div>

            <div style={{ display: "grid", gap: 8 }}>
              <Label htmlFor="product-type">Product Type</Label>
              <Input
                id="product-type"
                value={productType}
                onChange={(event) => setProductType(event.target.value)}
                placeholder="queijo"
              />
            </div>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Button onClick={handleConnect} variant="secondary" disabled={isConnecting || !hasEthereum()}>
                {isConnecting ? <Loader2 size={16} className="animate-spin" /> : <Wallet size={16} />}
                {address ? "Wallet Connected" : "Connect Wallet"}
              </Button>

              <Button
                onClick={handleMint}
                disabled={isMinting || !tokenUri.trim() || !productType.trim() || missingAddressKeys.length > 0}
              >
                {isMinting ? <Loader2 size={16} className="animate-spin" /> : null}
                Mint Lot
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mint Status</CardTitle>
          <CardDescription>Use the deployer wallet or another address with `MINTER_ROLE`.</CardDescription>
        </CardHeader>
        <CardContent>
          <div style={{ display: "grid", gap: 12 }}>
            <div>
              <Label>Wallet</Label>
              <p className="card__description" style={{ marginTop: 6 }}>
                {address || "Not connected"}
              </p>
            </div>

            <div>
              <Label>Configured contracts</Label>
              <p className="card__description" style={{ marginTop: 6 }}>
                {missingAddressKeys.length === 0
                  ? "All required contract addresses are configured."
                  : `Missing NEXT_PUBLIC values for: ${missingAddressKeys.join(", ")}`}
              </p>
            </div>

            <div>
              <Label>Last transaction</Label>
              <p className="card__description" style={{ marginTop: 6, overflowWrap: "anywhere" }}>
                {txHash || "No mint submitted yet"}
              </p>
            </div>

            <div>
              <Label>Error</Label>
              <p className="card__description" style={{ marginTop: 6, color: error ? "#fda4af" : undefined }}>
                {error || "No errors"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
