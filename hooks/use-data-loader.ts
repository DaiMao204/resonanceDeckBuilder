"use client"

import { useEffect, useState } from "react"
import type { Database } from "../types"
import { dummyData } from "../dummy"

// Flag to control data source - 相关 数据 使用 相关
const USE_DUMMY = false
const SUPPORTED_LANGUAGES = ["ko", "en", "jp", "cn", "tw"]

function getCurrentLanguage(): string {
  if (typeof window !== "undefined") {
    const pathParts = window.location.pathname.split("/")
    if (pathParts.length > 1) {
      const langFromPath = pathParts[1]
      if (SUPPORTED_LANGUAGES.includes(langFromPath)) {
        return langFromPath
      }
    }

    const browserLang = navigator.language.split("-")[0]
    if (SUPPORTED_LANGUAGES.includes(browserLang)) {
      return browserLang
    }
  }

  return "cn"
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to load ${url}: ${response.status}`)
  }

  return response.json()
}

async function loadSplitDatabase(currentLang: string): Promise<Database> {
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
    languageData,
  ] = await Promise.all([
    fetchJson<Database["characters"]>("/db/char_db.json"),
    fetchJson<Database["cards"]>("/db/card_db.json"),
    fetchJson<Database["skills"]>("/db/skill_db.json"),
    fetchJson<Database["breakthroughs"]>("/db/break_db.json"),
    fetchJson<Database["talents"]>("/db/talent_db.json"),
    fetchJson<Database["images"]>("/db/img_db.json"),
    fetchJson<NonNullable<Database["equipments"]>>("/db/equip_db.json"),
    fetchJson<NonNullable<Database["homeSkills"]>>("/db/home_skill_db.json"),
    fetchJson<NonNullable<Database["charSkillMap"]>>("/db/char_skill_map.json"),
    fetchJson<NonNullable<Database["itemSkillMap"]>>("/db/item_skill_map.json"),
    fetchJson<Record<string, string | null>>(`/db/lang_${currentLang}.json`),
  ])

  return {
    characters,
    cards,
    skills,
    breakthroughs,
    talents,
    images,
    languages: {
      [currentLang]: languageData,
    },
    equipments,
    homeSkills,
    charSkillMap,
    itemSkillMap,
  }
}

async function loadBootstrapDatabase(currentLang: string): Promise<Database> {
  try {
    return await fetchJson<Database>(`/db/bootstrap_${currentLang}.json`)
  } catch (error) {
    console.warn("Failed to load bootstrap database, falling back to split database:", error)
    return loadSplitDatabase(currentLang)
  }
}

function prepareDatabase(database: Database): Database {
  const characters = database.characters || {}
  const images = database.images || {}
  const equipments = database.equipments || {}
  const equipmentTypes = database.equipmentTypes || {}

  // 角色卡图和旧字段在加载后统一补齐，bootstrap 与拆分数据共用同一处理流程。
  Object.keys(characters).forEach((charId) => {
    const charImgKey = `char_${charId}`
    if (images[charImgKey]) {
      characters[charId].img_card = images[charImgKey]
    }

    const char = characters[charId]
    const qualityToRarity: Record<string, string> = {
      oneStar: "N-",
      twoStar: "N",
      threeStar: "R",
      fourStar: "SR",
      FiveStar: "SSR",
      SixStar: "UR",
    }

    char.rarity = qualityToRarity[char.quality] || "N-"
    char.desc = char.identity || `char_desc_${charId}`
  })

  Object.keys(equipments).forEach((equipId) => {
    const equipment = equipments[equipId]
    const tagId = equipment.equipTagId
    if (equipmentTypes[tagId]) {
      equipment.type = equipmentTypes[tagId]
    }

    // 装备类型缺失时按图鉴 tag 区间补默认类型。
    if (!equipment.type) {
      if (tagId >= 12600155 && tagId <= 12600160) {
        equipment.type = "weapon"
      } else if (tagId >= 12600161 && tagId <= 12600161) {
        equipment.type = "armor"
      } else if (tagId >= 12600162 && tagId <= 12600162) {
        equipment.type = "accessory"
      } else {
        equipment.type = "weapon"
      }
    }

    const equipImgKey = `equip_${equipId}`
    if (images[equipImgKey]) {
      equipment.url = images[equipImgKey]
    }

    if (equipment.skillList && !Array.isArray(equipment.skillList)) {
      const skillListObj = equipment.skillList as unknown as Record<string, any>
      equipment.skillList = Object.keys(skillListObj).map((key) => ({
        skillId: Number(skillListObj[key].skillId || key),
      }))
    }
  })

  return {
    ...database,
    characters,
    images,
    equipments,
    equipmentTypes,
  }
}

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
          const currentLang = getCurrentLanguage()
          setData(prepareDatabase(await loadBootstrapDatabase(currentLang)))
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
