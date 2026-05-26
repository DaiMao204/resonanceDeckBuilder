"use client"

import { useState, useCallback, useMemo, useEffect } from "react"
import type { Database } from "../../types"
import type { SelectedCard, Result } from "./types"
import { DEFAULT_OWNER_ID, DISCARD_CARD_ID, DISCARD_SKILL_ID } from "./types"
import { useCharacters } from "./use-characters"
import { useCards } from "./use-cards"
import { useEquipment } from "./use-equipment"
import { useBattle } from "./use-battle"
import { usePresets } from "./use-presets"
import { useAwakening } from "./use-awakening" // 觉醒 相关 添加
import { getSkillById, getAvailableCardIds } from "./utils"
import { useLanguage } from "../../contexts/language-context"

// 相关 类型 相关的 (实际 类型 相关的相关 相关 相关)
type CardExtraInfo = {
  name: string
  desc: string
  cost: number
  amount: number
  img_url: string | undefined
}

// 相关 函数 相关的 (实际 函数 相关的相关 相关 相关)
const getTranslatedString = (key: string) => key // 相关 相关
const processSkillDescription = (skill: any, desc: string) => desc // 相关 相关
const findCharacterImageForCard = (card: any) => undefined // 相关 相关

export function useDeckBuilder(data: Database | null) {
  // 相关 相关
  const [isDarkMode, setIsDarkMode] = useState(true)
  const {getTranslatedString } = useLanguage()
  // 角色 管理
  const { selectedCharacters, setSelectedCharacters, leaderCharacter, setLeaderCharacter, getCharacter, setLeader } =
    useCharacters(data)

  // 卡牌 管理
  const {
    selectedCards,
    setSelectedCards,
    getCard,
    getCardInfo,
    addCard,
    removeCard,
    reorderCards,
    updateCardSettings,
  } = useCards(data)

  // 装备 管理
  const { equipment, setEquipment, getEquipment, allEquipments } = useEquipment(data)

  // 战斗 设置
  const { battleSettings, updateBattleSettings } = useBattle()

  // 觉醒 管理 添加
  const { awakening, setAwakening, setCharacterAwakening, removeCharacterAwakening, clearAllAwakening } = useAwakening()

  // 技能 信息 读取
  const getSkill = useCallback(
    (skillId: number) => {
      return getSkillById(data, skillId)
    },
    [data],
  )

  // 相关 相关 相关
  const toggleDarkMode = useCallback(() => {
    setIsDarkMode((prev) => !prev)
  }, [])

  // 相关 相关 类 应用
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
  }, [isDarkMode])

  useEffect(() => {
    if (!data?.cards?.[DISCARD_CARD_ID]) return
    if (selectedCards.some((card) => card.id === DISCARD_CARD_ID)) return

    addCard(DISCARD_CARD_ID, "passive", DEFAULT_OWNER_ID, {
      skillId: DISCARD_SKILL_ID,
      ownerId: DEFAULT_OWNER_ID,
    })
  }, [data, selectedCards, addCard])

  // 所有 状态 初始化
  const clearAll = useCallback(() => {
    setSelectedCharacters([-1, -1, -1, -1, -1])
    setLeaderCharacter(-1)
    setSelectedCards([])
    updateBattleSettings({
      isLeaderCardOn: true,
      isSpCardOn: true,
      keepCardNum: 0,
      discardType: 0,
      otherCard: 0,
    })
    setEquipment(Array(5).fill({ weapon: null, armor: null, accessory: null }))
    clearAllAwakening() // 觉醒 信息 初始化 添加
  }, [
    setSelectedCharacters,
    setLeaderCharacter,
    setSelectedCards,
    updateBattleSettings,
    setEquipment,
    clearAllAwakening,
  ])

  // 角色的 技能 列表 相关 卡牌 生成相关 函数
  const generateCardsFromSkills = useCallback(
    (characterId: number) => {
      if (!data) {
        return
      }

      // char_skill_map相关 角色 ID相关 对应相关 技能 相关 读取
      const charSkillMap = data.charSkillMap?.[characterId.toString()]
      if (!charSkillMap) {
        return
      }

      // 新的 相关: skills 数组 处理 - 角色 ID ownerId相关 设置

      if (charSkillMap.skills) {
        charSkillMap.skills.forEach((skillId: number, index: number) => {
          const skill = getSkill(skillId)
          if (skill && skill.cardID) {
            const cardId = skill.cardID.toString()
            // 角色 ID ownerId相关 设置相关, skillIndex 最后 相关 添加
            addCard(cardId, "character", characterId, { skillId, ownerId: characterId }, index + 1)
          }
        })
      }

      // 新的 相关: relatedSkills 数组 处理 - 角色 ID ownerId相关 设置
      if (charSkillMap.relatedSkills) {
        charSkillMap.relatedSkills.forEach((skillId: number) => {
          const skill = getSkill(skillId)
          if (skill && skill.cardID) {
            const cardId = skill.cardID.toString()
            // 角色 ID ownerId相关 设置
            addCard(cardId, "character", characterId, { skillId, ownerId: characterId })
          }
        })
      }

      // 新的 相关: notFromCharacters 数组 处理 - ownerId 10000001相关 设置
      if (charSkillMap.notFromCharacters) {
        charSkillMap.notFromCharacters.forEach((skillId: number) => {
          const skill = getSkill(skillId)
          if (skill && skill.cardID) {
            const cardId = skill.cardID.toString()
            // ownerId 10000001相关 设置
            addCard(cardId, "character", characterId, { skillId, ownerId: 10000001 })
          }
        })
      }
    },
    [data, getSkill, addCard],
  )

  // 装备的 技能 列表 相关 卡牌 生成相关 函数
  const generateCardsFromEquipment = useCallback(
    (equipId: string, slotIndex: number, equipType: "weapon" | "armor" | "accessory") => {
      if (!data) {
        return
      }

      // item_skill_map.json相关 装备 ID相关 对应相关 技能 相关 查找
      const itemSkillMap = data.itemSkillMap?.[equipId]
      if (!itemSkillMap || !itemSkillMap.relatedSkills || itemSkillMap.relatedSkills.length === 0) {
        return
      }

      // relatedSkills 数组 处理
      itemSkillMap.relatedSkills.forEach((skillId: number) => {
        const skill = getSkill(skillId)
        if (!skill) return

        // 技能 相关 cardID 相关 卡牌 添加
        if (skill.cardID) {
          const cardId = skill.cardID.toString()
          // 装备相关 相关 卡牌 ownerId 10000001相关 设置
          addCard(cardId, "equipment", equipId, { skillId, slotIndex, equipType, ownerId: 10000001 })
        }
      })
    },
    [data, getSkill, addCard],
  )

  // 装备 相关 卡牌 移除 函数
  const removeCardsFromEquipment = useCallback(
    (equipId: string, slotIndex: number, equipType: "weapon" | "armor" | "accessory") => {
      setSelectedCards((prev) => {
        // 相关 卡牌的 来源 列表相关 对应 装备 来源仅 移除
        const updatedCards = prev.map((card) => {
          const updatedSources = card.sources.filter(
            (source) =>
              !(
                source.type === "equipment" &&
                source.id === equipId &&
                source.slotIndex === slotIndex &&
                source.equipType === equipType
              ),
          )

          return {
            ...card,
            sources: updatedSources,
          }
        })

        // 来源 没有 卡牌 移除
        return updatedCards.filter((card) => card.sources.length > 0)
      })
    },
    [setSelectedCards],
  )

  // 角色 移除 相关 卡牌 更新
  const updateCardsAfterCharacterRemoval = useCallback(
    (removedCharacterId: number) => {
      setSelectedCards((prev) => {
        // 相关 卡牌的 来源 列表相关 移除相关 角色 来源仅 移除
        console.log(removedCharacterId)
        const updatedCards = prev.map((card) => {
          const updatedSources = card.sources.filter(
            (source) =>
              !(source.type === "character" && source.id === removedCharacterId) &&
              !(source.type === "passive" && source.id === removedCharacterId),
          )

          return {
            ...card,
            sources: updatedSources,
          }
        })

        // 来源 没有 卡牌 移除
        return updatedCards.filter((card) => card.sources.length > 0)
      })
    },
    [setSelectedCards],
  )

  // 角色 添加
  const addCharacter = useCallback(
    (characterId: number, slot: number) => {
      if (slot < 0 || slot >= 5) return

      setSelectedCharacters((prev) => {
        const newSelection = [...prev]
        newSelection[slot] = characterId
        return newSelection
      })

      // 队长 设置 相关
      setSelectedCharacters((prev) => {
        // 队长 没有 相关
        if (leaderCharacter === -1) {
          setLeaderCharacter(characterId)
        }
        // 当前 队长 替换相关 相关
        else if (prev[slot] === leaderCharacter) {
          const otherCharacters = prev.filter((id, i) => id !== -1 && i !== slot)
          if (otherCharacters.length === 0) {
            setLeaderCharacter(characterId)
          }
        }
        // 当前 选择相关 角色 相关 角色相关 相关
        else {
          const selectedCharCount = prev.filter((id) => id !== -1).length
          if (selectedCharCount <= 1) {
            setLeaderCharacter(characterId)
          }
        }
        return prev
      })

      // 角色的 技能 列表 相关 卡牌 生成
      generateCardsFromSkills(characterId)
    },
    [leaderCharacter, generateCardsFromSkills, setSelectedCharacters, setLeaderCharacter],
  )

  // 角色 移除
  const removeCharacter = useCallback(
    (slot: number) => {
      if (slot < 0 || slot >= 5) return

      const characterId = selectedCharacters[slot]

      // 装备 信息 保存 (移除 相关)
      const slotEquipment = equipment[slot]

      setSelectedCharacters((prev) => {
        const newSelection = [...prev]
        newSelection[slot] = -1
        return newSelection
      })

      // 装备 移除 以及 相关 卡牌 移除
      setEquipment((prev) => {
        const newEquipment = [...prev]

        // 相关 装备 类型相关 处理
        if (slotEquipment.weapon) {
          removeCardsFromEquipment(slotEquipment.weapon, slot, "weapon")
        }
        if (slotEquipment.armor) {
          removeCardsFromEquipment(slotEquipment.armor, slot, "armor")
        }
        if (slotEquipment.accessory) {
          removeCardsFromEquipment(slotEquipment.accessory, slot, "accessory")
        }

        newEquipment[slot] = { weapon: null, armor: null, accessory: null }
        return newEquipment
      })

      // 队长 角色 移除 相关 相关 队长 设置
      if (characterId === leaderCharacter) {
        const remainingCharacters = selectedCharacters.filter((id, i) => id !== -1 && i !== slot)
        setLeaderCharacter(remainingCharacters.length > 0 ? remainingCharacters[0] : -1)
      }

      // 角色 移除 相关 卡牌 更新
      updateCardsAfterCharacterRemoval(characterId)

      // 角色 移除 相关 觉醒 信息相关 移除
      removeCharacterAwakening(characterId)
    },
    [
      selectedCharacters,
      leaderCharacter,
      equipment,
      removeCardsFromEquipment,
      updateCardsAfterCharacterRemoval,
      setSelectedCharacters,
      setLeaderCharacter,
      setEquipment,
      removeCharacterAwakening,
    ],
  )

  // 装备 更新
  const updateEquipment = useCallback(
    (slotIndex: number, equipType: "weapon" | "armor" | "accessory", equipId: string | null) => {
      setEquipment((prev) => {
        const newEquipment = [...prev]
        const oldEquipId = newEquipment[slotIndex][equipType]

        // 相关 装备 相关 相关 卡牌 移除
        if (oldEquipId) {
          removeCardsFromEquipment(oldEquipId, slotIndex, equipType)
        }

        // 相关 装备 设置
        newEquipment[slotIndex] = {
          ...newEquipment[slotIndex],
          [equipType]: equipId,
        }

        // 相关 装备 相关 相关 卡牌 添加
        if (equipId) {
          generateCardsFromEquipment(equipId, slotIndex, equipType)
        }

        return newEquipment
      })
    },
    [removeCardsFromEquipment, generateCardsFromEquipment, setEquipment],
  )

  // 觉醒 相关 更新
  const updateAwakening = useCallback(
    (characterId: number, stage: number | null) => {
      setCharacterAwakening(characterId, stage)
    },
    [setCharacterAwakening],
  )

  // 预设 对象 读取
  const importPresetObject = useCallback(
    (preset: any, isUrlImport = false): Result => {
      try {
        // 预设 相关 校验
        if (!preset.roleList || !Array.isArray(preset.roleList) || preset.roleList.length !== 5) {
          throw new Error("Invalid roleList")
        }

        if (!preset.cardList || !Array.isArray(preset.cardList)) {
          throw new Error("Invalid cardList")
        }

        // 所有 状态 初始化
        clearAll()

        // 相关 相关 更新相关 状态 相关
        const updatedCharacters = [-1, -1, -1, -1, -1]
        const updatedEquipment = Array(5).fill({ weapon: null, armor: null, accessory: null })

        // 角色 设置
        preset.roleList.forEach((charId: number, index: number) => {
          if (charId !== -1) {
            addCharacter(charId, index)
            updatedCharacters[index] = charId
          }
        })

        // 队长 设置 - 所有 角色 添加 相关 相关 设置
        // 预设的 header 有效 角色相关 检查
        if (preset.header !== -1 && preset.roleList.includes(preset.header)) {
          // 状态 更新 相关 添加相关 所有 角色 添加 相关 相关 相关
          setTimeout(() => {
            // forceSet 相关 true相关 设置相关 队长 相关 设置
            setLeader(preset.header, true)
          }, 100) // 相关 相关 100ms相关 增加
        }

        // 觉醒 信息 设置 (存在 相关)
        if (preset.awakening) {
          setAwakening(preset.awakening)
        }

        // 装备 设置
        if (preset.equipment) {
          Object.entries(preset.equipment).forEach(([slotIndex, equipData]) => {
            const index = Number.parseInt(slotIndex, 10)
            if (index >= 0 && index < 5 && Array.isArray(equipData) && equipData.length === 3) {
              const [weapon, armor, accessory] = equipData as [string | null, string | null, string | null]

              // 相关 相关 更新
              updatedEquipment[index] = {
                weapon: weapon || null,
                armor: armor || null,
                accessory: accessory || null,
              }

              // 实际 状态 更新
              if (weapon) updateEquipment(index, "weapon", weapon)
              if (armor) updateEquipment(index, "armor", armor)
              if (accessory) updateEquipment(index, "accessory", accessory)
            }
          })
        }

        // 装备 类型相关 相关 使用相关 角色 相关 相关卡组相关 相关 相关
        const equipmentTypeSlotMap = {
          weapon: 0,
          armor: 0,
          accessory: 0,
        }

        // 有效 角色 相关 相关卡组相关 数组 (角色 存在 相关仅)
        const validCharacterSlots = updatedCharacters
          .map((charId, index) => (charId !== -1 ? index : -1))
          .filter((index) => index !== -1)

        // 相关 相关 装备 ID 相关 Set
        const equippedItems = new Set<string>()

        // 角色 相关 相关 处理 中断
        if (validCharacterSlots.length === 0) return { success: true, message: "import_success" }

        // URL 相关 相关 相关仅 cardList的 equipIdList 处理
        // 相关 核心 变更 相关
        if (!isUrlImport) {
          // 卡牌的 equipIdList 处理
          preset.cardList.forEach((presetCard: any) => {
            if (presetCard.equipIdList && Array.isArray(presetCard.equipIdList) && presetCard.equipIdList.length > 0) {
              // 相关 装备 ID相关 相关 处理
              presetCard.equipIdList.forEach((equipId: string) => {
                // 相关 相关 装备 相关
                if (equippedItems.has(equipId)) return

                // 装备 信息 读取
                const equipmentData = data?.equipments?.[equipId]
                if (!equipmentData) return

                // 装备 类型 检查
                const equipType = equipmentData.type as "weapon" | "armor" | "accessory"
                if (!equipType) return

                // 对应 装备 实际相关 卡牌的 技能 添加相关 检查
                let isValidEquipment = false

                // item_skill_map相关 装备 相关 技能 检查
                const itemSkillMap = data.itemSkillMap?.[equipId]
                if (itemSkillMap && itemSkillMap.relatedSkills) {
                  for (const skillId of itemSkillMap.relatedSkills) {
                    const skill = getSkill(skillId)
                    if (skill && skill.cardID && skill.cardID.toString() === presetCard.id) {
                      isValidEquipment = true
                      break
                    }
                  }
                }

                // 有效 装备相关 相关 角色 相关 相关
                if (isValidEquipment) {
                  // 当前 装备 类型相关 相关 相关 相关卡组相关 读取
                  let slotIndex = equipmentTypeSlotMap[equipType]

                  // 所有 角色 相关 相关 重新 相关 相关
                  if (slotIndex >= validCharacterSlots.length) {
                    slotIndex = 0
                    equipmentTypeSlotMap[equipType] = 0
                  }

                  // 实际 角色 相关 相关卡组相关 读取
                  const charSlotIndex = validCharacterSlots[slotIndex]

                  // 装备 相关
                  updateEquipment(charSlotIndex, equipType, equipId)

                  // 相关 相关 更新
                  updatedEquipment[charSlotIndex] = {
                    ...updatedEquipment[charSlotIndex],
                    [equipType]: equipId,
                  }

                  // 相关 装备 Set相关 添加
                  equippedItems.add(equipId)

                  // 相关 相关 相关卡组相关 更新
                  equipmentTypeSlotMap[equipType]++
                }
              })
            }
          })
        }

        // 卡牌 设置 更新 (useType, useParam 相关)
        setSelectedCards((currentCards) => {
          // 1. 预设的 cardList相关 存在 所有 卡牌 相关 添加
          const newCards: SelectedCard[] = []

          // 预设的 卡牌 列表 处理相关 相关 卡牌 数组 生成
          preset.cardList.forEach((presetCard: any) => {
            const cardId = presetCard.id
            // 当前 卡牌 列表相关 对应 ID 相关 卡牌 查找
            const existingCard = currentCards.find((card) => card.id === cardId)

            if (existingCard) {
              // 现有 卡牌 相关 设置仅 更新
              if (existingCard.skillIndex == undefined && presetCard.skillIndex != undefined){
                existingCard.skillIndex = presetCard.skillIndex
              }
              newCards.push({
                ...existingCard,
                useType: presetCard.useType,
                useParam: presetCard.useParam,
                ...(presetCard.useParamMap ? { useParamMap: presetCard.useParamMap } : {}),
              })
            } else {
              // 现有 卡牌 相关 相关 生成
              newCards.push({
                id: cardId,
                useType: presetCard.useType,
                useParam: presetCard.useParam,
                ...(presetCard.useParamMap ? { useParamMap: presetCard.useParamMap } : {}),
                ownerId: presetCard.ownerId,
                skillId: presetCard.skillId,
                skillIndex: presetCard.skillIndex,
                sources: [], // 空 来源 数组相关 相关
              })
            }
          })

          // 2. 预设的 cardList相关 没有 卡牌 相关 当前 选择相关 卡牌 列表相关 存在 卡牌 添加
          const presetCardIds = new Set(preset.cardList.map((card: any) => card.id))

          currentCards.forEach((card) => {
            // 相关 添加相关 相关 卡牌仅 添加
            if (!presetCardIds.has(card.id)) {
              newCards.push(card)
            }
          })

          // 3. 使用相关 相关 没有 卡牌 相关 以及 替换
          if (data) {
            // 相关 相关 函数 使用
            const { idSet: availableCardIds, cardSources } = getAvailableCardIds(data, preset.roleList, equipment)
            // 使用相关 相关 没有 卡牌 相关
            const unavailableCards = newCards.filter((card) =>!availableCardIds.has(card.id))

            // 使用相关 相关 没有 卡牌相关 相关 名称 相关 相关 相关 卡牌 查找
            unavailableCards.forEach((unavailableCard) => {
              // 技能 ID 相关 对应 技能的 名称 查找
              if (unavailableCard.skillId && data.skills[unavailableCard.skillId]) {
                const unavailableSkill = data.skills[unavailableCard.skillId]
                // 语言包相关 相关 技能 名称 读取
                const translatedUnavailableSkillName = getTranslatedString(unavailableSkill.name)

                // console.log(translatedUnavailableSkillName)
                // 使用 相关 卡牌相关 相关 相同 名称 相关 卡牌 查找
                for (const availableCardId of availableCardIds) {
                  // 对应 卡牌的 技能 ID 查找
                  let foundSkillId: number | undefined

                  // 卡牌相关 相关 技能 查找
                  for (const skillId in data.skills) {
                    const skill = data.skills[skillId]
                    if (skill.cardID && skill.cardID.toString() === availableCardId) {
                      foundSkillId = Number(skillId)
                      break
                    }
                  }

                  if (foundSkillId) {
                    const availableSkill = data.skills[foundSkillId.toString()]
                    if (availableSkill) {
                      // 语言包相关 相关 使用 相关 技能 名称 读取
                      const translatedAvailableSkillName = getTranslatedString(availableSkill.name)
                      // console.log(translatedAvailableSkillName +" 2")
                      // 相关 名称相关 比较
                      if (translatedAvailableSkillName === translatedUnavailableSkillName) {
                        const index = newCards.findIndex((card) => card.id === availableCardId)
                        if (index !== -1) {
                          newCards.splice(index, 1) // 相关卡组相关 位置相关 1相关的 相关 删除
                        }

                        // 名称 相关 卡牌 相关, 卡牌 信息 替换
                        unavailableCard.id = availableCardId
                        unavailableCard.skillId = foundSkillId

                        // 卡牌的 ownerId 更新
                        const cardData = data.cards[availableCardId]
                        // if (cardData && cardData.ownerId) {
                        //   unavailableCard.ownerId = cardData.ownerId
                        // }

                        // 来源 信息 添加 - 相关 相关
                        if (!unavailableCard.sources) {
                          unavailableCard.sources = []
                        }
                        
                        // 对应 卡牌 ID相关 相关 所有 来源 信息 添加
                        const sourcesForCard = cardSources.filter(cs => cs.cardId === availableCardId)
                        sourcesForCard.forEach(cs => {
                          unavailableCard.sources.push(cs.source)
                        });

                        // 相关 技能 检查 (charSkillMap相关 notFromCharacters相关 存在 相关)
                        let isSpecialSkill = false
                        for (const charId in data.charSkillMap) {
                          const charSkillMap = data.charSkillMap[charId]
                          if (charSkillMap.notFromCharacters && charSkillMap.notFromCharacters.includes(foundSkillId)) {
                            isSpecialSkill = true
                            break
                          }
                        }

                        if (isSpecialSkill) {
                          unavailableCard.ownerId = 10000001 // 相关 技能的 相关 ownerId 10000001相关 设置
                        }

                        break
                      }
                    }
                  }
                }
              }
            })
          }

          return newCards
        })

        // 战斗 设置 更新
        updateBattleSettings({
          isLeaderCardOn: preset.isLeaderCardOn !== undefined ? preset.isLeaderCardOn : true,
          isSpCardOn: preset.isSpCardOn !== undefined ? preset.isSpCardOn : true,
          keepCardNum: preset.keepCardNum !== undefined ? preset.keepCardNum : 0,
          discardType: preset.discardType !== undefined ? preset.discardType - 1 : 0, // discardType相关 1 相关
          otherCard: preset.otherCard !== undefined ? preset.otherCard : 0,
        })

        return { success: true, message: "import_success" }
      } catch (error) {
        return { success: false, message: "import_failed" }
      }
    },
    [
      addCharacter,
      setLeader,
      updateEquipment,
      clearAll,
      setSelectedCards,
      data,
      getSkill,
      selectedCharacters,
      equipment,
      updateBattleSettings,
      setAwakening,
    ],
  )

  // 预设 管理
  const {
    exportPreset,
    exportPresetToString,
    importPreset,
    decodePresetString,
    createShareableUrl,
    createRootShareableUrl,
    createPresetObject, // 函数 相关 相关
  } = usePresets(
    data,
    selectedCharacters,
    leaderCharacter,
    selectedCards,
    battleSettings,
    equipment,
    awakening, // 觉醒 信息 添加
    clearAll,
    importPresetObject,
  )

  // 使用 相关 卡牌 列表
  const availableCards = useMemo(() => {
    if (!data) return []

    const cardSet = new Set<string>()
    const validCharacters = selectedCharacters.filter((id) => id !== -1)

    // 角色 技能 相关 卡牌 ID 相关
    validCharacters.forEach((charId) => {
      const charSkillMap = data.charSkillMap?.[charId.toString()]
      if (!charSkillMap) return

      // 默认 技能 处理
      if (charSkillMap.skills && Array.isArray(charSkillMap.skills)) {
        charSkillMap.skills.forEach((skillId: number) => {
          const skill = data.skills[skillId.toString()]
          if (skill && skill.cardID) {
            cardSet.add(skill.cardID.toString())
          }
        })
      }

      // 相关 技能 处理
      if (charSkillMap.relatedSkills && Array.isArray(charSkillMap.relatedSkills)) {
        charSkillMap.relatedSkills.forEach((skillId: number) => {
          const skill = data.skills[skillId.toString()]
          if (skill && skill.cardID) {
            cardSet.add(skill.cardID.toString())
          }
        })
      }

      // 角色相关 相关 相关 技能 处理
      if (charSkillMap.notFromCharacters && Array.isArray(charSkillMap.notFromCharacters)) {
        charSkillMap.notFromCharacters.forEach((skillId: number) => {
          const skill = data.skills[skillId.toString()]
          if (skill && skill.cardID) {
            cardSet.add(skill.cardID.toString())
          }
        })
      }
    })

    // 装备 技能 相关 卡牌 ID 相关
    validCharacters.forEach((charId, slotIndex) => {
      const charEquipment = equipment[slotIndex]

      // 相关 装备 类型相关 处理
      const processEquipment = (equipId: string | null) => {
        if (!equipId) return

        // 装备 技能 相关 相关 技能 查找
        const itemSkillMap = data.itemSkillMap?.[equipId]
        if (!itemSkillMap || !itemSkillMap.relatedSkills) return

        // 相关 技能相关 卡牌 ID 相关
        itemSkillMap.relatedSkills.forEach((skillId: number) => {
          const skill = data.skills[skillId.toString()]
          if (skill && skill.cardID) {
            cardSet.add(skill.cardID.toString())
          }
        })
      }

      // 相关 装备 类型相关 相关 处理
      if (charEquipment.weapon) processEquipment(charEquipment.weapon)
      if (charEquipment.armor) processEquipment(charEquipment.armor)
      if (charEquipment.accessory) processEquipment(charEquipment.accessory)
    })

    // 重要: selectedCards相关 所有 卡牌 ID cardSet相关 添加
    // 相关 相关 装备相关 添加相关 卡牌相关 相关
    selectedCards.forEach((card) => {
      cardSet.add(card.id)
    })

    // Convert to array
    return Array.from(cardSet)
      .map((id) => {
        // 相关 selectedCards相关 对应 卡牌 查找
        const selectedCard = selectedCards.find((card) => card.id === id)

        // selectedCards相关 相关 保存相关 信息 使用
        if (selectedCard && selectedCard.skillInfo && selectedCard.cardInfo && selectedCard.extraInfo) {
          return {
            card: {
              id: Number(id),
              ...selectedCard.cardInfo,
            },
            extraInfo: {
              name: getTranslatedString(selectedCard.skillInfo.name),
              desc: processSkillDescription(
                selectedCard.skillInfo,
                selectedCard.extraInfo.desc || selectedCard.skillInfo.description,
              ),
              cost: selectedCard.extraInfo.cost,
              amount: selectedCard.extraInfo.amount,
              img_url: selectedCard.extraInfo.img_url,
            },
            characterImage: findCharacterImageForCard(selectedCard),
          }
        }

        // selectedCards相关 相关 现有 相关 处理
        const card = data.cards[id]
        if (!card) return null

        // 默认 extraInfo 对象 生成 - 相关 卡牌 名称相关 初始化
        const extraInfo: CardExtraInfo = {
          name: card.name || `card_name_${id}`,
          desc: "",
          cost: 0, // 默认值 设置
          amount: 0, // 默认 数量 0相关 设置
          img_url: undefined,
        }

        // 卡牌 ID相关 对应相关 图片 URL 查找
        if (data.images && data.images[`card_${id}`]) {
          extraInfo.img_url = data.images[`card_${id}`]
        }

        // 技能 ID 相关 添加 信息 查找
        let skillId = -1
        let skillObj = null
        for (const sId in data.skills) {
          const skill = data.skills[sId]
          if (skill && skill.cardID && skill.cardID.toString() === id) {
            // 技能 名称 extraInfo.name相关 相关 - 相关 名称 使用
            extraInfo.name = getTranslatedString(skill.name)
            // 技能 说明 extraInfo.desc相关 相关 - 相关 以及 #r 值 替换 应用
            extraInfo.desc = skill.description || ""
            // 技能 ID 保存
            skillId = Number.parseInt(sId)
            // 技能 对象 保存
            skillObj = skill

            // 技能 图片 URL 查找
            if (data.images && data.images[`skill_${sId}`]) {
              extraInfo.img_url = data.images[`skill_${sId}`]
            }
            break
          }
        }

        // 技能 说明 处理 - 相关 以及 #r 值 替换
        if (skillObj) {
          extraInfo.desc = processSkillDescription(skillObj, extraInfo.desc)
        } else {
          // 技能 对象 没有 相关 默认 相关仅 应用
          extraInfo.desc = getTranslatedString(extraInfo.desc)
        }

        // 卡牌 费用 信息 查找 - cost_SN 10000相关 相关 值 使用
        if (card.cost_SN !== undefined) {
          // cost_SN 10000相关 相关 相关 处理
          const costValue = card.cost_SN > 0 ? Math.floor(card.cost_SN / 10000) : 0
          extraInfo.cost = costValue
        }

        // 卡牌 数量 信息 查找 - 角色的 skillList相关 对应 技能的 num 值 查找
        if (skillId !== -1) {
          for (const charId of validCharacters) {
            const character = data.characters[charId.toString()]
            if (character && character.skillList) {
              const skillItem = character.skillList.find((item) => item.skillId === skillId)
              if (skillItem && skillItem.num) {
                extraInfo.amount = skillItem.num
                break
              }
            }
          }
        }

        // 重要: selectedCards相关 对应 卡牌 相关 ownerId 信息 读取
        const cardForImage = selectedCard || card
        const characterImage = findCharacterImageForCard(cardForImage)

        return { card, extraInfo, characterImage }
      })
      .filter(Boolean)
  }, [
    data,
    selectedCharacters,
    findCharacterImageForCard,
    selectedCards,
    processSkillDescription,
    getTranslatedString,
    equipment,
  ])

  return {
    selectedCharacters,
    leaderCharacter,
    selectedCards,
    battleSettings,
    equipment,
    isDarkMode,
    availableCards,
    awakening, // 觉醒 信息 添加
    getCharacter,
    getCard,
    getCardInfo,
    getEquipment,
    getSkill,
    allEquipments,
    addCharacter,
    removeCharacter,
    setLeader,
    addCard,
    removeCard,
    reorderCards,
    updateCardSettings,
    updateBattleSettings,
    updateEquipment,
    updateAwakening, // 觉醒 更新 函数 添加
    toggleDarkMode,
    clearAll,
    exportPreset,
    exportPresetToString,
    importPreset,
    importPresetObject,
    createShareableUrl,
    createRootShareableUrl,
    decodePresetString,
    createPresetObject, // 函数 相关 相关
    setSelectedCharacters, // 添加: 角色 数组 直接 设置 函数
    setLeaderCharacter,
  }
}
