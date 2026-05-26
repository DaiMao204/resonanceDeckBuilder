"use client"

import { useState, useCallback, useEffect } from "react"
import type { Database } from "../../types"
import { getCharacterById } from "./utils"

export function useCharacters(data: Database | null) {
  // 角色 选择 (5 相关, -1 空 相关)
  const [selectedCharacters, setSelectedCharacters] = useState<number[]>([-1, -1, -1, -1, -1])

  // 队长 角色
  const [leaderCharacter, setLeaderCharacter] = useState<number>(-1)

  // 角色 ID相关 角色 信息 读取
  const getCharacter = useCallback(
    (id: number) => {
      return getCharacterById(data, id)
    },
    [data],
  )

  // 队长 设置 - 相关 相关
  const setLeader = useCallback(
    (characterId: number, forceSet = false) => {
      // forceSet true相关 校验 相关 队长 设置
      // 或 有效 角色相关 检查 (当前 选择相关 角色 列表相关 存在相关)
      if (forceSet || selectedCharacters.includes(characterId)) {
        setLeaderCharacter(characterId)
      }
    },
    [selectedCharacters, setLeaderCharacter],
  )

  // 选择相关 角色 变更 相关 队长 相关 相关 以及 相关 设置
  useEffect(() => {
    // 当前 队长 选择相关 角色 列表相关 没有 相关
    if (leaderCharacter !== -1 && !selectedCharacters.includes(leaderCharacter)) {
      // 选择相关 角色 相关 第一个 队长相关 设置
      const validCharacters = selectedCharacters.filter((id) => id !== -1)
      setLeaderCharacter(validCharacters.length > 0 ? validCharacters[0] : -1)
    }
    // 队长 相关 选择相关 角色 存在 相关
    else if (leaderCharacter === -1) {
      const validCharacters = selectedCharacters.filter((id) => id !== -1)
      if (validCharacters.length > 0) {
        setLeaderCharacter(validCharacters[0])
      }
    }
  }, [selectedCharacters, leaderCharacter])

  return {
    selectedCharacters,
    setSelectedCharacters,
    leaderCharacter,
    setLeaderCharacter,
    getCharacter,
    setLeader,
  }
}

