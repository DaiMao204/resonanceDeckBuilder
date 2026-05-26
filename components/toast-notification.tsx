"use client"

import { useEffect, useState, useRef } from "react"

interface ToastProps {
  message: string
  type: "success" | "error" | "info"
  duration?: number
  onClose: () => void
}

export function Toast({ message, type, duration = 3000, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose()
    }, duration)

    return () => clearTimeout(timer)
  }, [duration, onClose])

  // 现有 Toast 组件的 bgColor 相关 相关和 相关 变更相关.
  const bgColor =
    type === "success"
      ? "bg-white border-green-500 text-black"
      : type === "error"
        ? "bg-white border-red-500 text-black"
        : "bg-white border-blue-500 text-black"

  // 相关 Toast 组件的 return 相关 类 相关和 相关 变更相关.
  return (
    <div className={`fixed bottom-4 right-4 p-4 rounded-lg border-l-4 shadow-md ${bgColor} z-50`}>
      <div className="flex items-center justify-between">
        <p>{message}</p>
        <button onClick={onClose} className="ml-4 text-gray-500 hover:text-gray-700">
          ✕
        </button>
      </div>
    </div>
  )
}

interface ToastManagerProps {
  getTranslatedString: (key: string) => string
}

export function useToast() {
  const [toasts, setToasts] = useState<Array<{ id: number; message: string; type: "success" | "error" | "info" }>>([])
  const nextIdRef = useRef(0) // useRef 使用相关 组件 相关 相关 值 保持相关 相关

  const showToast = (message: string, type: "success" | "error" | "info" = "info") => {
    const id = nextIdRef.current
    nextIdRef.current += 1 // ID 增加
    setToasts((prev) => [...prev, { id, message, type }])
    return id
  }

  const hideToast = (id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }

  const ToastContainer = () => (
    <>
      {toasts.map((toast) => (
        <Toast key={toast.id} message={toast.message} type={toast.type} onClose={() => hideToast(toast.id)} />
      ))}
    </>
  )

  return { showToast, hideToast, ToastContainer }
}

