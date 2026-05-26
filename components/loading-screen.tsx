"use client"

import { Loader2 } from "lucide-react"

interface LoadingScreenProps {
  message?: string
  language?: string
  leaving?: boolean
}

const loadingText: Record<string, { title: string; subtitle: string; message: string }> = {
  cn: { title: "雷索纳斯", subtitle: "卡组构建器", message: "正在加载数据..." },
  tw: { title: "雷索納斯", subtitle: "卡組構建器", message: "正在載入資料..." },
  en: { title: "Resonance", subtitle: "Deck Builder", message: "Loading data..." },
  jp: { title: "レゾナンス", subtitle: "デッキビルダー", message: "データを読み込み中..." },
  ko: { title: "Resonance", subtitle: "Deck Builder", message: "데이터를 불러오는 중..." },
}

export function LoadingScreen({ message, language = "cn", leaving = false }: LoadingScreenProps) {
  const text = loadingText[language] || loadingText.cn

  return (
    <div
      className={`min-h-screen bg-black px-6 py-5 text-white transition-all duration-300 ease-out ${
        leaving ? "scale-[1.01] opacity-0 blur-sm" : "scale-100 opacity-100 blur-0"
      }`}
    >
      <div className="mx-auto max-w-[1600px]">
        <header className="mb-12 flex items-start justify-between gap-6">
          <div>
            <div className="text-4xl font-black tracking-normal neon-text sm:text-5xl">{text.title}</div>
            <div className="mt-1 text-sm font-semibold text-white/80">{text.subtitle}</div>
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            {Array.from({ length: 9 }).map((_, index) => (
              <div
                key={index}
                className="flex h-10 w-10 items-center justify-center rounded-md border border-white/40 bg-black/40"
              >
                <div className="h-4 w-4 rounded-sm bg-white/40" />
              </div>
            ))}
          </div>
        </header>

        <main className="animate-pulse">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index}>
                <div className="aspect-[3/4] rounded-xl border border-white/60 bg-white/[0.03] shadow-[0_0_18px_rgba(255,255,255,0.12)]" />
                <div className="mt-2 grid grid-cols-3 gap-1">
                  <div className="h-20 rounded-md border border-white/30 bg-white/[0.04]" />
                  <div className="h-20 rounded-md border border-white/30 bg-white/[0.04]" />
                  <div className="h-20 rounded-md border border-white/30 bg-white/[0.04]" />
                </div>
              </div>
            ))}
          </div>

          <section className="mt-10">
            <div className="mb-4 h-7 w-24 rounded bg-white/15" />
            <div className="rounded-lg border border-white/25 bg-white/[0.03]">
              <div className="flex gap-6 border-b border-white/25 px-4 py-3">
                <div className="h-5 w-20 rounded bg-white/20" />
                <div className="h-5 w-14 rounded bg-white/10" />
              </div>
              <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4 lg:grid-cols-8">
                {Array.from({ length: 8 }).map((_, index) => (
                  <div key={index} className="aspect-[3/4] rounded-md bg-white/[0.07]" />
                ))}
              </div>
            </div>
          </section>
        </main>

        <div className="fixed bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-full border border-white/20 bg-black/80 px-5 py-3 shadow-[0_0_20px_rgba(255,255,255,0.12)]">
          <Loader2 className="h-5 w-5 animate-spin text-blue-400" />
          <span className="text-sm text-white/80">{message || text.message}</span>
        </div>
      </div>
    </div>
  )
}

