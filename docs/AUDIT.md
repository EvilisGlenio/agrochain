# Relatório de Auditoria - AgroChain

## 1. Objetivo

Este documento registra a auditoria simplificada do MVP AgroChain, cobrindo análise de segurança básica, testes automatizados e ferramentas estáticas solicitadas na atividade.

O foco da auditoria é verificar:

- riscos de reentrancy
- controle de acesso
- consistência de permissões administrativas
- integração com oracle
- segurança básica de staking e governança
- cobertura mínima por testes e análise estática

## 2. Escopo

Contratos auditados:

- `contracts/AgroToken.sol`
- `contracts/AgroLotNFT.sol`
- `contracts/AgroStaking.sol`
- `contracts/AgroDAO.sol`

Contratos auxiliares:

- `contracts/mocks/MockERC20.sol`
- `contracts/mocks/MockV3Aggregator.sol`

## 3. Ferramentas utilizadas

### 3.1 Hardhat

Uso esperado:

- compilação dos contratos
- execução dos testes automatizados
- validação funcional do protocolo

Comandos executados:

```bash
npx hardhat compile
npx hardhat test
```

Resultado:

- status: `executado com sucesso`
- data: `2026-04-26`
- resumo:
  - `npx hardhat compile`: sem erros, sem necessidade de recompilação adicional
  - `npx hardhat test`: 139 testes passando

### 3.2 Slither

Uso esperado:

- análise estática de padrões inseguros
- identificação de riscos comuns em Solidity

Comando executado:

```bash
docker run --rm -v "/home/montenegro/my-projects/agrochain":/src trailofbits/eth-security-toolbox slither /src
```

Resultado:

- status: `executado com sucesso via Docker`
- data: `2026-04-26`
- resumo:
  - Slither analisou `51 contracts with 101 detectors`
  - foram reportados `95 result(s)`
  - a maior parte dos apontamentos veio de dependências OpenZeppelin e padrões genéricos do ecossistema
  - os pontos mais relevantes para o código do projeto foram isolados na seção de achados

### 3.3 Mythril

Uso esperado:

- análise simbólica dos contratos principais
- busca por problemas lógicos ou vulnerabilidades clássicas

Comandos executados:

```bash
docker run --rm mythril/myth analyze -c "$(jq -r '.deployedBytecode' artifacts/contracts/AgroToken.sol/AgroToken.json)"
docker run --rm mythril/myth analyze -c "$(jq -r '.deployedBytecode' artifacts/contracts/AgroLotNFT.sol/AgroLotNFT.json)"
docker run --rm mythril/myth analyze -c "$(jq -r '.deployedBytecode' artifacts/contracts/AgroStaking.sol/AgroStaking.json)"
docker run --rm mythril/myth analyze -c "$(jq -r '.deployedBytecode' artifacts/contracts/AgroDAO.sol/AgroDAO.json)"
```

Observação:

- a tentativa inicial de analisar o código-fonte diretamente falhou por indisponibilidade de resolução DNS para `solc-bin.ethereum.org` dentro do contêiner
- como workaround, a análise foi executada sobre o `deployedBytecode` gerado pelo Hardhat
- isso reduz contexto semântico do source map e aumenta a chance de falsos positivos em relação à análise compilada diretamente do fonte

Resultado:

- status: `executado com workaround via bytecode`
- data: `2026-04-26`
- resumo:
  - `AgroDAO`: sem issues detectadas
  - `AgroStaking`: 1 alerta médio genérico de `assertion violation` em fallback e alertas baixos de dependência em `block.timestamp`
  - `AgroLotNFT`: 1 alerta médio genérico de `assertion violation` em fallback
  - `AgroToken`: 1 alerta médio genérico de `assertion violation` em fallback e alertas baixos de dependência em `block.number` e `block.timestamp` por causa das extensões de votos/permit

## 4. Controles de segurança implementados

### 4.1 Solidity ^0.8.x

Todos os contratos principais utilizam `pragma solidity ^0.8.28;`.

Benefícios:

- proteção nativa contra overflow e underflow
- suporte moderno do compilador
- compatibilidade com versões recentes da OpenZeppelin

### 4.2 Controle de acesso

Os contratos usam `AccessControl` para restringir operações administrativas.

Aplicações observadas:

- mint controlado no NFT
- administração de parâmetros do staking
- administração de pausa
- administração da DAO e de alvos autorizados

### 4.3 Pausable

Os contratos principais incluem capacidade de pausa para reduzir impacto operacional em caso de falhas ou comportamento inesperado.

### 4.4 ReentrancyGuard

Proteção contra reentrancy foi aplicada nos contratos com operações mais sensíveis.

Pontos esperados:

- `AgroLotNFT`: `mintLot`
- `AgroStaking`: `stake`, `claim`, `unstake`
- `AgroDAO`: `execute`

### 4.5 SafeERC20

O contrato de staking usa `SafeERC20`, reduzindo risco em transferências de token.

### 4.6 Oracle com validações

O staking inclui validações do dado retornado pelo oracle.

Validações esperadas:

- preço maior que zero
- `updatedAt` válido
- `updatedAt` não futuro
- `answeredInRound >= roundId`
- limite de staleness

## 5. Análise por contrato

### 5.1 AgroToken

Objetivo:

- token fungível do protocolo
- suporte a governança via `ERC20Votes`

Pontos positivos:

- uso de OpenZeppelin
- integração com `ERC20Permit`
- integração com `ERC20Votes`
- controle de acesso para funções administrativas

Pontos de atenção:

- revisar permissões de mint e pausa antes do deploy final
- confirmar se a distribuição inicial está documentada no relatório técnico

### 5.2 AgroLotNFT

Objetivo:

- representar lotes agro individualmente

Pontos positivos:

- uso de `ERC721URIStorage`
- modelo adequado para ativos únicos
- mint protegido por papel administrativo
- `mintLot` protegido com `nonReentrant`

Pontos de atenção:

- os metadados dependem de URI externa; a disponibilidade do conteúdo deve ser considerada
- o MVP não valida estrutura semântica dos metadados fora da URI

### 5.3 AgroStaking

Objetivo:

- bloquear AGRO e distribuir recompensas

Pontos positivos:

- uso de `ReentrancyGuard`
- uso de `SafeERC20`
- integração com oracle
- validações de consistência do feed

Pontos de atenção:

- a regra econômica é acadêmica e precisa ser explicada como demonstrativa
- o contrato depende de funding de recompensas
- parâmetros administrativos devem ser claramente documentados

### 5.4 AgroDAO

Objetivo:

- governança simplificada do protocolo

Pontos positivos:

- votação com snapshot via `ERC20Votes`
- uso de `ReentrancyGuard` em execução
- restrição de alvos executáveis reduz superfície de ataque

Pontos de atenção:

- DAO simplificada não possui toda a robustez de um `Governor + Timelock`
- a execução depende de fluxo correto de delegação e espera de blocos
- o escopo de ações executáveis é intencionalmente limitado

## 6. Achados

### 6.1 Achados críticos

- `nenhum registrado até o momento`

### 6.2 Achados altos

- `nenhum registrado até o momento`

### 6.3 Achados médios

- `Mythril` reportou `SWC-110 Assertion Violation` em análises por bytecode de `AgroToken`, `AgroLotNFT` e `AgroStaking`
- avaliação: `baixo risco prático / provável falso positivo de análise em runtime bytecode`
- justificativa:
  - o achado aparece associado à `fallback` de `MAIN`, sem mapeamento claro para uma função de negócio do projeto
  - `AgroDAO` não apresentou o mesmo problema
  - a suíte de testes está íntegra e não indicou comportamento equivalente
  - a execução foi feita sobre bytecode, não sobre fonte compilada diretamente pelo Mythril

### 6.4 Achados baixos

- `Slither` apontou uso de `block.timestamp` em `AgroStaking`
- avaliação: `aceito para o caso de uso`
- justificativa:
  - o contrato usa timestamp para cálculo temporal de recompensa e verificação de staleness do oracle
  - não há uso de timestamp como fonte de aleatoriedade

- `Slither` apontou `low-level call` em `AgroDAO.execute`
- avaliação: `aceito e intencional`
- justificativa:
  - a DAO precisa executar chamadas arbitrárias dentro de uma allowlist controlada
  - a função já usa `nonReentrant`, checagem de estado e restrição de alvos permitidos

- `Slither` apontou `reentrancy-benign` e `reentrancy-events` em `AgroLotNFT.mintLot`
- avaliação: `mitigado no código`
- justificativa:
  - o alerta decorre de `_safeMint` seguido de gravação de estado e emissão de evento
  - após a auditoria, `mintLot` passou a usar `ReentrancyGuard` com `nonReentrant`
  - o mint é restrito por papel administrativo
  - não há fluxo econômico direto associado ao ponto indicado

- `Slither` apontou que `AgroStaking.minStake` poderia ser `immutable`
- avaliação: `melhoria de qualidade, não vulnerabilidade`

### 6.5 Informativos

- a arquitetura prioriza simplicidade para fins acadêmicos
- o uso de mocks em localhost melhora testabilidade
- a governança é propositalmente reduzida para caber no escopo do MVP
- parte relevante dos alertas do Slither foi emitida em contratos OpenZeppelin importados pelo projeto
- o `solc-version` reportado pelo Slither recai principalmente sobre ranges de versão presentes nas dependências, não sobre os contratos principais da AgroChain, que usam `^0.8.28`
- o `incorrect-exp` reportado pelo Slither aparece em `Math.sol` da OpenZeppelin e corresponde a implementação conhecida da biblioteca, não a bug da AgroChain

## 7. Resultados dos testes

Execução registrada em `2026-04-26`:

- `AgroToken.ts`: 20 passing
- `AgroLotNFT.ts`: 20 passing
- `AgroStaking.ts`: 47 passing
- `AgroDAO.ts`: 52 passing
- total da suíte: 139 passing

Interpretação:

- o projeto apresenta boa validação funcional para um MVP acadêmico
- os fluxos principais foram exercitados localmente
- a suíte atual oferece boa confiança funcional para o escopo acadêmico

## 8. Riscos residuais

Mesmo com os controles aplicados, permanecem riscos residuais típicos de MVP:

- simplificação da governança em comparação com padrões completos de produção
- dependência de metadados externos no NFT
- dependência de funding manual das recompensas de staking
- dependência da disponibilidade do oracle em testnet
- a análise Mythril foi feita por bytecode como workaround, o que reduz precisão dos achados

## 9. Recomendações

### Antes da entrega

- decidir se `AgroStaking.minStake` deve virar `immutable` como melhoria de qualidade
- repetir Mythril a partir do código-fonte caso o ambiente permita resolver o download do `solc`, apenas para aumentar confiança do relatório final
- anexar no PDF final o resumo dos achados desta auditoria

### Evolução futura

- migrar governança para arquitetura com `Governor` e `Timelock`
- enriquecer metadados do NFT
- adicionar monitoramento de eventos e dashboard on-chain
- criar política mais robusta para gestão de recompensas

## 10. Conclusão

Do ponto de vista de implementação, a AgroChain já incorpora controles relevantes para o escopo da atividade, como `AccessControl`, `ReentrancyGuard`, `SafeERC20`, `Pausable` e validações de oracle.

O estado atual indica um MVP tecnicamente consistente, e este relatório já registra a execução formal de `Hardhat`, `Slither` e `Mythril` dentro das limitações do ambiente disponível.

Após a execução realizada em `2026-04-26`, o projeto demonstrou:

- compilação sem erros
- suíte completa de testes passando
- ausência de achados críticos ou altos diretamente atribuíveis à lógica principal da AgroChain
- alguns alertas baixos e médios que, em sua maior parte, se enquadram como uso intencional do protocolo, dependências OpenZeppelin ou falsos positivos de análise por bytecode

Com isso, a AgroChain atende bem à camada de segurança esperada para um MVP acadêmico, embora ainda exista espaço para refinamentos antes da entrega final.
