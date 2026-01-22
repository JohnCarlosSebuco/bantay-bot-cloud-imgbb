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
  apiKey: "AIzaSyCnoTxukz7Jj32BPuUxIxub0N2MtgfDRxs",
  authDomain: "bantay-bot.firebaseapp.com",
  projectId: "bantay-bot",
  storageBucket: "bantay-bot.firebasestorage.app",
  messagingSenderId: "783316846678",
  appId: "1:783316846678:web:43ef0c19ad8130d42fd3f7",
  measurementId: "G-8N5Q0CGR34"
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
export const FCM_VAPID_KEY = 'BCAU_7ckDwnb4dKa5MqDKFlbCnBlWPsj-LDKD7GAMMZYga34yJonXmQGh9J8CdfLBpPyypEwrRA1ln-IOXsa820';

export default firebaseConfig;
