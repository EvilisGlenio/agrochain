# AgroChain MVP

AgroChain é um MVP de protocolo Web3 para rastreabilidade e governança em cadeias agro.
O projeto integra token ERC-20, NFT ERC-721, staking com recompensa, DAO simplificada, oracle Chainlink, scripts `ethers.js` e mini frontend em Next.js.

## Visão Geral

O problema que a AgroChain busca resolver é a dificuldade de:

- registrar lotes agro de forma auditável
- criar incentivos econômicos para participação no ecossistema
- permitir decisões transparentes sobre parâmetros do protocolo

No MVP, isso é resolvido com quatro contratos principais:

- `AgroToken.sol`: token AGRO com suporte a votos
- `AgroLotNFT.sol`: NFT de lotes agro
- `AgroStaking.sol`: staking com recompensa e oracle
- `AgroDAO.sol`: governança simplificada

## Stack

- Solidity `^0.8.28`
- Hardhat
- OpenZeppelin
- Ignition
- ethers v6
- Chainlink
- Next.js

## Estrutura do Projeto

```text
contracts/
  AgroToken.sol
  AgroLotNFT.sol
  AgroStaking.sol
  AgroDAO.sol
  mocks/

ignition/modules/
  AgroChain.ts
  AgroChainLocal.ts

scripts/
  common.ts
  status.ts
  delegate.ts
  mint-lot.ts
  stake.ts
  claim.ts
  propose-set-apr.ts
  vote.ts
  execute.ts

frontend/
  app/
  abi/
  components/
  lib/

docs/
  ARCHITECTURE.md
  AUDIT.md
  REPORT.md
  DEMO_SCRIPT.md
```

## Documentação

- Arquitetura: `docs/ARCHITECTURE.md`
- Auditoria: `docs/AUDIT.md`
- Relatório técnico: `docs/REPORT.md`
- Roteiro da demo: `docs/DEMO_SCRIPT.md`

## Contratos

### AgroToken

Token ERC-20 do protocolo com:

- `ERC20Permit`
- `ERC20Votes`
- `AccessControl`
- `Pausable`

### AgroLotNFT

NFT ERC-721 para representar lotes únicos com:

- URI de metadados
- tipo do produto
- `AccessControl`
- `Pausable`

### AgroStaking

Contrato de staking com:

- depósito de AGRO
- `claim` de recompensas
- `unstake`
- integração com oracle Chainlink ETH/USD
- `ReentrancyGuard`
- `SafeERC20`

### AgroDAO

DAO simplificada com:

- proposta
- votação com snapshot via `ERC20Votes`
- execução de proposta
- alvos autorizados
- `ReentrancyGuard`

## Segurança Aplicada

Medidas principais já implementadas:

- `Solidity ^0.8.x`
- `AccessControl`
- `Pausable`
- `ReentrancyGuard`
- `SafeERC20`
- validação de oracle

## Testes

Suíte atual conhecida:

- `AgroToken.ts`: 20 passing
- `AgroLotNFT.ts`: 20 passing
- `AgroStaking.ts`: 47 passing
- `AgroDAO.ts`: 52 passing
- total: 139 passing

Rodar testes:

```bash
npx hardhat test
```

## Variáveis de Ambiente

### Raiz do projeto

Usado para scripts e deploy:

```env
RPC_URL=
PRIVATE_KEY=
SEPOLIA_RPC_URL=
SEPOLIA_PRIVATE_KEY=
ETHERSCAN_API_KEY=

AGRO_TOKEN=
AGRO_NFT=
AGRO_STAKING=
AGRO_DAO=
```

### Frontend

Usado pelo Next.js:

```env
NEXT_PUBLIC_CHAIN_ID=
NEXT_PUBLIC_NETWORK_NAME=
NEXT_PUBLIC_AGRO_TOKEN=
NEXT_PUBLIC_AGRO_NFT=
NEXT_PUBLIC_AGRO_STAKING=
NEXT_PUBLIC_AGRO_DAO=
```

## Setup

Instalar dependências da raiz:

```bash
npm install
```

Instalar dependências do frontend:

```bash
cd frontend
npm install
```

## Deploy Local

### 1. Subir nó local

```bash
npx hardhat node
```

### 2. Fazer deploy local com mock oracle

```bash
npx hardhat ignition deploy ignition/modules/AgroChainLocal.ts --network localhost
```

### 3. Configurar `.env`

Usar, por exemplo, a conta #0 do Hardhat:

```env
RPC_URL=http://127.0.0.1:8545
PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

### 4. Endereços locais conhecidos

Último conjunto validado localmente:

```env
AGRO_TOKEN=0x9A9f2CCfdE556A7E9Ff0848998Aa4a0CFD8863AE
AGRO_NFT=0x959922bE3CAee4b8Cd9a407cc3ac1C251C2007B1
AGRO_STAKING=0xc6e7DF5E7b4f2A278906862b61205850344D4e7d
AGRO_DAO=0x3Aa5ebB10DC797CAC828524e59A333d0A371443c
```

## Deploy Sepolia

Deploy com Chainlink ETH/USD real:

```bash
npx hardhat ignition deploy ignition/modules/AgroChain.ts --network sepolia
```

Deploy com verificação:

```bash
npx hardhat ignition deploy ignition/modules/AgroChain.ts --network sepolia --verify
```

### Status atual

- localhost: validado
- Sepolia: pendente de registro final dos endereços

### Endereços Sepolia

Preencher após deploy:

- `AgroToken`: `pendente`
- `AgroLotNFT`: `pendente`
- `AgroStaking`: `pendente`
- `AgroDAO`: `pendente`

### Explorer

Preencher após deploy:

- `AgroToken`: `pendente`
- `AgroLotNFT`: `pendente`
- `AgroStaking`: `pendente`
- `AgroDAO`: `pendente`

## Scripts Web3

### Ler status

```bash
npx ts-node scripts/status.ts
```

### Delegar votos

```bash
npx ts-node scripts/delegate.ts
```

### Mint de NFT

```bash
npx ts-node scripts/mint-lot.ts
```

### Fazer staking

```bash
npx ts-node scripts/stake.ts
```

### Claim de recompensas

```bash
npx ts-node scripts/claim.ts
```

### Criar proposta de APR

```bash
npx ts-node scripts/propose-set-apr.ts
```

### Votar

```bash
npx ts-node scripts/vote.ts
```

### Executar proposta

```bash
npx ts-node scripts/execute.ts
```

## Frontend

Rodar em desenvolvimento:

```bash
cd frontend
npm run dev
```

Gerar build:

```bash
cd frontend
npm run build
```

Páginas disponíveis:

- `/`: painel inicial
- `/mint`: emissão de lotes
- `/staking`: staking e recompensas
- `/governanca`: propostas, voto e execução

## Fluxo da Demo

Fluxo recomendado:

1. conectar carteira
2. emitir NFT de lote
3. aprovar AGRO e fazer staking
4. consultar recompensas
5. delegar votos
6. criar proposta de APR
7. votar
8. executar proposta aprovada

## Observações Técnicas

- `AgroChainLocal.ts` usa `MockV3Aggregator` para localhost
- `AgroChain.ts` usa Chainlink ETH/USD real em Sepolia
- a DAO exige fluxo de delegação antes da votação
- a execução da proposta depende da janela correta de blocos
- o staking depende de funding prévio de recompensas
- `hardhat.config.ts` usa `evmVersion: "cancun"` por compatibilidade com OpenZeppelin 5.x

## Pendências Para Fechar a Entrega Acadêmica

- rodar e registrar `Slither`
- rodar e registrar `Mythril`
- fazer deploy Sepolia
- preencher endereços e explorer
- gerar PDF final
- gravar vídeo demonstrativo

## Licença

Uso acadêmico.
