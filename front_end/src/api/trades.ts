import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase/firebase";
import type { CompletedTrade } from "../types";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

export async function fetchTradeHistory(userId: string): Promise<CompletedTrade[]> {
  const url = new URL(`${API_BASE}/trades/history`);
  url.searchParams.set("userId", userId);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error("Failed to fetch trade history");

  const data = await res.json();
  const rawTrades: any[] = data.trades ?? [];

  const hydrated = await Promise.all(
    rawTrades.map(async (t): Promise<CompletedTrade> => {
      const isUser1 = t.user1_id === userId;
      const myItemId = isUser1 ? t.item1_id : t.item2_id;
      const theirItemId = isUser1 ? t.item2_id : t.item1_id;
      const partnerId = isUser1 ? t.user2_id : t.user1_id;
      const myRating = isUser1 ? t.user2_rating : t.user1_rating;
      const partnerRating = isUser1 ? t.user1_rating : t.user2_rating;

      const [myItemSnap, theirItemSnap, partnerSnap] = await Promise.all([
        getDoc(doc(db, "items", myItemId)),
        getDoc(doc(db, "items", theirItemId)),
        getDoc(doc(db, "users", partnerId)),
      ]);

      const myItem = myItemSnap.exists() ? myItemSnap.data() : null;
      const theirItem = theirItemSnap.exists() ? theirItemSnap.data() : null;
      const partner = partnerSnap.exists() ? partnerSnap.data() : null;

      return {
        id: t.id,
        tradeId: t.trade_id ?? t.matchKey ?? t.id,
        user1Id: t.user1_id,
        user2Id: t.user2_id,
        item1Id: t.item1_id,
        item2Id: t.item2_id,
        user1Rating: t.user1_rating ?? null,
        user2Rating: t.user2_rating ?? null,
        status: t.status ?? "confirmed",
        completedAt: t.completedAt ?? undefined,
        givenItemTitle: myItem?.title,
        givenItemImage: myItem?.imageUrls?.[0],
        receivedItemTitle: theirItem?.title,
        receivedItemImage: theirItem?.imageUrls?.[0],
        partnerName: partner?.name || theirItem?.userName,
        partnerAvatar: partner?.photoURL || theirItem?.userAvatar,
        myRating: myRating ?? null,
        partnerRating: partnerRating ?? null,
      };
    })
  );

  return hydrated;
}

export type SubmitTradeRatingPayload = {
  tradeId: string;
  raterUserId: string;
  score: number;
};

export async function submitTradeRating(payload: SubmitTradeRatingPayload) {
  const url = new URL(`${API_BASE}/ratings/submit`);
  url.searchParams.set("tradeId", payload.tradeId);
  url.searchParams.set("raterUserId", payload.raterUserId);
  url.searchParams.set("score", String(payload.score));

  const res = await fetch(url.toString(), {
    method: "POST",
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText || "Failed to submit rating");
  }

  return res.json();
}
