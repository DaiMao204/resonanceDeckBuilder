"use client"

import { useState, useCallback, useMemo } from "react"
import type { Database } from "../../types"
import type { EquipmentSlot } from "./types"
import { getEquipmentById } from "./utils"

export function useEquipment(data: Database | null) {
  // 相关 角色 相关的 装备
  const [equipment, setEquipment] = useState<EquipmentSlot[]>(
    Array(5).fill({ weapon: null, armor: null, accessory: null }),
  )

  // 装备 ID相关 装备 信息 读取
  const getEquipment = useCallback(
    (equipId: string) => {
      return getEquipmentById(data, equipId)
    },
    [data],
  )

  // 所有 装备 列表
  const allEquipments = useMemo(() => {
    if (!data || !data.equipments) return []
    return Object.values(data.equipments)
  }, [data])

  return {
    equipment,
    setEquipment,
    getEquipment,
    allEquipments,
  }
}

