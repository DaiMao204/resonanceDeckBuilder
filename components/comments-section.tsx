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
const artalkServer = process.env.NEXT_PUBLIC_ARTALK_SERVER?.replace(/\/$/, "")
const artalkSite = process.env.NEXT_PUBLIC_ARTALK_SITE || "雷索纳斯卡组构建器"
const preloadedEmoticonImageUrls = new Set<string>()
const activePreloadImages = new Set<HTMLImageElement>()

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

function scheduleEmoticonPreload(callback: () => void) {
  if (typeof window === "undefined") return

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
  const preloadBatch = () => {
    const batch = urls.slice(index, index + 6)
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

  // 蓝鹊儿动图较多，进入页面后分批预热浏览器缓存，避免打开面板时才集中加载。
  scheduleEmoticonPreload(preloadBatch)
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
  const pathname = window.location.pathname.replace(/^\/(cn|en|jp|ko|tw)(?=\/|$)/, "") || "/"
  return pathname + window.location.search
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

  useEffect(() => {
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
  }, [currentLanguage])

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
