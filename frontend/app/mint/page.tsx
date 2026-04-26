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
  const hasSuccess = Boolean(txHash) && !error;

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
          <CardTitle>Emitir NFT de Lote</CardTitle>
          <CardDescription>
            Crie um NFT único para um lote agro usando uma URI de metadados e o tipo do produto.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div style={{ display: "grid", gap: 16 }}>
            <div style={{ display: "grid", gap: 8 }}>
              <Label htmlFor="token-uri">URI do token</Label>
              <p className="field-hint">Exemplo: link IPFS ou JSON público com os metadados do lote.</p>
              <Input
                id="token-uri"
                value={tokenUri}
                onChange={(event) => setTokenUri(event.target.value)}
                placeholder="https://example.com/metadata/lote-1.json"
              />
            </div>

            <div style={{ display: "grid", gap: 8 }}>
              <Label htmlFor="product-type">Tipo do produto</Label>
              <p className="field-hint">Exemplo: queijo, café, soja ou cacau.</p>
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
                {address ? "Carteira conectada" : "Conectar carteira"}
              </Button>

              <Button
                onClick={handleMint}
                disabled={isMinting || !tokenUri.trim() || !productType.trim() || missingAddressKeys.length > 0}
              >
                {isMinting ? <Loader2 size={16} className="animate-spin" /> : null}
                Emitir lote
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Status da emissão</CardTitle>
          <CardDescription>Use a carteira de deploy ou outro endereço com `MINTER_ROLE`.</CardDescription>
        </CardHeader>
        <CardContent>
          <div style={{ display: "grid", gap: 12 }}>
            {hasSuccess ? (
              <div className="notice notice--success">
                NFT emitido com sucesso. O próximo passo natural da demo é mostrar staking com AGRO.
              </div>
            ) : null}

            <div>
              <Label>Carteira</Label>
              <p className="card__description" style={{ marginTop: 6 }}>
                {address || "Não conectada"}
              </p>
            </div>

            <div>
              <Label>Contratos configurados</Label>
              <p className="card__description" style={{ marginTop: 6 }}>
                {missingAddressKeys.length === 0
                  ? "Todos os endereços necessários estão configurados."
                  : `Valores NEXT_PUBLIC ausentes para: ${missingAddressKeys.join(", ")}`}
              </p>
            </div>

            <div>
              <Label>Última transação</Label>
              <p className="card__description" style={{ marginTop: 6, overflowWrap: "anywhere" }}>
                {txHash || "Nenhuma emissão enviada ainda"}
              </p>
            </div>

            <div>
              <Label>Erro</Label>
              <p className="card__description" style={{ marginTop: 6, color: error ? "#fda4af" : undefined }}>
                {error || "Sem erros"}
              </p>
            </div>

            <div>
              <Label>Próximo passo</Label>
              <p className="card__description" style={{ marginTop: 6 }}>
                {hasSuccess
                  ? "Abra a página de recompensas para fazer staking de AGRO e continuar a narrativa da demo."
                  : "Conecte uma carteira com permissão de mint, revise os campos e emita o primeiro lote."}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
