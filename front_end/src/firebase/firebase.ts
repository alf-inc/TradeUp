import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
// import { getAnalytics, isSupported } from "firebase/analytics";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
  addDoc,
  query,
  where,
  getDocs,
  deleteDoc,
  limit,
  orderBy,
  startAfter,
  QueryDocumentSnapshot,
  DocumentData,
  arrayUnion,
  arrayRemove,
  updateDoc,
} from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import type { CompletedTrade } from "../types";

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

const BACKEND_BASE_URL =
  (typeof import.meta !== "undefined" &&
    (import.meta as any).env &&
    ((import.meta as any).env.VITE_API_BASE_URL as string | undefined)) ||
  "http://127.0.0.1:8000";

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
  limitCount?: number; // default 20
  category?: string; // optional filter
  condition?: string; // optional filter
  excludeUserId?: string; // optional (skip your own items client-side)
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
  name?: string;
  bio?: string;
  photoURL?: string;
  average_rating?: number;
  ratings_received_count?: number;
  completed_trade_count?: number;
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
  return querySnapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
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

// =======================
// Trade / Match Helpers
// =======================

type RawTradeHistoryRecord = {
  id?: string;
  tradeId?: string;
  matchKey?: string;
  user1Id?: string;
  user2Id?: string;
  item1Id?: string;
  item2Id?: string;
  user1Rating?: number | null;
  user2Rating?: number | null;
  status?: string;
  completedAt?: number | { seconds?: number; nanoseconds?: number } | null;
};

function normalizeTimestamp(
  value: number | { seconds?: number; nanoseconds?: number } | null | undefined
): number | undefined {
  if (typeof value === "number") return value;
  if (value && typeof value === "object" && typeof value.seconds === "number") {
    return value.seconds * 1000;
  }
  return undefined;
}

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BACKEND_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed: ${res.status}`);
  }

  return (await res.json()) as T;
}

export async function confirmTrade(notificationId: string) {
  return apiRequest<any>(
    `/trades/confirm?notificationId=${encodeURIComponent(notificationId)}`,
    { method: "POST" }
  );
}

export async function getTradeHistory(uid: string): Promise<CompletedTrade[]> {
  const raw = await apiRequest<any>(
    `/trades/history?userId=${encodeURIComponent(uid)}`
  );

  const records: RawTradeHistoryRecord[] = Array.isArray(raw)
    ? raw
    : Array.isArray(raw?.trades)
    ? raw.trades
    : Array.isArray(raw?.history)
    ? raw.history
    : [];

  const baseTrades: CompletedTrade[] = records.map((trade, index) => ({
    id: trade.id || trade.tradeId || trade.matchKey || `trade-${index}`,
    tradeId: trade.tradeId || trade.id || trade.matchKey || `trade-${index}`,
    user1Id: trade.user1Id || "",
    user2Id: trade.user2Id || "",
    item1Id: trade.item1Id || "",
    item2Id: trade.item2Id || "",
    user1Rating: trade.user1Rating ?? null,
    user2Rating: trade.user2Rating ?? null,
    status: trade.status || "confirmed",
    completedAt: normalizeTimestamp(trade.completedAt),
  }));

  const itemIds = Array.from(
    new Set(
      baseTrades.flatMap((trade) => [trade.item1Id, trade.item2Id]).filter(Boolean)
    )
  );

  const userIds = Array.from(
    new Set(
      baseTrades
        .flatMap((trade) => [trade.user1Id, trade.user2Id])
        .filter((userId) => userId && userId !== uid)
    )
  );

  const itemMap = new Map<string, any>();
  const userMap = new Map<string, any>();

  await Promise.all(
    itemIds.map(async (itemId) => {
      const snap = await getDoc(doc(db, "items", itemId));
      if (snap.exists()) {
        itemMap.set(itemId, { id: snap.id, ...snap.data() });
      }
    })
  );

  await Promise.all(
    userIds.map(async (userId) => {
      const snap = await getDoc(doc(db, "users", userId));
      if (snap.exists()) {
        userMap.set(userId, { id: snap.id, ...snap.data() });
      }
    })
  );

  return baseTrades.map((trade) => {
    const amUser1 = trade.user1Id === uid;
    const partnerId = amUser1 ? trade.user2Id : trade.user1Id;

    const givenItemId = amUser1 ? trade.item1Id : trade.item2Id;
    const receivedItemId = amUser1 ? trade.item2Id : trade.item1Id;

    const givenItem = itemMap.get(givenItemId);
    const receivedItem = itemMap.get(receivedItemId);
    const item1 = itemMap.get(trade.item1Id);
    const item2 = itemMap.get(trade.item2Id);
    const partner = userMap.get(partnerId);

    return {
      ...trade,
      item1Title: item1?.title,
      item1Image: item1?.imageUrls?.[0],
      item2Title: item2?.title,
      item2Image: item2?.imageUrls?.[0],
      partnerName: partner?.name || partner?.userName || "Unknown User",
      partnerAvatar: partner?.photoURL || partner?.avatar || "",
      givenItemTitle: givenItem?.title || "Unknown Item",
      givenItemImage: givenItem?.imageUrls?.[0] || "",
      receivedItemTitle: receivedItem?.title || "Unknown Item",
      receivedItemImage: receivedItem?.imageUrls?.[0] || "",
      myRating: amUser1 ? trade.user1Rating : trade.user2Rating,
      partnerRating: amUser1 ? trade.user2Rating : trade.user1Rating,
    };
  });
}