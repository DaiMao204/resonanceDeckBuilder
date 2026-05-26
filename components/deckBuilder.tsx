"use client"

import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { useSearchParams } from "next/navigation"
import { TopBar } from "./top-bar"
import { CharacterWindow } from "./character-window"
import { SkillWindow } from "./skill-window"
import { BattleSettings } from "./battle-settings"
import { CommentsSection } from "./comments-section"
import { useToast } from "./toast-notification"
import { useDeckBuilder } from "../hooks/deck-builder/index"
import { useLanguage } from "../contexts/language-context"
import { decodePresetFromUrlParam } from "../utils/presetCodec"
import { loadDeckPresetFromShortlink } from "../utils/deck-shortlink"
import { logEventWrapper } from "../lib/firebase-config"
import { SaveDeckModal } from "./ui/modal/SaveDeckModal" // 添加
import { LoadDeckModal } from "./ui/modal/LoadDeckModal" // 添加
import { getCurrentDeckId, setCurrentDeckId, removeCurrentDeckId, type SavedDeck } from "../utils/local-storage" // 添加

interface DeckBuilderProps {
  urlDeckCode: string | null
  urlDeckShortCode: string | null
  data: import("../types").Database | null
}

interface CardExtraInfo {
  name: string
  desc: string
  cost: number
  amount: number
  img_url: string | undefined
}

export default function DeckBuilder({ urlDeckCode, urlDeckShortCode, data }: DeckBuilderProps) {
  const { getTranslatedString, currentLanguage } = useLanguage()
  const searchParams = useSearchParams()
  const { showToast, ToastContainer } = useToast()
  const contentRef = useRef<HTMLDivElement>(null) // 截图相关 相关 引用 添加

  const [initialLoadComplete, setInitialLoadComplete] = useState(false)

  // 保存/加载 弹窗 状态 添加
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [showLoadModal, setShowLoadModal] = useState(false)

  // useDeckBuilder 相关 使用 - 实际 data 对象 传递
  const {
    selectedCharacters,
    leaderCharacter,
    selectedCards,
    battleSettings,
    equipment,
    awakening, // 觉醒 信息 添加
    availableCards: availableCardsFromHook,
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
    clearAll,
    exportPreset,
    importPresetObject,
    createShareableUrl,
    decodePresetString,
    importPreset,
    createPresetObject, // 添加: 预设 对象 生成 函数
    setSelectedCharacters,
    setLeaderCharacter,
  } = useDeckBuilder(data)

  // URL 相关 卡组 预设 相关 相关 ownerId char_db相关 搜索相关 卡牌相关 角色 相关 显示 相关 相关

  // findCharacterImageForCard 函数 修改相关 相关 相关 仅相关
  const findCharacterImageForCard = useCallback(
    (card: any) => {
      if (!data || !card) {
        return "images/placeHolder Card.jpg" // 默认 图片 路径
      }

      // 卡牌相关 ownerId 相关 有效相关 检查
      if (card.ownerId && card.ownerId !== -1) {
        // 1. 图片 数据相关 char_{ownerId} 键相关 直接 查找
        if (data.images && data.images[`char_${card.ownerId}`]) {
          return data.images[`char_${card.ownerId}`]
        }

        // 2. 角色 对象相关 img_card 相关 查找
        const character = data.characters[card.ownerId.toString()]
        if (character && character.img_card) {
          return character.img_card
        }
      }

      // ownerId 相关 图片 相关 相关 相关 默认 图片 返回
      return "images/placeHolder Card.jpg"
    },
    [data],
  )

  // 处理 URL 中的分享参数：优先读取短码，旧 code 长链接继续兼容。
  useEffect(() => {
    // 已经完成初始导入后不再重复导入，避免覆盖用户后续编辑。
    if (initialLoadComplete || !data) return

    const loadFromUrl = async () => {
      if (urlDeckShortCode || urlDeckCode) {
        try {
          const preset = urlDeckShortCode
            ? await loadDeckPresetFromShortlink(urlDeckShortCode)
            : decodePresetFromUrlParam(urlDeckCode)

          if (preset) {
            const result = importPresetObject(preset, true) // 标记为 URL 导入，沿用原有导入兼容逻辑
            if (result.success) {
              showToast(getTranslatedString(result.message), "success")

              // 从分享链接导入后，不再关联本地正在编辑的旧存档。
              removeCurrentDeckId()

              // 记录分享链接导入事件，区分短链和旧长链。
              logEventWrapper("deck_shared_visit", {
                deck_code: urlDeckShortCode || urlDeckCode,
                deck_code_type: urlDeckShortCode ? "short" : "long",
                language: currentLanguage,
              })
            }
          }
        } catch (error) {
          console.error("Error decoding URL preset:", error)
        }
      } else {
        // 没有分享参数时，保留未来恢复本地编辑草稿的入口。
        const currentDeckId = getCurrentDeckId()
        if (currentDeckId) {
          // 如果存在正在编辑的本地卡组，后续可以在这里接自动恢复或弹窗询问。
        }
      }

      setInitialLoadComplete(true)
    }

    void loadFromUrl()
  }, [
    data,
    urlDeckCode,
    urlDeckShortCode,
    importPresetObject,
    showToast,
    getTranslatedString,
    currentLanguage,
    initialLoadComplete,
  ])

  // 技能 说明相关 #r 标签 实际 值相关 相关 函数
  const processSkillDescription = useCallback(
    (skill: any, description: string) => {
      if (!skill || !description) return description

      // 相关 说明 读取
      const translatedDesc = getTranslatedString(description)

      // Check if desParamList exists and has items
      if (skill.desParamList && skill.desParamList.length > 0) {
        // 所有 #r 标签 相关 数组相关 保存
        const rTags = translatedDesc.match(/#r/g) || []

        // #r 标签 相关 相关 返回
        if (rTags.length === 0) return translatedDesc

        let processedDesc = translatedDesc
        let rTagIndex = 0

        // desParamList的 相关 相关 相关 #r 标签 相关 相关
        for (let i = 0; i < skill.desParamList.length && rTagIndex < rTags.length; i++) {
          const param = skill.desParamList[i]
          const paramValue = param.param

          // Check if skillParamList exists
          if (skill.skillParamList && skill.skillParamList[0]) {
            // Find the skillRate key based on param value
            const rateKey = `skillRate${paramValue}_SN`
            if (skill.skillParamList[0][rateKey] !== undefined) {
              // Calculate the rate value (divide by 10000)
              let rateValue = Math.floor(skill.skillParamList[0][rateKey] / 10000)

              // Add % if isPercent is true
              if (param.isPercent) {
                rateValue = `${skill.skillParamList[0][rateKey] / 100}%`
              }

              // Replace only the first occurrence of #r
              processedDesc = processedDesc.replace(/#r/, rateValue.toString())
              rTagIndex++
            }
          }
        }

        return processedDesc
      }

      return translatedDesc
    },
    [getTranslatedString],
  )

  // availableCards 相关 extraInfo 对象 生成 相关 name 处理 修改
  // 技能 卡牌 信息 生成 相关 修改
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
        const selectedCard = selectedCards.find((sc) => sc.id === id)

        // 角色 图片 相关 - 相关 相关 相关 使用
        // 选择相关 卡牌 相关 相关 卡牌 对象 使用, 相关 默认 卡牌 对象 使用
        const cardForImage = selectedCard || card
        const characterImage = findCharacterImageForCard(cardForImage)

        return { card, cardForImage, extraInfo, characterImage }
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

  // 相关 读取
  const handleImport = useCallback(async () => {
    try {
      const result = await importPreset()
      showToast(getTranslatedString(result.message), result.success ? "success" : "error")

      // 相关 相关 相关 当前 相关 相关 卡组 ID 移除
      removeCurrentDeckId()

      // Firebase Analytics 相关 相关
      const characterIds = selectedCharacters.filter((id) => id !== -1)
      logEventWrapper("deck_imported", {
        character_ids: JSON.stringify(characterIds),
        language: currentLanguage,
      })
    } catch (error) {
      console.error("Import error:", error)
      showToast(getTranslatedString("import_failed"), "error")
    }
  }, [importPreset, showToast, getTranslatedString, selectedCharacters, currentLanguage])

  // 相关 导出
  const handleExport = useCallback(() => {
    try {
      const result = exportPreset()
      showToast(getTranslatedString(result.message), result.success ? "success" : "error")

      // Firebase Analytics 相关 相关
      const characterIds = selectedCharacters.filter((id) => id !== -1)
      logEventWrapper("deck_exported", {
        character_ids: JSON.stringify(characterIds),
        language: currentLanguage,
      })
    } catch (error) {
      console.error("Export error:", error)
      showToast(getTranslatedString("export_failed"), "error")
    }
  }, [exportPreset, showToast, getTranslatedString, selectedCharacters, currentLanguage])

  // 相关 相关 生成
  const handleShare = useCallback(async () => {
    try {
      const result = await createShareableUrl()
      if (result.success && result.url) {
        navigator.clipboard.writeText(result.url)
        showToast(getTranslatedString("share_link_copied_alert"), "success")

        // Firebase Analytics 相关 相关
        const characterIds = selectedCharacters.filter((id) => id !== -1)
        logEventWrapper("deck_shared", {
          character_ids: JSON.stringify(characterIds),
          language: currentLanguage,
        })
      } else {
        showToast(getTranslatedString("share_link_failed"), "error")
      }
    } catch (error) {
      console.error("Share error:", error)
      showToast(getTranslatedString("share_link_failed"), "error")
    }
  }, [createShareableUrl, showToast, getTranslatedString, selectedCharacters, currentLanguage])

  // 初始化
  const handleClear = useCallback(() => {
    clearAll()
    // 当前 相关 相关 卡组 ID 移除
    removeCurrentDeckId()
    showToast(getTranslatedString("deck_cleared"), "success")
  }, [clearAll, showToast, getTranslatedString])

  // 觉醒 相关 选择 处理函数
  const handleAwakeningSelect = useCallback(
    (characterId: number, stage: number | null) => {
      updateAwakening(characterId, stage)
    },
    [updateAwakening],
  )

  // 卡组 保存 弹窗 打开
  const handleOpenSaveModal = useCallback(() => {
    setShowSaveModal(true)
  }, [])

  // 卡组 加载 弹窗 打开
  const handleOpenLoadModal = useCallback(() => {
    setShowLoadModal(true)
  }, [])

  // 卡组 保存 相关 处理
  const handleSaveSuccess = useCallback(
    (deckId: string) => {
      showToast(getTranslatedString("deck_saved"), "success")
      // 当前 相关 相关 卡组 ID 设置
      setCurrentDeckId(deckId)

      // Firebase Analytics 相关 相关
      const characterIds = selectedCharacters.filter((id) => id !== -1)
      logEventWrapper("deck_saved", {
        character_ids: JSON.stringify(characterIds),
        language: currentLanguage,
      })
    },
    [showToast, getTranslatedString, selectedCharacters, currentLanguage],
  )

  // 卡组 加载 处理
  const handleLoadDeck = useCallback(
    (deck: SavedDeck) => {
      try {
        // 卡组 预设 加载
        const result = importPresetObject(deck.preset)
        if (result.success) {
          // 当前 相关 相关 卡组 ID 设置
          setCurrentDeckId(deck.id)
          showToast(getTranslatedString("deck_loaded") || "Deck loaded successfully!", "success")

          // Firebase Analytics 相关 相关
          const characterIds = selectedCharacters.filter((id) => id !== -1)
          logEventWrapper("deck_loaded", {
            character_ids: JSON.stringify(characterIds),
            language: currentLanguage,
          })
        } else {
          showToast(getTranslatedString("deck_load_error") || "Failed to load deck", "error")
        }
      } catch (error) {
        console.error("Error loading deck:", error)
        showToast(getTranslatedString("deck_load_error") || "Failed to load deck", "error")
      }
    },
    [importPresetObject, showToast, getTranslatedString, selectedCharacters, currentLanguage],
  )

  // 卡组 删除 处理
  const handleDeleteDeck = useCallback(
    (deckId: string) => {
      showToast(getTranslatedString("deck_deleted"), "success")

      // 当前 相关 相关 卡组 删除相关 卡组相关 当前 卡组 ID 移除
      if (getCurrentDeckId() === deckId) {
        removeCurrentDeckId()
      }
    },
    [showToast, getTranslatedString],
  )

  // 角色 名称 读取 函数
  const getCharacterName = useCallback(
    (characterId: number): string => {
      if (!data || characterId === -1) return ""

      const character = data.characters[characterId.toString()]
      if (!character) return ""

      return getTranslatedString(character.name)
    },
    [data, getTranslatedString],
  )

  // 保存相关 卡组 相关 处理函数 添加
  const handleShareSavedDeck = useCallback(
    async (deck: SavedDeck) => {
      try {
        // 卡组 预设相关 相关 URL 生成
        const result = await createShareableUrl(deck.preset)
        if (result.success && result.url) {
          navigator.clipboard.writeText(result.url)
          showToast(getTranslatedString("share_link_copied_alert"), "success")

          // Firebase Analytics 相关 相关
          const characterIds = deck.preset.roleList.filter((id) => id !== -1)
          logEventWrapper("deck_shared", {
            deck_name: deck.name,
            character_ids: JSON.stringify(characterIds),
            language: currentLanguage,
          })
        } else {
          showToast(getTranslatedString("share_link_failed"), "error")
        }
      } catch (error) {
        console.error("Share error:", error)
        showToast(getTranslatedString("share_link_failed"), "error")
      }
    },
    [createShareableUrl, showToast, getTranslatedString, currentLanguage],
  )

  // 角色 排序 函数 添加 - 始终 相关的相关 修改
  const handleSortCharacters = useCallback(() => {
    if (!data || !data.characters) return

    // 当前 选择相关 角色 相关 有效 角色仅 相关
    const validCharacters = selectedCharacters
      .filter((id) => id !== -1)
      .map((id) => {
        const character = data.characters[id.toString()]
        return {
          id,
          line: character?.line || 999, // 默认值 设置
          subLine: character?.subLine || 0, // 默认值 设置
        }
      })

    // line 相关 相关, line 相关 subLine 相关 相关 排序
    validCharacters.sort((a, b) => {
      if (a.line !== b.line) return a.line - b.line;      // line 相关
      return b.subLine - a.subLine;                       // subLine 相关
    })
    // 排序相关 角色和 空 相关(-1) 相关 相关 数组 生成
    const newSelectedCharacters = Array(5).fill(-1)

    // 排序相关 角色 相关 相关
    validCharacters.forEach((char, index) => {
      // 相关 相关 相关 相关 相关卡组相关 计算
      const slotIndex = 4 - index
      if (slotIndex >= 0) {
        newSelectedCharacters[slotIndex] = char.id
      }
    })

    // 角色 数组 更新
    setSelectedCharacters(newSelectedCharacters)

    // 队长 角色 相关 相关 以及 更新
    if (leaderCharacter !== -1 && !newSelectedCharacters.includes(leaderCharacter)) {
      // 队长 相关 相关 选择相关 角色相关 相关 第一个 有效 角色 队长相关 设置
      const firstValidChar = newSelectedCharacters.find((id) => id !== -1)
      if (firstValidChar !== undefined) {
        setLeaderCharacter(firstValidChar)
      } else {
        setLeaderCharacter(-1)
      }
    }

    // 排序 相关 相关
    showToast(getTranslatedString("characters_sorted") || "Characters sorted by position", "success")
  }, [
    data,
    selectedCharacters,
    leaderCharacter,
    setSelectedCharacters,
    setLeaderCharacter,
    showToast,
    getTranslatedString,
  ])

  // 相关 处理
  // 数据 没有 相关
  if (!data) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-yellow-500 p-4 max-w-md text-center">
          <h2 className="text-xl font-bold mb-2">{getTranslatedString("no_data") || "No Data Available"}</h2>
          <p>{getTranslatedString("data_not_loaded") || "Data could not be loaded. Please try again later."}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <ToastContainer />

      <TopBar
        onClear={handleClear}
        onImport={handleImport}
        onExport={handleExport}
        onShare={handleShare}
        onSave={handleOpenSaveModal}
        onLoad={handleOpenLoadModal}
        onSortCharacters={handleSortCharacters} // 排序 函数 传递
        contentRef={contentRef}
      />

      {/* 相关的 填充 相关 相关 相关 相关 相关 相关. */}
      <div className="container mx-auto px-0 sm:px-3 md:px-4 pt-40 md:pt-28 pb-8">
        {/* 截图相关 相关 */}
        <div ref={contentRef} className="capture-content">
          {/* 角色 相关 */}
          <CharacterWindow
            selectedCharacters={selectedCharacters}
            leaderCharacter={leaderCharacter}
            onAddCharacter={addCharacter}
            onRemoveCharacter={removeCharacter}
            onSetLeader={setLeader}
            getCharacter={getCharacter}
            getTranslatedString={getTranslatedString}
            availableCharacters={data && data.characters ? Object.values(data.characters) : []}
            equipment={equipment}
            onEquipItem={updateEquipment}
            getCardInfo={getCardInfo}
            getEquipment={getEquipment}
            equipments={allEquipments}
            data={data}
            getSkill={getSkill}
            awakening={awakening}
            onAwakeningSelect={handleAwakeningSelect}
          />

          {/* 技能 相关 */}
          <div className="mt-8">
            <h2 className="neon-section-title">{getTranslatedString("skill.section.title") || "Skills"}</h2>
            <SkillWindow
              selectedCards={selectedCards}
              availableCards={availableCards}
              onAddCard={addCard}
              onRemoveCard={removeCard}
              onReorderCards={reorderCards}
              onUpdateCardSettings={updateCardSettings}
              getTranslatedString={getTranslatedString}
              specialControls={{}}
              data={data}
            />
          </div>

          {/* 战斗 设置 - 截图 相关 相关 */}
          <BattleSettings
            settings={battleSettings}
            onUpdateSettings={updateBattleSettings}
            getTranslatedString={getTranslatedString}
          />
        </div>
      </div>

      <div className="mt-0 mb-0 text-center text-sm text-muted-foreground flex flex-wrap items-center justify-center gap-2">
        <span>
          {getTranslatedString("footer.project_copyright") || "Resonance Deck Builder © 2025"}{" "}
          {getTranslatedString("footer.original_author_label") || "Original author"}{" "}
          <a
            className="underline-offset-2 hover:underline"
            href="https://github.com/danij91/resonanceDeckBuilder"
            target="_blank"
            rel="noopener noreferrer"
          >
            Heeyong Chang
          </a>
        </span>
        <span className="hidden sm:inline">·</span>
        <span>
          {getTranslatedString("footer.current_maintainer_label") || "Currently maintained by"}{" "}
          <a
            className="underline-offset-2 hover:underline"
            href={
              currentLanguage === "cn"
                ? "https://space.bilibili.com/25653754?spm_id_from=555.117.0.0"
                : "https://github.com/DaiMao204/resonanceDeckBuilder"
            }
            target="_blank"
            rel="noopener noreferrer"
          >
            {getTranslatedString("footer.maintainer_name") || "DaiMao"}
          </a>
          {getTranslatedString("footer.current_maintainer_suffix") || ""}
        </span>
        <span className="hidden sm:inline">·</span>
        <a href="https://github.com/DaiMao204/resonanceDeckBuilder" target="_blank" rel="noopener noreferrer">
          <img className="w-6 h-6" src="images/github-mark-white2.svg" />
        </a>
        <span
          className="hidden sm:inline"
          style={{ display: currentLanguage === "cn" || currentLanguage === "tw" ? undefined : "none" }}
        >
          ·
        </span>
        <a
          className="underline-offset-2 hover:underline"
          style={{ display: currentLanguage === "cn" || currentLanguage === "tw" ? undefined : "none" }}
          href="https://soli-reso.com"
          target="_blank"
          rel="noopener noreferrer"
        >
          {getTranslatedString("footer.official_site") || "Resonance Official Site"}
        </a>
        <span
          className="hidden sm:inline"
          style={{ display: currentLanguage === "cn" || currentLanguage === "tw" ? undefined : "none" }}
        >
          ·
        </span>
        <a
          className="underline-offset-2 hover:underline"
          style={{ display: currentLanguage === "cn" || currentLanguage === "tw" ? undefined : "none" }}
          href="https://wiki.biligame.com/resonance"
          target="_blank"
          rel="noopener noreferrer"
        >
          {getTranslatedString("footer.wiki") || "Resonance Wiki"}
        </a>
        <span className="hidden sm:inline">·</span>
        <span className="hidden sm:inline">{getTranslatedString("footer.license") || "GPLv3"}</span>
      </div>
      {/* 相关 相关 */}
      <CommentsSection currentLanguage={currentLanguage} />

      {/* 卡组 保存 弹窗 */}
      <SaveDeckModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        preset={createPresetObject(true, true)} // 装备 信息和 觉醒 信息 相关
        getTranslatedString={getTranslatedString}
        onSaveSuccess={handleSaveSuccess}
        getCharacterName={getCharacterName}
      />

      {/* 卡组 加载 弹窗 */}
      <LoadDeckModal
        isOpen={showLoadModal}
        onClose={() => setShowLoadModal(false)}
        getTranslatedString={getTranslatedString}
        onLoadDeck={handleLoadDeck}
        onDeleteDeck={handleDeleteDeck}
        onShareDeck={handleShareSavedDeck} // 相关 相关 添加
      />
    </div>
  )
}
