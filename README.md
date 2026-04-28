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

## Scripts

```bash
npx ts-node scripts/status.ts
npx ts-node scripts/delegate.ts
npx ts-node scripts/mint-lot.ts
npx ts-node scripts/stake.ts
npx ts-node scripts/claim.ts
npx ts-node scripts/propose-set-apr.ts
npx ts-node scripts/vote.ts
npx ts-node scripts/execute.ts
```

## Frontend

### `frontend/.env.local`

```env
NEXT_PUBLIC_CHAIN_ID=11155111
NEXT_PUBLIC_NETWORK_NAME=sepolia
NEXT_PUBLIC_AGRO_TOKEN=0x7205bFb3862E3370255D6c812EB9E9B9cC2A708D
NEXT_PUBLIC_AGRO_NFT=0x09886ABE143F7aF05660aeE837C9dbcaA5677386
NEXT_PUBLIC_AGRO_STAKING=0x59fB33f44d4FfC7CE7b30bB6b76726Ad4aC0c0F9
NEXT_PUBLIC_AGRO_DAO=0x5272108cb932b543442A20350ABBA110E38a376d
```

### Rodar

```bash
cd frontend
npm install
npm run dev
```

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
