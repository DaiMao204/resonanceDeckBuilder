import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// 支持的语言列表
const supportedLanguages = ["en", "ko", "jp", "cn", "tw"]
const defaultLanguage = "cn"

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const searchParams = request.nextUrl.searchParams.toString()
  const queryString = searchParams ? `?${searchParams}` : ""

  // 将当前路径写入响应头，供需要读取路径的组件使用。
  const response = NextResponse.next()
  response.headers.set("x-pathname", pathname)

  // 已经带语言前缀的路径直接放行。
  const pathnameHasLanguage = supportedLanguages.some(
    (lang) => pathname.startsWith(`/${lang}/`) || pathname === `/${lang}`,
  )

  if (pathnameHasLanguage) return response

  // 检测浏览器语言设置。
  const acceptLanguage = request.headers.get("accept-language") || ""
  let detectedLanguage = defaultLanguage

  if (acceptLanguage) {
    // 从浏览器语言设置中提取优先级最高的语言。
    const browserLanguages = acceptLanguage
      .split(",")
      .map((lang) => {
        const [language, weight] = lang.trim().split(";q=")
        return {
          code: language.split("-")[0], // "en-US" -> "en"
          weight: weight ? Number.parseFloat(weight) : 1.0,
        }
      })
      .sort((a, b) => b.weight - a.weight)

    // 找到支持语言中优先级最高的一项。
    for (const lang of browserLanguages) {
      if (supportedLanguages.includes(lang.code)) {
        detectedLanguage = lang.code
        break
      }
    }
  }

  // 根路径统一进入默认中文页面。
  if (pathname === "/") {
    return NextResponse.redirect(new URL(`/${defaultLanguage}${queryString}`, request.url))
  }

  // 其他页面路径也补上默认语言前缀。
  return NextResponse.redirect(new URL(`/${defaultLanguage}${pathname}${queryString}`, request.url))
}

export const config = {
  matcher: [
    // 排除内部路径和 public/db 静态数据，避免 JSON 请求被重定向成页面。
    "/((?!api|db|_next/static|_next/image|favicon.ico).*)",
  ],
}
