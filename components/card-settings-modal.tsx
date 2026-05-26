"use client"
import { useState } from "react"
import type { Card, CardExtraInfo } from "../types"
import { ChevronLeft, ChevronRight, PlusIcon as MoreThan, MinusIcon as LessThan, Equal } from "lucide-react"
import { Modal } from "./ui/modal/Modal"
import { formatColorText } from "../utils/format-text"

interface CardSettingsModalProps {
  isOpen: boolean
  onClose: () => void
  card: Card
  extraInfo: CardExtraInfo
  initialUseType: number
  initialUseParam: number
  initialUseParamMap?: Record<string, number>
  onSave: (cardId: string, useType: number, useParam: number, useParamMap?: Record<string, number>) => void
  getTranslatedString: (key: string) => string
  characterImage?: string
}

// CardSettingsModal相关 selectedCard的 保存相关 信息 相关
export function CardSettingsModal({
  isOpen,
  onClose,
  card,
  extraInfo,
  initialUseType,
  initialUseParam,
  initialUseParamMap = {},
  onSave,
  getTranslatedString,
  characterImage,
}: CardSettingsModalProps) {
  const [useType, setUseType] = useState(initialUseType)
  const [useParam, setUseParam] = useState(initialUseParam)
  const [useParamMap, setUseParamMap] = useState<Record<string, number>>(initialUseParamMap)

  // 相关 输入值 变更 处理函数
  const handleParamChange = (optionIndex: number, value: number, minNum: number, maxNum: number) => {
    // 相关 相关 值 相关
    let adjustedValue = value
    if (value < minNum) adjustedValue = minNum
    if (value > maxNum) adjustedValue = maxNum

    // 状态 更新 - Use option index as key, not condId
    const newParamMap = {
      ...useParamMap,
      [optionIndex.toString()]: adjustedValue,
    }

    setUseParamMap(newParamMap)

    // 相关 相关 相关 对应 相关 选择
    setUseType(optionIndex)
    setUseParam(adjustedValue)

    // 变更相关 相关 保存
    onSave(card.id.toString(), optionIndex, adjustedValue, newParamMap)
  }

  // 图标 相关 函数
  const renderIcon = (iconText: string | undefined) => {
    if (!iconText) return null

    switch (iconText) {
      case "<=":
        return (
          <span className="flex items-center">
            <LessThan className="w-4 h-4 mr-1" />=
          </span>
        )
      case ">=":
        return (
          <span className="flex items-center">
            <MoreThan className="w-4 h-4 mr-1" />=
          </span>
        )
      case "<":
        return <LessThan className="w-4 h-4" />
      case ">":
        return <MoreThan className="w-4 h-4" />
      case "=":
        return <Equal className="w-4 h-4" />
      default:
        return <span>{iconText}</span>
    }
  }
  // 相关 选择 相关 调用相关 函数
  const handleOptionSelect = (newUseType: number, paramValue = -1) => {
    setUseType(newUseType)
    setUseParam(paramValue)

    // 相关 保存 应用 (相关 相关 相关)
    onSave(card.id.toString(), newUseType, paramValue, useParamMap)
  }

  // ExCondList和 ExActList相关 使用相关 图标 映射
  const getIconForCondition = (typeEnum: string | undefined) => {
    if (!typeEnum) return undefined

    switch (typeEnum.toLowerCase()) {
      case "less":
        return "<"
      case "lessequal":
        return "<="
      case "greater":
        return ">"
      case "greaterequal":
        return ">="
      case "equal":
        return "="
      default:
        return undefined
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center">
          <svg className="w-6 h-6 mr-2 text-white" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
            <path d="M7 12H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M7 8H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M7 16H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <h2 className="text-lg font-bold neon-text">{getTranslatedString("skill_details") || "Skill Details"}</h2>
        </div>
      }
      footer={
        <div className="flex justify-end">
          <button onClick={onClose} className="neon-button px-4 py-2 rounded-lg text-sm">
            {getTranslatedString("close")}
          </button>
        </div>
      }
      maxWidth="max-w-3xl"
    >
      <div
        className="flex flex-col md:flex-row flex-grow overflow-hidden"
        style={{ backgroundColor: "var(--modal-content-bg)" }}
      >
        {/* 相关 - 卡牌 信息 */}
        <div
          className="w-full md:w-3/5 p-4 md:border-r border-b md:border-b-0 border-[hsl(var(--neon-white),0.3)] overflow-y-auto"
          style={{ backgroundColor: "var(--modal-content-bg)" }}
        >
          <div className="flex mb-4">
            {/* 卡牌 图片 */}
            <div className="w-24 h-24 bg-black border border-[hsl(var(--neon-white),0.3)] rounded-md overflow-hidden mr-4">
              {extraInfo.img_url && (
                <img
                  src={extraInfo.img_url || "/placeholder.svg"}
                  alt={extraInfo.name}
                  className="w-full h-full object-cover"
                />
              )}
            </div>

            <div className="flex-1">
              {/* 卡牌 名称和 费用 */}
              <div className="border-b border-[hsl(var(--neon-white),0.3)] pb-2 mb-2">
                <div className="text-xl font-bold neon-text">{formatColorText(getTranslatedString(card.name))}</div>
                <div className="flex items-center mt-1">
                  <span className="text-gray-400 mr-2">{getTranslatedString("cost") || "Cost"}</span>
                  <span className="text-[hsl(var(--neon-white))] text-2xl font-bold">{extraInfo.cost}</span>
                </div>
                {/* Only show amount if it's greater than 0 */}
                {extraInfo.amount > 0 && (
                  <div className="text-sm text-gray-400">
                    {getTranslatedString("amount") || "Amount"}: {extraInfo.amount}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 卡牌 说明 - 格式化 应用 */}
          <div className="text-gray-300 mb-4">{formatColorText(extraInfo.desc)}</div>
        </div>

        {/* 相关 - 使用 设置 */}
        <div className="w-full md:w-2/5 p-4 overflow-y-auto" style={{ backgroundColor: "var(--modal-content-bg)" }}>
          <h3 className="text-lg font-medium mb-4 neon-text">
            {getTranslatedString("usage_settings") || "Usage Settings"}
          </h3>

          <div className="space-y-3">
            {/* 相关 使用 相关 */}
            <div
              className={`skill-option ${useType === 1 ? "skill-option-selected" : "skill-option-unselected"}`}
              onClick={() => handleOptionSelect(1)}
            >
              <div className="font-medium">{getTranslatedString("use_immediately") || "Use Immediately"}</div>
            </div>

            {/* 使用 相关 相关 */}
            <div
              className={`skill-option ${useType === 2 ? "skill-option-selected" : "skill-option-unselected"}`}
              onClick={() => handleOptionSelect(2)}
            >
              <div className="font-medium">{getTranslatedString("do_not_use") || "Do Not Use"}</div>
            </div>

            {/* ExCondList 相关 条件 相关 */}
            {card.ExCondList &&
              card.ExCondList.map((cond, index) => {
                // Calculate option index (starting from 3 after the default options)
                const optionIndex = index + 3
                const isNumCond = cond.isNumCond === true
                const minNum = cond.minNum || 0
                const maxNum =
                  cond.interValNum && cond.numDuration ? minNum + (cond.interValNum - 1) * cond.numDuration : 100
                const step = cond.numDuration || 1

                // 当前 值 计算 - Use option index as key, not condId
                const currentValue =
                  useParamMap[optionIndex.toString()] !== undefined ? useParamMap[optionIndex.toString()] : minNum

                // 语言包 键 生成
                const textKey = `text_${cond.des}`
                let text = getTranslatedString(textKey)
                let specialChar = ""
                const match = text.match(/(≥|≤|<|>)$/)
                console.log(specialChar)
                if (match) {
                  specialChar = match[0]
                  text = text.slice(0, -1) // 最后 相关 移除
                }

                return (
                  <div
                    key={`cond-${optionIndex}`}
                    className={`skill-option ${useType === optionIndex ? "skill-option-selected" : "skill-option-unselected"}`}
                    onClick={() => handleOptionSelect(optionIndex, currentValue)}
                  >
                    <div className="flex items-center">
                      <div className="font-medium flex items-center">
                        {/* 相关 */}
                        <span>{text}</span>
                        {specialChar?<span>{specialChar}</span>:null}
                        {/* 图标 */}
                        {cond.typeEnum && (
                          <span className="mx-1">{renderIcon(getIconForCondition(cond.typeEnum))}</span>
                        )}

                        {/* 相关 输入 (isNumCond true相关 相关) */}
                        {isNumCond && (
                          <div className="ml-2 flex items-center" onClick={(e) => e.stopPropagation()}>
                            <button
                              className="w-4 h-6 bg-black bg-opacity-20 rounded-l flex items-center justify-center"
                              onClick={() => handleParamChange(optionIndex, currentValue - step, minNum, maxNum)}
                            >
                              <ChevronLeft className="w-4 h-4" />
                            </button>
                            <span
                              className={`font-mono inline-block text-right ${
                                cond.typeEnum === "percent" ? "w-[3ch]" : "w-[2ch]"
                              }`}
                            >
                              {currentValue}
                              {cond.typeEnum === "percent" ? "%" : ""}
                            </span>
                            <button
                              className="w-4 h-6 bg-black bg-opacity-20 rounded-r flex items-center justify-center"
                              onClick={() => handleParamChange(optionIndex, currentValue + step, minNum, maxNum)}
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}

            {/* ExActList 相关 相关 相关 - 卡牌相关 ExActList 存在 相关 添加 */}
            {card.ExActList &&
              card.ExActList.map((act, index) => {
                // Calculate option index (starting after ExCondList options)
                const condListLength = card.ExCondList?.length || 0
                const optionIndex = index + 3 + condListLength
                const isNumCond = act.isNumCond === true
                const minNum = act.minNum ?? 0
                const maxNum =
                  act.interValNum && act.numDuration ? minNum + (act.interValNum - 1) * act.numDuration : 100
                const step = act.numDuration || 1
                const currentValue =
                  useParamMap[optionIndex.toString()] !== undefined ? useParamMap[optionIndex.toString()] : minNum

                // 语言包 键 生成
                const textKey = `text_${act.des}`

                return (
                  <div
                    key={`act-${optionIndex}`}
                    className={`skill-option ${useType === optionIndex ? "skill-option-selected" : "skill-option-unselected"}`}
                    onClick={() => handleOptionSelect(optionIndex, isNumCond ? currentValue : -1)}
                  >
                    <div className="flex items-center">
                      <div className="font-medium flex items-center">
                        {/* 相关 */}
                        <span>{getTranslatedString(textKey) || textKey}</span>
                        {isNumCond && (
                          <div className="ml-2 flex items-center" onClick={(e) => e.stopPropagation()}>
                            <button
                              className="w-4 h-6 bg-black bg-opacity-20 rounded-l flex items-center justify-center"
                              onClick={() => handleParamChange(optionIndex, currentValue - step, minNum, maxNum)}
                            >
                              <ChevronLeft className="w-4 h-4" />
                            </button>
                            <span
                              className={`font-mono inline-block text-right ${
                                act.typeEnum === "percent" ? "w-[3ch]" : "w-[2ch]"
                              }`}
                            >
                              {currentValue}
                              {act.typeEnum === "percent" ? "%" : ""}
                            </span>
                            <button
                              className="w-4 h-6 bg-black bg-opacity-20 rounded-r flex items-center justify-center"
                              onClick={() => handleParamChange(optionIndex, currentValue + step, minNum, maxNum)}
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
          </div>
        </div>
      </div>
    </Modal>
  )
}
