# AgroChain MVP

## Contracts

- `AgroToken.sol`
- `AgroLotNFT.sol`
- `AgroStaking.sol`
- `AgroDAO.sol`

## Local Deploy

1. Start a local node:

```bash
npx hardhat node
```

2. Deploy the localhost module with a mock oracle:

```bash
npx hardhat ignition deploy ignition/modules/AgroChainLocal.ts --network localhost
```

3. Copy the deployed contract addresses into `.env`.

4. Use Hardhat account #0 for scripts:

```env
RPC_URL=http://127.0.0.1:8545
PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

## Sepolia Deploy

Deploy the Sepolia module with the real Chainlink feed:

```bash
npx hardhat ignition deploy ignition/modules/AgroChain.ts --network sepolia
```

Verify during deploy:

```bash
npx hardhat ignition deploy ignition/modules/AgroChain.ts --network sepolia --verify
```

## Scripts

Read status:

```bash
npx ts-node scripts/status.ts
```

Delegate votes:

```bash
npx ts-node scripts/delegate.ts
```

Mint NFT lot:

```bash
npx ts-node scripts/mint-lot.ts
```

Stake AGRO:

```bash
npx ts-node scripts/stake.ts
```

Claim rewards:

```bash
npx ts-node scripts/claim.ts
```

Create APR proposal:

```bash
npx ts-node scripts/propose-set-apr.ts
```

Vote:

```bash
npx ts-node scripts/vote.ts
```

Execute proposal:

```bash
npx ts-node scripts/execute.ts
```

## Notes

- `AgroChainLocal.ts` uses `MockV3Aggregator` for localhost.
- `AgroChain.ts` uses the real Chainlink ETH/USD feed for Sepolia.
- For DAO actions, remember the flow: `delegate -> propose -> wait blocks -> vote -> wait blocks -> execute`.
