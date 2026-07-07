/**
 * Utility functions for clipboard operations
 */

function copyWithLegacyTextarea(text: string): boolean {
  if (typeof document === "undefined") return false

  const textarea = document.createElement("textarea")
  textarea.value = text
  textarea.setAttribute("readonly", "true")
  textarea.style.position = "fixed"
  textarea.style.top = "0"
  textarea.style.left = "-9999px"
  textarea.style.opacity = "0"

  document.body.appendChild(textarea)
  textarea.focus()
  textarea.select()

  try {
    return document.execCommand("copy")
  } catch (err) {
    console.error("Legacy clipboard copy failed: ", err)
    return false
  } finally {
    document.body.removeChild(textarea)
  }
}

/**
 * Copies text to clipboard
 * @param text Text to copy
 * @returns Promise that resolves when text is copied
 */
export async function copyToClipboard(text: string): Promise<void> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return
    }
  } catch (err) {
    console.error("Failed to copy text: ", err)
  }

  if (copyWithLegacyTextarea(text)) return

  throw new Error("Failed to copy to clipboard")
}

/**
 * Reads text from clipboard
 * @returns Promise that resolves with clipboard text
 */
export async function readFromClipboard(): Promise<string> {
  try {
    return await navigator.clipboard.readText()
  } catch (err) {
    console.error("Failed to read text: ", err)
    throw new Error("Failed to read from clipboard")
  }
}

