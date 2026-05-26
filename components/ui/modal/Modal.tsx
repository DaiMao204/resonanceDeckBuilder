"use client"

import type React from "react"
import { useEffect, useRef, useState } from "react"

// 弹窗 管理 相关 相关 相关
let modalCounter = 0

export interface ModalProps {
  isOpen: boolean
  onClose: (e?: React.MouseEvent) => void
  title?: React.ReactNode
  children: React.ReactNode
  footer?: React.ReactNode
  maxWidth?: string
  closeOnOutsideClick?: boolean
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  maxWidth = "max-w-3xl",
  closeOnOutsideClick = true,
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  // 相关 弹窗 相关 相关 ID 相关
  const [modalId] = useState(() => `modal-${modalCounter++}`)
  // 弹窗的 z-index 管理
  const [zIndex, setZIndex] = useState(100)

  // 弹窗 相关 相关 z-index 增加
  useEffect(() => {
    if (isOpen) {
      // 当前 相关 弹窗 相关 相关 最高 z-index 查找
      const modals = document.querySelectorAll(".neon-modal-backdrop")
      let maxZIndex = 100

      modals.forEach((modal) => {
        const currentZIndex = Number.parseInt(window.getComputedStyle(modal).zIndex, 10)
        if (currentZIndex > maxZIndex) {
          maxZIndex = currentZIndex
        }
      })

      // 当前 弹窗的 z-index 相关 最高 值 + 10相关 设置
      setZIndex(maxZIndex + 10)
    }
  }, [isOpen])

  // ESC 键相关 弹窗 关闭 - 相关 相关 存在 弹窗仅 相关 修改
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        // 当前 相关 弹窗 相关 相关 最高 z-index 相关 弹窗 查找
        const modals = document.querySelectorAll(".neon-modal-backdrop")
        let maxZIndex = 0
        let topModalId = ""

        modals.forEach((modal) => {
          const currentZIndex = Number.parseInt(window.getComputedStyle(modal).zIndex, 10)
          if (currentZIndex > maxZIndex) {
            maxZIndex = currentZIndex
            topModalId = modal.id
          }
        })

        // 当前 弹窗 相关 相关 存在 相关仅 关闭
        if (topModalId === modalId) {
          onClose()
        }
      }
    }

    if (isOpen) {
      document.addEventListener("keydown", handleEscKey)
    }

    return () => {
      document.removeEventListener("keydown", handleEscKey)
    }
  }, [isOpen, onClose, modalId])

  // 弹窗 相关 相关 body相关 modal-open 类 添加
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add("modal-open")
    } else {
      // 相关 弹窗 没有 相关仅 modal-open 类 移除
      const openModals = document.querySelectorAll(".neon-modal-backdrop")
      if (openModals.length <= 1) {
        document.body.classList.remove("modal-open")
      }
    }

    return () => {
      // 组件 相关挂载 相关 相关 弹窗 没有 相关仅 modal-open 类 移除
      const openModals = document.querySelectorAll(".neon-modal-backdrop")
      if (openModals.length <= 1) {
        document.body.classList.remove("modal-open")
      }
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div
      id={modalId}
      className="neon-modal-backdrop fixed inset-0 flex items-center justify-center"
      style={{ zIndex }}
      onClick={(e) => {
        // 当前 弹窗的 backdrop 点击相关 相关仅 关闭
        if (closeOnOutsideClick && e.target === e.currentTarget) {
          console.log("Modal backdrop clicked, closing modal")
          onClose(e)
        }
      }}
    >
      <div
        ref={modalRef}
        className={`neon-modal ${maxWidth} w-full flex flex-col max-h-[90vh] overflow-y-auto`}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div
            className="neon-modal-header sticky top-0 z-20 flex flex-col justify-between items-center shadow-md"
            style={{ backgroundColor: "var(--modal-header-bg)" }}
          >
            <div className="w-full flex justify-between items-center">
              <div className="flex-1">{title}</div>
            </div>
          </div>
        )}

        <div className="flex-grow" style={{ backgroundColor: "var(--modal-content-bg)" }}>
          {children}
        </div>

        {footer && <div className="neon-modal-footer sticky bottom-0 z-20">{footer}</div>}
      </div>
    </div>
  )
}
