# Perna React

Implementacao em React 18 + TypeScript da verificacao de idade. Usa o componente `<OpenID4VPVerification>` do SDK `@mosip/react-inji-verify-sdk`, que cuida de todo o fluxo (VP request, QR code, polling, resultado).

## Como rodar

Necessita de 2 terminais.

**Terminal 1** - Caddy (serve o `eca-context.jsonld` na porta 5500 para o backend Docker):

```bash
cd perna && caddy run
```

**Terminal 2** - Vite dev server:

```bash
cd perna/react
npm install   # ou: bun install
npm run dev   # ou: bun run dev
```

Abra o navegador em `http://localhost:5173`.

**Testar** (ver [perna/README.md](../README.md#scripts-de-simulacao)):

```bash
cd perna/scripts && node simulate-wallet-happy.mjs req_xxx
```

## Como funciona

O SDK faz todo o trabalho pesado. O codigo do app e minimo:

1. Usuario clica "Verificar" → monta o componente `<OpenID4VPVerification>`
2. O SDK cria a VP request, gera o QR code e faz polling automaticamente
3. Callback `onVPProcessed` recebe o resultado e verifica `vcStatus` e `isOver18`
4. Redireciona para `/conteudo_adulto/` ou `/nao/`

### Interceptor de fetch

O `requestId` necessario para rodar os scripts de simulacao e logado no console do navegador via um interceptor de `fetch` (o SDK nao expoe esse valor diretamente).

### Proxy do Vite

O Vite dev server faz proxy de `/v1/verify/*` para `localhost:8080`, evitando problemas de CORS sem precisar do Caddy para a API.

### Paginas estaticas

As paginas de resultado (`/nao/`, `/conteudo_adulto/`) sao HTMLs estaticos em `public/`, servidos por um plugin Vite customizado que intercepta essas rotas antes do SPA fallback.

## Arquivos

| Arquivo | Descricao |
|---|---|
| `src/App.tsx` | Componente principal |
| `src/main.tsx` | Entry point React 18 |
| `src/index.css` | Estilos (fundo preto, fonte monospace) |
| `vite.config.ts` | Proxy API + plugin para paginas estaticas |
| `public/nao/` | Pagina de rejeicao |
| `public/conteudo_adulto/` | Pagina de conteudo adulto |

---

# Perna React (English)

React 18 + TypeScript implementation of age verification. Uses the `<OpenID4VPVerification>` component from the `@mosip/react-inji-verify-sdk` SDK, which handles the entire flow (VP request, QR code, polling, result).

## How to run

Requires 2 terminals.

**Terminal 1** - Caddy (serves `eca-context.jsonld` on port 5500 for the Docker backend):

```bash
cd perna && caddy run
```

**Terminal 2** - Vite dev server:

```bash
cd perna/react
npm install   # or: bun install
npm run dev   # or: bun run dev
```

Open browser at `http://localhost:5173`.

**Test** (see [perna/README.md](../README.md#simulation-scripts)):

```bash
cd perna/scripts && node simulate-wallet-happy.mjs req_xxx
```

## How it works

The SDK does all the heavy lifting. The app code is minimal:

1. User clicks "Verificar" → mounts the `<OpenID4VPVerification>` component
2. The SDK creates the VP request, generates the QR code, and polls automatically
3. `onVPProcessed` callback receives the result and checks `vcStatus` and `isOver18`
4. Redirects to `/conteudo_adulto/` or `/nao/`

### Fetch interceptor

The `requestId` needed to run the simulation scripts is logged in the browser console via a `fetch` interceptor (the SDK does not expose this value directly).

### Vite proxy

The Vite dev server proxies `/v1/verify/*` to `localhost:8080`, avoiding CORS issues without needing Caddy for the API.

### Static pages

The result pages (`/nao/`, `/conteudo_adulto/`) are static HTMLs in `public/`, served by a custom Vite plugin that intercepts these routes before the SPA fallback.

## Files

| File | Description |
|---|---|
| `src/App.tsx` | Main component |
| `src/main.tsx` | React 18 entry point |
| `src/index.css` | Styles (black background, monospace font) |
| `vite.config.ts` | API proxy + static pages plugin |
| `public/nao/` | Rejection page |
| `public/conteudo_adulto/` | Adult content page |
