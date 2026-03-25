import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'

const firebaseConfig = {
  apiKey: "AIzaSyCKLSWXiPgW4Z9HUGCLWZs-Zf6OcB8KDS0",
  authDomain: "rakugo-yoyaku.firebaseapp.com",
  projectId: "rakugo-yoyaku",
  storageBucket: "rakugo-yoyaku.firebasestorage.app",
  messagingSenderId: "754057479855",
  appId: "1:754057479855:web:17b7f0e5f80e7424c0365a",
  measurementId: "G-J698ZW8YBC",
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
export const auth = getAuth(app)
export const googleProvider = new GoogleAuthProvider()
googleProvider.setCustomParameters({ hd: 'sunpro36.co.jp' })
