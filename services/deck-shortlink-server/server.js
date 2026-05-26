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

// 确保存储短链数据的目录存在，方便 NSSM 启动后直接写入。
function ensureDataDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true })
}

// 统一 JSON 响应和跨域头，供前端站点直接调用。
function sendJson(res, statusCode, payload, origin) {
  const body = JSON.stringify(payload)
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    ...corsHeaders(origin),
  })
  res.end(body)
}

// 只允许配置过的站点跨域访问，避免接口被随意嵌入。
function corsHeaders(origin) {
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0] || "*"
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin",
  }
}

// 读取并限制请求体大小，防止异常大 payload 占用内存。
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

// 生成短码。短码只用于分享定位，不包含卡组明文。
function randomCode(length = CODE_LENGTH) {
  let code = ""
  const bytes = crypto.randomBytes(length)
  for (const byte of bytes) {
    code += CODE_ALPHABET[byte % CODE_ALPHABET.length]
  }
  return code
}

// 限制短码字符集，避免把路径穿越或奇怪字符带进文件路径。
function isValidCode(code) {
  return typeof code === "string" && /^[0-9A-Za-z_-]{4,32}$/.test(code)
}

// 每个短码对应一个 JSON 文件，便于备份和人工迁移。
function deckPath(code) {
  return path.join(DATA_DIR, `${code}.json`)
}

// 只做最小结构校验，详细兼容性交给前端原有导入逻辑处理。
function isValidPreset(preset) {
  return (
    preset &&
    Array.isArray(preset.roleList) &&
    preset.roleList.length === 5 &&
    Array.isArray(preset.cardList)
  )
}

// 创建短链记录；极小概率撞码时会重新生成。
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

// 读取短码对应的卡组配置，不存在或不合法时返回 null。
function getDeck(code) {
  if (!isValidCode(code)) return null

  const file = deckPath(code)
  if (!fs.existsSync(file)) return null

  const record = JSON.parse(fs.readFileSync(file, "utf8"))
  return record.preset || null
}

// 简单路由：健康检查、保存卡组、读取卡组。
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

// 监听本机地址，由宝塔/Nginx 反向代理到公网 HTTPS 域名。
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
