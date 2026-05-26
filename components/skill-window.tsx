"use client"

import type React from "react"
import { useState, useEffect, useRef, useMemo } from "react"
import type { Card, CardExtraInfo } from "../types"
import { SkillCard } from "./skill-card"
import { CardSettingsModal } from "./card-settings-modal"
import { TabbedInterface } from "./tabbed-interface"
import { DeckStats } from "./deck-stats"

// dnd-kit import - MouseSensor和 TouchSensor 添加
import { DndContext, closestCenter, useSensor, useSensors, DragOverlay, MouseSensor, TouchSensor } from "@dnd-kit/core"
import { SortableContext, useSortable, rectSortingStrategy } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

interface SkillWindowProps {
  selectedCards: {
    id: string
    useType: number
    useParam: number
    useParamMap?: Record<string, number>
    skillId?: number
  }[]
  availableCards: { card: Card; extraInfo: CardExtraInfo; characterImage?: string }[]
  onAddCard: (cardId: string) => void
  onRemoveCard: (cardId: string) => void
  onReorderCards: (fromIndex: number, toIndex: number) => void
  onUpdateCardSettings: (
    cardId: string,
    useType: number,
    useParam: number,
    useParamMap?: Record<string, number>,
  ) => void
  getTranslatedString: (key: string) => string
  data: any
}

function SortableSkillCard({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 100 : 1,
    position: "relative" as const,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`touch-manipulation ${isDragging ? "dragging-card" : ""}`}
      onContextMenu={(e) => e.preventDefault()}
    >
      {children}
    </div>
  )
}

// 标签 组件 - 相关卡牌 相关 状态相关 相关 显示/隐藏 处理
function StatusEffectTags({
  statusEffects,
  includeDerivedCards,
  getTranslatedString,
  forceShowAll = false, // 所有 标签 相关 显示相关 相关
}: {
  statusEffects: {
    id: string
    name: string
    color: string
    description: string
    source: "normal" | "derived" | "both"
  }[]
  includeDerivedCards: boolean
  getTranslatedString: (key: string) => string
  forceShowAll?: boolean
}) {
  return (
    <div className="neon-container p-4 mt-4">
      <h3 className="text-lg font-semibold mb-4 neon-text">
        {getTranslatedString("status_effects") || "Status Effects"}
      </h3>
      {statusEffects.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {statusEffects.map((effect) => (
            <div
              key={effect.id}
              className={`relative group tooltip-group ${
                !forceShowAll && !includeDerivedCards && effect.source === "derived" ? "hidden" : ""
              }`}
              onMouseEnter={(e) => {
                const tag = e.currentTarget
                const tagRect = tag.getBoundingClientRect()
                const tooltipWidth = 256 // 提示框 宽度
                const screenWidth = window.innerWidth

                // 标签的 相关 相关 相关 相关 存在相关 检查
                if (tagRect.left + tagRect.width / 2 > screenWidth / 2) {
                  // 相关 相关 提示框 相关 排序
                  tag.style.setProperty("--tooltip-x", `${Math.max(tagRect.left - tooltipWidth, 10)}px`)
                  tag.style.setProperty("--tooltip-align", "left")
                } else {
                  // 相关 相关 提示框 相关 排序
                  tag.style.setProperty("--tooltip-x", `${tagRect.right}px`)
                  tag.style.setProperty("--tooltip-align", "right")
                }

                // Y 位置 标签 相关 显示
                const tooltipY = tagRect.top - 10
                tag.style.setProperty("--tooltip-y", `${tooltipY}px`)
              }}
            >
              <span
                className="px-2 py-1 bg-black bg-opacity-50 border rounded-md text-sm cursor-help"
                style={{
                  borderColor: effect.color,
                  color: effect.color,
                  boxShadow: `0 0 5px ${effect.color}40`,
                }}
              >
                {effect.name}
              </span>

              {/* 提示框 */}
              <div
                className="fixed p-2 rounded text-xs text-gray-300 
                          invisible group-hover:visible z-10 border border-gray-700 pointer-events-none
                          bg-black bg-opacity-90 shadow-lg w-64"
                style={{
                  // 相关 位置相关 相关 相关 位置 相关
                  left: "var(--tooltip-x, 0)",
                  top: "var(--tooltip-y, 0)",
                }}
              >
                <div className="font-bold mb-1" style={{ color: effect.color }}>
                  {effect.name}
                </div>
                <div>{effect.description}</div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-400">{getTranslatedString("no_status_effects") || "No status effects found"}</p>
      )}
    </div>
  )
}

// SkillCard 组件相关 selectedCards的 保存相关 信息 直接 使用相关 修改
function SkillPriorityTab({
  selectedCards,
  availableCards,
  onRemoveCard,
  onReorderCards,
  getTranslatedString,
  onEditCard,
  activeId,
  activeCardInfo,
  statusEffects,
  includeDerivedCards,
  data,
}: {
  selectedCards: {
    id: string
    useType: number
    useParam: number
    useParamMap?: Record<string, number>
    skillInfo?: any
    cardInfo?: any
    extraInfo?: any
  }[]
  availableCards: { card: Card; extraInfo: CardExtraInfo; characterImage?: string }[]
  onRemoveCard: (cardId: string) => void
  onReorderCards: (fromIndex: number, toIndex: number) => void
  getTranslatedString: (key: string) => string
  onEditCard: (cardId: string) => void
  activeId: string | null
  activeCardInfo: { card: Card; extraInfo: CardExtraInfo; characterImage?: string } | null
  statusEffects: any[]
  includeDerivedCards: boolean
  data: any
}) {
  return (
    <div className="w-full">
      {selectedCards.length === 0 ? (
        <div className="flex items-center justify-center h-[300px] text-gray-400">
          {getTranslatedString("no.skill.cards") || "No skill cards"}
        </div>
      ) : (
        <SortableContext items={selectedCards.map((c) => c.id)} strategy={rectSortingStrategy}>
          <div className="skill-grid w-full">
            {selectedCards.map((selectedCard) => {
              // 始终 availableCards相关 卡牌 信息 查找 (CardSettingsModal和 相关 相关)
              const cardInfo = availableCards.find((c) => c.card.id.toString() === selectedCard.id.toString())

              if (!cardInfo) {
                return null
              }

              const { card, extraInfo, characterImage } = cardInfo
              const isDisabled = selectedCard.useType === 2

              return (
                <SortableSkillCard key={selectedCard.id} id={selectedCard.id}>
                  <SkillCard
                    card={card}
                    extraInfo={extraInfo}
                    getTranslatedString={getTranslatedString}
                    onRemove={() => onRemoveCard(selectedCard.id)}
                    onEdit={() => onEditCard(selectedCard.id)}
                    isDisabled={isDisabled}
                    characterImage={characterImage}
                    useType={selectedCard.useType}
                    useParam={selectedCard.useParam}
                  />
                </SortableSkillCard>
              )
            })}
          </div>
        </SortableContext>
      )}

      {/* 拖拽 覆盖层 添加 - 拖拽 相关 卡牌的 相关 相关 */}
      <DragOverlay adjustScale={true}>
        {activeId && activeCardInfo && (
          <div className="dragging-overlay">
            <SkillCard
              card={activeCardInfo.card}
              extraInfo={activeCardInfo.extraInfo}
              getTranslatedString={getTranslatedString}
              onRemove={() => {}}
              onEdit={() => {}}
              isDisabled={false}
              characterImage={activeCardInfo.characterImage}
              useType={selectedCards.find((c) => c.id === activeId)?.useType || 1}
              useParam={selectedCards.find((c) => c.id === activeId)?.useParam || -1}
            />
          </div>
        )}
      </DragOverlay>

      {/* 状态效果(标签) 显示 */}
      <StatusEffectTags
        statusEffects={statusEffects}
        includeDerivedCards={includeDerivedCards}
        getTranslatedString={getTranslatedString}
        forceShowAll={true} // 优先级 标签页相关 始终 所有 标签 显示
      />
    </div>
  )
}

export function SkillWindow({
  selectedCards,
  availableCards,
  onAddCard,
  onRemoveCard,
  onReorderCards,
  onUpdateCardSettings,
  getTranslatedString,
  data,
}: SkillWindowProps) {
  const [editingCard, setEditingCard] = useState<string | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [isTouchDevice, setIsTouchDevice] = useState(false)
  const skillContainerRef = useRef<HTMLDivElement>(null)
  const [includeDerivedCards, setIncludeDerivedCards] = useState(true)

  // 标签 数据和 颜色 映射 相关 组件相关 管理
  const [tagData, setTagData] = useState<Record<string, any>>({})
  const [tagColorMapping, setTagColorMapping] = useState<Record<string, string[]>>({})

  // 标签 数据 加载 - 组件 挂载 相关 相关 相关仅 相关
  useEffect(() => {
    const loadTagData = async () => {
      try {
        // 标签 数据 加载
        const tagResponse = await fetch("/db/tag_db.json")
        const tagData = await tagResponse.json()
        setTagData(tagData)

        // 标签 颜色 映射 数据 加载
        const tagColorResponse = await fetch("/db/tag_color_mapping.json")
        const tagColorData = await tagColorResponse.json()
        setTagColorMapping(tagColorData)
      } catch (error) {
        console.error("Failed to load tag data:", error)
      }
    }

    loadTagData()
  }, []) // 空 的相关 数组相关 挂载 相关 相关 相关仅 相关

  // 触摸 相关 检测
  useEffect(() => {
    const detectTouch = () => {
      setIsTouchDevice(
        "ontouchstart" in window || navigator.maxTouchPoints > 0 || (navigator as any).msMaxTouchPoints > 0,
      )
    }

    detectTouch()

    // 相关 大小 变更 相关 重新 检测
    window.addEventListener("resize", detectTouch)

    return () => {
      window.removeEventListener("resize", detectTouch)
    }
  }, [])

  // 触摸 相关和 鼠标 相关 相关 其他 相关 设置
  const sensors = useSensors(
    // 鼠标 相关 - 相关 相关
    useSensor(MouseSensor, {
      // 鼠标 按钮 - 相关 按钮仅 相关
      activationConstraint: {
        distance: 5, // 5px 相关 相关 拖拽 相关 (相关 防止)
      },
    }),
    // 触摸 相关 - 长按 应用
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250, // 250ms 相关 相关 相关 拖拽 相关
        tolerance: 5, // 5px 相关的 相关 相关
      },
    }),
  )

  // Get the cards that are actually in the deck (not disabled)
  const activeCards = useMemo(() => {
    return selectedCards
      .filter((card) => card.useType !== 2) // Filter out disabled cards
      .map((selectedCard) => {
        const cardInfo = availableCards.find((c) => c.card.id.toString() === selectedCard.id)
        return cardInfo ? { ...cardInfo, selectedCard } : null
      })
      .filter(Boolean) as {
      card: Card
      extraInfo: CardExtraInfo
      characterImage?: string
      selectedCard: any
    }[]
  }, [selectedCards, availableCards])

  // 相关 卡牌和 相关 卡牌 分类
  const { normalCards, derivedCards } = useMemo(() => {
    if (!data) return { normalCards: [], derivedCards: [] }

    const normal: typeof activeCards = []
    const derived: typeof activeCards = []

    activeCards.forEach((cardInfo) => {
      let isDerived = true

      // 卡牌 相关 卡牌相关 检查
      if (cardInfo.selectedCard.skillId) {
        // 所有 角色的 技能 相关 检查
        for (const charId in data.charSkillMap) {
          const charSkillMap = data.charSkillMap[charId]

          // 技能 角色的 默认 技能 列表相关 相关 相关 卡牌 相关
          if (charSkillMap.skills && charSkillMap.skills.includes(cardInfo.selectedCard.skillId)) {
            isDerived = false
            break
          }
        }
      } else {
        // skillId 相关 相关 卡牌相关 相关
        isDerived = false
      }

      if (isDerived) {
        derived.push(cardInfo)
      } else {
        normal.push(cardInfo)
      }
    })

    return { normalCards: normal, derivedCards: derived }
  }, [activeCards, data])

  // 状态效果(标签) 计算 - 相关 卡牌和 相关 卡牌相关 相关 标签 相关
  const statusEffects = useMemo(() => {
    // 标签 数据相关 颜色 映射 加载相关 相关 空 数组 返回
    if (Object.keys(tagData).length === 0 || Object.keys(tagColorMapping).length === 0) {
      return []
    }

    // 所有 标签 ID 颜色 相关 映射相关 对象 生成
    const tagToColorMap: Record<string, string> = {}

    // 颜色 相关 标签 ID 数组 相关 映射 生成
    Object.entries(tagColorMapping).forEach(([colorCode, tagIds]) => {
      tagIds.forEach((tagId) => {
        tagToColorMap[tagId.toString()] = colorCode
      })
    })

    // 相关 卡牌相关 相关 标签 ID 相关
    const normalTagIds = new Set<string>()

    // 相关 卡牌相关 相关 标签 ID 相关
    const derivedTagIds = new Set<string>()

    // 相关 卡牌相关 标签 相关
    normalCards.forEach(({ card }) => {
      if (card.tagList && Array.isArray(card.tagList)) {
        card.tagList.forEach((tagItem) => {
          if (tagItem && tagItem.tagId) {
            normalTagIds.add(tagItem.tagId.toString())
          }
        })
      }
    })

    // 相关 卡牌相关 标签 相关
    derivedCards.forEach(({ card }) => {
      if (card.tagList && Array.isArray(card.tagList)) {
        card.tagList.forEach((tagItem) => {
          if (tagItem && tagItem.tagId) {
            derivedTagIds.add(tagItem.tagId.toString())
          }
        })
      }
    })

    // 所有 标签 ID 相关
    const allTagIds = new Set([...normalTagIds, ...derivedTagIds])

    // 标签 ID 标签 信息相关 相关
    return Array.from(allTagIds)
      .map((tagId) => {
        const tag = tagData[tagId]
        if (!tag) return null

        // 颜色 映射相关 存在 标签仅 相关
        const colorCode = tagToColorMap[tagId]
        if (!colorCode) return null

        // 标签 来源 相关 (相关, 相关, 或 相关 相关)
        let source: "normal" | "derived" | "both" = "normal"
        if (normalTagIds.has(tagId) && derivedTagIds.has(tagId)) {
          source = "both"
        } else if (derivedTagIds.has(tagId)) {
          source = "derived"
        }

        // Get translated tag name and description
        const tagName = getTranslatedString(tag.tagName) || tag.tagName
        const tagDesc = getTranslatedString(tag.detail) || tag.detail || ""

        return {
          id: tagId,
          name: tagName,
          color: colorCode,
          description: tagDesc,
          source, // 标签 来源 添加
        }
      })
      .filter(Boolean)
  }, [normalCards, derivedCards, tagData, tagColorMapping, getTranslatedString])

  const handleEditCard = (cardId: string) => {
    setEditingCard(cardId)
  }

  const handleSaveCardSettings = (
    cardId: string,
    useType: number,
    useParam: number,
    useParamMap?: Record<string, number>,
  ) => {
    onUpdateCardSettings(cardId, useType, useParam, useParamMap)
  }

  const handleCloseModal = () => setEditingCard(null)

  const handleDragStart = (event: any) => {
    const { active } = event
    setActiveId(active.id)

    // 拖拽 相关 相关 滚动 防止
    document.body.style.overflow = "hidden"
    document.body.classList.add("dragging")

    // 技能 相关 拖拽 相关 类 添加
    if (skillContainerRef.current) {
      skillContainerRef.current.classList.add("dragging-container")
    }
  }

  const handleDragEnd = (event: any) => {
    const { active, over } = event

    // 拖拽 相关 相关 滚动 重新 相关
    document.body.style.overflow = ""
    document.body.classList.remove("dragging")

    // 技能 相关 拖拽 相关 类 移除
    if (skillContainerRef.current) {
      skillContainerRef.current.classList.remove("dragging-container")
    }

    setActiveId(null)

    if (!over || active.id === over.id) return

    const oldIndex = selectedCards.findIndex((card) => card.id === active.id)
    const newIndex = selectedCards.findIndex((card) => card.id === over.id)

    if (oldIndex !== -1 && newIndex !== -1) {
      onReorderCards(oldIndex, newIndex)
    }
  }

  // 当前 相关 相关 卡牌 信息 查找
  const editingCardInfo = editingCard ? availableCards.find((c) => c.card.id.toString() === editingCard) : null
  const editingCardSettings = editingCard ? selectedCards.find((c) => c.id === editingCard) : null

  // 当前 拖拽 相关 卡牌 信息 查找
  const activeCardInfo = activeId ? availableCards.find((c) => c.card.id.toString() === activeId) : null

  return (
    <div className="w-full">
      {/* 相关 相关 移除 - DeckBuilder相关 管理相关 变更 */}

      {/* 技能 相关 相关的 填充 相关 边距 相关 */}
      {/* neon-container 类 存在 div的 填充 修改相关 */}
      <div ref={skillContainerRef} className="neon-container p-0 min-h-[300px] overflow-hidden skill-container w-full">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <TabbedInterface
            tabs={[
              {
                id: "priority",
                label: getTranslatedString("skill_priority") || "Skill Priority",
                content: (
                  <SkillPriorityTab
                    selectedCards={selectedCards}
                    availableCards={availableCards}
                    onRemoveCard={onRemoveCard}
                    onReorderCards={onReorderCards}
                    getTranslatedString={getTranslatedString}
                    onEditCard={handleEditCard}
                    activeId={activeId}
                    activeCardInfo={activeCardInfo}
                    statusEffects={statusEffects}
                    includeDerivedCards={includeDerivedCards}
                    data={data}
                  />
                ),
              },
              {
                id: "stats",
                label: getTranslatedString("deck_stats") || "Deck Stats",
                content: (
                  <DeckStats
                    selectedCards={selectedCards}
                    availableCards={availableCards}
                    getTranslatedString={getTranslatedString}
                    data={data}
                    statusEffects={statusEffects}
                    includeDerivedCards={includeDerivedCards}
                    setIncludeDerivedCards={setIncludeDerivedCards}
                  />
                ),
              },
            ]}
            defaultTabId="priority"
          />
        </DndContext>
      </div>

      {editingCard && editingCardInfo && editingCardSettings && (
        <CardSettingsModal
          isOpen={true}
          onClose={handleCloseModal}
          card={editingCardInfo.card}
          extraInfo={editingCardInfo.extraInfo}
          initialUseType={editingCardSettings.useType}
          initialUseParam={editingCardSettings.useParam}
          initialUseParamMap={editingCardSettings.useParamMap}
          onSave={handleSaveCardSettings}
          getTranslatedString={getTranslatedString}
          characterImage={editingCardInfo.characterImage}
        />
      )}
    </div>
  )
}
