/*
  Resonance Deck Builder
  Copyright (C) 2025 Heeyong Chang

  This program is free software: you can redistribute it and/or modify
  it under the terms of the GNU General Public License as published by
  the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.

  This program is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU General Public License for more details.

  You should have received a copy of the GNU General Public License
  along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { redirect } from "next/navigation"
import { headers } from "next/headers"

export default function Home() {
  // 浏览器的 语言 相关 检测
  const headersList = headers()
  const acceptLanguage = headersList.get("accept-language") || ""

  // 相关 语言 列表
  const supportedLanguages = ["en", "ko", "jp", "cn", "tw"]
  const defaultLanguage = "cn"

  // 浏览器 语言 相关 提取 (相关: 'en-US' -> 'en')
  const preferredLanguage = acceptLanguage.split(",")[0].split("-")[0]

  // 相关 语言相关 检查
  const detectedLanguage = defaultLanguage

  // 检测相关 语言相关 重定向
  redirect(`/${detectedLanguage}`)
}

