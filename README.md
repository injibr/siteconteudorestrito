# Perna - Verificacao de Idade com Credenciais Verificaveis

Prova de conceito de verificacao de idade usando o protocolo OpenID4VP (Verifiable Presentations). Um usuario apresenta uma credencial digital (ECACredential) que comprova ser maior de 18 anos, sem revelar sua identidade.

## Pre-requisitos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (para o backend)
- [Caddy](https://caddyserver.com/) (servidor de arquivos)
- [Node.js](https://nodejs.org/) 18+

## Estrutura

```
perna/
  eca-context.jsonld          # JSON-LD context da credencial ECA
  Caddyfile                   # Caddy: serve eca-context.jsonld na porta 5500
  vanillajs/                  # Implementacao vanilla JS
  react/                      # Implementacao React
  scripts/                    # Scripts de simulacao de wallet
```

## Backend

O backend (`verify-service`) roda em Docker e expoe a API na porta 8080.

```bash
cd inji-verify/docker-compose && docker compose up -d
```

## Caddy (obrigatorio)

O backend precisa buscar o `eca-context.jsonld` via HTTP para validar as assinaturas das credenciais. De dentro do Docker, ele acessa `http://host.docker.internal:5500/eca-context.jsonld`. O Caddy serve esse arquivo.

```bash
cd perna && caddy run
```

Isso e necessario tanto para a versao vanilla JS quanto para a versao React.

## Implementacoes

Ha duas implementacoes do mesmo webapp:

- **[vanillajs/](vanillajs/)** - HTML + JavaScript puro, usando a API REST diretamente
- **[react/](react/)** - React 18 + TypeScript, usando o SDK `@mosip/react-inji-verify-sdk`

Veja o README de cada uma para instrucoes especificas.

## Scripts de simulacao

Como nao temos uma wallet real, usamos scripts que simulam o comportamento de uma wallet digital submetendo uma Verifiable Presentation ao backend.

### Uso

1. Abra o webapp (vanillajs ou react) e clique em "Verificar".
2. Copie o `requestId` do console do navegador (F12). O formato e `req_xxx`.
3. Rode o script:

```bash
cd perna/scripts

# Instalar dependencias (primeira vez)
npm install

# Happy path: isOver18=true, assinatura valida → /conteudo_adulto/
node simulate-wallet-happy.mjs req_xxx

# Unhappy path: isOver18=false → /nao/
node simulate-wallet-unhappy.mjs req_xxx
```

### Variaveis de ambiente

| Variavel | Default | Descricao |
|---|---|---|
| `VERIFY_SERVICE_URL` | `http://localhost:8080/v1/verify` | URL do backend |
| `CONTEXT_PORT` | `5500` | Porta do Caddy servindo `eca-context.jsonld` |

## Fluxo de verificacao

```
Usuario               Webapp              Backend (Docker)        Wallet (script)
  |                     |                      |                      |
  |-- Clica Verificar   |                      |                      |
  |                     |-- POST /vp-request -->|                      |
  |                     |<-- requestId, QR -----|                      |
  |                     |                      |                      |
  |                     |-- GET /status ------->|  (polling)           |
  |                     |                      |                      |
  |                     |                      |<-- POST /vp-submission|
  |                     |                      |    (VP + credential)  |
  |                     |                      |                      |
  |                     |<-- VP_SUBMITTED ------|                      |
  |                     |-- GET /vp-result ---->|                      |
  |                     |<-- vcStatus, vc ------|                      |
  |                     |                      |                      |
  |<-- Redirect --------|                      |                      |
  |  /conteudo_adulto/ (SUCCESS + isOver18)                           |
  |  /nao/             (caso contrario)                               |
```

---

# Perna - Age Verification with Verifiable Credentials

Proof of concept for age verification using the OpenID4VP (Verifiable Presentations) protocol. A user presents a digital credential (ECACredential) proving they are over 18, without revealing their identity.

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (for the backend)
- [Caddy](https://caddyserver.com/) (file server)
- [Node.js](https://nodejs.org/) 18+

## Structure

```
perna/
  eca-context.jsonld          # ECA credential JSON-LD context
  Caddyfile                   # Caddy: serves eca-context.jsonld on port 5500
  vanillajs/                  # Vanilla JS implementation
  react/                      # React implementation
  scripts/                    # Wallet simulation scripts
```

## Backend

The backend (`verify-service`) runs in Docker and exposes the API on port 8080.

```bash
cd inji-verify/docker-compose && docker compose up -d
```

## Caddy (required)

The backend needs to fetch `eca-context.jsonld` over HTTP to validate credential signatures. From inside Docker, it accesses `http://host.docker.internal:5500/eca-context.jsonld`. Caddy serves this file.

```bash
cd perna && caddy run
```

This is required for both the vanilla JS and the React versions.

## Implementations

There are two implementations of the same webapp:

- **[vanillajs/](vanillajs/)** - Plain HTML + JavaScript, using the REST API directly
- **[react/](react/)** - React 18 + TypeScript, using the `@mosip/react-inji-verify-sdk` SDK

See each README for specific instructions.

## Simulation scripts

Since we don't have a real wallet, we use scripts that simulate a digital wallet submitting a Verifiable Presentation to the backend.

### Usage

1. Open the webapp (vanillajs or react) and click "Verificar".
2. Copy the `requestId` from the browser console (F12). The format is `req_xxx`.
3. Run the script:

```bash
cd perna/scripts

# Install dependencies (first time)
npm install

# Happy path: isOver18=true, valid signature → /conteudo_adulto/
node simulate-wallet-happy.mjs req_xxx

# Unhappy path: isOver18=false → /nao/
node simulate-wallet-unhappy.mjs req_xxx
```

### Environment variables

| Variable | Default | Description |
|---|---|---|
| `VERIFY_SERVICE_URL` | `http://localhost:8080/v1/verify` | Backend URL |
| `CONTEXT_PORT` | `5500` | Caddy port serving `eca-context.jsonld` |

## Verification flow

```
User                  Webapp              Backend (Docker)        Wallet (script)
  |                     |                      |                      |
  |-- Clicks Verify     |                      |                      |
  |                     |-- POST /vp-request -->|                      |
  |                     |<-- requestId, QR -----|                      |
  |                     |                      |                      |
  |                     |-- GET /status ------->|  (polling)           |
  |                     |                      |                      |
  |                     |                      |<-- POST /vp-submission|
  |                     |                      |    (VP + credential)  |
  |                     |                      |                      |
  |                     |<-- VP_SUBMITTED ------|                      |
  |                     |-- GET /vp-result ---->|                      |
  |                     |<-- vcStatus, vc ------|                      |
  |                     |                      |                      |
  |<-- Redirect --------|                      |                      |
  |  /conteudo_adulto/ (SUCCESS + isOver18)                           |
  |  /nao/             (otherwise)                                    |
```
