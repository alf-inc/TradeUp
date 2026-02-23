import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
// import { getAnalytics, isSupported } from "firebase/analytics";
import { getFirestore, doc, getDoc, setDoc, collection, addDoc, query, where, getDocs, deleteDoc,
   limit, orderBy, startAfter, QueryDocumentSnapshot, DocumentData, arrayUnion, arrayRemove, updateDoc } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

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
export const db = getFirestore(app);
export const storage = getStorage(app);

// Firebase Analytics (optional, safe check)
// isSupported().then((supported) => {
//   if (supported) {
//     getAnalytics(app);
//   }
// });


// Feed Item
export type FeedItem = {
  id: string;
  title: string;
  description: string;
  imageUrls: string[];
  category: string;
  condition: string;
  userId: string;
  userName: string;
  userAvatar: string;
  createdAt: number;
};

export type GetFeedOptions = {
  limitCount?: number;                 // default 20
  category?: string;                   // optional filter
  condition?: string;                  // optional filter
  excludeUserId?: string;              // optional (skip your own items client-side)
  startAfterDoc?: QueryDocumentSnapshot<DocumentData>; // pagination
};

export async function getFeedItems(options: GetFeedOptions = {}) {
  const {
    limitCount = 20,
    category,
    condition,
    excludeUserId,
    startAfterDoc,
  } = options;

  const constraints: any[] = [orderBy("createdAt", "desc"), limit(limitCount)];

  if (category) constraints.unshift(where("category", "==", category));
  if (condition) constraints.unshift(where("condition", "==", condition));
  if (startAfterDoc) constraints.push(startAfter(startAfterDoc));

  const q = query(collection(db, "items"), ...constraints);
  const snap = await getDocs(q);

  const items: FeedItem[] = snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as Omit<FeedItem, "id">) }))
    .filter((it) => (excludeUserId ? it.userId !== excludeUserId : true));

  const lastDoc = snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null;

  return { items, lastDoc };
}

export type UserProfile = {
  name?: string
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

// =======================
// Liked Items Functions
// =======================

export async function addLikedItem(uid: string, itemId: string) {
  const userRef = doc(db, "users", uid);
  await updateDoc(userRef, {
    liked_items: arrayUnion(itemId),
  });
}

export async function removeLikedItem(uid: string, itemId: string) {
  const userRef = doc(db, "users", uid);
  await updateDoc(userRef, {
    liked_items: arrayRemove(itemId),
  });
}

export async function getLikedItems(uid: string): Promise<string[]> {
  const userRef = doc(db, "users", uid);
  const snap = await getDoc(userRef);

  if (!snap.exists()) return [];

  const data = snap.data();
  return (data.liked_items ?? []) as string[];
}