# U1C5O1T1_EvilisGlenio

## Identificação

- Disciplina: Web 3.0
- Unidade: Unidade 1
- Capítulo: Capítulo 5
- Tema: Desenvolvimento de Protocolo Web3 Completo com Deploy em Testnet
- Projeto: AgroChain
- Aluno(a): `preencher`
- Professor: Bruno Portes

## 1. Introdução

A AgroChain é um MVP Web3 voltado para rastreabilidade e governança em cadeias agro. O projeto foi desenvolvido para consolidar os conteúdos da fase avançada por meio da integração de token ERC-20, NFT ERC-721, staking com recompensa, governança simplificada, oracle e frontend Web3 em testnet Ethereum.

## 2. Problema e objetivo

O projeto busca responder a três necessidades principais:

- registrar lotes agro de forma auditável
- criar incentivos econômicos por meio de staking
- permitir decisões transparentes sobre parâmetros do protocolo

O objetivo do MVP foi demonstrar, em um fluxo funcional, como esses elementos podem ser integrados em uma arquitetura descentralizada simples e executável em Sepolia.

## 3. Arquitetura da solução

O protocolo é composto por quatro contratos principais:

- `AgroToken.sol`: token AGRO com `ERC20Votes`
- `AgroLotNFT.sol`: NFT de lotes agro
- `AgroStaking.sol`: staking com recompensa e oracle
- `AgroDAO.sol`: proposta, voto e execução

Camadas complementares:

- Chainlink ETH/USD em Sepolia
- scripts `ethers.js` para automação
- frontend em Next.js para demonstração

Fluxo principal do protocolo:

1. emitir NFT de lote
2. fazer staking de AGRO
3. delegar votos
4. criar proposta
5. votar
6. executar proposta aprovada

## 4. Justificativa dos padrões ERC

### ERC-20

O padrão ERC-20 foi escolhido para representar o ativo fungível do protocolo, pois ele é adequado para transferências, staking, recompensas e governança.

### ERC-721

O padrão ERC-721 foi escolhido para representar lotes únicos com identidade própria e metadados associados, o que se ajusta ao caso de uso de rastreabilidade.

## 5. Implementação técnica

O MVP foi implementado com OpenZeppelin e Hardhat, utilizando Solidity `^0.8.28`.

Componentes entregues:

- token ERC-20 funcional
- NFT ERC-721 funcional
- staking com recompensa
- DAO simplificada
- integração com oracle
- integração Web3 por scripts e frontend

## 6. Segurança aplicada

Foram adotadas as seguintes medidas:

- `AccessControl`
- `Pausable`
- `ReentrancyGuard`
- `SafeERC20`
- validações de oracle

Funções protegidas com `nonReentrant`:

- `AgroLotNFT.mintLot`
- `AgroStaking.stake`
- `AgroStaking.claim`
- `AgroStaking.unstake`
- `AgroDAO.execute`

## 7. Auditoria e testes

Validações executadas:

- `npx hardhat compile`: sem erros
- `npx hardhat test`: `139 passing`
- `Slither`: executado via Docker
- `Mythril`: executado via Docker com análise por bytecode

Resumo da auditoria:

- sem achados críticos
- sem achados altos
- alertas remanescentes de baixo ou médio risco compatíveis com o escopo do MVP

Detalhes complementares estão em `docs/AUDIT.md`.

## 8. Integração com oracle

O contrato de staking utiliza o feed Chainlink ETH/USD em Sepolia para influenciar a lógica de APR/recompensa. Essa integração demonstra o consumo de dado externo confiável em um fluxo on-chain.

## 9. Integração Web3

O projeto oferece duas formas de uso:

- scripts `ethers.js`
- mini frontend em Next.js

Scripts principais:

- `delegate.ts`
- `mint-lot.ts`
- `stake.ts`
- `claim.ts`
- `propose-set-apr.ts`
- `vote.ts`
- `execute.ts`

Páginas do frontend:

- `/mint`
- `/staking`
- `/governanca`

## 10. Deploy em Sepolia

### Endereços dos contratos

- `AgroToken`: `0x7205bFb3862E3370255D6c812EB9E9B9cC2A708D`
- `AgroLotNFT`: `0x09886ABE143F7aF05660aeE837C9dbcaA5677386`
- `AgroStaking`: `0x59fB33f44d4FfC7CE7b30bB6b76726Ad4aC0c0F9`
- `AgroDAO`: `0x5272108cb932b543442A20350ABBA110E38a376d`

### Links do explorer

- `AgroToken`: `https://sepolia.etherscan.io/address/0x7205bFb3862E3370255D6c812EB9E9B9cC2A708D#code`
- `AgroLotNFT`: `https://sepolia.etherscan.io/address/0x09886ABE143F7aF05660aeE837C9dbcaA5677386#code`
- `AgroStaking`: `https://sepolia.etherscan.io/address/0x59fB33f44d4FfC7CE7b30bB6b76726Ad4aC0c0F9#code`
- `AgroDAO`: `https://sepolia.etherscan.io/address/0x5272108cb932b543442A20350ABBA110E38a376d#code`

## 11. Demonstração validada

Em Sepolia, foram demonstrados com sucesso:

- mint de NFT
- staking de AGRO
- claim de recompensa
- delegação de votos
- criação de proposta
- votação
- execução da proposta

## 12. Conclusão

A AgroChain atende ao escopo da atividade com um protocolo Web3 funcional em testnet, cobrindo token, NFT, staking, governança, oracle, integração Web3, auditoria e deploy em Sepolia.

O projeto cumpriu os principais requisitos técnicos da proposta e se mostrou adequado como MVP acadêmico para demonstração prática dos conteúdos estudados.
