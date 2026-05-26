"use client"

import { Plus, Info, Crown, Sword, Shield, Gem, Star } from "lucide-react"
import { useState, useRef, useEffect } from "react"
import type { Character, Card, Equipment } from "../types"
import { EquipmentSearchModal } from "./ui/modal/EquipmentSearchModal"
import { CharacterDetailsModal } from "./character-details-modal"
import { EquipmentDetailsModal } from "./equipment-details-modal"

interface CharacterSlotProps {
  index: number
  characterId: number
  onAddCharacter: () => void
  onRemoveCharacter: () => void
  character: Character | null
  getTranslatedString: (key: string) => string
  equipment: {
    weapon: string | null
    armor: string | null
    accessory: string | null
  }
  onEquipItem: (slotIndex: number, equipType: "weapon" | "armor" | "accessory", equipId: string | null) => void
  isLeader: boolean
  onSetLeader: () => void
  getCardInfo: (cardId: string) => { card: Card } | null
  getSkill?: (skillId: number) => any
  getEquipment: (equipId: string) => Equipment | null
  equipments?: Equipment[]
  data: any
  hasAnyCharacter: boolean
  awakeningStage?: number | null // 觉醒 相关 添加
  onAwakeningSelect?: (characterId: number, stage: number | null) => void // 觉醒 选择 回调 添加
}

export function CharacterSlot({
  index,
  characterId,
  onAddCharacter,
  onRemoveCharacter,
  character,
  getTranslatedString,
  equipment,
  onEquipItem,
  isLeader,
  onSetLeader,
  getCardInfo,
  getSkill,
  getEquipment,
  equipments = [],
  data,
  hasAnyCharacter,
  awakeningStage = null,
  onAwakeningSelect,
}: CharacterSlotProps) {
  const isEmpty = characterId === -1
  const [showEquipmentSelector, setShowEquipmentSelector] = useState<"weapon" | "armor" | "accessory" | null>(null)
  const [showCharacterDetails, setShowCharacterDetails] = useState(false)
  const [showEquipmentDetails, setShowEquipmentDetails] = useState<string | null>(null)
  const characterSlotRef = useRef<HTMLDivElement>(null)
  const [slotWidth, setSlotWidth] = useState(0)

  // 角色 相关的 宽度 相关 按钮 大小 相关 相关
  useEffect(() => {
    const updateSlotWidth = () => {
      if (characterSlotRef.current) {
        setSlotWidth(characterSlotRef.current.offsetWidth)
      }
    }

    // 相关 加载 相关 以及 相关 大小 变更 相关 宽度 更新
    updateSlotWidth()
    window.addEventListener("resize", updateSlotWidth)

    return () => {
      window.removeEventListener("resize", updateSlotWidth)
    }
  }, [])

  const handleEquipmentClick = (type: "weapon" | "armor" | "accessory") => {
    if (isEmpty) return
    setShowEquipmentSelector(type)
  }

  const handleEquipItem = (equipId: string | null) => {
    if (showEquipmentSelector && !isEmpty) {
      onEquipItem(index, showEquipmentSelector, equipId)
      setShowEquipmentSelector(null)
    }
  }

  // 角色 相关 信息 弹窗 打开
  const handleOpenCharacterDetails = () => {
    if (isEmpty) return
    setShowCharacterDetails(true)
  }

  // 觉醒 选择 处理函数
  const handleAwakeningSelect = (stage: number | null) => {
    if (onAwakeningSelect && !isEmpty) {
      onAwakeningSelect(characterId, stage)
    }
  }

  // Function to get rarity badge color
  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case "UR":
        return "bg-gradient-to-r from-orange-500 to-amber-500"
      case "SSR":
        return "bg-gradient-to-r from-yellow-500 to-amber-500"
      case "SR":
        return "bg-gradient-to-r from-purple-500 to-indigo-500"
      case "R":
        return "bg-gradient-to-r from-blue-500 to-cyan-500"
      default:
        return "bg-gray-500"
    }
  }

  // Function to get equipment quality background color
  const getEquipmentQualityBgColor = (quality: string) => {
    switch (quality) {
      case "Orange":
        return "bg-gradient-to-br from-orange-500 to-red-500"
      case "Golden":
        return "bg-gradient-to-br from-yellow-500 to-amber-500"
      case "Purple":
        return "bg-gradient-to-br from-purple-500 to-indigo-500"
      case "Blue":
        return "bg-gradient-to-br from-blue-500 to-cyan-500"
      case "Green":
        return "bg-gradient-to-br from-green-500 to-emerald-500"
      default:
        return "bg-gradient-to-br from-gray-400 to-gray-500"
    }
  }

  // Get equipment details
  const weaponEquipment = equipment.weapon ? getEquipment(equipment.weapon) : null
  const armorEquipment = equipment.armor ? getEquipment(equipment.armor) : null
  const accessoryEquipment = equipment.accessory ? getEquipment(equipment.accessory) : null

  // 角色 相关 相关 边框 颜色 以及 阴影 效果 直接 设置
  const getRarityBorderStyle = (rarity: string) => {
    switch (rarity) {
      case "UR":
        return {
          borderColor: "#f97316", // orange-500
          boxShadow: "0 0 10px rgba(249, 115, 22, 0.7), 0 0 15px rgba(249, 115, 22, 0.4)",
        }
      case "SSR":
        return {
          borderColor: "#eab308", // yellow-500
          boxShadow: "0 0 10px rgba(234, 179, 8, 0.7), 0 0 15px rgba(234, 179, 8, 0.4)",
        }
      case "SR":
        return {
          borderColor: "#a855f7", // purple-500
          boxShadow: "0 0 10px rgba(168, 85, 247, 0.7), 0 0 15px rgba(168, 85, 247, 0.4)",
        }
      case "R":
        return {
          borderColor: "#3b82f6", // blue-500
          boxShadow: "0 0 10px rgba(59, 130, 246, 0.7), 0 0 15px rgba(59, 130, 246, 0.4)",
        }
      default:
        return {
          borderColor: "rgba(255, 255, 255, 0.5)",
          boxShadow: "0 0 5px rgba(255, 255, 255, 0.3)",
        }
    }
  }

  // 角色 相关 相关 - 直接 相关 相关 应用
  const characterSlotStyle =
    !isEmpty && character
      ? {
          border: "2px solid",
          ...getRarityBorderStyle(character.rarity),
        }
      : {}

  // 按钮 大小 计算 - 相关 宽度的 25%
  const buttonSize = Math.max(slotWidth * 0.25, 20) // 相关 20px 保证

  // 相关 图标 大小 计算 - 相关 宽度的 33%
  const crownSize = Math.max(slotWidth * 0.33, 24) // 相关 24px 保证

  // 1. 相关 装备 相关 类 仅相关 相关使用相关.
  const getEquipmentSlotClass = (equipment: any) => `
  w-full aspect-square rounded-lg overflow-hidden cursor-pointer relative flex items-center justify-center
  ${isEmpty ? "opacity-50 pointer-events-none" : ""}
  ${!equipment ? "equipment-slot-empty neon-border" : getEquipmentQualityBgColor(equipment.quality)}
`

  return (
    <div className="flex flex-col relative" ref={characterSlotRef}>
      {/* Character Card - 相关 相关 大小相关 显示相关 修改 */}
      <div
        className={`
          relative w-full aspect-[3/4] rounded-xl sm:rounded-2xl lg:rounded-3xl overflow-hidden
          ${
            isEmpty
              ? "flex items-center justify-center cursor-pointer border border-[hsla(var(--neon-white),0.3)] bg-black bg-opacity-70 hover:bg-white hover:bg-opacity-10"
              : "cursor-pointer character-slot-filled hover:bg-white hover:bg-opacity-10"
          }
          transition-all duration-200
        `}
        onClick={onAddCharacter}
        style={characterSlotStyle}
      >
        {isEmpty ? (
          <Plus className="w-6 h-6 sm:w-8 sm:h-8 text-[hsl(var(--neon-white))]" />
        ) : character ? (
          <div className="w-full h-full relative">
            {/* Character background image - now fully opaque */}
            <div className="absolute inset-0 w-full h-full">
              {character.img_card && (
                <img
                  src={character.img_card || "/placeholder.svg"}
                  alt={getTranslatedString(character.name)}
                  className="w-full h-full object-cover"
                />
              )}
            </div>

            {/* Overlay - reduced opacity for better visibility */}
            <div className="absolute inset-0 bg-black bg-opacity-20"></div>

            {/* Content */}
            <div className="relative z-10 p-1 lg:p-3 flex flex-col h-full">
              {/* Character action buttons - 相关 位置 */}
              <div className="flex justify-between w-full">
                {/* 队长 相关 按钮 或 队长 相关 相关 - 相关 相关 */}
                <div
                  style={{
                    width: `${buttonSize}px`,
                    height: `${buttonSize}px`,
                    minWidth: `${buttonSize}px`,
                    minHeight: `${buttonSize}px`,
                  }}
                >
                  {!isEmpty &&
                    (isLeader ? (
                      <div
                        className="bg-red-600 rounded-full flex items-center justify-center transition-all duration-300"
                        style={{
                          width: `${buttonSize}px`,
                          height: `${buttonSize}px`,
                          minWidth: `${buttonSize}px`,
                          minHeight: `${buttonSize}px`,
                          border: "1px solid #f59e0b",
                          boxShadow: "0 0 8px rgba(245, 158, 11, 0.6)",
                        }}
                      >
                        <Crown className="w-3/4 h-3/4 text-yellow-300" />
                      </div>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onSetLeader()
                        }}
                        aria-label={getTranslatedString("set_as_leader") || "Set as leader"}
                        className="rounded-lg lg:rounded-xl character-action-btn hover:bg-black hover:bg-opacity-80 transition-all duration-300"
                        style={{
                          width: `${buttonSize}px`,
                          height: `${buttonSize}px`,
                          minWidth: `${buttonSize}px`,
                          minHeight: `${buttonSize}px`,
                        }}
                      >
                        <Crown className="w-3/4 h-3/4" />
                      </button>
                    ))}
                </div>

                {/* 信息 按钮 - 相关 相关 */}
                {!isEmpty && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowCharacterDetails(true)
                    }}
                    aria-label={getTranslatedString("character.details") || "Character details"}
                    className="rounded-lg lg:rounded-xl character-action-btn"
                    style={{
                      width: `${buttonSize}px`,
                      height: `${buttonSize}px`,
                      minWidth: `${buttonSize}px`,
                      minHeight: `${buttonSize}px`,
                    }}
                  >
                    <Info className="w-3/4 h-3/4" />
                  </button>
                )}
              </div>
              <div className="mt-auto flex flex-col">
                {/* 觉醒 相关 显示 - 名称 相关 相关 排序相关 显示, 相关 相关 */}
                {!isEmpty && (
                  <div className="w-max mb-1 inline-block px-0">
                    <div className="bg-purple-600 rounded-full px-1 py-0.5 lg:px-2 lg:py-1 shadow-lg flex items-center justify-center">
                      <Star className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-300" />
                      <span className="text-white text-xs sm:text-sm font-bold ml-0.5 sm:ml-1">
                        {awakeningStage !== null ? awakeningStage : 0}
                      </span>
                    </div>
                  </div>
                )}

                {/* 名称 相关 相关, 觉醒 显示和 相关 相关 填充 添加 */}

                <h3 className="w-max mb-0 rounded-full inline-block bg-gray-800 bg-opacity-60 text-xs sm:text-lg lg:text-xl xl:text-2xl font-semibold text-white neon-text truncate px-1 pb-0">
                  {getTranslatedString(character.name)}
                </h3>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* Equipment Slots - 相关 相关 大小相关 显示相关 修改 */}
      <div className="mt-1 sm:mt-2 grid grid-cols-3 gap-0.5 sm:gap-1">
        {/* Weapon Slot - Sword 图标 使用 */}
        <div className={getEquipmentSlotClass(weaponEquipment)} onClick={() => handleEquipmentClick("weapon")}>
          {!weaponEquipment ? (
            <Sword className="w-5 h-5 sm:w-6 sm:h-6 text-[hsl(var(--neon-white))]" />
          ) : (
            <div className="w-full h-full relative">
              {weaponEquipment.url ? (
                <img
                  src={weaponEquipment.url || "/placeholder.svg"}
                  alt={getTranslatedString(weaponEquipment.name)}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = "none"
                    e.currentTarget.parentElement?.classList.add("flex", "items-center", "justify-center")
                    const textElement = document.createElement("span")
                    textElement.className = "text-[0.6rem] sm:text-xs text-center"
                    textElement.textContent = getTranslatedString(weaponEquipment.name).substring(0, 2)
                    e.currentTarget.parentElement?.appendChild(textElement)
                  }}
                />
              ) : (
                <div className="flex items-center justify-center h-full w-full">
                  <span className="text-[0.6rem] sm:text-xs text-center">
                    {getTranslatedString(weaponEquipment.name).substring(0, 2)}
                  </span>
                </div>
              )}

              {/* 装备 名称 - 相关 相关 相关 显示 (相关 隐藏) */}
              <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 px-1 py-0.5 text-[0.5rem] sm:text-sm text-center truncate neon-text hidden xl:block">
                {getTranslatedString(weaponEquipment.name)}
              </div>

              {/* 装备 信息 按钮 - 相关 相关 相关 相关 显示 */}
              <button
                className="equipment-info-btn hidden lg:flex"
                onClick={(e) => {
                  e.stopPropagation()
                  setShowEquipmentDetails(equipment.weapon)
                }}
              >
                <Info className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Armor Slot - Shield 图标 使用 */}
        <div className={getEquipmentSlotClass(armorEquipment)} onClick={() => handleEquipmentClick("armor")}>
          {!armorEquipment ? (
            <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-[hsl(var(--neon-white))]" />
          ) : (
            <div className="w-full h-full relative">
              {armorEquipment.url ? (
                <img
                  src={armorEquipment.url || "/placeholder.svg"}
                  alt={getTranslatedString(armorEquipment.name)}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = "none"
                    e.currentTarget.parentElement?.classList.add("flex", "items-center", "justify-center")
                    const textElement = document.createElement("span")
                    textElement.className = "text-[0.6rem] sm:text-xs text-center"
                    textElement.textContent = getTranslatedString(armorEquipment.name).substring(0, 2)
                    e.currentTarget.parentElement?.appendChild(textElement)
                  }}
                />
              ) : (
                <div className="flex items-center justify-center h-full w-full">
                  <span className="text-[0.6rem] sm:text-xs text-center">
                    {getTranslatedString(armorEquipment.name).substring(0, 2)}
                  </span>
                </div>
              )}

              {/* 装备 名称 - 相关 相关 相关 显示 (相关 隐藏) */}
              <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 px-1 py-0.5 text-[0.5rem] sm:text-sm text-center truncate neon-text hidden xl:block">
                {getTranslatedString(armorEquipment.name)}
              </div>

              {/* 装备 信息 按钮 - 相关 相关 相关 相关 显示 */}
              <button
                className="equipment-info-btn hidden lg:flex"
                onClick={(e) => {
                  e.stopPropagation()
                  setShowEquipmentDetails(equipment.armor)
                }}
              >
                <Info className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Accessory Slot - Gem 图标 使用 */}
        <div className={getEquipmentSlotClass(accessoryEquipment)} onClick={() => handleEquipmentClick("accessory")}>
          {!accessoryEquipment ? (
            <Gem className="w-5 h-5 sm:w-6 sm:h-6 text-[hsl(var(--neon-white))]" />
          ) : (
            <div className="w-full h-full relative">
              {accessoryEquipment.url ? (
                <img
                  src={accessoryEquipment.url || "/placeholder.svg"}
                  alt={getTranslatedString(accessoryEquipment.name)}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = "none"
                    e.currentTarget.parentElement?.classList.add("flex", "items-center", "justify-center")
                    const textElement = document.createElement("span")
                    textElement.className = "text-[0.6rem] sm:text-xs text-center"
                    textElement.textContent = getTranslatedString(accessoryEquipment.name).substring(0, 2)
                    e.currentTarget.parentElement?.appendChild(textElement)
                  }}
                />
              ) : (
                <div className="flex items-center justify-center h-full w-full">
                  <span className="text-[0.6rem] sm:text-xs text-center">
                    {getTranslatedString(accessoryEquipment.name).substring(0, 2)}
                  </span>
                </div>
              )}

              {/* 装备 名称 - 相关 相关 相关 显示 (相关 隐藏) */}
              <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 px-1 py-0.5 text-[0.5rem] sm:text-sm text-center truncate neon-text hidden xl:block">
                {getTranslatedString(accessoryEquipment.name)}
              </div>

              {/* 装备 信息 按钮 - 相关 相关 相关 相关 显示 */}
              <button
                className="equipment-info-btn hidden lg:flex"
                onClick={(e) => {
                  e.stopPropagation()
                  setShowEquipmentDetails(equipment.accessory)
                }}
              >
                <Info className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {showEquipmentSelector && (
        <EquipmentSearchModal
          isOpen={true}
          onClose={() => setShowEquipmentSelector(null)}
          title={
            <h3 className="text-lg font-bold neon-text">
              {getTranslatedString(`select_${showEquipmentSelector}`) ||
                `Select ${showEquipmentSelector.charAt(0).toUpperCase() + showEquipmentSelector.slice(1)}`}
            </h3>
          }
          equipments={
            data.equipments
              ? Object.values(data.equipments).filter((equip: Equipment) => equip.type === showEquipmentSelector)
              : []
          }
          onSelectEquipment={handleEquipItem}
          getTranslatedString={getTranslatedString}
          type={showEquipmentSelector}
          maxWidth="max-w-3xl"
          footer={
            <div className="flex justify-end">
              <button
                onClick={() => setShowEquipmentSelector(null)}
                className="neon-button px-4 py-2 rounded-lg text-sm"
              >
                {getTranslatedString("close")}
              </button>
            </div>
          }
          getSkill={getSkill}
        />
      )}

      {/* 角色 相关 信息 弹窗 */}
      {showCharacterDetails && character && (
        <CharacterDetailsModal
          isOpen={showCharacterDetails}
          onClose={() => setShowCharacterDetails(false)}
          character={character}
          getTranslatedString={getTranslatedString}
          getCardInfo={getCardInfo}
          getSkill={getSkill}
          data={data}
          selectedAwakeningStage={awakeningStage}
          onAwakeningSelect={handleAwakeningSelect}
        />
      )}

      {/* 装备 相关 信息 弹窗 */}
      {showEquipmentDetails && (
        <EquipmentDetailsModal
          isOpen={!!showEquipmentDetails}
          onClose={() => setShowEquipmentDetails(null)}
          equipment={getEquipment(showEquipmentDetails)!}
          getTranslatedString={getTranslatedString}
          getSkill={getSkill}
        />
      )}
    </div>
  )
}
