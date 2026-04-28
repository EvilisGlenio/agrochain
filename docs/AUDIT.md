# Auditoria - AgroChain

## 1. Escopo

Contratos auditados:

- `AgroToken.sol`
- `AgroLotNFT.sol`
- `AgroStaking.sol`
- `AgroDAO.sol`

## 2. Controles aplicados

- Solidity `^0.8.28`
- `AccessControl`
- `Pausable`
- `ReentrancyGuard`
- `SafeERC20`
- validações de oracle

Proteção com `nonReentrant`:

- `AgroLotNFT.mintLot`
- `AgroStaking.stake`
- `AgroStaking.claim`
- `AgroStaking.unstake`
- `AgroDAO.execute`

## 3. Ferramentas executadas

### Hardhat

- `npx hardhat compile`: sem erros
- `npx hardhat test`: `139 passing`

### Slither

- executado via Docker
- sem achados críticos ou altos diretamente atribuíveis à lógica principal

### Mythril

- executado via Docker
- análise feita por `deployedBytecode`
- sem achados críticos ou altos diretamente atribuíveis à lógica principal

## 4. Principais achados

- alerta de reentrancy em `AgroLotNFT.mintLot`: mitigado com `ReentrancyGuard` e `nonReentrant`
- `low-level call` em `AgroDAO.execute`: uso intencional da DAO
- uso de `timestamp` no staking: esperado para cálculo temporal e validação de oracle
- sugestão de `immutable` para `minStake`: melhoria de qualidade, não vulnerabilidade

## 5. Conclusão

O projeto apresentou boa aderência ao escopo acadêmico, com testes passando, auditoria estática executada e ausência de achados críticos ou altos na lógica principal da AgroChain.
