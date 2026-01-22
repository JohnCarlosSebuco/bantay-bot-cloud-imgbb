/**
 * Firebase Configuration
 *
 * Instructions:
 * 1. Go to https://console.firebase.google.com
 * 2. Create a new project (or use existing): "bantaybot-pwa"
 * 3. Add a web app to your project
 * 4. Copy the firebaseConfig values and paste them below
 * 5. Enable Firestore Database in Firebase Console
 * 6. Enable Firebase Storage (optional, for camera snapshots)
 * 7. Enable Firebase Hosting for deployment
 */

const firebaseConfig = {
  apiKey: "AIzaSyDbNM81-xOLGjQ5iiSOiXGBaV19tdJUFdg",
  authDomain: "cloudbantaybot.firebaseapp.com",
  projectId: "cloudbantaybot",
  storageBucket: "cloudbantaybot.firebasestorage.app",
  messagingSenderId: "346273940225",
  appId: "1:346273940225:web:4c3f43d8ee593802e85100",
  measurementId: "G-2PP7RNM8WV"
};

/**
 * Example configuration (replace with your actual values):
 *
 * const firebaseConfig = {
 *   apiKey: "AIzaSyC1234567890abcdefghijk",
 *   authDomain: "bantaybot-pwa.firebaseapp.com",
 *   projectId: "bantaybot-pwa",
 *   storageBucket: "bantaybot-pwa.appspot.com",
 *   messagingSenderId: "123456789012",
 *   appId: "1:123456789012:web:abc123def456",
 *   measurementId: "G-ABCDEFGHIJ"
 * };
 */

/**
 * VAPID Key for Firebase Cloud Messaging (FCM) Web Push
 *
 * Instructions to get your VAPID key:
 * 1. Go to Firebase Console > Project Settings > Cloud Messaging
 * 2. Scroll to "Web configuration" section
 * 3. Click "Generate key pair" if you don't have one
 * 4. Copy the "Key pair" value and paste it below
 *
 * Note: Replace the placeholder with your actual VAPID key
 */
export const FCM_VAPID_KEY = 'BBjO22wxzkyLYMzXOQ18LRXskQsOGu7k8CCz7_aPqMod6PO0O-zF5AjHJBnLRqEuxe_d3RRd2jbN1FqH2j7u_-E';

export default firebaseConfig;
