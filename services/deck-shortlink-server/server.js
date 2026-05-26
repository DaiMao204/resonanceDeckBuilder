const http = require("http")
const fs = require("fs")
const path = require("path")
const crypto = require("crypto")

const PORT = Number(process.env.PORT || 23367)
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data")
const CODE_LENGTH = Number(process.env.CODE_LENGTH || 8)
const MAX_BODY_BYTES = Number(process.env.MAX_BODY_BYTES || 300 * 1024)
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ||
  "https://rsnswiki-deck-builder.com,https://www.rsnswiki-deck-builder.com,http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean)

const CODE_ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"

function ensureDataDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true })
}

function sendJson(res, statusCode, payload, origin) {
  const body = JSON.stringify(payload)
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    ...corsHeaders(origin),
  })
  res.end(body)
}

function corsHeaders(origin) {
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0] || "*"
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin",
  }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks = []

    req.on("data", (chunk) => {
      size += chunk.length
      if (size > MAX_BODY_BYTES) {
        reject(new Error("request_body_too_large"))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })

    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")))
    req.on("error", reject)
  })
}

function randomCode(length = CODE_LENGTH) {
  let code = ""
  const bytes = crypto.randomBytes(length)
  for (const byte of bytes) {
    code += CODE_ALPHABET[byte % CODE_ALPHABET.length]
  }
  return code
}

function isValidCode(code) {
  return typeof code === "string" && /^[0-9A-Za-z_-]{4,32}$/.test(code)
}

function deckPath(code) {
  return path.join(DATA_DIR, `${code}.json`)
}

function isValidPreset(preset) {
  return (
    preset &&
    Array.isArray(preset.roleList) &&
    preset.roleList.length === 5 &&
    Array.isArray(preset.cardList)
  )
}

function createDeck(preset) {
  ensureDataDir()

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const code = randomCode()
    const file = deckPath(code)
    if (fs.existsSync(file)) continue

    const record = {
      code,
      version: 1,
      createdAt: new Date().toISOString(),
      preset,
    }

    fs.writeFileSync(file, JSON.stringify(record), { encoding: "utf8", flag: "wx" })
    return code
  }

  throw new Error("code_generation_failed")
}

function getDeck(code) {
  if (!isValidCode(code)) return null

  const file = deckPath(code)
  if (!fs.existsSync(file)) return null

  const record = JSON.parse(fs.readFileSync(file, "utf8"))
  return record.preset || null
}

async function handleRequest(req, res) {
  const origin = req.headers.origin || ""
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`)

  if (req.method === "OPTIONS") {
    res.writeHead(204, corsHeaders(origin))
    res.end()
    return
  }

  if (req.method === "GET" && url.pathname === "/health") {
    sendJson(res, 200, { ok: true }, origin)
    return
  }

  if (req.method === "POST" && url.pathname === "/api/decks") {
    try {
      const body = await readBody(req)
      const payload = JSON.parse(body)
      const preset = payload && payload.preset

      if (!isValidPreset(preset)) {
        sendJson(res, 400, { error: "invalid_preset" }, origin)
        return
      }

      const code = createDeck(preset)
      sendJson(res, 201, { code }, origin)
    } catch (error) {
      const status = error.message === "request_body_too_large" ? 413 : 500
      sendJson(res, status, { error: error.message || "internal_error" }, origin)
    }
    return
  }

  if (req.method === "GET" && url.pathname.startsWith("/api/decks/")) {
    const code = decodeURIComponent(url.pathname.slice("/api/decks/".length))
    const preset = getDeck(code)

    if (!preset) {
      sendJson(res, 404, { error: "deck_not_found" }, origin)
      return
    }

    sendJson(res, 200, { code, preset }, origin)
    return
  }

  sendJson(res, 404, { error: "not_found" }, origin)
}

ensureDataDir()

const server = http.createServer((req, res) => {
  handleRequest(req, res).catch((error) => {
    console.error(error)
    sendJson(res, 500, { error: "internal_error" }, req.headers.origin || "")
  })
})

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Deck shortlink server listening on http://127.0.0.1:${PORT}`)
  console.log(`Data directory: ${DATA_DIR}`)
})
