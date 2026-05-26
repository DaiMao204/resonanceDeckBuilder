import type { Database } from "../../types"

// 卡牌 来源 类型 - 卡牌 相关 相关 相关
export type CardSource =
  | { type: "character"; id: number; skillId?: number; slotIndex?: number }
  | { type: "equipment"; id: string; skillId?: number; slotIndex?: number; equipType: "weapon" | "armor" | "accessory" }
  | { type: "passive"; id: number; skillId?: number; slotIndex?: number }

export const DISCARD_CARD_ID = "10600474"
export const DISCARD_SKILL_ID = 12303725
export const DEFAULT_OWNER_ID = 10000001

// 选择相关 卡牌 类型
export type SelectedCard = {
  id: string
  useType: number
  useParam: number
  useParamMap?: Record<string, number>
  ownerId?: number
  skillId?: number
  skillIndex?: number
  sources: CardSource[]
  // 技能 信息 直接 保存 相关 相关 添加
  skillInfo?: {
    name: string
    description: string
    detailDescription?: string
    cardID?: number | null
    leaderCardConditionDesc?: string
    // 添加 技能 信息 相关 相关 添加
  }
  // 卡牌 信息 直接 保存
  cardInfo?: {
    name: string
    color?: string
    cardType?: string
    tagList?: any[]
  }
  // 添加 信息 (费用, 数量 相关)
  extraInfo?: {
    cost: number
    amount: number
    img_url?: string
    desc?: string
  }
}

// 预设 卡牌 类型
export type PresetCard = {
  id: string
  ownerId: number
  skillId: number
  skillIndex?: number
  targetType: number
  useType: number
  useParam: number
  useParamMap?: Record<string, number>
  equipIdList: string[]
}

// 装备 相关 类型
export type EquipmentSlot = {
  weapon: string | null
  armor: string | null
  accessory: string | null
}

// 战斗 设置 类型
export type BattleSettings = {
  isLeaderCardOn: boolean
  isSpCardOn: boolean
  keepCardNum: number
  discardType: number
  otherCard: number
}

// 觉醒 信息 类型 添加
export type AwakeningInfo = {
  [characterId: number]: number // 角色 ID 键相关, 觉醒 相关 值相关
}

// 预设 类型
export type Preset = {
  roleList: number[]
  header: number
  cardList: PresetCard[]
  cardIdMap?: Record<string, number>
  isLeaderCardOn: boolean
  isSpCardOn: boolean
  keepCardNum: number
  discardType: number
  otherCard: number
  equipment?: Record<number, [string | null, string | null, string | null]>
  awakening?: AwakeningInfo // 觉醒 信息 添加
}

// 卡组 相关 状态 类型
export interface DeckBuilderState {
  selectedCharacters: number[]
  leaderCharacter: number
  selectedCards: SelectedCard[]
  battleSettings: BattleSettings
  equipment: EquipmentSlot[]
  isDarkMode: boolean
  awakening: AwakeningInfo // 觉醒 信息 添加
}

// 卡组 相关 相关 类型
export interface DeckBuilderActions {
  setSelectedCharacters: (characters: number[] | ((prev: number[]) => number[])) => void
  setLeaderCharacter: (leader: number) => void
  setSelectedCards: (cards: SelectedCard[] | ((prev: SelectedCard[]) => SelectedCard[])) => void
  setBattleSettings: (settings: Partial<BattleSettings>) => void
  setEquipment: (equipment: EquipmentSlot[] | ((prev: EquipmentSlot[]) => EquipmentSlot[])) => void
  setIsDarkMode: (isDarkMode: boolean | ((prev: boolean) => boolean)) => void
  setAwakening: (awakening: AwakeningInfo | ((prev: AwakeningInfo) => AwakeningInfo)) => void // 觉醒 信息 设置 函数 添加
}

// 卡组 相关 相关 类型
export interface DeckBuilderContext extends DeckBuilderState, DeckBuilderActions {
  data: Database | null
}

// 相关和 类型
export type Result = {
  success: boolean
  message: string
  url?: string
}
