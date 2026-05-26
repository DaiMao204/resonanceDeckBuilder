const DEFAULT_SHORTENER_URL = "https://deck.daimao.online"
const SHORTENER_TIMEOUT_MS = 5000

function getShortenerBaseUrl() {
  return (process.env.NEXT_PUBLIC_DECK_SHORTENER_URL || DEFAULT_SHORTENER_URL).replace(/\/+$/, "")
}

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
