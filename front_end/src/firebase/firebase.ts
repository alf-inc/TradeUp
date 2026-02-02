import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getAnalytics, isSupported } from "firebase/analytics";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAB010mSTZIEzhtwBAELxfpFNS-D8ZUHTI",
  authDomain: "tradeup-301.firebaseapp.com",
  projectId: "tradeup-301",
  storageBucket: "tradeup-301.firebasestorage.app",
  messagingSenderId: "829476476398",
  appId: "1:829476476398:web:07b4b89c6d39eaf80b6aff",
  measurementId: "G-N61WPHVQLS",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Firebase Auth (used in your LoginRegisterScreen)
export const auth = getAuth(app);

// Firebase Analytics (optional, safe check)
// isSupported().then((supported) => {
//   if (supported) {
//     getAnalytics(app);
//   }
// });
