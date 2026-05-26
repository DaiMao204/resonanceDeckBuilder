"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Globe, Download, Upload, RefreshCw, Share2, HelpCircle, Save, FolderOpen, UsersRound } from "lucide-react"
import { StylizedTitle } from "./stylized-title"
import { HelpModal } from "./ui/modal/HelpModal"
import { useLanguage } from "../contexts/language-context"
import { ScreenshotButton } from "./screenshot-button" // 添加

interface TopBarProps {
  onClear: () => void
  onImport: () => Promise<void>
  onExport: () => void
  onShare: () => void
  onSave: () => void // 添加: 保存 按钮 处理函数
  onLoad: () => void // 添加: 加载 按钮 处理函数
  onSortCharacters?: () => void
  contentRef: React.RefObject<HTMLElement> // 添加: 截图相关 相关 引用
}

export function TopBar({
  onClear,
  onImport,
  onExport,
  onShare,
  onSave,
  onLoad,
  onSortCharacters,
  contentRef,
}: TopBarProps) {
  const { currentLanguage, supportedLanguages, getTranslatedString, changeLanguage, isChangingLanguage } = useLanguage()

  const [showLanguageMenu, setShowLanguageMenu] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [showHelpPopup, setShowHelpPopup] = useState(false)
  const languageMenuRef = useRef<HTMLDivElement>(null)
  const helpPopupRef = useRef<HTMLDivElement>(null)
  // 语言 按钮 引用 添加
  const languageButtonRef = useRef<HTMLButtonElement>(null)

  // Add scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  // 语言 变更 处理函数
  const handleLanguageChange = (lang: string) => {
    // 当前 语言和 相同 语言 选择 相关 相关仅 关闭
    if (currentLanguage === lang) {
      setShowLanguageMenu(false)
      return
    }

    // 语言 变更
    changeLanguage(lang)

    // 相关 关闭
    setShowLanguageMenu(false)
  }

  // 语言 相关 相关 处理函数 修改 - 相关 语言 按钮的 相关 相关 相关 相关 变更
  const toggleLanguageMenu = () => {
    if (!showLanguageMenu && languageButtonRef.current) {
      // 按钮 位置 计算
      const rect = languageButtonRef.current.getBoundingClientRect()

      // 相关 相关 位置 设置 - 按钮 相关 相关
      document.documentElement.style.setProperty("--language-dropdown-top", `${rect.bottom}px`)
      document.documentElement.style.setProperty("--language-dropdown-left", `${rect.left}px`)
      document.documentElement.style.setProperty("--language-dropdown-right", "auto")
    }
    setShowLanguageMenu(!showLanguageMenu)
  }

  // 相关 按钮 点击 处理函数
  const toggleHelpPopup = () => {
    setShowHelpPopup(!showHelpPopup)
  }

  // 弹窗 相关 点击 相关 关闭
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        languageMenuRef.current &&
        !languageMenuRef.current.contains(event.target as Node) &&
        !event.target.closest(".language-button")
      ) {
        setShowLanguageMenu(false)
      }
      if (
        showHelpPopup &&
        helpPopupRef.current &&
        !helpPopupRef.current.contains(event.target as Node) &&
        !event.target.closest(".help-button")
      ) {
        setShowHelpPopup(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [showLanguageMenu, showHelpPopup])

  // 相关 相关 组件的 按钮 大小 相关 - 较小 相关 相关 相关 显示
  const buttonBaseClass = `neon-button flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-lg transition-colors duration-200 shadow-md relative overflow-hidden`

  // 按钮 图标 相关 类 - 较小 相关 相关 相关 显示
  const iconClass = `w-4 h-4 sm:w-5 sm:h-5 text-[hsl(var(--neon-white))] relative z-10`

  return (
    <>
      <div
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? "bg-black/80 backdrop-blur-md shadow-lg py-2" : "bg-black py-4"
        }`}
        style={{ width: "100%" }}
      >
        <div className="container mx-auto px-4">
          {/* 较大 相关 相关和 按钮 相同 相关 显示相关, 较小 相关 按钮 相关 相关 */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            {/* Logo/Title - 滚动 相关 隐藏 */}
            <div className={`flex items-center ${scrolled ? "hidden" : ""}`}>
              <a href={`/${currentLanguage}`} className="cursor-pointer hover:opacity-80 transition-opacity">
                <StylizedTitle
                  mainText={getTranslatedString("app.title.main") || "레조넌스"}
                  subText={getTranslatedString("app.title.sub") || "SOLSTICE"}
                />
              </a>
            </div>

            {/* 按钮相关 - 较小 相关 相关 滚动, 较大 相关 相关 排序 */}
            {/* 间距 相关 - space-x-3相关 space-x-1相关 变更相关 相关 相关 按钮 相关 相关 相关 */}
            <div className="flex items-center space-x-1 sm:space-x-2 mt-2 md:mt-0 overflow-x-auto py-1 justify-end">
              {/* Language Selector */}
              <div className="relative language-dropdown">
                <button
                  ref={languageButtonRef}
                  onClick={toggleLanguageMenu}
                  className={`${buttonBaseClass} language-button ${isChangingLanguage ? "opacity-50" : ""}`}
                  aria-label={getTranslatedString("language") || "Language"}
                  title={getTranslatedString("language") || "Language"}
                  disabled={isChangingLanguage}
                >
                  <Globe className={iconClass} />
                </button>

                {showLanguageMenu && (
                  <div
                    ref={languageMenuRef}
                    className="fixed mt-2 w-40 neon-dropdown animate-fadeIn bg-black bg-opacity-95 z-[100]"
                    style={{
                      top: "var(--language-dropdown-top, 4rem)",
                      left: "var(--language-dropdown-left, auto)",
                      right: "var(--language-dropdown-right, auto)",
                    }}
                  >
                    {supportedLanguages.map((lang) => (
                      <button
                        key={lang}
                        onClick={() => handleLanguageChange(lang)}
                        className={`block w-full text-left px-4 py-3 text-sm hover:bg-[rgba(255,255,255,0.1)] transition-colors duration-150 ${
                          currentLanguage === lang
                            ? "bg-[rgba(255,255,255,0.1)] text-[hsl(var(--neon-white))] neon-text"
                            : ""
                        }`}
                      >
                        {lang.toUpperCase()}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Screenshot Button - 截图 按钮相关 变更 */}
              <ScreenshotButton targetRef={contentRef} getTranslatedString={getTranslatedString} />

              {/* Share Button */}
              <button
                onClick={onShare}
                className={`${buttonBaseClass} share-button`}
                aria-label={getTranslatedString("share") || "Share"}
                title={getTranslatedString("share") || "Share"}
              >
                <Share2 className={iconClass} />
              </button>

              {/* Save Button - 添加 */}
              <button
                onClick={onSave}
                className={`${buttonBaseClass} save-button`}
                aria-label={getTranslatedString("save_deck") || "Save Deck"}
                title={getTranslatedString("save_deck") || "Save Deck"}
              >
                <Save className={iconClass} />
              </button>

              {/* Load Button - 添加 */}
              <button
                onClick={onLoad}
                className={`${buttonBaseClass} load-button`}
                aria-label={getTranslatedString("load_deck") || "Load Deck"}
                title={getTranslatedString("load_deck") || "Load Deck"}
              >
                <FolderOpen className={iconClass} />
              </button>

              {/* Sort Characters Button - 添加 */}
              {onSortCharacters && (
                <button
                  onClick={onSortCharacters}
                  className={`${buttonBaseClass} sort-button`}
                  aria-label={getTranslatedString("sort_characters") || "Sort Characters"}
                  title={getTranslatedString("sort_characters") || "Sort Characters"}
                >
                  <UsersRound className={iconClass} />
                </button>
              )}

              {/* Clear Button */}
              <button
                onClick={onClear}
                className={`${buttonBaseClass} clear-button`}
                aria-label={getTranslatedString("button.clear") || "Clear"}
                title={getTranslatedString("button.clear") || "Clear"}
              >
                <RefreshCw className={iconClass} />
              </button>

              {/* Import Button */}
              <button
                onClick={onImport}
                className={`${buttonBaseClass} import-button`}
                aria-label={getTranslatedString("import_from_clipboard") || "Import"}
                title={getTranslatedString("import_from_clipboard") || "Import"}
              >
                <Download className={iconClass} />
              </button>

              {/* Export Button */}
              <button
                onClick={onExport}
                className={`${buttonBaseClass} export-button`}
                aria-label={getTranslatedString("export_to_clipboard") || "Export"}
                title={getTranslatedString("export_to_clipboard") || "Export"}
              >
                <Upload className={iconClass} />
              </button>

              {/* Help Button */}
              <button
                onClick={toggleHelpPopup}
                className={`${buttonBaseClass} help-button`}
                aria-label={getTranslatedString("help.title") || "Help"}
                title={getTranslatedString("help.title") || "Help"}
              >
                <HelpCircle className={iconClass} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 相关 弹窗 - 相关 相关 相关 修改相关 TopBar 相关 相关 */}
      {showHelpPopup && (
        <HelpModal
          isOpen={showHelpPopup}
          onClose={() => setShowHelpPopup(false)}
          getTranslatedString={getTranslatedString}
          maxWidth="max-w-2xl"
        />
      )}
    </>
  )
}
