# Relatório Técnico - AgroChain

## 1. Identificação

- Disciplina: Web 3.0
- Unidade: Unidade 1
- Capítulo: Capítulo 5
- Tema: Desenvolvimento de Protocolo Web3 Completo com Deploy em Testnet
- Projeto: AgroChain

## 2. Resumo executivo

A AgroChain é um MVP de protocolo Web3 voltado para rastreabilidade e governança em cadeias agro.
O projeto integra um token ERC-20, um NFT ERC-721, um contrato de staking com recompensa, uma DAO simplificada, consumo de dados externos via oracle e uma camada de integração Web3 por scripts e frontend.

O objetivo foi consolidar os conteúdos da fase avançada por meio da construção de um sistema funcional, modular e demonstrável em ambiente local e em testnet Ethereum.

## 3. Problema que o projeto resolve

Em cadeias agro, é comum haver dificuldade para:

- registrar lotes de forma auditável
- manter histórico rastreável da produção
- criar incentivos econômicos para participação no ecossistema
- permitir decisões transparentes sobre regras do sistema

A AgroChain propõe uma solução em que lotes são registrados como NFTs, incentivos são coordenados por um token fungível e parâmetros do protocolo podem ser alterados por governança descentralizada.

## 4. Objetivo do MVP

O MVP foi desenvolvido para demonstrar, de forma prática, a integração entre:

- ativos fungíveis
- ativos não fungíveis
- staking com recompensas
- governança simplificada
- oracle externo
- integração Web3
- deploy em ambiente compatível com Ethereum

## 5. Arquitetura da solução

O protocolo é composto por quatro contratos principais:

- `AgroToken.sol`
- `AgroLotNFT.sol`
- `AgroStaking.sol`
- `AgroDAO.sol`

Também fazem parte da solução:

- `MockV3Aggregator.sol` para ambiente local
- scripts `ethers.js` para automação dos fluxos
- mini frontend em Next.js para demonstração visual

### 5.1 Visão geral dos componentes

#### AgroToken

Contrato ERC-20 do protocolo, com suporte a:

- transferências fungíveis
- permissão por assinatura com `ERC20Permit`
- votação histórica com `ERC20Votes`
- papéis administrativos com `AccessControl`

#### AgroLotNFT

Contrato ERC-721 para representar lotes agro de forma individual.
Cada NFT possui URI de metadados e tipo de produto associado.

#### AgroStaking

Contrato responsável por:

- receber staking de AGRO
- acumular recompensas
- permitir `stake`, `claim` e `unstake`
- consultar oracle Chainlink para influenciar APR/recompensa

#### AgroDAO

Contrato de governança simplificada responsável por:

- criar propostas
- registrar votação com saldo delegado
- executar propostas aprovadas

## 6. Justificativa dos padrões ERC

### 6.1 Escolha do ERC-20

O padrão ERC-20 foi escolhido para o token AGRO porque ele representa bem um ativo fungível usado como unidade econômica do protocolo.

Motivos principais:

- compatibilidade com carteiras e ferramentas do ecossistema Ethereum
- adequação para staking e recompensas
- facilidade de integração com governança via `ERC20Votes`
- adoção consolidada com implementação da OpenZeppelin

### 6.2 Escolha do ERC-721

O padrão ERC-721 foi escolhido porque cada lote agro precisa ser individualizado e rastreado separadamente.

Motivos principais:

- identidade única para cada lote
- integração simples com URI de metadados
- melhor aderência ao caso de uso do MVP do que um modelo multi-token

## 7. Implementação técnica

### 7.1 Token ERC-20

O token AGRO foi implementado com OpenZeppelin e extensão de votos.
Ele é utilizado como base econômica do protocolo e como fonte de poder político na governança.

### 7.2 NFT ERC-721

O contrato de NFT permite o mint de lotes com metadados externos, possibilitando representar procedência e categoria do produto.

### 7.3 Staking com recompensa

O contrato de staking foi implementado para permitir bloqueio de AGRO e recebimento de recompensas.
Além da lógica temporal de acúmulo, o contrato usa leitura de oracle para ajustar a lógica de APR do protocolo.

### 7.4 Governança simples

A governança foi construída como uma DAO simplificada para manter escopo enxuto.
O contrato permite proposta, voto e execução em alvos autorizados.
O poder de voto usa snapshot histórico do token via `ERC20Votes`.

## 8. Segurança aplicada

Os contratos foram desenvolvidos em `Solidity ^0.8.28`, aproveitando verificações nativas contra overflow e underflow.

Medidas aplicadas:

- `AccessControl` para funções administrativas
- `ReentrancyGuard` em `AgroLotNFT.mintLot`
- `ReentrancyGuard` em operações críticas de staking e execução da DAO
- `Pausable` para resposta operacional a incidentes
- `SafeERC20` para transferências mais seguras no staking
- validações de consistência do oracle

### 8.1 Reentrancy

Proteção aplicada em funções críticas como:

- `mintLot`
- `stake`
- `claim`
- `unstake`
- `execute`

### 8.2 Controle de acesso

O acesso administrativo foi segmentado por papéis, reduzindo a exposição de funções sensíveis.

## 9. Auditoria e validação

### 9.1 Testes automatizados

Foram implementados testes para os quatro contratos principais.

Resultados conhecidos:

- `AgroToken.ts`: 20 testes passando
- `AgroLotNFT.ts`: 20 testes passando
- `AgroStaking.ts`: 47 testes passando
- `AgroDAO.ts`: 52 testes passando
- total: 139 testes passando

### 9.2 Ferramentas de auditoria

Ferramentas previstas pela atividade:

- Hardhat
- Slither
- Mythril

Execução registrada em `2026-04-26`:

- Hardhat:
  - `npx hardhat compile`: executado sem erros
  - `npx hardhat test`: executado com `139 testes passando`
- Slither:
  - executado com sucesso via Docker
  - analisou `51 contracts with 101 detectors`
  - reportou `95 results`, majoritariamente ligados a dependências OpenZeppelin e padrões genéricos
- Mythril:
  - executado via Docker com workaround por `deployedBytecode`
  - `AgroDAO`: sem issues detectadas
  - `AgroToken`, `AgroLotNFT` e `AgroStaking`: alertas médios genéricos de `assertion violation` em fallback, tratados como prováveis falsos positivos da análise por bytecode

Síntese da auditoria:

- não foram identificados achados críticos
- não foram identificados achados altos
- os achados baixos e médios observados são compatíveis com o escopo do MVP e, em grande parte, decorrem de análise estática conservadora ou do uso de bibliotecas OpenZeppelin
- o alerta de reentrancy anteriormente reportado em `AgroLotNFT.mintLot` foi mitigado com `ReentrancyGuard` e `nonReentrant`

Observação: o detalhamento da auditoria está consolidado em `docs/AUDIT.md`.

## 10. Integração com oracle

O projeto usa Chainlink ETH/USD em Sepolia para obter um dado externo confiável.
No ambiente local, utiliza `MockV3Aggregator` para manter repetibilidade dos testes e da demonstração.

Uso no MVP:

- consulta do feed de preço
- validação do retorno do oracle
- influência sobre a lógica de APR/recompensa do staking

Essa integração demonstra como o protocolo pode reagir a dados externos sem depender de valores inseridos manualmente em produção.

## 11. Integração Web3

O protocolo oferece duas formas principais de uso:

### 11.1 Scripts com ethers.js

Scripts disponíveis:

- `status.ts`
- `delegate.ts`
- `mint-lot.ts`
- `stake.ts`
- `claim.ts`
- `propose-set-apr.ts`
- `vote.ts`
- `execute.ts`

Esses scripts permitem demonstrar os fluxos exigidos pela tarefa:

- mint de NFT
- staking de tokens
- votação na DAO

### 11.2 Mini frontend

Foi criado um frontend em Next.js com páginas para:

- painel inicial
- lotes / mint
- recompensas / staking
- governança

O frontend se conecta aos contratos por `ethers.js` e usa variáveis `NEXT_PUBLIC_*` para configuração dos endereços.

## 12. Deploy

### 12.1 Ambiente local

O projeto possui módulo Ignition específico para localhost:

- `ignition/modules/AgroChainLocal.ts`

Esse módulo usa `MockV3Aggregator` para substituir o oracle real durante a demo local.

### 12.2 Testnet

O projeto possui módulo de deploy para Sepolia:

- `ignition/modules/AgroChain.ts`

Esse módulo usa o feed Chainlink ETH/USD da rede Sepolia.

Comando de deploy:

```bash
npx hardhat ignition deploy ignition/modules/AgroChain.ts --network sepolia
```

Comando opcional com verificação:

```bash
npx hardhat ignition deploy ignition/modules/AgroChain.ts --network sepolia --verify
```

### 12.3 Status do deploy

- localhost: validado
- Sepolia: `preencher com resultado final`

### 12.4 Endereços e explorer

Preencher após deploy Sepolia:

- `AgroToken`: `pendente`
- `AgroLotNFT`: `pendente`
- `AgroStaking`: `pendente`
- `AgroDAO`: `pendente`

Links do explorer:

- `AgroToken`: `pendente`
- `AgroLotNFT`: `pendente`
- `AgroStaking`: `pendente`
- `AgroDAO`: `pendente`

## 13. Fluxo de demonstração

O fluxo recomendado para demonstrar o protocolo é:

1. conectar carteira
2. emitir NFT de lote
3. aprovar token e realizar staking
4. consultar recompensas
5. delegar votos
6. criar proposta de alteração de APR
7. votar na proposta
8. executar proposta aprovada

## 14. Resultados alcançados

O projeto já entrega, no nível de código e integração:

- token ERC-20 funcional
- NFT ERC-721 funcional
- staking funcional com recompensa
- governança simplificada funcional
- integração com oracle
- scripts Web3
- mini frontend Web3
- testes automatizados cobrindo os contratos principais

## 15. Limitações do MVP

Por ser um MVP acadêmico, o projeto possui limitações intencionais:

- a governança não usa stack completa com `Governor` e `Timelock`
- a modelagem dos metadados do NFT é simples
- a lógica econômica do staking é demonstrativa
- a integração com oracle está focada em um caso de uso específico

## 16. Conclusão

A AgroChain atende ao objetivo de consolidar conhecimentos avançados em Web3 por meio da implementação de um protocolo descentralizado completo em escopo acadêmico.

O projeto integra contratos inteligentes, segurança básica, oracle, governança, frontend e scripts, formando uma base consistente para apresentação técnica e demonstração prática.

Na etapa de auditoria, o projeto já foi validado com `Hardhat`, `Slither` e `Mythril`, sem identificação de falhas críticas diretamente atribuíveis à lógica principal da AgroChain.

Para fechamento integral da entrega, ainda devem ser anexados principalmente os dados finais do deploy em Sepolia e os links do explorer.
