# Relatório Técnico - AgroChain

## 1. Resumo

A AgroChain é um MVP Web3 para rastreabilidade e governança em cadeias agro. O projeto integra token ERC-20, NFT ERC-721, staking com recompensa, DAO simplificada, oracle Chainlink e integração Web3 por scripts e frontend.

## 2. Problema

O MVP busca resolver três pontos principais:

- registrar lotes agro de forma auditável
- criar incentivos econômicos com staking
- permitir decisões transparentes por governança on-chain

## 3. Arquitetura

Contratos principais:

- `AgroToken.sol`: token AGRO com `ERC20Votes`
- `AgroLotNFT.sol`: NFT de lotes agro
- `AgroStaking.sol`: staking com recompensa e oracle
- `AgroDAO.sol`: proposta, voto e execução

Integrações:

- Chainlink ETH/USD em Sepolia
- scripts `ethers.js`
- frontend Next.js

## 4. Padrões ERC

- `ERC-20`: escolhido para representar o ativo fungível do protocolo, usado em staking e governança
- `ERC-721`: escolhido para representar lotes únicos com metadados próprios

## 5. Segurança

Medidas aplicadas:

- Solidity `^0.8.28`
- `AccessControl`
- `Pausable`
- `ReentrancyGuard`
- `SafeERC20`
- validações de oracle

Pontos protegidos com `nonReentrant`:

- `AgroLotNFT.mintLot`
- `AgroStaking.stake`
- `AgroStaking.claim`
- `AgroStaking.unstake`
- `AgroDAO.execute`

## 6. Auditoria e testes

- `npx hardhat compile`: sem erros
- `npx hardhat test`: `139 passing`
- `Slither`: executado via Docker
- `Mythril`: executado via Docker com análise por bytecode

Resumo:

- sem achados críticos
- sem achados altos
- alertas restantes de baixo/médio risco compatíveis com o escopo do MVP

Detalhes: `docs/AUDIT.md`

## 7. Integração Web3

Scripts disponíveis:

- `delegate.ts`
- `mint-lot.ts`
- `stake.ts`
- `claim.ts`
- `propose-set-apr.ts`
- `vote.ts`
- `execute.ts`

Frontend:

- `/mint`
- `/staking`
- `/governanca`

## 8. Deploy Sepolia

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

## 9. Demonstração concluída

Em Sepolia, foram validados:

- mint de NFT
- staking de AGRO
- claim de recompensa
- delegação de votos
- criação de proposta
- votação
- execução da proposta

## 10. Conclusão

A AgroChain atende ao escopo da atividade com um protocolo Web3 funcional em testnet, cobrindo token, NFT, staking, governança, oracle, integração Web3, auditoria e deploy em Sepolia.
