"use client"

import { useState, useCallback } from "react"
import type { AwakeningInfo } from "./types"

export function useAwakening() {
  // 相关 角色的 觉醒 相关 状态
  const [awakening, setAwakening] = useState<AwakeningInfo>({})

  // 觉醒 相关 设置
  const setCharacterAwakening = useCallback((characterId: number, stage: number | null) => {
    setAwakening((prev) => {
      const newAwakening = { ...prev }

      if (stage === null) {
        // 觉醒 相关 移除 (选择 相关)
        delete newAwakening[characterId]
      } else {
        // 觉醒 相关 设置
        newAwakening[characterId] = stage
      }

      return newAwakening
    })
  }, [])

  // 角色 移除 相关 觉醒 信息相关 移除
  const removeCharacterAwakening = useCallback((characterId: number) => {
    setAwakening((prev) => {
      const newAwakening = { ...prev }
      delete newAwakening[characterId]
      return newAwakening
    })
  }, [])

  // 所有 觉醒 信息 初始化
  const clearAllAwakening = useCallback(() => {
    setAwakening({})
  }, [])

  return {
    awakening,
    setAwakening,
    setCharacterAwakening,
    removeCharacterAwakening,
    clearAllAwakening,
  }
}

