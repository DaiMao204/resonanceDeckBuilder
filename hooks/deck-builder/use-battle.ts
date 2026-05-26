"use client"

import { useState, useCallback } from "react"
import type { BattleSettings } from "./types"

export function useBattle() {
  // 战斗 设置
  const [battleSettings, setBattleSettingsState] = useState<BattleSettings>({
    isLeaderCardOn: true,
    isSpCardOn: true,
    keepCardNum: 0,
    discardType: 0,
    otherCard: 0,
  })

  // 战斗 设置 更新
  const updateBattleSettings = useCallback((settings: Partial<BattleSettings>) => {
    setBattleSettingsState((prev) => ({ ...prev, ...settings }))
  }, [])

  return {
    battleSettings,
    updateBattleSettings,
  }
}

