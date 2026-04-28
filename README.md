# AgroChain MVP

MVP Web3 para rastreabilidade e governança em cadeias agro.

## O que o projeto entrega

- `ERC-20`: token AGRO com `ERC20Votes`
- `ERC-721`: NFT de lotes agro
- staking com recompensa
- DAO simplificada
- oracle Chainlink ETH/USD
- scripts `ethers.js`
- mini frontend em Next.js

## Contratos

- `contracts/AgroToken.sol`
- `contracts/AgroLotNFT.sol`
- `contracts/AgroStaking.sol`
- `contracts/AgroDAO.sol`

## Tutorial Sepolia

### 1. Pré-requisitos

Você vai precisar de:

- Node.js e npm
- MetaMask
- uma carteira com ETH de teste em Sepolia
- um RPC da Sepolia

### 2. Instalação

Na raiz do projeto:

```bash
npm install
```

No frontend:

```bash
cd frontend
npm install
```

### 3. Configurar `.env` da raiz

Crie um `.env` na raiz com:

```env
RPC_URL=https://eth-sepolia.g.alchemy.com/v2/SUA_CHAVE
PRIVATE_KEY=0xSUA_PRIVATE_KEY

SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/SUA_CHAVE
SEPOLIA_PRIVATE_KEY=0xSUA_PRIVATE_KEY
ETHERSCAN_API_KEY=SUA_CHAVE_ETHERSCAN

AGRO_TOKEN=0x7205bFb3862E3370255D6c812EB9E9B9cC2A708D
AGRO_NFT=0x09886ABE143F7aF05660aeE837C9dbcaA5677386
AGRO_STAKING=0x59fB33f44d4FfC7CE7b30bB6b76726Ad4aC0c0F9
AGRO_DAO=0x5272108cb932b543442A20350ABBA110E38a376d
```

### 4. Configurar `frontend/.env.local`

```env
NEXT_PUBLIC_CHAIN_ID=11155111
NEXT_PUBLIC_NETWORK_NAME=sepolia
NEXT_PUBLIC_AGRO_TOKEN=0x7205bFb3862E3370255D6c812EB9E9B9cC2A708D
NEXT_PUBLIC_AGRO_NFT=0x09886ABE143F7aF05660aeE837C9dbcaA5677386
NEXT_PUBLIC_AGRO_STAKING=0x59fB33f44d4FfC7CE7b30bB6b76726Ad4aC0c0F9
NEXT_PUBLIC_AGRO_DAO=0x5272108cb932b543442A20350ABBA110E38a376d
```

### 5. Rodar o frontend

```bash
cd frontend
npm run dev
```

Abra:

```text
http://localhost:3000
```

### 6. Conectar a carteira

No MetaMask:

- selecione a rede `Sepolia`
- conecte a carteira usada no deploy ou outra carteira com as permissões necessárias

### 7. Fluxo mínimo da demo

No frontend:

1. emitir NFT em `/mint`
2. fazer staking em `/staking`
3. resgatar recompensa, se desejar
4. delegar votos com script
5. criar proposta em `/governanca`
6. votar
7. aguardar o fim da janela de votação
8. executar a proposta

### 8. Delegar votos

Na raiz do projeto:

```bash
npx ts-node scripts/delegate.ts
```

### 9. Scripts úteis

```bash
npx ts-node scripts/status.ts
npx ts-node scripts/mint-lot.ts
npx ts-node scripts/stake.ts
npx ts-node scripts/claim.ts
npx ts-node scripts/propose-set-apr.ts
npx ts-node scripts/vote.ts
npx ts-node scripts/execute.ts
```

### 10. Observações

- para criar proposta, a carteira precisa ter votos delegados
- para emitir NFT, a carteira precisa ter `MINTER_ROLE`
- a governança usa blocos, então em Sepolia é necessário aguardar a rede avançar entre proposta, voto e execução

## Sepolia

### Endereços

- `AgroToken`: `0x7205bFb3862E3370255D6c812EB9E9B9cC2A708D`
- `AgroLotNFT`: `0x09886ABE143F7aF05660aeE837C9dbcaA5677386`
- `AgroStaking`: `0x59fB33f44d4FfC7CE7b30bB6b76726Ad4aC0c0F9`
- `AgroDAO`: `0x5272108cb932b543442A20350ABBA110E38a376d`

### Explorer

- `AgroToken`: `https://sepolia.etherscan.io/address/0x7205bFb3862E3370255D6c812EB9E9B9cC2A708D#code`
- `AgroLotNFT`: `https://sepolia.etherscan.io/address/0x09886ABE143F7aF05660aeE837C9dbcaA5677386#code`
- `AgroStaking`: `https://sepolia.etherscan.io/address/0x59fB33f44d4FfC7CE7b30bB6b76726Ad4aC0c0F9#code`
- `AgroDAO`: `https://sepolia.etherscan.io/address/0x5272108cb932b543442A20350ABBA110E38a376d#code`

## Frontend

## Fluxo da demo

1. emitir NFT
2. fazer staking de AGRO
3. delegar votos
4. criar proposta
5. votar
6. executar proposta

## Testes e auditoria

- `npx hardhat test`: `139 passing`
- `Slither`: executado
- `Mythril`: executado

## Documentos

- `docs/ARCHITECTURE.md`
- `docs/AUDIT.md`
- `docs/REPORT.md`
- `docs/DEMO_SCRIPT.md`
