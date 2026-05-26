"use client"

import { useState, useRef } from "react"
import type { Character, Card, Equipment } from "../types"
import { CharacterSlot } from "./character-slot"
import { CharacterSearchModal } from "./ui/modal/CharacterSearchModal"

interface CharacterWindowProps {
  selectedCharacters: number[]
  leaderCharacter: number
  onAddCharacter: (characterId: number, slot: number) => void
  onRemoveCharacter: (slot: number) => void
  onSetLeader: (characterId: number) => void
  getCharacter: (id: number) => Character | null
  getTranslatedString: (key: string) => string
  availableCharacters: Character[]
  equipment: Array<{
    weapon: string | null
    armor: string | null
    accessory: string | null
  }>
  onEquipItem: (slotIndex: number, equipType: "weapon" | "armor" | "accessory", equipId: string | null) => void
  getCardInfo: (cardId: string) => { card: Card } | null
  getEquipment: (equipId: string) => Equipment | null
  equipments?: Equipment[]
  data: any
  getSkill?: (skillId: number) => any
  awakening?: Record<number, number> // 觉醒 信息 添加
  onAwakeningSelect?: (characterId: number, stage: number | null) => void // 觉醒 选择 回调 添加
}

export function CharacterWindow({
  selectedCharacters,
  leaderCharacter,
  onAddCharacter,
  onRemoveCharacter,
  onSetLeader,
  getCharacter,
  getTranslatedString,
  availableCharacters,
  equipment,
  onEquipItem,
  getCardInfo,
  getEquipment,
  equipments = [],
  data,
  getSkill,
  awakening = {},
  onAwakeningSelect,
}: CharacterWindowProps) {
  const [showSelector, setShowSelector] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<number>(-1)
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState<"name" | "rarity">("rarity")
  const [sortDirection, setSortDirection] = useState<"desc" | "asc">("desc")
  const modalRef = useRef<HTMLDivElement>(null)
  const [slotHasExistingCharacter, setSlotHasExistingCharacter] = useState(false)

  const handleOpenSelector = (slot: number) => {
    // 相关 相关 角色 存在相关 检查
    const hasExistingCharacter = selectedCharacters[slot] !== -1
    setSlotHasExistingCharacter(hasExistingCharacter)

    // 相关 信息 保存 以及 相关 !== -1
    setSlotHasExistingCharacter(hasExistingCharacter)

    // 相关 信息 保存 以及 搜索 弹窗 打开
    setSelectedSlot(slot)
    setSearchTerm("")
    setShowSelector(true)
  }

  // 角色 选择 弹窗相关 -1(相关) 选择相关 相关 处理相关 相关 添加
  const handleCharacterSelect = (characterId: number) => {
    if (selectedSlot !== -1) {
      // 相关 相关 角色 相关 相关 移除
      if (slotHasExistingCharacter) {
        onRemoveCharacter(selectedSlot)
      }

      // 相关 角色 添加 (characterId -1相关 相关 置空)
      if (characterId !== -1) {
        onAddCharacter(characterId, selectedSlot)
      }

      setShowSelector(false)
      setSelectedSlot(-1)
      setSlotHasExistingCharacter(false)
    }
  }

  // Filter out already selected characters to prevent duplicates
  const availableForSelection = availableCharacters.filter((character) => !selectedCharacters.includes(character.id))

  // Filter by search term
  const filteredCharacters = availableForSelection.filter((character) =>
    getTranslatedString(character.name).toLowerCase().includes(searchTerm.toLowerCase()),
  )

  // Update the sort function to respect direction
  const sortedCharacters = [...filteredCharacters].sort((a, b) => {
    let result = 0

    if (sortBy === "name") {
      result = getTranslatedString(a.name).localeCompare(getTranslatedString(b.name))
    } else {
      // Sort by rarity (UR > SSR > SR > R)
      const rarityOrder = { UR: 4, SSR: 3, SR: 2, R: 1 }
      result =
        (rarityOrder[b.rarity as keyof typeof rarityOrder] || 0) -
        (rarityOrder[a.rarity as keyof typeof rarityOrder] || 0)
    }

    // Apply sort direction
    return sortDirection === "asc" ? -result : result
  })

  // Check if any character slot is filled
  const hasAnyCharacter = selectedCharacters.some((id) => id !== -1)

  return (
    <div className="w-full">
      {/* 始终 5相关的 角色 相关 相关 相关 显示相关 修改 */}
      <div className="grid grid-cols-5 gap-1 sm:gap-2 md:gap-4">
        {selectedCharacters.map((characterId, index) => (
          <CharacterSlot
            key={index}
            index={index}
            characterId={characterId}
            onAddCharacter={() => handleOpenSelector(index)}
            onRemoveCharacter={() => onRemoveCharacter(index)}
            character={getCharacter(characterId)}
            getTranslatedString={getTranslatedString}
            equipment={equipment[index]}
            onEquipItem={onEquipItem}
            isLeader={characterId === leaderCharacter}
            onSetLeader={() => onSetLeader(characterId)}
            getCardInfo={getCardInfo}
            getEquipment={getEquipment}
            equipments={equipments}
            data={data}
            getSkill={getSkill}
            hasAnyCharacter={hasAnyCharacter}
            awakeningStage={characterId !== -1 ? awakening[characterId] || null : null}
            onAwakeningSelect={onAwakeningSelect}
          />
        ))}
      </div>

      {/* 新的 角色 搜索 弹窗 组件 使用 */}
      <CharacterSearchModal
        isOpen={showSelector}
        onClose={() => {
          setShowSelector(false)
          setSelectedSlot(-1)
          setSlotHasExistingCharacter(false)
        }}
        title={
          <h3 className="text-lg font-bold neon-text">
            {getTranslatedString("select_character") || "Select Character"}
          </h3>
        }
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        sortBy={sortBy}
        onSortByChange={(value) => setSortBy(value as "name" | "rarity")}
        sortDirection={sortDirection}
        onSortDirectionChange={() => setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"))}
        sortOptions={[
          { value: "rarity", label: getTranslatedString("sort_by_rarity") || "Sort by Rarity" },
          { value: "name", label: getTranslatedString("sort_by_name") || "Sort by Name" },
        ]}
        searchPlaceholder={getTranslatedString("search_characters") || "Search characters"}
        characters={sortedCharacters}
        onSelectCharacter={handleCharacterSelect}
        getTranslatedString={getTranslatedString}
        getCardInfo={getCardInfo}
        getSkill={getSkill}
        data={data}
        maxWidth="max-w-3xl"
        footer={
          <div className="flex justify-end">
            <button
              onClick={() => {
                setShowSelector(false)
                setSelectedSlot(-1)
                setSlotHasExistingCharacter(false)
              }}
              className="neon-button px-4 py-2 rounded-lg text-sm"
            >
              {getTranslatedString("close") || "Close"}
            </button>
          </div>
        }
      />
    </div>
  )
}
