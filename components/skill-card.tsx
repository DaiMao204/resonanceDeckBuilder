"use client"

import type { Card, CardExtraInfo, SpecialControl } from "../types"
import { formatColorText } from "../utils/format-text"

interface SkillCardProps {
  card: Card
  extraInfo: CardExtraInfo
  getTranslatedString: (key: string) => string
  onRemove: () => void
  onEdit: () => void
  isDisabled: boolean
  characterImage?: string
  useType: number // 添加: 卡牌 使用 条件 类型
  useParam: number // 添加: 卡牌 使用 条件 相关
}

export function SkillCard({
  card,
  extraInfo,
  getTranslatedString,
  onRemove,
  onEdit,
  isDisabled,
  characterImage,
  useType,
  useParam,
}: SkillCardProps) {
  // 使用 条件 相关 读取

  const shouldShowParam = () => {
    if (useType < 3) return false

    const condListLength = card.ExCondList?.length || 0

    // useType ExCondList 相关 存在相关 检查
    if (card.ExCondList && useType >= 3 && useType < 3 + condListLength) {
      const condIndex = useType - 3
      const cond = card.ExCondList[condIndex]
      // isNumCond true相关 检查
      return cond.isNumCond === true
    }

    if (card.ExActList && useType >= 3 + condListLength) {
      const actIndex = useType - 3 - condListLength
      const act = card.ExActList[actIndex]
      return act?.isNumCond === true
    }

    return false
  }


  const getConditionText = () => {
    if (useType === 2) {
      return getTranslatedString("do_not_use") || "Do Not Use"
    }

    if (useType >= 3) {
      // ExCondList 相关 相关 检查
      const condListLength = card.ExCondList?.length || 0

      if (card.ExCondList && useType >= 3 && useType < 3 + condListLength) {
        const condIndex = useType - 3
        const cond = card.ExCondList[condIndex]
        // card-settings-modal.tsx相关 text_${cond.des} 相关 键 生成
        const textKey = `text_${cond.des}`
        return getTranslatedString(textKey) || textKey
      }

      // ExActList相关 值 读取
      if (card.ExActList && useType >= 3 + condListLength) {
        const actIndex = useType - 3 - condListLength
        if (actIndex >= 0 && actIndex < card.ExActList.length) {
          const act = card.ExActList[actIndex]
          // card-settings-modal.tsx相关 text_${act.des} 相关 键 生成
          const textKey = `text_${act.des}`
          return getTranslatedString(textKey) || textKey
        }
      }
    }

    return ""
  }

  return (
    <div
      className="skill-card relative overflow-hidden h-full cursor-pointer user-select-none"
      style={{
        aspectRatio: "1/1.5",
        maxWidth: "100%",
        width: "100%",
      }}
      onClick={(e) => {
        e.stopPropagation()
        onEdit()
      }}
      onContextMenu={(e) => {
        e.preventDefault()
        e.stopPropagation()
      }}
    >
      {/* Card background */}
      <div className="absolute inset-0 w-full h-full">
        {
          <img
            src={characterImage || "images/placeHolder Card.jpg"}
            alt=""
            className="w-full h-full object-cover pointer-events-none"
            onError={(e) => {
              e.currentTarget.src = "images/placeHolder Card.jpg"
            }}
          />
        }
      </div>

      {/* Card overlay */}
      <div className="absolute inset-0 bg-black bg-opacity-50"></div>

      {/* Disabled overlay */}
      {isDisabled && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-red-900 bg-opacity-30">
          <div className="text-3xl text-red-500 transform rotate-60">🚫</div>
        </div>
      )}

      {/* Cost badge - 相关 相关 仅相关 */}
      <div className="absolute top-0 right-0 px-0.5 py-0 text-white font-bold sm:text-3xl text-xs z-10">
        {extraInfo.cost}
      </div>

      {/* Card content */}
      <div className="relative z-1 p-0 flex flex-col h-full">
        {/* 使用 条件 覆盖层 */}
        {useType > 0 && useType !== 1 && (
          <div className="absolute top-0 left-0 w-full p-1 bg-black bg-opacity-50 text-white text-xs z-10 flex items-center justify-center">
            {useType === 2 ? (
              <span className="flex items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-3 w-3 mr-1 text-red-500 shrink-0"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="hidden md:inline pr-3">
                {getTranslatedString("do_not_use") || "Do Not Use"}
                </span>
              </span>
            ) : (
              <span className="flex items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-3 h-3 mr-1 text-blue-500 shrink-0"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="hidden md:inline pr-3">
                  {getConditionText()}
                  {shouldShowParam() ? (useParam > 0 ? `: ${useParam}` : ": 0") : ""}
                </span>
              </span>

            )}
          </div>
        )}
        {/* Empty space in the middle */}
        <div className="flex-grow"></div>

        {/* 技能 图片 - 大小 增加 以及 位置 相关 */}
        <div className="flex justify-center mb-2 lg:mb-8 mt-auto">
          <div className="w-1/2 relative">
            {" "}
            {/* 图片 大小 1/4相关 1/2相关 增加 */}
            <div className="aspect-square transform rotate-45 overflow-hidden bg-black bg-opacity-30 border border-[hsla(var(--neon-white),0.5)] shadow-[0_0_5px_rgba(255,255,255,0.3)]">
              {extraInfo.img_url && (
                <img
                  src={extraInfo.img_url || "/placeholder.svg"}
                  alt={extraInfo.name}
                  className="object-cover absolute top-1/2 left-1/2 transform scale-150 -translate-x-1/2 -translate-y-1/2 -rotate-45 pointer-events-none"
                />
              )}
            </div>
          </div>
        </div>

        {/* Card name - 相关 相关 显示 相关 修改 */}
        <div className="text-white font-bold lg:text-[1rem] text-[0.6rem] line-clamp-2 mt-auto neon-text user-select-none px-0.5 pb-0.5">
          {formatColorText(getTranslatedString(card.name))}
        </div>
      </div>
    </div>
  )
}
