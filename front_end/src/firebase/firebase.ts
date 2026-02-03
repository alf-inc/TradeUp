import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getFirestore, doc, getDoc, setDoc, collection, addDoc, query, where, getDocs, deleteDoc } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";



// Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Firebase Auth (used in your LoginRegisterScreen)
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Firebase Analytics (optional, safe check)
// isSupported().then((supported) => {
//   if (supported) {
//     getAnalytics(app);
//   }
// });


export type UserProfile = {
  bio?: string;
  photoURL?: string;
};

// Getting user profile
export async function getMyProfile(uid: string): Promise<UserProfile> {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? (snap.data() as UserProfile) : {};
}


// Saving user bio
export async function saveMyBio(uid: string, bio: string) {
  await setDoc(doc(db, "users", uid), { bio }, { merge: true });
}


// Upload user profile photo and return its download URL
export async function uploadMyProfilePhoto(
  uid: string,
  file: File
): Promise<string> {
  const fileRef = ref(storage, `profilePhotos/${uid}`);
  await uploadBytes(fileRef, file);
  return await getDownloadURL(fileRef);
}


// Save user profile (bio and photoURL)
export async function saveMyProfile(uid: string, profile: UserProfile) {
  await setDoc(doc(db, "users", uid), profile, { merge: true });
}

// Item type for item data
export interface ItemData {
  title: string;
  description: string;
  imageUrls: string[];
  category: string;
  condition: string;
  userId: string;
  userName: string;
  userAvatar: string;
  createdAt: number; 
}

// Save new item
export async function saveNewItem(item: ItemData) {
  const docRef = await addDoc(collection(db, "items"), item);
  return docRef.id;
}

// Get items for a specific user from userId
export async function getUserItems(uid: string) {
  const q = query(collection(db, "items"), where("userId", "==", uid));
  const querySnapshot = await getDocs(q);
  
  // Converts Firestore docs into item format
  return querySnapshot.docs.map((doc) => ({
    id: doc.id, 
    ...doc.data() 
  }));
}

// Delete an item given its item ID
export async function deleteItem(itemId: string) {
  await deleteDoc(doc(db, "items", itemId));
}