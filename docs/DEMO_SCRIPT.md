# Roteiro de Demonstração - AgroChain

## 1. Objetivo do vídeo

Este roteiro organiza a apresentação da AgroChain em 5 a 10 minutos, cobrindo os pontos exigidos pela atividade:

- problema resolvido
- arquitetura do protocolo
- token ERC-20
- NFT ERC-721
- staking com recompensa
- governança simplificada
- integração com oracle
- integração Web3
- deploy em testnet

## 2. Estrutura sugerida do vídeo

### Bloco 1 - Introdução
Tempo sugerido: 30 a 60 segundos

Fala sugerida:

> A AgroChain é um MVP de protocolo Web3 para rastreabilidade e governança em cadeias agro. A proposta é registrar lotes como NFTs, usar um token para incentivos e votação, integrar staking com oracle e permitir decisões coletivas por meio de uma DAO simplificada.

Mostrar:

- nome do projeto
- home do frontend
- logo e proposta visual

## 3. Bloco 2 - Problema e arquitetura
Tempo sugerido: 1 a 2 minutos

Fala sugerida:

> O problema que o projeto resolve é a dificuldade de registrar lotes de forma auditável, criar incentivos econômicos e permitir governança transparente sobre parâmetros do protocolo. A solução foi dividida em quatro contratos principais: token, NFT, staking e DAO.

Mostrar:

- `docs/ARCHITECTURE.md`
- diagrama Mermaid ou versão renderizada
- arquivos em `contracts/`

Pontos para destacar:

- `AgroToken.sol` é o ERC-20 com `ERC20Votes`
- `AgroLotNFT.sol` representa lotes únicos
- `AgroStaking.sol` gerencia staking e recompensas
- `AgroDAO.sol` faz proposta, voto e execução
- Chainlink ETH/USD alimenta a lógica do staking

## 4. Bloco 3 - Segurança e testes
Tempo sugerido: 1 minuto

Fala sugerida:

> Na parte de segurança, os contratos usam Solidity 0.8.x, controle de acesso com AccessControl, proteção contra reentrancy, pausa administrativa e validação de oracle. Também foram escritos testes automatizados para os quatro contratos principais.

Mostrar:

- `docs/AUDIT.md`
- arquivos em `test/`
- resultado de testes, se disponível no terminal

Pontos para citar:

- `ReentrancyGuard` no staking e na execução da DAO
- `AccessControl` nos contratos administrativos
- suíte com 139 testes passando

## 5. Bloco 4 - Deploy local ou Sepolia
Tempo sugerido: 1 minuto

### Cenário ideal

Mostrar deploy Sepolia já realizado e endereços prontos.

Fala sugerida:

> O protocolo foi preparado para deploy em testnet Sepolia com módulo Ignition. Em localhost, usamos um mock de oracle. Em Sepolia, usamos o feed real do Chainlink ETH/USD.

Mostrar:

- `README.md`
- `ignition/modules/AgroChain.ts`
- `ignition/modules/AgroChainLocal.ts`
- endereços e links do explorer, se já existirem

### Se o deploy Sepolia ainda não estiver pronto

Fala sugerida:

> O projeto já está preparado para deploy em Sepolia, com módulo específico para Chainlink real. O ambiente local já foi validado com mock oracle e o passo final é registrar os endereços e links do explorer após o deploy testnet.

## 6. Bloco 5 - Demonstração Web3 no frontend
Tempo sugerido: 2 a 4 minutos

### 5.1 Home

Fala sugerida:

> A home organiza o fluxo da demonstração e resume os módulos do protocolo: token, NFT, staking, governança e ambiente atual.

Mostrar:

- página inicial
- cards de contexto
- sessão “Como funciona”

### 5.2 Mint de NFT

Fala sugerida:

> Aqui eu demonstro o mint de um lote agro como NFT. O usuário informa a URI de metadados e o tipo do produto, conecta a carteira e envia a transação.

Mostrar:

- página `Lotes`
- campo `URI do token`
- campo `Tipo do produto`
- botão de conectar carteira
- botão de emissão

Se possível demonstrar:

- transação sendo enviada
- hash da transação
- mensagem de sucesso

### 5.3 Staking

Fala sugerida:

> Em seguida, demonstro o staking de AGRO. O usuário aprova o token, faz o depósito e acompanha saldo, valor em staking, recompensas e APR atual.

Mostrar:

- página `Recompensas`
- quantidade de AGRO
- botão `Aprovar + fazer staking`
- botão `Resgatar`
- status do staking

### 5.4 Governança

Fala sugerida:

> Na governança, o usuário cria uma proposta para alterar o APR, vota com base em saldo delegado e executa a proposta se aprovada.

Mostrar:

- página `Governança`
- campo de APR
- descrição da proposta
- botões de votar e executar

Ponto importante para falar:

> O poder de voto vem do token AGRO com delegação e snapshot histórico via ERC20Votes.

## 7. Bloco 6 - Demonstração por scripts
Tempo sugerido: 1 a 2 minutos

Fala sugerida:

> Além do frontend, o protocolo também pode ser operado por scripts em ethers.js, o que facilita validação técnica e automação da demonstração.

Mostrar:

- pasta `scripts/`
- comandos principais

Comandos que podem ser exibidos:

```bash
npx ts-node scripts/status.ts
npx ts-node scripts/delegate.ts
npx ts-node scripts/mint-lot.ts
npx ts-node scripts/stake.ts
npx ts-node scripts/propose-set-apr.ts
npx ts-node scripts/vote.ts
npx ts-node scripts/execute.ts
```

## 8. Bloco 7 - Encerramento
Tempo sugerido: 30 a 60 segundos

Fala sugerida:

> Em resumo, a AgroChain integra os conteúdos da fase avançada em um protocolo Web3 funcional, com token, NFT, staking, DAO, oracle e frontend. O projeto foi desenvolvido como um MVP acadêmico, com foco em clareza de arquitetura, segurança básica e demonstração prática do fluxo completo.

Mostrar:

- home do projeto
- README
- relatório técnico ou arquitetura

## 9. Ordem ideal de telas

1. Home do frontend
2. `docs/ARCHITECTURE.md`
3. pasta `contracts/`
4. `docs/AUDIT.md`
5. terminal com testes ou deploy
6. página `Lotes`
7. página `Recompensas`
8. página `Governança`
9. pasta `scripts/`
10. README ou explorer

## 10. Checklist pré-gravação

- [ ] frontend rodando
- [ ] carteira conectando corretamente
- [ ] variáveis de ambiente configuradas
- [ ] endereços corretos no frontend
- [ ] scripts funcionando
- [ ] testes executados
- [ ] deploy Sepolia pronto ou status claramente explicado
- [ ] links do explorer separados
- [ ] roteiro aberto para consulta

## 11. Plano de contingência

Se alguma transação falhar durante a gravação:

- mostrar o fluxo pelo frontend mesmo sem concluir a transação
- usar os scripts para comprovar operação
- mostrar hashes já gerados anteriormente
- mostrar testes automatizados e arquitetura como evidência complementar

Se o deploy Sepolia ainda não estiver finalizado:

- mostrar que o módulo de deploy existe
- explicar a diferença entre `AgroChain.ts` e `AgroChainLocal.ts`
- demonstrar localmente com mock oracle

## 12. Duração recomendada

- introdução: 0:30
- arquitetura: 1:30
- segurança: 1:00
- deploy: 1:00
- frontend: 3:00
- scripts: 1:00
- encerramento: 0:30

Total estimado: 8 a 9 minutos
