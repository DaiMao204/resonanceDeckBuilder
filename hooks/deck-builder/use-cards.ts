"use client"

import { useState, useCallback, useRef } from "react"
import type { Database } from "../../types"
import type { SelectedCard, CardSource } from "./types"
import { getCardById, hasSource } from "./utils"

export function useCards(data: Database | null) {
  // 选择相关 卡牌 引用 - 状态 更新 相关 当前 值相关 相关 相关
  const selectedCardsRef = useRef<SelectedCard[]>([])

  // 选择相关 卡牌 状态 更新 函数
  const [, setSelectedCardsState] = useState<SelectedCard[]>([])

  // 选择相关 卡牌 更新 函数
  const setSelectedCards = useCallback((newCards: SelectedCard[] | ((prevCards: SelectedCard[]) => SelectedCard[])) => {
    if (typeof newCards === "function") {
      selectedCardsRef.current = newCards(selectedCardsRef.current)
    } else {
      selectedCardsRef.current = newCards
    }
    setSelectedCardsState(selectedCardsRef.current) // 状态 更新相关 相关 相关
  }, [])

  // 卡牌 ID相关 卡牌 信息 读取
  const getCard = useCallback(
    (id: string) => {
      return getCardById(data, id)
    },
    [data],
  )

  // 卡牌 信息 读取
  const getCardInfo = useCallback(
    (cardId: string) => {
      if (!data) return null
      const card = data.cards[cardId]
      if (!card) return null
      return { card }
    },
    [data],
  )

  // 卡牌 添加 函数 修改
  const addCard = useCallback(
    (
      cardId: string,
      sourceType: "character" | "equipment" | "passive",
      sourceId: string | number,
      sourceInfo?: {
        skillId?: number
        slotIndex?: number
        equipType?: "weapon" | "armor" | "accessory"
        ownerId?: number
      },
      skillIndex?:number
    ) => {
      setSelectedCards((prev) => {
        // 现有 卡牌 查找
        const existingCard = prev.find((card) => card.id === cardId)

        // 相关 来源 对象 生成
        const newSource: CardSource = {
          type: sourceType,
          id: sourceId,
          ...sourceInfo,
        } as CardSource

        // ownerId 相关
        const ownerId =
          sourceType === "equipment" ? 10000001 : sourceInfo?.ownerId !== undefined ? sourceInfo.ownerId : 10000001
        let skillId = -1

        // 来源 类型 character 或 passive相关 相关
        if (sourceType === "character" || sourceType === "passive") {
          if (sourceInfo?.skillId) {
            skillId = sourceInfo.skillId
          }
        }

        // 卡牌 信息 读取
        const card = data?.cards[cardId]

        // 技能 信息 读取
        let skillInfo = undefined
        if (skillId !== -1 && data?.skills) {
          const skill = data.skills[skillId.toString()]
          if (skill) {
            skillInfo = {
              name: skill.name,
              description: skill.description,
              detailDescription: skill.detailDescription,
              cardID: skill.cardID,
              leaderCardConditionDesc: skill.leaderCardConditionDesc,
            }
          } else if (card && data?.skills) {
            // 卡牌 ID相关 技能 查找
            for (const sId in data.skills) {
              const skill = data.skills[sId]
              if (skill && skill.cardID && skill.cardID.toString() === cardId) {
                skillId = Number.parseInt(sId)
                skillInfo = {
                  name: skill.name,
                  description: skill.description,
                  detailDescription: skill.detailDescription,
                  cardID: skill.cardID,
                  leaderCardConditionDesc: skill.leaderCardConditionDesc,
                }
                break
              }
            }
          }
        }

        // 卡牌 添加 信息 生成
        let extraInfo = undefined
        if (card) {
          // 费用 计算
          let cost = 0
          if (card.cost_SN !== undefined) {
            cost = Math.floor(card.cost_SN / 10000)
          }

          // 数量 计算 (角色的 skillList相关 查找)
          let amount = 0
          if (skillId !== -1 && sourceType === "character" && typeof sourceId === "number") {
            const character = data?.characters[sourceId.toString()]
            if (character && character.skillList) {
              const skillItem = character.skillList.find((item) => item.skillId === skillId)
              if (skillItem && skillItem.num) {
                amount = skillItem.num
              }
            }
          }

          // 图片 URL 查找
          let img_url = undefined
          if (data?.images) {
            if (data.images[`card_${cardId}`]) {
              img_url = data.images[`card_${cardId}`]
            } else if (skillId !== -1 && data.images[`skill_${skillId}`]) {
              img_url = data.images[`skill_${skillId}`]
            }
          }

          extraInfo = {
            cost,
            amount,
            img_url,
            desc: skillInfo?.description || "",
          }
        }

        // 卡牌 信息 生成
        let cardInfo = undefined
        if (card) {
          cardInfo = {
            name: card.name,
            color: card.color,
            cardType: card.cardType,
            tagList: card.tagList,
          }
        }

        if (existingCard) {
          // 相关 相同 来源 存在相关 检查
          if (!hasSource(existingCard, newSource)) {
            // 相关 来源 添加
            return prev.map((card) =>
              card.id === cardId
                ? {
                    ...card,
                    sources: [...card.sources, newSource],
                    ...(ownerId !== -1 && { ownerId }),
                    ...(skillId !== -1 && { skillId }),
                    // 技能 信息 没有 相关仅 添加
                    ...(skillInfo && !card.skillInfo && { skillInfo }),
                    // 卡牌 信息 没有 相关仅 添加
                    ...(cardInfo && !card.cardInfo && { cardInfo }),
                    // 添加 信息 没有 相关仅 添加
                    ...(extraInfo && !card.extraInfo && { extraInfo }),
                  }
                : card,
            )
          }
          return prev // 来源 相关 相关 变更 相关
        }

        // 相关 卡牌 添加
        return [
          ...prev,
          {
            id: cardId,
            useType: 1,
            useParam: -1,
            ownerId,
            skillId: skillId !== -1 ? skillId : undefined,
            sources: [newSource],
            skillInfo,
            cardInfo,
            extraInfo,
            ...(skillIndex !== undefined ? { skillIndex } : {})
          },
        ]
      })
    },
    [setSelectedCards, data, hasSource],
  )

  // 卡牌 移除
  const removeCard = useCallback(
    (cardId: string) => {
      setSelectedCards((prev) => prev.filter((card) => card.id !== cardId))
    },
    [setSelectedCards],
  )

  // 卡牌 相关 变更
  const reorderCards = useCallback(
    (fromIndex: number, toIndex: number) => {
      setSelectedCards((prev) => {
        const result = [...prev]
        const [removed] = result.splice(fromIndex, 1)
        result.splice(toIndex, 0, removed)
        return result
      })
    },
    [setSelectedCards],
  )

  // 卡牌 设置 更新
  const updateCardSettings = useCallback(
    (cardId: string, useType: number, useParam: number, useParamMap?: Record<string, number>) => {
      setSelectedCards((currentCards) => {
        return currentCards.map((card) => (card.id === cardId ? { ...card, useType, useParam, useParamMap } : card))
      })
    },
    [setSelectedCards],
  )

  return {
    selectedCards: selectedCardsRef.current,
    setSelectedCards,
    getCard,
    getCardInfo,
    addCard,
    removeCard,
    reorderCards,
    updateCardSettings,
  }
}
