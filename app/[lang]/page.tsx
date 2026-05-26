"use client"

import { useEffect, useState ,use} from "react"
import { useSearchParams, usePathname } from "next/navigation"
import DeckBuilder from "../../components/deckBuilder"
import { LoadingScreen } from "../../components/loading-screen"
import { useDataLoader } from "../../hooks/use-data-loader"
import { LanguageProvider } from "../../contexts/language-context"

// 统一封装后的 Firebase Analytics 事件记录。
import { logEventWrapper } from "../../lib/firebase-config"

interface PageProps {
  params: {
    lang: string
  }
}

export default function Page({ params }: PageProps) {
  const { lang } = use(params)
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const [isLoading, setIsLoading] = useState(true)
  const [deckCode, setDeckCode] = useState<string | null>(null)
  const [deckShortCode, setDeckShortCode] = useState<string | null>(null)
  const { data, loading, error } = useDataLoader()

  useEffect(() => {
    // 同时读取旧长链接 code 和新短链接 s，保证历史分享链接仍可访问。
    const codeParam = searchParams.get("code")
    const shortCodeParam = searchParams.get("s")
    setDeckCode(codeParam)
    setDeckShortCode(shortCodeParam)

    // 记录分享链接访问来源，短链和旧长链用不同类型区分。
    if (shortCodeParam || codeParam) {
      if (typeof window !== "undefined") {
        logEventWrapper("deck_shared_visit", {
          deck_code: shortCodeParam || codeParam,
          deck_code_type: shortCodeParam ? "short" : "long",
          language: lang,
        })
      }
    }

    setIsLoading(false)

    // 记录普通页面访问。
    if (typeof window !== "undefined") {
      logEventWrapper("page_view", {
        page_path: pathname,
        language: lang,
      })
    }
  }, [searchParams, pathname, lang])

  if (loading || isLoading) {
    return <LoadingScreen language={lang} />
  }

  if (error) {
    return (
      <div className="text-red-500">
        Error: {error.message}
        <br />
        Please check console for more details.
      </div>
    )
  }

  return (
    <LanguageProvider initialLanguage={lang} data={data}>
      <DeckBuilder urlDeckCode={deckCode} urlDeckShortCode={deckShortCode} data={data} />
    </LanguageProvider>
  )
}
