import { initializeApp } from "firebase/app"
import type { FirebaseApp } from "firebase/app"
import { getFirestore } from "firebase/firestore"
import type { Firestore } from "firebase/firestore"
import { getAuth, onAuthStateChanged, signInAnonymously } from "firebase/auth"
import type { Auth, User } from "firebase/auth"
import { getAnalytics, logEvent } from "firebase/analytics"
import type { Analytics } from "firebase/analytics"

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const isProd = process.env.NODE_ENV === "production"
const isFirebaseEnabled = process.env.NEXT_PUBLIC_FIREBASE_ENABLED === "true"
const requiredFirebaseConfig = [
  firebaseConfig.apiKey,
  firebaseConfig.authDomain,
  firebaseConfig.projectId,
  firebaseConfig.storageBucket,
  firebaseConfig.messagingSenderId,
  firebaseConfig.appId,
]
const hasFirebaseConfig = requiredFirebaseConfig.every(Boolean)
const app: FirebaseApp | null = isFirebaseEnabled && hasFirebaseConfig ? initializeApp(firebaseConfig) : null

export const db: Firestore | null = app ? getFirestore(app) : null
export const auth: Auth | null = app ? getAuth(app) : null
export const firebaseEnabled = Boolean(app)

const isAnalyticsEnabled =
  firebaseEnabled &&
  process.env.NEXT_PUBLIC_FIREBASE_ANALYTICS_ENABLED === "true" &&
  Boolean(firebaseConfig.measurementId)

// Initialize Firebase Analytics
export const analytics: Analytics | null =
  typeof window !== "undefined" && app && isAnalyticsEnabled ? getAnalytics(app) : null

// 새로운 래핑된 logEvent 함수로 대체
export const getAnonymousUser = (): Promise<User | null> => {
  if (!auth) return Promise.resolve(null)

  if (auth.currentUser) return Promise.resolve(auth.currentUser)

  const waitForAuthState = new Promise<User | null>((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      unsubscribe()
      resolve(user)
    }, (error) => {
      unsubscribe()
      console.error("[ERROR] Anonymous auth state failed:", error)
      resolve(null)
    })
  })

  const timeout = new Promise<null>((resolve) => {
    window.setTimeout(() => resolve(null), 3000)
  })

  return Promise.race([waitForAuthState, timeout]).then(async (user) => {
    if (user) return user

    try {
      const result = await Promise.race([
        signInAnonymously(auth),
        new Promise<null>((resolve) => window.setTimeout(() => resolve(null), 7000)),
      ])
      return result?.user ?? null
    } catch (error) {
      console.error("[ERROR] Anonymous sign-in failed:", error)
      return null
    }
  })
}

export const logEventWrapper = (eventName: string, eventParams?: Record<string, any>) => {
  if (!firebaseEnabled) {
    if (!isProd) console.log(`[DEV] Firebase disabled. Event skipped: ${eventName}`, eventParams)
    return
  }

  if (!isProd || !isAnalyticsEnabled) {
    console.log(`[DEV] Firebase Analytics Events: ${eventName}`, eventParams)
    return
  }

  if (typeof window !== "undefined" && analytics) {
    try {
      logEvent(analytics, eventName, eventParams)
    } catch (error) {
      console.error(`[ERROR] Failed to log event: ${eventName}`, error)
    }
  } else {
    console.warn(`[WARN] Analytics not available. Event: ${eventName}`, eventParams)
    console.log(`[DEBUG] isProd: ${isProd}, isAnalyticsEnabled: ${isAnalyticsEnabled}`)
  }
}
