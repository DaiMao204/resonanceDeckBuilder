"use client"

import { useEffect, useRef, useState } from "react"
import { useLanguage } from "../contexts/language-context"

declare global {
  interface Window {
    Artalk?: {
      init: (options: Record<string, unknown>) => { destroy?: () => void }
    }
  }
}

interface CommentsProps {
  currentLanguage: string
}

interface ArtalkCommentsProps {
  currentLanguage: string
  getTranslatedString: (key: string) => string
}

const ARTALK_VERSION = "2.9.1"
const ARTALK_SCRIPT_ID = "artalk-client-script"
const ARTALK_STYLE_ID = "artalk-client-style"
const ARTALK_DEFAULT_EMOTICONS_URL = "https://cdn.jsdelivr.net/gh/ArtalkJS/Emoticons/grps/default.json"
const ARTALK_EMOTICONS_ASSET_ORIGIN = "https://comment.daimao.online"
const ARTALK_LANQUEER_EMOTICONS_URL = `${ARTALK_EMOTICONS_ASSET_ORIGIN}/artalk-emoticons/lanqueer-webp.json`
const ARTALK_DEFAULT_AVATAR_PATH = "/artalk/default-avatar-livia.png"
const ARTALK_GRAVATAR_MIRROR = "https://cravatar.cn/avatar/"
const SHARED_ARTALK_PAGE_KEY = "/"
const artalkServer = process.env.NEXT_PUBLIC_ARTALK_SERVER?.replace(/\/$/, "")
const artalkSite = process.env.NEXT_PUBLIC_ARTALK_SITE || "雷索纳斯卡组构建器"
const preloadedEmoticonImageUrls = new Set<string>()
const activePreloadImages = new Set<HTMLImageElement>()

interface NetworkInformationLike {
  effectiveType?: string
  saveData?: boolean
}

export function CommentsSection({ currentLanguage }: CommentsProps) {
  const { getTranslatedString } = useLanguage()

  if (!artalkServer) return null

  return <ArtalkCommentsSection currentLanguage={currentLanguage} getTranslatedString={getTranslatedString} />
}

function loadArtalkClient() {
  if (typeof window === "undefined") return Promise.reject(new Error("Artalk can only run in browser"))
  if (window.Artalk) return Promise.resolve()

  return new Promise<void>((resolve, reject) => {
    if (!document.getElementById(ARTALK_STYLE_ID)) {
      const link = document.createElement("link")
      link.id = ARTALK_STYLE_ID
      link.rel = "stylesheet"
      link.href = `https://unpkg.com/artalk@${ARTALK_VERSION}/dist/Artalk.css`
      document.head.appendChild(link)
    }

    const existingScript = document.getElementById(ARTALK_SCRIPT_ID) as HTMLScriptElement | null
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), { once: true })
      existingScript.addEventListener("error", () => reject(new Error("Failed to load Artalk client")), { once: true })
      return
    }

    const script = document.createElement("script")
    script.id = ARTALK_SCRIPT_ID
    script.src = `https://unpkg.com/artalk@${ARTALK_VERSION}/dist/Artalk.js`
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error("Failed to load Artalk client"))
    document.body.appendChild(script)
  })
}

function isHuajiEmoticonText(value: string) {
  return /huaji|\u6ed1\u7a3d/i.test(value)
}

function removeHuajiEmoticons(value: unknown): unknown | null {
  if (typeof value === "string") {
    return isHuajiEmoticonText(value) ? null : value
  }

  if (Array.isArray(value)) {
    return value.map(removeHuajiEmoticons).filter((item) => item !== null)
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>
    const searchableText = [record.name, record.key, record.val].filter(
      (item): item is string => typeof item === "string",
    )

    if (searchableText.some(isHuajiEmoticonText)) {
      return null
    }

    const filteredRecord = { ...record }
    if (Array.isArray(record.items)) {
      filteredRecord.items = record.items.map(removeHuajiEmoticons).filter((item) => item !== null)
    }
    return filteredRecord
  }

  return value
}

async function loadJson(url: string) {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to load ${url}: ${response.status}`)
  }

  return response.json()
}

function normalizeRemoteEmoticonUrls(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(normalizeRemoteEmoticonUrls)
  }

  if (value && typeof value === "object") {
    const record = { ...(value as Record<string, unknown>) }
    if (typeof record.val === "string" && record.val.startsWith("/")) {
      record.val = `${ARTALK_EMOTICONS_ASSET_ORIGIN}${record.val}`
    }
    if (Array.isArray(record.items)) {
      record.items = record.items.map(normalizeRemoteEmoticonUrls)
    }
    return record
  }

  return value
}

function collectRemoteEmoticonImageUrls(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap(collectRemoteEmoticonImageUrls)
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>
    const urls = Array.isArray(record.items) ? collectRemoteEmoticonImageUrls(record.items) : []
    if (typeof record.val === "string" && /^https?:\/\/.+\.(gif|webp|png|jpe?g)$/i.test(record.val)) {
      urls.push(record.val)
    }
    return urls
  }

  return []
}

function getNetworkInformation() {
  if (typeof navigator === "undefined") return undefined

  const extendedNavigator = navigator as Navigator & {
    connection?: NetworkInformationLike
    mozConnection?: NetworkInformationLike
    webkitConnection?: NetworkInformationLike
  }

  return extendedNavigator.connection || extendedNavigator.mozConnection || extendedNavigator.webkitConnection
}

function shouldDelayEmoticonPreload() {
  const connection = getNetworkInformation()
  if (!connection) return false
  if (connection.saveData) return true

  const effectiveType = connection.effectiveType?.toLowerCase()
  return effectiveType === "slow-2g" || effectiveType === "2g" || effectiveType === "3g"
}

function scheduleEmoticonPreload(callback: () => void, delayMs = 0) {
  if (typeof window === "undefined") return

  if (delayMs > 0) {
    window.setTimeout(() => scheduleEmoticonPreload(callback), delayMs)
    return
  }

  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(callback, { timeout: 2000 })
    return
  }

  window.setTimeout(callback, 300)
}

function preloadRemoteEmoticonImages(value: unknown) {
  if (typeof window === "undefined") return

  const urls = collectRemoteEmoticonImageUrls(value).filter((url) => {
    if (preloadedEmoticonImageUrls.has(url)) return false
    preloadedEmoticonImageUrls.add(url)
    return true
  })
  if (!urls.length) return

  let index = 0
  const delayPreload = shouldDelayEmoticonPreload()
  const batchSize = delayPreload ? 2 : 6
  const preloadBatch = () => {
    const batch = urls.slice(index, index + batchSize)
    index += batch.length
    for (const url of batch) {
      const image = new Image()
      activePreloadImages.add(image)
      image.decoding = "async"
      image.onload = image.onerror = () => activePreloadImages.delete(image)
      image.src = url
    }
    if (index < urls.length) scheduleEmoticonPreload(preloadBatch)
  }

  // 蓝鹊儿动图较多；慢网或省流量模式下进一步延后并降低并发，避免抢首屏带宽。
  scheduleEmoticonPreload(preloadBatch, delayPreload ? 12000 : 0)
}

async function loadArtalkEmoticons() {
  const emoticonGroups: unknown[] = []

  try {
    const lanqueerEmoticons = normalizeRemoteEmoticonUrls(await loadJson(ARTALK_LANQUEER_EMOTICONS_URL))
    preloadRemoteEmoticonImages(lanqueerEmoticons)
    if (Array.isArray(lanqueerEmoticons)) {
      emoticonGroups.push(...lanqueerEmoticons)
    } else if (lanqueerEmoticons) {
      emoticonGroups.push(lanqueerEmoticons)
    }
  } catch (error) {
    console.warn("Failed to load Lanqueer Artalk emoticons:", error)
  }

  try {
    const emoticons = await loadJson(ARTALK_DEFAULT_EMOTICONS_URL)
    const filteredDefaultEmoticons = removeHuajiEmoticons(emoticons)
    const defaultGroups = Array.isArray(filteredDefaultEmoticons)
      ? filteredDefaultEmoticons
      : filteredDefaultEmoticons
        ? [filteredDefaultEmoticons]
        : []
    emoticonGroups.push(...defaultGroups)
  } catch (error) {
    console.warn("Failed to load filtered Artalk emoticons:", error)
  }

  return emoticonGroups
}

function mapToArtalkLocale(lang: string) {
  const localeMap: Record<string, string> = {
    cn: "zh-CN",
    zh: "zh-CN",
    tw: "zh-TW",
    en: "en-US",
    jp: "ja",
    ko: "ko",
  }
  return localeMap[lang] || "zh-CN"
}

function getSharedArtalkPageKey() {
  // 所有语言与配队链接共用同一个评论页，避免 Artalk 后台生成很长的本地调试链接。
  return SHARED_ARTALK_PAGE_KEY
}

function getArtalkGravatarConfig() {
  // 没有 Gravatar/Cravatar 头像时，回退到站点内置的莉薇娅默认头像。
  const defaultAvatarUrl = new URL(ARTALK_DEFAULT_AVATAR_PATH, window.location.origin).toString()

  return {
    mirror: ARTALK_GRAVATAR_MIRROR,
    params: `sha256=1&d=${encodeURIComponent(defaultAvatarUrl)}&s=240`,
  }
}

function getArtalkUiText(lang: string) {
  const uiTextMap: Record<string, Record<string, string>> = {
    cn: {
      placeholder: "说点什么...",
      noComment: "暂无评论",
      sendBtn: "发送评论",
    },
    zh: {
      placeholder: "说点什么...",
      noComment: "暂无评论",
      sendBtn: "发送评论",
    },
    tw: {
      placeholder: "說點什麼...",
      noComment: "暫無留言",
      sendBtn: "發送留言",
    },
    en: {
      placeholder: "Type something...",
      noComment: "No comments yet",
      sendBtn: "Post Comment",
    },
    jp: {
      placeholder: "コメントを入力...",
      noComment: "コメントはまだありません",
      sendBtn: "コメントを投稿",
    },
    ko: {
      placeholder: "댓글을 입력하세요...",
      noComment: "아직 댓글이 없습니다",
      sendBtn: "댓글 작성",
    },
  }
  return uiTextMap[lang] || uiTextMap.cn
}

function ArtalkCommentsSection({ currentLanguage, getTranslatedString }: ArtalkCommentsProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const artalkRef = useRef<{ destroy?: () => void } | null>(null)
  const [disabled, setDisabled] = useState(false)
  const [shouldInitialize, setShouldInitialize] = useState(false)

  useEffect(() => {
    if (shouldInitialize || typeof window === "undefined") return

    let cancelled = false
    let timeoutId: number | undefined
    let observer: IntersectionObserver | undefined

    const initializeComments = () => {
      if (!cancelled) setShouldInitialize(true)
    }

    const initializeAfterPageSettles = () => {
      timeoutId = window.setTimeout(initializeComments, 4000)
    }

    const container = containerRef.current
    if ("IntersectionObserver" in window && container) {
      observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) {
            initializeComments()
          }
        },
        { rootMargin: "800px 0px" },
      )
      observer.observe(container)
    }

    if (document.readyState === "complete") {
      initializeAfterPageSettles()
    } else {
      window.addEventListener("load", initializeAfterPageSettles, { once: true })
    }

    return () => {
      cancelled = true
      if (timeoutId !== undefined) window.clearTimeout(timeoutId)
      observer?.disconnect()
      window.removeEventListener("load", initializeAfterPageSettles)
    }
  }, [shouldInitialize])

  useEffect(() => {
    if (!shouldInitialize) return

    let cancelled = false
    setDisabled(false)

    loadArtalkClient()
      .then(async () => {
        if (cancelled || !window.Artalk || !containerRef.current || !artalkServer) return
        artalkRef.current?.destroy?.()
        containerRef.current.innerHTML = ""

        const uiText = getArtalkUiText(currentLanguage)
        let emoticons: unknown = []
        try {
          emoticons = await loadArtalkEmoticons()
        } catch (error) {
          console.warn("Failed to load Artalk emoticons:", error)
        }
        if (cancelled || !window.Artalk || !containerRef.current || !artalkServer) return

        artalkRef.current = window.Artalk.init({
          el: containerRef.current,
          server: artalkServer,
          site: artalkSite,
          pageKey: getSharedArtalkPageKey(),
          pageTitle: "Resonance Deck Builder",
          locale: mapToArtalkLocale(currentLanguage),
          darkMode: true,
          preview: false,
          emoticons,
          gravatar: getArtalkGravatarConfig(),
          preferRemoteConf: false,
          useBackendConf: false,
          placeholder: uiText.placeholder,
          noComment: uiText.noComment,
          sendBtn: uiText.sendBtn,
        })
      })
      .catch((error) => {
        console.error("Error loading Artalk:", error)
        if (!cancelled) setDisabled(true)
      })

    return () => {
      cancelled = true
      artalkRef.current?.destroy?.()
      artalkRef.current = null
    }
  }, [currentLanguage, shouldInitialize])

  if (disabled) return null

  return (
    <section className="w-full py-4 mt-12 border-t border-[rgba(255,255,255,0.1)]">
      <div className="container mx-auto px-4">
        <h2 className="text-xl font-semibold mb-4 neon-text">
          {getTranslatedString("comments.title") || "Comments"}
        </h2>
        <div key={currentLanguage} className="artalk-comments" ref={containerRef} />
      </div>
    </section>
  )
}
