"use client"

import { useState, type ReactNode } from "react"

interface Tab {
  id: string
  label: string
  content: ReactNode
}

// TabbedInterface相关 onTabChange 回调 添加
interface TabbedInterfaceProps {
  tabs: Tab[]
  defaultTabId?: string
  isPhotoMode?: boolean
  onTabChange?: (tabId: string) => void // 标签页 变更 回调 添加
}

export function TabbedInterface({ tabs, defaultTabId, isPhotoMode = false, onTabChange }: TabbedInterfaceProps) {
  const [activeTabId, setActiveTabId] = useState(defaultTabId || tabs[0]?.id)

  // 标签页 变更 相关 回调 调用
  const handleTabChange = (tabId: string) => {
    setActiveTabId(tabId)
    if (onTabChange) {
      onTabChange(tabId)
    }
  }

  // 当前 相关 标签页 查找
  const activeTab = tabs.find((tab) => tab.id === activeTabId)

  return (
    <div className="w-full">
      {/* 相关 相关 相关 相关仅 标签页 按钮 显示 */}
      {!isPhotoMode && (
        <div className="flex border-b border-[hsla(var(--neon-white),0.3)]">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTabId === tab.id
                  ? "border-b-2 border-[hsl(var(--neon-white))] text-[hsl(var(--neon-white))] neon-text"
                  : "text-gray-400 hover:text-gray-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}
      <div className="mt-4">{tabs.find((tab) => tab.id === activeTabId)?.content}</div>
    </div>
  )
}
