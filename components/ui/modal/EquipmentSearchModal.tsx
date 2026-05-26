"use client"
import { useState, useMemo } from "react"
import { SearchModal, type SearchModalProps } from "./SearchModal"
import type { Equipment } from "../../../types"
// 相关 import 添加
import { Info } from "lucide-react"
import { EquipmentDetailsModal } from "../../../components/equipment-details-modal"

// props 类型 更新
export interface EquipmentSearchModalProps extends Omit<SearchModalProps, "children" | "searchControl"> {
  equipments: Equipment[]
  onSelectEquipment: (equipId: string | null) => void
  getTranslatedString: (key: string) => string
  type: "weapon" | "armor" | "accessory"
  getSkill?: (skillId: number) => any
}

export function EquipmentSearchModal({
  equipments,
  onSelectEquipment,
  getTranslatedString,
  type,
  getSkill,
  ...searchModalProps
}: EquipmentSearchModalProps) {
  // 搜索 以及 排序 状态 管理
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState<"quality" | "name">("quality")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")

  // EquipmentSearchModal 组件 相关 状态 添加
  const [showEquipmentDetails, setShowEquipmentDetails] = useState<string | null>(null)

  // 搜索相关 变更 处理函数
  const handleSearchChange = (value: string) => {
    setSearchTerm(value)
  }

  // 排序 相关 变更 处理函数
  const handleSortByChange = (value: string) => {
    setSortBy(value as "quality" | "name")
  }

  // 排序 相关 变更 处理函数
  const handleSortDirectionChange = () => {
    setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"))
  }

  // 相关 以及 排序相关 装备 列表
  const filteredEquipments = useMemo(() => {
    // 搜索相关 相关
    const filtered = equipments.filter((equipment) =>
      getTranslatedString(equipment.name).toLowerCase().includes(searchTerm.toLowerCase()),
    )

    // 排序
    return [...filtered].sort((a, b) => {
      let result = 0

      if (sortBy === "name") {
        // 名称相关 排序
        result = getTranslatedString(a.name).localeCompare(getTranslatedString(b.name))
      } else {
        // 相关 排序 (Orange > Golden > Purple > Blue > Green)
        const qualityOrder: Record<string, number> = {
          Orange: 5,
          Golden: 4,
          Purple: 3,
          Blue: 2,
          Green: 1,
        }

        result = (qualityOrder[b.quality] || 0) - (qualityOrder[a.quality] || 0)
      }

      // 排序 相关 应用
      return sortDirection === "asc" ? -result : result
    })
  }, [equipments, searchTerm, sortBy, sortDirection, getTranslatedString])

  // Function to get quality background color
  const getQualityBgColor = (quality: string) => {
    switch (quality) {
      case "Orange":
        return "bg-gradient-to-br from-orange-500 to-red-500 bg-opacity-70"
      case "Golden":
        return "bg-gradient-to-br from-yellow-500 to-amber-500 bg-opacity-70"
      case "Purple":
        return "bg-gradient-to-br from-purple-500 to-indigo-500 bg-opacity-70"
      case "Blue":
        return "bg-gradient-to-br from-blue-500 to-cyan-500 bg-opacity-70"
      case "Green":
        return "bg-gradient-to-br from-green-500 to-emerald-500 bg-opacity-70"
      default:
        return "bg-gradient-to-br from-gray-400 to-gray-500 bg-opacity-70"
    }
  }

  return (
    <>
      <SearchModal
        {...searchModalProps}
        searchControl={{
          searchTerm,
          onSearchChange: handleSearchChange,
          sortBy,
          onSortByChange: handleSortByChange,
          sortDirection,
          onSortDirectionChange: handleSortDirectionChange,
          sortOptions: [
            { value: "quality", label: getTranslatedString("sort_by_quality") || "Sort by Quality" },
            { value: "name", label: getTranslatedString("sort_by_name") || "Sort by Name" },
          ],
          searchPlaceholder: getTranslatedString("search_equipment") || "Search equipment",
        }}
        closeOnOutsideClick={true}
      >
        <div className="p-4">
          <div className="grid grid-cols-4 gap-2">
            {/* None option */}
            <div onClick={() => onSelectEquipment(null)} className="flex flex-col items-center">
              <div className="w-full aspect-square bg-gray-700 rounded-lg mb-1 flex items-center justify-center cursor-pointer hover:bg-gray-600 neon-border">
                <span className="text-lg neon-text">✕</span>
              </div>
              <div className="text-xs font-medium text-center truncate neon-text max-w-full">
                {getTranslatedString("none") || "None"}
              </div>
            </div>

            {/* Equipment items */}
            {filteredEquipments.length === 0 ? (
              <div className="col-span-full text-center py-4 text-gray-400">
                {getTranslatedString("no_equipment_found") || "No equipment found"}
              </div>
            ) : (
              filteredEquipments.map((equipment) => (
                <div key={equipment.id} className="flex flex-col items-center cursor-pointer relative">
                  <div
                    className={`w-full aspect-square equipment-card ${getQualityBgColor(equipment.quality)} relative`}
                    onClick={() => onSelectEquipment(equipment.id.toString())}
                  >
                    {equipment.url ? (
                      <img
                        src={equipment.url || "/placeholder.svg"}
                        alt={getTranslatedString(equipment.name)}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // 图片 加载 相关 相关 默认 相关 显示
                          e.currentTarget.style.display = "none"
                          e.currentTarget.parentElement?.classList.add("flex", "items-center", "justify-center")
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-xs text-center">
                          {getTranslatedString(equipment.name).substring(0, 2)}
                        </span>
                      </div>
                    )}

                    {/* 装备 信息 按钮 添加 - 搜索相关 相关 显示 */}
                    <button
                      className="absolute top-1 right-1 bg-black bg-opacity-60 rounded-full p-0.5 sm:p-1 flex items-center justify-center z-10"
                      onClick={(e) => {
                        e.preventDefault() // 默认 相关 防止
                        e.stopPropagation() // 相关 相关 防止
                        setShowEquipmentDetails(equipment.id.toString())
                      }}
                    >
                      <Info className="w-7 h-7 text-white" />
                    </button>
                  </div>
                  <div
                    className="text-xs font-medium text-center truncate w-full neon-text max-w-full"
                    onClick={() => onSelectEquipment(equipment.id.toString())}
                  >
                    {getTranslatedString(equipment.name)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </SearchModal>

      {/* 装备 相关 信息 弹窗 */}
      {showEquipmentDetails && (
        <EquipmentDetailsModal
          isOpen={!!showEquipmentDetails}
          onClose={() => {
            setShowEquipmentDetails(null)
          }}
          equipment={equipments.find((e) => e.id.toString() === showEquipmentDetails)!}
          getTranslatedString={getTranslatedString}
          getSkill={getSkill}
        />
      )}
    </>
  )
}
