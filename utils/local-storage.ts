import type { Preset } from "../types"

// localStorage 键 相关
const DECKS_STORAGE_KEY = "resonance_saved_decks"
const CURRENT_DECK_KEY = "resonance_current_deck"

// 保存相关 卡组 类型 相关的
export interface SavedDeck {
  id: string
  name: string
  preset: Preset
  createdAt: number
  updatedAt: number
}

// 所有 保存相关 卡组 读取
export function getSavedDecks(): SavedDeck[] {
  try {
    const decksJson = localStorage.getItem(DECKS_STORAGE_KEY)
    if (!decksJson) return []
    return JSON.parse(decksJson)
  } catch (error) {
    console.error("Failed to get saved decks:", error)
    return []
  }
}

// 相关 ID的 卡组 读取
export function getSavedDeckById(id: string): SavedDeck | null {
  const decks = getSavedDecks()
  return decks.find((deck) => deck.id === id) || null
}

// 卡组 保存相关
export function saveDeck(name: string, preset: Preset, deckId?: string): SavedDeck {
  try {
    const decks = getSavedDecks()
    const now = Date.now()

    // 相关 卡组 ID 生成 或 现有 ID 使用
    const id = deckId || `deck_${now}_${Math.random().toString(36).substring(2, 9)}`

    // 现有 卡组 查找
    const existingDeckIndex = decks.findIndex((deck) => deck.id === id)

    // 相关 卡组 对象 生成
    const newDeck: SavedDeck = {
      id,
      name: name,
      preset,
      createdAt: existingDeckIndex >= 0 ? decks[existingDeckIndex].createdAt : now,
      updatedAt: now,
    }

    // 现有 卡组 更新 或 相关 卡组 添加
    if (existingDeckIndex >= 0) {
      decks[existingDeckIndex] = newDeck
    } else {
      decks.push(newDeck)
    }

    // localStorage相关 保存
    localStorage.setItem(DECKS_STORAGE_KEY, JSON.stringify(decks))

    // 当前 相关 相关 卡组 ID 保存
    setCurrentDeckId(id)

    return newDeck
  } catch (error) {
    console.error("Failed to save deck:", error)
    throw new Error("Failed to save deck")
  }
}

// 卡组 删除相关
export function deleteDeck(id: string): boolean {
  try {
    const decks = getSavedDecks()
    const filteredDecks = decks.filter((deck) => deck.id !== id)

    // 卡组 相关 相关 false 返回
    if (filteredDecks.length === decks.length) return false

    // localStorage相关 保存
    localStorage.setItem(DECKS_STORAGE_KEY, JSON.stringify(filteredDecks))

    // 当前 相关 相关 卡组 删除相关 卡组相关 当前 卡组 ID 移除
    if (getCurrentDeckId() === id) {
      removeCurrentDeckId()
    }

    return true
  } catch (error) {
    console.error("Failed to delete deck:", error)
    return false
  }
}

// 当前 相关 相关 卡组 ID 保存
export function setCurrentDeckId(id: string): void {
  localStorage.setItem(CURRENT_DECK_KEY, id)
}

// 当前 相关 相关 卡组 ID 读取
export function getCurrentDeckId(): string | null {
  return localStorage.getItem(CURRENT_DECK_KEY)
}

// 当前 相关 相关 卡组 ID 移除
export function removeCurrentDeckId(): void {
  localStorage.removeItem(CURRENT_DECK_KEY)
}

// 当前 相关 相关 卡组 读取
export function getCurrentDeck(): SavedDeck | null {
  const currentId = getCurrentDeckId()
  if (!currentId) return null
  return getSavedDeckById(currentId)
}
