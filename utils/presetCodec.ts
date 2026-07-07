import pako from "pako"

const BASE64_CHUNK_SIZE = 0x8000

// 分块把压缩后的字节转成二进制字符串，避免卡组较大时参数展开导致栈溢出。
function bytesToBinaryString(bytes: Uint8Array): string {
  let binary = ""
  for (let index = 0; index < bytes.length; index += BASE64_CHUNK_SIZE) {
    binary += String.fromCharCode(...bytes.subarray(index, index + BASE64_CHUNK_SIZE))
  }
  return binary
}

function encodeUtf8(value: string): Uint8Array {
  if (typeof TextEncoder !== "undefined") {
    return new TextEncoder().encode(value)
  }

  const binary = unescape(encodeURIComponent(value))
  return Uint8Array.from(binary, (char) => char.charCodeAt(0))
}

function decodeUtf8(bytes: Uint8Array): string {
  if (typeof TextDecoder !== "undefined") {
    return new TextDecoder().decode(bytes)
  }

  return decodeURIComponent(escape(bytesToBinaryString(bytes)))
}

// 解码前统一整理剪贴板、URL 查询参数、base64url 这几种常见输入形态。
function normalizeBase64(str: string): string {
  return str.trim().replace(/ /g, "+").replace(/[\r\n\t\f\v]/g, "").replace(/-/g, "+").replace(/_/g, "/")
}

// base64 → JSON
export function decodePreset(base64: string): any {
  try {
    // URL相关 相关 base64 相关 整理
    const cleaned = fixBase64FromUrl(base64)
    const compressed = Uint8Array.from(atob(cleaned), (c) => c.charCodeAt(0))
    const jsonStr = decodeUtf8(pako.inflateRaw(compressed))
    const result = JSON.parse(jsonStr)
    return result
  } catch (e) {
    console.error("Failed to decode preset:", e)
    return null
  }
}

// JSON → base64
export function encodePreset(json: any): string {
  try {
    const jsonStr = JSON.stringify(json)
    const deflated = pako.deflateRaw(encodeUtf8(jsonStr))
    const base64 = btoa(bytesToBinaryString(deflated))
    return base64
  } catch (e) {
    console.error("Failed to encode preset:", e)
    return ""
  }
}

// URL相关 相关 base64 相关 修改 函数
export function fixBase64FromUrl(str: string): string {
  // 1. 处理 URL/剪贴板里可能出现的空格、换行和 base64url 字符。
  const normalized = normalizeBase64(str)

  // 2. base64 填充 添加 (=)
  return padBase64(normalized)
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
    // URLSearchParams 通常已经解码；这里兼容直接传入的原始查询参数。
    let decoded = urlParam
    try {
      decoded = decodeURIComponent(urlParam)
    } catch (e) {
      decoded = urlParam
    }
    return decodePreset(decoded)
  } catch (e) {
    console.error("Error decoding URL param:", e)
    return null
  }
}

