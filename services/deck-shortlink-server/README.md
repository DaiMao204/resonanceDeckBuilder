# Deck Shortlink Server

Small dependency-free Node.js service for Resonance Deck Builder short share links.

## Endpoints

```text
GET  /health
POST /api/decks
GET  /api/decks/:code
```

## Windows quick start

```powershell
cd F:\resonanceDeckBuilder\services\deck-shortlink-server
$env:PORT="23367"
$env:DATA_DIR="F:\resonanceDeckBuilder-data\deck-shortlinks"
$env:ALLOWED_ORIGINS="https://rsnswiki-deck-builder.com,https://www.rsnswiki-deck-builder.com,http://localhost:3000"
node server.js
```

Use BT Panel / Nginx reverse proxy:

```text
https://deck.daimao.online -> http://127.0.0.1:23367
```

Then test:

```text
https://deck.daimao.online/health
```
