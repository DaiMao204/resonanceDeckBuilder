"use client"

import type React from "react"

import { createContext, useContext, useState, useEffect, useCallback } from "react"
import type { Database } from "../types"

interface LanguageContextType {
  currentLanguage: string
  isChangingLanguage: boolean
  supportedLanguages: string[]
  getTranslatedString: (key: string) => string
  changeLanguage: (lang: string) => void
}

const LanguageContext = createContext<LanguageContextType | null>(null)

export function LanguageProvider({
  children,
  initialLanguage,
  data,
}: {
  children: React.ReactNode
  initialLanguage: string
  data: Database | null
}) {
  const [currentLanguage, setCurrentLanguage] = useState(initialLanguage)
  const [isChangingLanguage, setIsChangingLanguage] = useState(false)
  const [, setLanguageDataVersion] = useState(0)

  const supportedLanguages = ["ko", "en", "jp", "cn", "tw"]

  const ensureLanguageData = useCallback(
    async (language: string) => {
      if (!data) return
      if (data.languages[language]) return

      const langResponse = await fetch(`/db/lang_${language}.json`)
      if (!langResponse.ok) {
        throw new Error(`Failed to load language data: ${langResponse.status}`)
      }

      data.languages[language] = await langResponse.json()
      setLanguageDataVersion((version) => version + 1)
    },
    [data],
  )

  useEffect(() => {
    ensureLanguageData(currentLanguage).catch((error) => {
      console.error("Failed to load language data:", error)
    })
  }, [currentLanguage, ensureLanguageData])

  const getTranslatedString = useCallback(
    (key: string) => {
      if (!data || !data.languages[currentLanguage]) return key
      return Object.prototype.hasOwnProperty.call(data.languages[currentLanguage], key)
        ? data.languages[currentLanguage][key]
        : key
    },
    [data, currentLanguage],
  )

  const changeLanguage = useCallback(
    async (newLanguage: string) => {
      if (currentLanguage === newLanguage) return

      setIsChangingLanguage(true)

      try {
        await ensureLanguageData(newLanguage)
        if (typeof window !== "undefined") {
          const pathParts = window.location.pathname.split("/")
          pathParts[1] = newLanguage
          window.history.pushState(null, "", `${pathParts.join("/")}${window.location.search}${window.location.hash}`)
        }
        setCurrentLanguage(newLanguage)
      } catch (error) {
        console.error("Failed to change language:", error)
      } finally {
        setTimeout(() => {
          setIsChangingLanguage(false)
        }, 300)
      }
    },
    [currentLanguage, ensureLanguageData],
  )

  return (
    <LanguageContext.Provider
      value={{
        currentLanguage,
        isChangingLanguage,
        supportedLanguages,
        getTranslatedString,
        changeLanguage,
      }}
    >
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider")
  }
  return context
}
