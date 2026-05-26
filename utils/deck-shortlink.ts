const DEFAULT_SHORTENER_URL = "https://deck.daimao.online"
const SHORTENER_TIMEOUT_MS = 5000

// 读取短链服务地址；未配置环境变量时使用当前线上服务。
function getShortenerBaseUrl() {
  return (process.env.NEXT_PUBLIC_DECK_SHORTENER_URL || DEFAULT_SHORTENER_URL).replace(/\/+$/, "")
}

// 给短链请求加超时，避免分享按钮在接口异常时长时间无响应。
async function fetchWithTimeout(url: string, init: RequestInit = {}) {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), SHORTENER_TIMEOUT_MS)

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    })
  } finally {
    window.clearTimeout(timeout)
  }
}

// 保存完整卡组配置，成功时返回短码；失败时返回 null 并交给旧长链接回退。
export async function saveDeckPresetToShortlink(preset: any): Promise<string | null> {
  try {
    const response = await fetchWithTimeout(`${getShortenerBaseUrl()}/api/decks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ preset }),
    })

    if (!response.ok) return null

    const payload = await response.json()
    return typeof payload?.code === "string" && payload.code ? payload.code : null
  } catch (error) {
    console.warn("Failed to create deck shortlink:", error)
    return null
  }
}

// 根据短码读取完整卡组配置；读取失败时返回 null。
export async function loadDeckPresetFromShortlink(code: string): Promise<any | null> {
  try {
    const safeCode = encodeURIComponent(code)
    const response = await fetchWithTimeout(`${getShortenerBaseUrl()}/api/decks/${safeCode}`)

    if (!response.ok) return null

    const payload = await response.json()
    return payload?.preset || null
  } catch (error) {
    console.warn("Failed to load deck shortlink:", error)
    return null
  }
}
