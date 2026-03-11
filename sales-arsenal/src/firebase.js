import { initializeApp } from 'firebase/app';
import { getAnalytics, logEvent as _logEvent } from 'firebase/analytics';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyDdD6hx9tNRTWltTjXFtyqW8K2wwwi8Oqo',
  authDomain: 'sales-arsenal.firebaseapp.com',
  projectId: 'sales-arsenal',
  storageBucket: 'sales-arsenal.firebasestorage.app',
  messagingSenderId: '713672083058',
  appId: '1:713672083058:web:b9341c7317c054f5ada4eb',
  measurementId: 'G-G3CMKC8TYS',
};

const app = initializeApp(firebaseConfig);

let analytics = null;
try { analytics = getAnalytics(app); } catch (_) {}
export { analytics };
export const db = getFirestore(app);
export const auth = getAuth(app);

export const logEvent = (name, params) => {
  try { if (analytics) _logEvent(analytics, name, params); } catch (_) {}
};
