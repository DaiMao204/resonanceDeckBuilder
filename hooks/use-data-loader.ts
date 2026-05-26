"use client"

import { useEffect, useState } from "react"
import type { Database } from "../types"
import { dummyData } from "../dummy"

// Flag to control data source - 相关 数据 使用 相关
const USE_DUMMY = false

export function useDataLoader() {
  const [data, setData] = useState<Database | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    async function loadData() {
      try {
        if (USE_DUMMY) {
          setData(dummyData)
        } else {
          // 相关 路径 使用相关 数据 文件 加载
          const [
            charactersResponse,
            cardsResponse,
            skillsResponse,
            breakthroughsResponse,
            talentsResponse,
            imagesResponse,
            equipmentsResponse,
            homeSkillsResponse,
            charSkillMapResponse, // char_skill_map.json 添加
            itemSkillMapResponse, // item_skill_map.json 添加
          ] = await Promise.all([
            fetch("/api/db/char_db.json"),
            fetch("/api/db/card_db.json"),
            fetch("/api/db/skill_db.json"),
            fetch("/api/db/break_db.json"),
            fetch("/api/db/talent_db.json"),
            fetch("/api/db/img_db.json"),
            fetch("/api/db/equip_db.json"),
            fetch("/api/db/home_skill_db.json"),
            fetch("/api/db/char_skill_map.json"), // char_skill_map.json 添加
            fetch("/api/db/item_skill_map.json"), // item_skill_map.json 添加
          ])

          const [
            characters,
            cards,
            skills,
            breakthroughs,
            talents,
            images,
            equipments,
            homeSkills,
            charSkillMap,
            itemSkillMap,
          ] = await Promise.all([
            charactersResponse.json(),
            cardsResponse.json(),
            skillsResponse.json(),
            breakthroughsResponse.json(),
            talentsResponse.json(),
            imagesResponse.json(),
            equipmentsResponse.json(),
            homeSkillsResponse.json(),
            charSkillMapResponse.json(), // char_skill_map.json 添加
            itemSkillMapResponse.json(), // item_skill_map.json 添加
          ])

          // 当前 浏览器 语言 或 URL 路径相关 语言 相关 提取
          const currentLang = getCurrentLanguage()

          // 当前 语言仅 加载
          const languageResponse = await fetch(`/api/db/lang_${currentLang}.json`)
          const languageData = await languageResponse.json()

          // 语言 数据 相关 - 当前 语言仅 相关
          const languages: Record<string, any> = {}
          languages[currentLang] = languageData

          // 当前 语言 相关 提取相关 函数
          function getCurrentLanguage(): string {
            // 浏览器 相关 相关仅 相关
            if (typeof window !== "undefined") {
              // URL 路径相关 语言 相关 提取 尝试
              const pathParts = window.location.pathname.split("/")
              if (pathParts.length > 1) {
                const langFromPath = pathParts[1]
                if (["ko", "en", "jp", "cn", "tw"].includes(langFromPath)) {
                  return langFromPath
                }
              }

              // URL相关 语言 相关 相关 相关 浏览器 语言 设置 使用
              const browserLang = navigator.language.split("-")[0]
              if (["ko", "en", "jp", "cn", "tw"].includes(browserLang)) {
                return browserLang
              }
            }

            // 默认值 相关
            return "cn"
          }

          // Add image URLs to characters
          Object.keys(characters).forEach((charId) => {
            const charImgKey = `char_${charId}`
            if (images[charImgKey]) {
              characters[charId].img_card = images[charImgKey]
            }
          })

          // Process characters to add backward compatibility fields
          Object.keys(characters).forEach((charId) => {
            const char = characters[charId]

            // Map quality to rarity for backward compatibility
            const qualityToRarity: Record<string, string> = {
              oneStar: "N-",
              twoStar: "N",
              threeStar: "R",
              fourStar: "SR",
              FiveStar: "SSR",
              SixStar: "UR",
            }

            // Add rarity field for backward compatibility
            char.rarity = qualityToRarity[char.quality] || "N-"

            // Add desc field for backward compatibility
            char.desc = char.identity || `char_desc_${charId}`
          })

          // Process equipment types
          const equipmentTypes = {}

          // Add type to equipment based on equipTagId
          Object.keys(equipments).forEach((equipId) => {
            const equipment = equipments[equipId]
            const tagId = equipment.equipTagId
            if (equipmentTypes[tagId]) {
              equipment.type = equipmentTypes[tagId]
            }

            // 装备 类型 没有 相关 默认值 设置 添加
            if (!equipment.type) {
              // equipTagId相关 相关 类型 设置
              if (tagId >= 12600155 && tagId <= 12600160) {
                equipment.type = "weapon"
              } else if (tagId >= 12600161 && tagId <= 12600161) {
                equipment.type = "armor"
              } else if (tagId >= 12600162 && tagId <= 12600162) {
                equipment.type = "accessory"
              } else {
                // 默认值 weapon相关 设置
                equipment.type = "weapon"
              }
            }

            // Add image URL if available
            const equipImgKey = `equip_${equipId}`
            if (images[equipImgKey]) {
              equipment.url = images[equipImgKey]
            }

            // Ensure skillList is properly initialized if it exists
            if (equipment.skillList && Array.isArray(equipment.skillList)) {
              // skillList is already properly formatted, no need to modify
            } else if (equipment.skillList) {
              // If skillList exists but is not an array, convert it to proper format
              const skillListObj = equipment.skillList as unknown as Record<string, any>
              const skillListArray = Object.keys(skillListObj).map((key) => ({
                skillId: Number(skillListObj[key].skillId || key),
              }))
              equipment.skillList = skillListArray
            }
          })

          setData({
            characters,
            cards,
            skills,
            breakthroughs,
            talents,
            images,
            languages,
            equipments,
            equipmentTypes,
            homeSkills,
            charSkillMap, // char_skill_map 添加
            itemSkillMap, // item_skill_map 添加
          })
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)))
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  return { data, loading, error }
}
