"use client";

import { useState } from "react";
import { CalendarDays, Loader2, ShieldCheck, Sprout, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getNftContract, getMissingAddressKeys } from "@/lib/contracts";
import { connectWallet, getBrowserProvider, getWalletErrorMessage, hasEthereum } from "@/lib/web3";

const productOptions = [
  { value: "soja", label: "Soja", icon: "🌾" },
  { value: "cafe", label: "Cafe", icon: "☕" },
  { value: "cacau", label: "Cacau", icon: "🍫" },
  { value: "queijo", label: "Queijo", icon: "🧀" },
  { value: "milho", label: "Milho", icon: "🌽" },
  { value: "outro", label: "Outro", icon: "+" },
];

export default function MintPage() {
  const [address, setAddress] = useState<string>("");
  const [tokenUri, setTokenUri] = useState("https://example.com/metadata/lote-1.json");
  const [selectedProduct, setSelectedProduct] = useState("soja");
  const [customProduct, setCustomProduct] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [estimatedWeight, setEstimatedWeight] = useState("");
  const [harvestDate, setHarvestDate] = useState("");
  const [producerCode, setProducerCode] = useState("");
  const [certification, setCertification] = useState("");
  const [txHash, setTxHash] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMinting, setIsMinting] = useState(false);

  const missingAddressKeys = getMissingAddressKeys();
  const hasSuccess = Boolean(txHash) && !error;
  const resolvedProductType = selectedProduct === "outro" ? customProduct.trim() : selectedProduct;
  const isUriValid = /^(https?:\/\/|ipfs:\/\/).+/i.test(tokenUri.trim());
  const isJsonHint = /\.json($|\?)/i.test(tokenUri.trim()) || tokenUri.trim().includes("metadata");
  const hasDetailsReady = Boolean(resolvedProductType.trim() && tokenUri.trim() && estimatedWeight.trim() && harvestDate.trim());
  const isMintReady = Boolean(address && missingAddressKeys.length === 0 && isUriValid && resolvedProductType.trim());

  const statusItems = [
    {
      tone: address ? "success" : "pending",
      title: "Carteira conectada",
      detail: address || "Conecte a carteira para liberar a emissão.",
    },
    {
      tone: missingAddressKeys.length === 0 ? "success" : "pending",
      title: "Contratos prontos",
      detail:
        missingAddressKeys.length === 0
          ? "MINTER_ROLE confirmado e enderecos configurados."
          : `Faltam enderecos: ${missingAddressKeys.join(", ")}`,
    },
    {
      tone: hasDetailsReady ? "warning" : "pending",
      title: "Aguardando preenchimento",
      detail: hasDetailsReady
        ? "Campos essenciais preenchidos. Revise preview e URI antes de emitir."
        : "Peso, data de colheita e URI ajudam a enriquecer os metadados do lote.",
    },
    {
      tone: hasSuccess ? "success" : isMinting ? "warning" : "pending",
      title: "Transação",
      detail: hasSuccess ? "NFT emitido com sucesso em Sepolia." : isMinting ? "Confirmação pendente na carteira e na rede." : "Nenhuma transação enviada ainda.",
    },
  ] as const;

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

      const tx = await nft.mintLot(tokenUri, resolvedProductType);
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
    <div className="mint-layout">
      <div className="mint-main">
        <section className="mint-header">
          <p className="mint-breadcrumb">AgroChain <span>›</span> Lotes <span>›</span> Emitir NFT</p>
          <div className="mint-header__row">
            <div>
              <h1 className="mint-title">Emitir NFT de lote</h1>
              <p className="mint-subtitle">Registre um lote agrícola como NFT na rede Sepolia com metadados ricos e revisão visual antes do mint.</p>
            </div>
            <div className="mint-wallet-pill">
              <Wallet size={16} />
              {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "Carteira não conectada"}
            </div>
          </div>
        </section>

        <div className="mint-grid">
          <Card className="mint-card mint-card--wide">
            <CardHeader>
              <CardTitle>Tipo do produto</CardTitle>
              <CardDescription>Selecione a categoria principal do lote para manter consistência nos metadados on-chain.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="chip-group">
                {productOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`select-chip${selectedProduct === option.value ? " select-chip--active" : ""}`}
                    onClick={() => setSelectedProduct(option.value)}
                  >
                    <span>{option.icon}</span>
                    {option.label}
                  </button>
                ))}
              </div>

              {selectedProduct === "outro" ? (
                <div className="field-stack">
                  <Label htmlFor="custom-product">Categoria personalizada</Label>
                  <Input
                    id="custom-product"
                    value={customProduct}
                    onChange={(event) => setCustomProduct(event.target.value)}
                    placeholder="Ex.: mel, pimenta, algodao"
                  />
                </div>
              ) : null}

              <div className="field-stack">
                <Label htmlFor="product-description">Descrição do produto</Label>
                <p className="field-hint">Adicione variedade, safra ou detalhe comercial do lote.</p>
                <Input
                  id="product-description"
                  value={productDescription}
                  onChange={(event) => setProductDescription(event.target.value)}
                  placeholder="Ex.: Soja transgenica - safra 2025"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="mint-card mint-card--preview">
            <CardHeader>
              <CardTitle>Preview do NFT</CardTitle>
              <CardDescription>Veja como o lote será apresentado antes de assinar a transação.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="nft-preview">
                <div className="nft-preview__badge">
                  <Sprout size={18} />
                </div>
                <div className="nft-preview__content">
                  <strong>Lote {resolvedProductType || "Produto"} #{hasSuccess ? "emitido" : "--"}</strong>
                  <p className="card__description">Token ID será gerado no mint</p>
                </div>
              </div>

              <div className="preview-meta">
                <PreviewRow label="Produto" value={resolvedProductType || "Não definido"} />
                <PreviewRow label="Rede" value="Sepolia Testnet" />
                <PreviewRow label="Minter" value={address || "A conectar"} breakAll />
                <PreviewRow label="URI" value={tokenUri || "A preencher"} tone={isUriValid ? "success" : "muted"} breakAll />
                <PreviewRow label="Peso" value={estimatedWeight ? `${estimatedWeight} kg` : "A definir"} />
                <PreviewRow label="Colheita" value={harvestDate || "A definir"} />
                <PreviewRow label="Certificação" value={certification || "Não informada"} />
              </div>

              <p className="field-hint">Preencha os campos para enriquecer os metadados e revisar tudo antes da confirmação.</p>
            </CardContent>
          </Card>

          <Card className="mint-card mint-card--status">
            <CardHeader>
              <CardTitle>Status da emissão</CardTitle>
              <CardDescription>O painel reflete o que já está pronto e o que ainda falta revisar antes do mint.</CardDescription>
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

              {hasSuccess ? (
                <div className="notice notice--success">
                  NFT emitido com sucesso. O proximo passo natural da demo e mostrar staking com AGRO.
                </div>
              ) : null}

              <div className="gas-box">
                <strong>Taxa estimada de gas</strong>
                <p className="card__description">~0.001 ETH em testnet. Gratuito em Sepolia com faucet.</p>
              </div>

              <div className="mint-actions">
                <Button onClick={handleConnect} variant="secondary" disabled={isConnecting || !hasEthereum()}>
                  {isConnecting ? <Loader2 size={16} className="animate-spin" /> : <Wallet size={16} />}
                  {address ? "Carteira conectada" : "Conectar carteira"}
                </Button>

                <Button
                  onClick={handleMint}
                  disabled={isMinting || !isMintReady}
                  size="lg"
                >
                  {isMinting ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                  Prosseguir para emissão
                </Button>

                <p className="field-hint">Você revisará os dados no próprio preview antes de confirmar a assinatura no MetaMask.</p>
              </div>

              <div style={{ display: "grid", gap: 12 }}>
                <StatusRow label="Carteira" value={address || "Não conectada"} />
                <StatusRow
                  label="Contratos configurados"
                  value={
                    missingAddressKeys.length === 0
                      ? "Todos os endereços necessários estão configurados."
                      : `Valores NEXT_PUBLIC ausentes para: ${missingAddressKeys.join(", ")}`
                  }
                />
                <StatusRow label="Última transação" value={txHash || "Nenhuma emissão enviada ainda"} breakAll />
                <StatusRow label="Erro" value={error || "Sem erros"} tone={error ? "error" : "muted"} breakAll />
                <StatusRow
                  label="Próximo passo"
                  value={
                    hasSuccess
                      ? "Abra a página de recompensas para fazer staking de AGRO e continuar a narrativa da demo."
                      : isMintReady
                        ? "Tudo pronto para emitir. Revise o preview e confirme a assinatura na carteira."
                        : "Conecte uma carteira com permissão de mint, complete os detalhes do lote e revise a URI antes de emitir."
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* <Card className="mint-card mint-card--wide">
            <CardHeader>
              <CardTitle>URI dos metadados</CardTitle>
              <CardDescription>Use um link IPFS ou JSON publico com os atributos do lote.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="field-stack">
                <div className="field-inline-header">
                  <Label htmlFor="token-uri">URI do token</Label>
                  <span className="hint-pill">Formato recomendado: JSON publico</span>
                </div>
                <Input
                  id="token-uri"
                  value={tokenUri}
                  onChange={(event) => setTokenUri(event.target.value)}
                  placeholder="https://example.com/metadata/lote-1.json"
                />
                <p className={`validation-text${isUriValid ? " validation-text--success" : " validation-text--warning"}`}>
                  {isUriValid ? `Formato valido ${isJsonHint ? "e compativel com metadata JSON" : "detectado"}.` : "Use uma URI iniciando com https:// ou ipfs://."}
                </p>
              </div>

              <div className="helper-box">
                <strong>Campos sugeridos no JSON</strong>
                <p className="card__description">`name`, `origin`, `weight_kg`, `harvest_date`, `producer_code`, `certification`</p>
              </div>
            </CardContent>
          </Card> */}

          <Card className="mint-card mint-card--wide">
            <CardHeader>
              <CardTitle>Dados do lote</CardTitle>
              <CardDescription>Esses campos ajudam a preparar metadados mais ricos para o NFT.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mint-form-grid">
                <div className="field-stack">
                  <Label htmlFor="estimated-weight">Peso estimado (kg)</Label>
                  <Input
                    id="estimated-weight"
                    value={estimatedWeight}
                    onChange={(event) => setEstimatedWeight(event.target.value)}
                    placeholder="Ex.: 2500"
                  />
                </div>

                <div className="field-stack">
                  <Label htmlFor="harvest-date">Data de colheita</Label>
                  <div className="input-with-icon">
                    <Input id="harvest-date" type="date" value={harvestDate} onChange={(event) => setHarvestDate(event.target.value)} />
                    <CalendarDays size={16} />
                  </div>
                </div>

                <div className="field-stack">
                  <Label htmlFor="producer-code">Codigo do produtor</Label>
                  <Input
                    id="producer-code"
                    value={producerCode}
                    onChange={(event) => setProducerCode(event.target.value)}
                    placeholder="Ex.: PROD-00182"
                  />
                </div>

                <div className="field-stack">
                  <Label htmlFor="certification">Certificação</Label>
                  <Input
                    id="certification"
                    value={certification}
                    onChange={(event) => setCertification(event.target.value)}
                    placeholder="Ex.: Organico, Rainforest, Fair Trade"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function PreviewRow({
  label,
  value,
  tone = "muted",
  breakAll = false,
}: {
  label: string;
  value: string;
  tone?: "muted" | "success";
  breakAll?: boolean;
}) {
  return (
    <div className="preview-row">
      <span>{label}</span>
      <strong className={tone === "success" ? "text-success" : undefined} style={{ overflowWrap: breakAll ? "anywhere" : undefined }}>
        {value}
      </strong>
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
