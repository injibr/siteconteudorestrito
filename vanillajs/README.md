# Perna Vanilla JS

Implementacao em HTML + JavaScript puro da verificacao de idade. Usa a API REST do `verify-service` diretamente (sem SDK).

## Como rodar

Necessita de 2 terminais.

**Terminal 1** - Caddy (serve o webapp na porta 5500, faz proxy da API, e serve o `eca-context.jsonld`):

```bash
cd perna/vanillajs && caddy run
```

Abra o navegador em `http://localhost:5500`.

**Terminal 2** - Script de simulacao (ver [perna/README.md](../README.md#scripts-de-simulacao)):

```bash
cd perna/scripts && node simulate-wallet-happy.mjs req_xxx
```

## Como funciona

1. `startVerification()` faz POST em `/v1/verify/vp-request` com a `presentationDefinition`
2. Constroi uma URL `openid4vp://authorize?...` e gera um QR code
3. `pollStatus()` faz polling em `/v1/verify/vp-request/{requestId}/status`
4. Quando o status e `VP_SUBMITTED`, busca o resultado em `/v1/verify/vp-result/{transactionId}`
5. Verifica `verificationStatus === "SUCCESS"` e `credentialSubject.isOver18 === true`
6. Redireciona para `/conteudo_adulto/` ou `/nao/`

## Arquivos

| Arquivo | Descricao |
|---|---|
| `index.html` | Pagina principal com toda a logica JS |
| `styles.css` | Estilos (fundo preto, fonte monospace) |
| `Caddyfile` | Caddy: file server + reverse proxy + eca-context.jsonld |

---

# Perna Vanilla JS (English)

Plain HTML + JavaScript implementation of age verification. Uses the `verify-service` REST API directly (no SDK).

## How to run

Requires 2 terminals.

**Terminal 1** - Caddy (serves the webapp on port 5500, proxies the API, and serves `eca-context.jsonld`):

```bash
cd perna/vanillajs && caddy run
```

Open browser at `http://localhost:5500`.

**Terminal 2** - Simulation script (see [perna/README.md](../README.md#simulation-scripts)):

```bash
cd perna/scripts && node simulate-wallet-happy.mjs req_xxx
```

## How it works

1. `startVerification()` POSTs to `/v1/verify/vp-request` with the `presentationDefinition`
2. Builds an `openid4vp://authorize?...` URL and generates a QR code
3. `pollStatus()` polls `/v1/verify/vp-request/{requestId}/status`
4. When status is `VP_SUBMITTED`, fetches result from `/v1/verify/vp-result/{transactionId}`
5. Checks `verificationStatus === "SUCCESS"` and `credentialSubject.isOver18 === true`
6. Redirects to `/conteudo_adulto/` or `/nao/`

## Files

| File | Description |
|---|---|
| `index.html` | Main page with all JS logic |
| `styles.css` | Styles (black background, monospace font) |
| `Caddyfile` | Caddy: file server + reverse proxy + eca-context.jsonld |
