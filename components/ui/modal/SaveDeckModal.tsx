"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Modal } from "./Modal"
import { saveDeck, getSavedDecks, getCurrentDeckId } from "../../../utils/local-storage"
import type { Preset } from "../../../types"

interface SaveDeckModalProps {
  isOpen: boolean
  onClose: () => void
  preset: Preset
  getTranslatedString: (key: string) => string
  onSaveSuccess: (deckId: string) => void
  getCharacterName: (id: number) => string
}

export function SaveDeckModal({
  isOpen,
  onClose,
  preset,
  getTranslatedString,
  onSaveSuccess,
  getCharacterName,
}: SaveDeckModalProps) {
  const [deckName, setDeckName] = useState("")
  const [savedDecks, setSavedDecks] = useState<{ id: string; name: string }[]>([])
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null)
  const [isNewDeck, setIsNewDeck] = useState(true)
  const [placeholderName, setPlaceholderName] = useState("")

  // 弹窗 相关 相关 保存相关 卡组 列表 加载 以及 默认 卡组 名称 设置
  useEffect(() => {
    if (isOpen) {
      // 保存相关 卡组 列表 加载
      const decks = getSavedDecks().map((deck) => ({ id: deck.id, name: deck.name }))
      setSavedDecks(decks)

      // 当前 相关 相关 卡组 ID 读取
      const currentDeckId = getCurrentDeckId()
      setSelectedDeckId(currentDeckId)
      setIsNewDeck(!currentDeckId)

      // 始终 当前 卡组 相关 相关 默认 名称 生成
      const defaultName = generateDefaultDeckName(preset)
      setPlaceholderName(defaultName)

      // 当前 选择相关 卡组 相关 对应 卡组 名称 输入 相关 设置
      if (currentDeckId) {
        const currentDeck = decks.find((deck) => deck.id === currentDeckId)
        if (currentDeck) {
          setDeckName(currentDeck.name)
        }
      } else {
        // 相关 卡组相关 相关 名称 相关 相关 placeholder 相关 相关
        setDeckName("")
      }
    }
  }, [isOpen, preset, getCharacterName])

  // 默认 卡组 名称 生成 函数
  const generateDefaultDeckName = (preset: Preset): string => {
    try {
      // 队长 角色 名称
      const leaderName = preset.header !== -1 ? getCharacterName(preset.header) : ""

      // 相关 角色 名称相关 (空 相关 相关)
      const otherCharNames = preset.roleList
        .filter((charId) => charId !== -1 && charId !== preset.header)
        .map((charId) => getCharacterName(charId))
        .filter((name) => name) // 空 名称 相关
        .join(", ")

      // 队长 名称 - 相关 角色 名称相关
      if (leaderName) {
        return otherCharNames ? `${leaderName} - ${otherCharNames}` : leaderName
      }

      // 队长 相关仅 其他 角色 存在 相关
      if (otherCharNames) {
        return otherCharNames
      }

      // 相关 角色相关 没有 相关
      return getTranslatedString("new_deck")
    } catch (error) {
      console.error("Error generating default deck name:", error)
      return getTranslatedString("new_deck")
    }
  }

  // 卡组 保存 处理
  const handleSaveDeck = () => {
    try {
      // 卡组 名称 相关 placeholder 名称 使用
      const nameToUse = deckName.trim() || placeholderName

      // 卡组 保存
      const deckId = !isNewDeck && selectedDeckId ? selectedDeckId : undefined
      const savedDeck = saveDeck(nameToUse, preset, deckId)

      // 相关 回调 调用
      onSaveSuccess(savedDeck.id)

      // 弹窗 关闭
      onClose()
    } catch (error) {
      console.error("Failed to save deck:", error)
      // 相关 处理 (实际 相关 相关 相关 显示 相关 添加)
    }
  }

  // 卡组 选择 变更 处理
  const handleDeckSelectionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value
    if (value === "new") {
      setIsNewDeck(true)
      setSelectedDeckId(null)
      setDeckName("") // 名称 相关 相关 placeholder 相关 相关
    } else {
      setIsNewDeck(false)
      setSelectedDeckId(value)
      // 选择相关 卡组的 名称 输入 相关 设置
      const selectedDeck = savedDecks.find((deck) => deck.id === value)
      if (selectedDeck) {
        setDeckName(selectedDeck.name)
      }
    }
  }

  // 当前 选择相关 卡组 ID
  const currentDeckId = getCurrentDeckId()

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={<h3 className="text-lg font-bold neon-text">{getTranslatedString("save_deck")}</h3>}
      maxWidth="max-w-md"
    >
      <div className="p-4">
        {/* 卡组 选择 (相关 卡组 或 现有 卡组 相关) */}
        <div className="mb-4">
          <label htmlFor="deck-selection" className="block text-sm font-medium mb-1">
            {getTranslatedString("deck_selection") || "Deck Selection"}
          </label>
          <select
            id="deck-selection"
            className="w-full p-2 bg-black border border-[hsla(var(--neon-white),0.3)] rounded-md"
            value={isNewDeck ? "new" : selectedDeckId || "new"}
            onChange={handleDeckSelectionChange}
          >
            <option value="new">{getTranslatedString("new_deck")}</option>
            {savedDecks.map((deck) => (
              <option key={deck.id} value={deck.id}>
                {deck.name}
                {deck.id === currentDeckId ? ` (${getTranslatedString("selected") || "선택됨"})` : ""}
              </option>
            ))}
          </select>
        </div>

        {/* 卡组 名称 输入 */}
        <div className="mb-4">
          <label htmlFor="deck-name" className="block text-sm font-medium mb-1">
            {getTranslatedString("deck_name")}
          </label>
          <input
            id="deck-name"
            type="text"
            className="w-full p-2 bg-black border border-[hsla(var(--neon-white),0.3)] rounded-md"
            value={deckName}
            onChange={(e) => setDeckName(e.target.value)}
            placeholder={placeholderName}
          />
        </div>

        {/* 按钮 */}
        <div className="flex justify-end space-x-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-[hsla(var(--neon-white),0.3)] rounded-md hover:bg-[hsla(var(--neon-white),0.1)]"
          >
            {getTranslatedString("cancel")}
          </button>
          <button onClick={handleSaveDeck} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
            {getTranslatedString("save")}
          </button>
        </div>
      </div>
    </Modal>
  )
}
