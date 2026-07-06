import pako from "pako"

// base64 → JSON
export function decodePreset(base64: string): any {
  try {
    // URL相关 相关 base64 相关 整理
    const cleaned = fixBase64FromUrl(base64)
    const compressed = Uint8Array.from(atob(cleaned), (c) => c.charCodeAt(0))
    const jsonStr = new TextDecoder().decode(pako.inflateRaw(compressed))
    const result = JSON.parse(jsonStr)
    return result
  } catch (e) {
    return null
  }
}

// JSON → base64
export function encodePreset(json: any): string {
  try {
    const jsonStr = JSON.stringify(json)
    const deflated = pako.deflateRaw(new TextEncoder().encode(jsonStr))
    const base64 = btoa(String.fromCharCode(...deflated))
    return base64
  } catch (e) {
    return ""
  }
}

// URL相关 相关 base64 相关 修改 函数
export function fixBase64FromUrl(str: string): string {
  // 1. 相关 +相关 相关
  const withPlus = str.replace(/ /g, "+")

  // 2. base64 填充 添加 (=)
  return padBase64(withPlus)
}

// base64 相关 相关 填充(=) 添加
export function padBase64(str: string): string {
  // base64 4的 相关 相关 相关
  const padLen = (4 - (str.length % 4)) % 4
  return str + "=".repeat(padLen)
}

// base64 相关 URL 相关 相关
export function encodePresetForUrl(json: any): string {
  const base64 = encodePreset(json)
  return encodeURIComponent(base64)
}

// URL相关 相关 相关 提取 以及 相关
export function decodePresetFromUrlParam(urlParam: string | null): any {
  if (!urlParam) return null

  try {
    // URL 相关 相关 base64 修改 以及 相关
    const decoded = decodeURIComponent(urlParam)
    return decodePreset(decoded)
  } catch (e) {
    console.error("Error decoding URL param:", e)
    return null
  }
}

