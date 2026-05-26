import type React from "react"
import "./globals.css"
import { headers } from "next/headers"

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // ✅ headers() 相关 await 相关
  const headersList = await headers()
  const pathname = headersList.get("x-pathname") || ""

  // 语言 提取
  let lang = "en"
  const pathParts = pathname.split("/").filter(Boolean)
  if (pathParts.length > 0 && ["en", "ko", "jp", "cn", "tw"].includes(pathParts[0])) {
    lang = pathParts[0]
  }

  return (
    <html lang={lang}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="icon" href="/images/favicon.png" sizes="any" />
      </head>
      <body className="overflow-x-hidden">{children}</body>
    </html>
  )
}
