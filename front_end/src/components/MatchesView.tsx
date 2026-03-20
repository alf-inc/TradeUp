import React, { useEffect, useState } from "react";
import { MessageCircle, Clock, Check, X } from "lucide-react";
import { auth, db, confirmTrade } from "../firebase/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  updateDoc,
} from "firebase/firestore";

type MatchStatus = "accepted" | "rejected" | "completed";

interface MatchNotification {
  id: string;
  userId: string;
  type: string;
  status?: "accepted" | "rejected";
  createdAt: any;
  payload: {
    otherUserId: string;
    itemId: string;
    mutualItemId: string;
    matchKey?: string;
  };
}

interface MatchItemData {
  id: string;
  title?: string;
  description?: string;
  imageUrls?: string[];
  category?: string;
  condition?: string;
  userId?: string;
  userName?: string;
  userAvatar?: string;
}

interface HydratedMatch {
  id: string;
  item: MatchItemData;
  matchedWith: MatchItemData;
  timestamp: Date;
  status?: MatchStatus;
}

export function MatchesView() {
  const [matches, setMatches] = useState<HydratedMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingMatchId, setSavingMatchId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string>("");

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const fetchMatchesFromNotifications = async () => {
    const user = auth.currentUser;
    if (!user) {
      setMatches([]);
      setLoading(false);
      return;
    }

    try {
      const q = query(
        collection(db, "notifications"),
        where("userId", "==", user.uid),
        where("type", "==", "MUTUAL_MATCH")
      );

      const snapshot = await getDocs(q);
      const notifications = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as MatchNotification[];

      const hydratedMatches = await Promise.all(
        notifications.map(async (notif): Promise<HydratedMatch | null> => {
          const { itemId, mutualItemId } = notif.payload;

          const myItemSnap = await getDoc(doc(db, "items", mutualItemId));
          const theirItemSnap = await getDoc(doc(db, "items", itemId));

          if (!myItemSnap.exists() || !theirItemSnap.exists()) return null;

          const createdAtDate = notif.createdAt?.toDate
            ? notif.createdAt.toDate()
            : new Date();

          return {
            id: notif.id,
            timestamp: createdAtDate,
            item: { ...(myItemSnap.data() as MatchItemData), id: mutualItemId },
            matchedWith: {
              ...(theirItemSnap.data() as MatchItemData),
              id: itemId,
            },
            status: notif.status,
          };
        })
      );

      const cleanMatches = hydratedMatches.filter(
        (match): match is HydratedMatch =>
          match !== null && match.status !== "completed"
      );

      setMatches(cleanMatches);
    } catch (error) {
      console.error("Error fetching matches from notifications:", error);
      setFeedback("Failed to load matches.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatchesFromNotifications();
  }, []);

  const handleStatusUpdate = async (
    matchId: string,
    newStatus: "accepted" | "rejected",
    matchData: HydratedMatch
  ) => {
    if (!auth.currentUser) return;

    const previousMatches = matches;
    setSavingMatchId(matchId);
    setFeedback("");

    // Optimistic UI update
    setMatches((prev) =>
      prev.map((match) =>
        match.id === matchId ? { ...match, status: newStatus } : match
      )
    );

    try {
      // Update my notification status
      const myNotificationRef = doc(db, "notifications", matchId);
      await updateDoc(myNotificationRef, {
        status: newStatus,
      });

      if (newStatus === "rejected") {
        setFeedback("Trade request rejected.");
        return;
      }

      // Check whether the other user already accepted this same match
      const reciprocalQuery = query(
        collection(db, "notifications"),
        where("userId", "==", matchData.matchedWith.userId),
        where("type", "==", "MUTUAL_MATCH"),
        where("payload.otherUserId", "==", auth.currentUser.uid),
        where("payload.itemId", "==", matchData.item.id),
        where("payload.mutualItemId", "==", matchData.matchedWith.id)
      );

      const reciprocalSnapshot = await getDocs(reciprocalQuery);

      if (reciprocalSnapshot.empty) {
        setFeedback("Accepted. Waiting for the other user to respond.");
        return;
      }

      const theirNotification = reciprocalSnapshot.docs[0].data() as MatchNotification;

      if (theirNotification.status !== "accepted") {
        setFeedback("Accepted. Waiting for the other user to respond.");
        return;
      }

      // Both users accepted -> confirm trade in backend
      await confirmTrade(matchId);

      // Remove from active matches so it can live in Trade History instead
      setMatches((prev) => prev.filter((match) => match.id !== matchId));
      setFeedback("Trade confirmed and moved to trade history.");
    } catch (error) {
      console.error("Failed to update match status:", error);
      setMatches(previousMatches);
      setFeedback("Could not update this match. Please try again.");
    } finally {
      setSavingMatchId(null);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-gray-500">Loading matches...</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Your Matches</h2>

      {feedback && (
        <div className="mb-4 rounded-xl border border-purple-100 bg-purple-50 px-4 py-3 text-sm text-purple-700">
          {feedback}
        </div>
      )}

      {matches.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 shadow-lg text-center">
          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageCircle className="w-8 h-8 text-purple-600" />
          </div>
          <h3 className="text-xl font-bold mb-2">No matches yet</h3>
          <p className="text-gray-600">
            Keep swiping to find items you'd like to trade for!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {matches.map((match) => {
            const isSaving = savingMatchId === match.id;

            return (
              <div
                key={match.id}
                className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow"
              >
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-4 text-sm text-gray-500">
                    <Clock className="w-4 h-4" />
                    <span>Matched {formatTimestamp(match.timestamp)}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    {/* Your Item */}
                    <div>
                      <p className="text-xs text-gray-500 mb-2">Your Item</p>
                      <div className="relative">
                        <img
                          src={
                            match.item.imageUrls?.[0] ||
                            "https://via.placeholder.com/150"
                          }
                          alt={match.item.title || "Your item"}
                          className="w-full h-32 object-cover rounded-lg"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent rounded-lg" />
                        <p className="absolute bottom-2 left-2 right-2 text-white text-sm font-medium truncate">
                          {match.item.title || "Untitled Item"}
                        </p>
                      </div>
                    </div>

                    {/* Matched Item */}
                    <div>
                      <p className="text-xs text-gray-500 mb-2">Trade For</p>
                      <div className="relative">
                        <img
                          src={
                            match.matchedWith.imageUrls?.[0] ||
                            "https://via.placeholder.com/150"
                          }
                          alt={match.matchedWith.title || "Matched item"}
                          className="w-full h-32 object-cover rounded-lg"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent rounded-lg" />
                        <p className="absolute bottom-2 left-2 right-2 text-white text-sm font-medium truncate">
                          {match.matchedWith.title || "Untitled Item"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 mb-4">
                    <img
                      src={
                        match.matchedWith.userAvatar ||
                        "https://via.placeholder.com/40"
                      }
                      alt={match.matchedWith.userName || "Trade partner"}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <div className="flex-1">
                      <p className="font-medium">
                        {match.matchedWith.userName || "Unknown User"}
                      </p>
                      <p className="text-sm text-gray-500">wants to trade</p>
                    </div>
                  </div>

                  {match.status ? (
                    <div
                      className={`w-full py-3 rounded-full font-medium text-center flex items-center justify-center gap-2 ${
                        match.status === "accepted"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {match.status === "accepted" ? (
                        <>
                          <Check className="w-5 h-5" />
                          <span>Accepted</span>
                        </>
                      ) : (
                        <>
                          <X className="w-5 h-5" />
                          <span>Rejected</span>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="flex gap-3">
                      <button
                        onClick={() =>
                          handleStatusUpdate(match.id, "rejected", match)
                        }
                        disabled={isSaving}
                        className="flex-1 rounded-full border border-red-200 bg-red-50 px-4 py-3 font-medium text-red-700 hover:bg-red-100 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        <X className="w-5 h-5" />
                        <span>{isSaving ? "Saving..." : "Reject"}</span>
                      </button>

                      <button
                        onClick={() =>
                          handleStatusUpdate(match.id, "accepted", match)
                        }
                        disabled={isSaving}
                        className="flex-1 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-3 font-medium text-white hover:shadow-lg transition-shadow disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        <Check className="w-5 h-5" />
                        <span>{isSaving ? "Saving..." : "Accept"}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}