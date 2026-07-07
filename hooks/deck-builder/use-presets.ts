"use client"

import { useCallback } from "react"
import type { Database } from "../../types"
import type { SelectedCard, PresetCard, Preset, EquipmentSlot, Result, AwakeningInfo } from "./types"
import { DEFAULT_OWNER_ID, DISCARD_CARD_ID, DISCARD_SKILL_ID } from "./types"
import { encodePreset, decodePreset, encodePresetForUrl, decodePresetFromUrlParam } from "../../utils/presetCodec"
import { saveDeckPresetToShortlink, loadDeckPresetFromShortlink } from "../../utils/deck-shortlink"
import { copyToClipboard, readFromClipboard } from "../../utils/clipboard"

const MANUAL_EXPORT_PROMPT = "自动复制失败，请手动复制卡组码"
const MANUAL_IMPORT_PROMPT = "请粘贴卡组码或分享链接"

function cleanUrlCandidate(value: string): string {
  const markdownLinkStart = value.indexOf("](")
  const candidate = markdownLinkStart === -1 ? value : value.slice(0, markdownLinkStart)
  return candidate.trim().replace(/[)\]}>。，,.;；：:]+$/g, "")
}

function addUrlCandidate(candidates: Set<string>, value: string) {
  const cleaned = cleanUrlCandidate(value)
  if (cleaned) candidates.add(cleaned)

  const markdownLinkStart = value.indexOf("](")
  if (markdownLinkStart !== -1) {
    const target = value
      .slice(markdownLinkStart + 2)
      .trim()
      .replace(/[)\]}>。，,.;；：:]+$/g, "")
    if (target) candidates.add(target)
  }
}

function getUrlCandidates(text: string): string[] {
  const candidates = new Set<string>()
  const trimmedText = text.trim()
  if (trimmedText) addUrlCandidate(candidates, trimmedText)

  const markdownTargetPattern = /\]\((https?:\/\/[^)\s]+)\)/g
  let markdownTarget = markdownTargetPattern.exec(trimmedText)
  while (markdownTarget) {
    const candidate = markdownTarget[1]?.trim()
    if (candidate) candidates.add(candidate)
    markdownTarget = markdownTargetPattern.exec(trimmedText)
  }

  const urlMatches = trimmedText.match(/https?:\/\/[^\s<>"']+/g) || []
  urlMatches.forEach((match) => {
    addUrlCandidate(candidates, match)
  })

  return Array.from(candidates)
}

function getCodeCandidates(text: string): string[] {
  const candidates = new Set<string>()
  const codePattern = /(?:^|[?&#\s])code=([^&\s)\]}>]+)/g
  let match = codePattern.exec(text)
  while (match) {
    const candidate = match[1]?.trim()
    if (candidate) candidates.add(candidate)
    match = codePattern.exec(text)
  }

  return Array.from(candidates)
}

// 从剪贴板导入时兼容三种内容：纯导出码、旧长链接 code、新短链 s。
async function decodePresetFromClipboardText(text: string): Promise<any | null> {
  const trimmedText = text.trim()
  if (!trimmedText) return null

  for (const candidate of getUrlCandidates(trimmedText)) {
    try {
      const url = new URL(candidate, window.location.origin)
      const shortCode = url.searchParams.get("s")
      if (shortCode) {
        const preset = await loadDeckPresetFromShortlink(shortCode)
        if (preset) return preset
      }

      const deckCode = url.searchParams.get("code")
      if (deckCode) {
        const preset = decodePresetFromUrlParam(deckCode)
        if (preset) return preset
      }
    } catch (error) {
      // 不是 URL 时继续按原始导出码或 code= 片段解析。
    }
  }

  for (const deckCode of getCodeCandidates(trimmedText)) {
    const preset = decodePresetFromUrlParam(deckCode)
    if (preset) return preset
  }

  return decodePreset(trimmedText)
}

export function usePresets(
  data: Database | null,
  selectedCharacters: number[],
  leaderCharacter: number,
  selectedCards: SelectedCard[],
  battleSettings: {
    isLeaderCardOn: boolean
    isSpCardOn: boolean
    keepCardNum: number
    discardType: number
    otherCard: number
  },
  equipment: EquipmentSlot[],
  awakening: AwakeningInfo, // 觉醒 信息 添加
  clearAll: () => void,
  importPresetObject: (preset: any) => Result,
) {
  // 预设 对象 生成
  const createPresetObject = useCallback(
    (includeEquipment = false, includeAwakening = false) => {
      // 选择相关 卡牌 相关 相关 相关
      const cardsForPreset: SelectedCard[] = selectedCards.some((card) => card.id === DISCARD_CARD_ID)
        ? selectedCards
        : [
            ...selectedCards,
            {
              id: DISCARD_CARD_ID,
              ownerId: DEFAULT_OWNER_ID,
              skillId: DISCARD_SKILL_ID,
              useType: 1,
              useParam: -1,
              sources: [{ type: "passive", id: DEFAULT_OWNER_ID, skillId: DISCARD_SKILL_ID }],
            },
          ]

      const formattedCardList = cardsForPreset.map((card) => {
        // 默认 卡牌 对象 生成
        const cardObj: PresetCard = {
          id: card.id,
          ownerId: card.ownerId || -1,
          skillId: card.skillId || -1,
          skillIndex: card.skillIndex || -1,
          targetType: 0,
          useType: card.useType,
          useParam: card.useParam,
          ...(card.useParamMap ? { useParamMap: card.useParamMap } : {}),
          equipIdList: [],
        }

        // 装备 来源 信息 添加
        if (card.sources) {
          const equipmentSources = card.sources.filter((source) => source.type === "equipment")
          if (equipmentSources.length > 0) {
            cardObj.equipIdList = equipmentSources.map((source) => source.id.toString())
          }
        }

        // skillId 没有 相关仅 数据相关 相关 设置
        if (cardObj.skillId === -1 && data) {
          const cardData = data.cards[card.id]

          if (cardData) {
            // 对应 卡牌 ID 相关 技能 查找
            let foundSkillId = -1
            for (const skillId in data.skills) {
              const skill = data.skills[skillId]
              if (skill && skill.cardID && skill.cardID.toString() === card.id) {
                foundSkillId = Number.parseInt(skillId)
                cardObj.skillId = foundSkillId
                break
              }
            }

            // 相关 技能相关 检查
            const isSpecialSkill =
              data.specialSkillIds && foundSkillId > 0 && data.specialSkillIds.includes(foundSkillId)

            if (isSpecialSkill) {
              cardObj.ownerId = 10000001
            }

            // skillIndex 设置
            if (cardObj.skillIndex === -1 && cardObj.ownerId > 0 && foundSkillId > 0) {
              const character = data.characters[cardObj.ownerId.toString()]
              if (character && character.skillList) {
                const skillIndex = character.skillList.findIndex((s) => s.skillId === foundSkillId)
                if (skillIndex !== -1) {
                  cardObj.skillIndex = skillIndex + 1
                }
              }
            }
          }
        }

        // skillIndex -1相关 移除
        if (cardObj.skillIndex === -1) {
          delete cardObj.skillIndex
        }

        return cardObj
      })

      // 卡牌 ID 相关 生成
      const cardIdMap: Record<string, number> = {}
      cardsForPreset.forEach((card) => {
        cardIdMap[card.id] = 1
      })

      // 默认 预设 对象 生成
      const preset: Preset = {
        roleList: selectedCharacters,
        header: leaderCharacter,
        cardList: formattedCardList,
        cardIdMap: cardIdMap,
        isLeaderCardOn: battleSettings.isLeaderCardOn,
        isSpCardOn: battleSettings.isSpCardOn,
        keepCardNum: battleSettings.keepCardNum,
        discardType: battleSettings.discardType + 1, // discardType相关 +1
        otherCard: battleSettings.otherCard,
      }

      // 装备 信息 相关 相关
      if (includeEquipment) {
        // 装备 信息 生成
        const equipmentData: Record<number, [string | null, string | null, string | null]> = {}

        // 角色 存在 相关 相关仅 装备 信息 添加
        selectedCharacters.forEach((charId, index) => {
          if (charId !== -1) {
            const charEquipment = equipment[index]
            if (charEquipment.weapon || charEquipment.armor || charEquipment.accessory) {
              equipmentData[index] = [charEquipment.weapon, charEquipment.armor, charEquipment.accessory]
            }
          }
        })

        // 装备 信息 存在 相关仅 添加
        if (Object.keys(equipmentData).length > 0) {
          preset.equipment = equipmentData
        }
      }

      // 觉醒 信息 相关 相关
      if (includeAwakening && Object.keys(awakening).length > 0) {
        preset.awakening = awakening
      }

      return preset
    },
    [selectedCharacters, leaderCharacter, selectedCards, battleSettings, equipment, awakening, data],
  )

  // 预设 导出
  const exportPreset = useCallback(async () => {
    try {
      const preset = createPresetObject(false, false) // 装备 信息和 觉醒 信息 相关
      const base64String = encodePreset(preset)
      if (!base64String) throw new Error("encode_failed")

      try {
        await copyToClipboard(base64String)
      } catch (error) {
        window.prompt(MANUAL_EXPORT_PROMPT, base64String)
      }

      return { success: true, message: "export_success" }
    } catch (error) {
      return { success: false, message: "export_failed" }
    }
  }, [createPresetObject])

  // 预设 相关 导出
  const exportPresetToString = useCallback(() => {
    try {
      const preset = createPresetObject(false, false) // 装备 信息 觉醒 信息 相关
      return encodePreset(preset)
    } catch (error) {
      return ""
    }
  }, [createPresetObject])

  // 相关 预设 读取
  const importPreset = useCallback(async () => {
    try {
      let clipboardText = ""

      try {
        clipboardText = await readFromClipboard()
      } catch (error) {
        // 某些浏览器会拒绝读取剪贴板，此时让用户手动粘贴卡组码或分享链接。
        clipboardText = window.prompt(MANUAL_IMPORT_PROMPT) || ""
      }

      // 剪贴板中可以是导出码，也可以是分享链接。
      let preset = await decodePresetFromClipboardText(clipboardText)

      if (!preset) {
        const manualText = window.prompt(MANUAL_IMPORT_PROMPT, clipboardText) || ""
        preset = await decodePresetFromClipboardText(manualText)
      }

      if (!preset) {
        throw new Error("invalid_preset_format")
      }

      // 预设 相关 校验
      if (!preset.roleList || !Array.isArray(preset.roleList) || preset.roleList.length !== 5) {
        throw new Error("invalid_rolelist")
      }

      if (!preset.cardList || !Array.isArray(preset.cardList)) {
        throw new Error("invalid_cardlist")
      }

      // 预设 对象 读取
      return importPresetObject(preset)
    } catch (error) {
      console.error("Failed to import preset:", error)
      return { success: false, message: "import_failed" }
    }
  }, [importPresetObject])

  // 预设 相关 相关
  const decodePresetString = useCallback((base64Text: string) => {
    try {
      const preset = decodePreset(base64Text)

      if (!preset) {
        return null
      }

      // 预设 相关 校验
      if (!preset.roleList || !Array.isArray(preset.roleList) || preset.roleList.length !== 5) {
        return null
      }

      if (!preset.cardList || !Array.isArray(preset.cardList)) {
        return null
      }

      return preset
    } catch (error) {
      console.error("Error decoding preset:", error)
      return null
    }
  }, [])

  // 生成分享链接：优先生成短链，短链服务不可用时回退到旧的长 code 链接。
  const createShareableUrl = useCallback(async (presetOverride?: any) => {
    try {
      const preset = presetOverride || createPresetObject(true, true) // 包含装备和觉醒信息
      const encodedPreset = encodePresetForUrl(preset)
      if (!encodedPreset) throw new Error("encode_failed")

      // 以当前语言路径生成分享链接，避免分享后跳到其它语言。
      const baseUrl = window.location.origin
      const langPath = window.location.pathname.split("/")[1] || "ko"

      const longUrl = `${baseUrl}/${langPath}?code=${encodedPreset}`
      const shortCode = await saveDeckPresetToShortlink(preset)

      if (shortCode) {
        return { success: true, url: `${baseUrl}/${langPath}?s=${encodeURIComponent(shortCode)}`, isShort: true }
      }

      return { success: true, url: longUrl, isShort: false }
    } catch (error) {
      console.error("Failed to create shareable URL:", error)
      return { success: false, url: "", isShort: false }
    }
  }, [createPresetObject])

  // 生成根路径分享链接，保留旧入口兼容。
  const createRootShareableUrl = useCallback(() => {
    try {
      const preset = createPresetObject(true, true) // 包含装备和觉醒信息
      const encodedPreset = encodePresetForUrl(preset)

      // 获取站点根 URL。
      const rootUrl = window.location.origin

      // 根路径仍使用旧长链接格式。
      const shareableUrl = `${rootUrl}?code=${encodedPreset}`
      return { success: true, url: shareableUrl }
    } catch (error) {
      return { success: false, url: "" }
    }
  }, [createPresetObject])

  return {
    exportPreset,
    exportPresetToString,
    importPreset,
    decodePresetString,
    createShareableUrl,
    createRootShareableUrl,
    createPresetObject,
  }
}
