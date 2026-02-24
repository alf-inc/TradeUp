import React, { useEffect, useState } from 'react';
import { MessageCircle, Clock, Check, X } from 'lucide-react';
import { auth, db } from '../firebase/firebase'; 
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';

interface MatchNotification {
  id: string;
  userId: string;
  type: string;
  createdAt: any;
  payload: {
    otherUserId: string;
    itemId: string;        // The item YOU liked (theirs)
    mutualItemId: string;  // The item THEY liked (yours)
  };
}

interface HydratedMatch {
  id: string; 
  item: any;
  matchedWith: any;
  timestamp: Date;
}

export function MatchesView() {
  const [matches, setMatches] = useState<HydratedMatch[]>([]);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    const fetchMatchesFromNotifications = async () => {
      const user = auth.currentUser;
      if (!user) return;

      try {
        const q = query(
          collection(db, "notifications"),
          where("userId", "==", user.uid),
          where("type", "==", "MUTUAL_MATCH")
        );

        const snapshot = await getDocs(q);
        const notifications = snapshot.docs.map(d => ({ 
          id: d.id, 
          ...d.data() 
        })) as MatchNotification[];

        const hydratedMatches = await Promise.all(
          notifications.map(async (notif) => {
            const { itemId, mutualItemId } = notif.payload;
            
            const myItemSnap = await getDoc(doc(db, "items", mutualItemId));
            const theirItemSnap = await getDoc(doc(db, "items", itemId));

            if (!myItemSnap.exists() || !theirItemSnap.exists()) return null;

            const createdAtDate = notif.createdAt?.toDate ? notif.createdAt.toDate() : new Date();

            return {
              id: notif.id,
              timestamp: createdAtDate,
              item: { ...myItemSnap.data(), id: mutualItemId },
              matchedWith: { ...theirItemSnap.data(), id: itemId }
            };
          })
        );

        setMatches(hydratedMatches.filter((m): m is HydratedMatch => m !== null));

      } catch (error) {
        console.error("Error fetching matches from notifications:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMatchesFromNotifications();
  }, []);

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
          {matches.map((match) => (
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
                  <div>
                    <p className="text-xs text-gray-500 mb-2">Your Item</p>
                    <div className="relative">
                      <img
                        src={match.item.imageUrls?.[0] || 'https://via.placeholder.com/150'}
                        alt={match.item.title}
                        className="w-full h-32 object-cover rounded-lg"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent rounded-lg" />
                      <p className="absolute bottom-2 left-2 right-2 text-white text-sm font-medium truncate">
                        {match.item.title}
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500 mb-2">Trade For</p>
                    <div className="relative">
                      <img
                        src={match.matchedWith.imageUrls?.[0] || 'https://via.placeholder.com/150'}
                        alt={match.matchedWith.title}
                        className="w-full h-32 object-cover rounded-lg"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent rounded-lg" />
                      <p className="absolute bottom-2 left-2 right-2 text-white text-sm font-medium truncate">
                        {match.matchedWith.title}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 mb-4">
                  <img
                    src={match.matchedWith.userAvatar || 'https://via.placeholder.com/40'}
                    alt={match.matchedWith.userName}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div className="flex-1">
                    <p className="font-medium">{match.matchedWith.userName}</p>
                    <p className="text-sm text-gray-500">wants to trade</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}