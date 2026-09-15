/** Firebase initialisation.
 *
 *  These values are not secrets. A Firebase web config identifies the project
 *  to the client; it grants nothing on its own. Access is decided entirely by
 *  firestore.rules, which is why those rules are the thing to get right rather
 *  than trying to hide this block.
 */

import { initializeApp } from 'firebase/app'
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

export const firebaseConfig = {
  apiKey: 'AIzaSyCeX5AIszj1adcajO_usBCylVFHXVLq2as',
  authDomain: 'agentcontext-sessions.firebaseapp.com',
  projectId: 'agentcontext-sessions',
  storageBucket: 'agentcontext-sessions.firebasestorage.app',
  messagingSenderId: '922020173545',
  appId: '1:922020173545:web:8e7e956e3a9ff63a0f8278',
}

export const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)

// Survive a reload without re-authenticating. Failure here is not fatal - a
// private window or blocked site data just means the session lasts one tab.
setPersistence(auth, browserLocalPersistence).catch(() => {})
