import React, { useEffect, useState } from 'react';
import { MessageCircle, Clock } from 'lucide-react';
import { auth, db } from '../firebase/firebase'; 
import { collection, query, where, getDocs, doc, getDoc, orderBy, limit } from 'firebase/firestore';
import { ChatWindow } from './ChatWindow'; 

interface MatchNotification {
  id: string;
  userId: string;
  type: string;
  status?: 'accepted' | 'rejected'; 
  confirmed?: boolean;
  createdAt: any;
  payload: {
    otherUserId: string;
    itemId: string;
    mutualItemId: string;
  };
}

interface HydratedMatch {
  id: string;
  item: any;
  matchedWith: any;
  otherUserId: string;
  timestamp: Date;
  status?: 'accepted' | 'rejected';
  confirmed?: boolean;
  chatId?: string;
  lastMessage?: string;
  lastMessageAt?: Date;
}

const SESSION_KEY = 'tradeup_active_chat';

export function MatchesView() {
  const [matches, setMatches] = useState<HydratedMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [knownChats, setKnownChats] = useState<Array<{ chatId: string; participants: string[]; notificationId: string; lastMessage: string; lastMessageAt: any }>>([]);

  // State to track if we are viewing a specific chat
  const [activeChat, setActiveChat] = useState<{
    chatId: string;
    notificationId: string;
    matchedWith: any;
    status?: 'accepted' | 'rejected';
    confirmed?: boolean;
  } | null>(() => {
    try {
      const saved = sessionStorage.getItem(SESSION_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

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

  const openChat = (chatId: string, match: HydratedMatch) => {
    const chat = {
      chatId,
      notificationId: match.id,
      matchedWith: match.matchedWith,
      status: match.status,
      confirmed: match.confirmed,
    };
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(chat));
    } catch { /* ignore */ }
    setActiveChat(chat);
  };

  const closeChat = () => {
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch { /* ignore */ }
    setActiveChat(null);
    setRefreshKey(k => k + 1);
  };

  const handleOpenChat = async (match: HydratedMatch) => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;

    // If we already have the chatId from preloading, use it
    if (match.chatId) {
      openChat(match.chatId, match);
      return;
    }

    // Before calling initiate, check if a shared chat already exists by participants.
    // This prevents creating a duplicate chat when the other user already initiated one.
    const existingChat = knownChats.find(c =>
      Array.isArray(c.participants) &&
      c.participants.includes(uid) &&
      c.participants.includes(match.otherUserId)
    );
    if (existingChat) {
      openChat(existingChat.chatId, match);
      return;
    }

    try {
      const res = await fetch('http://localhost:8000/chats/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentUserId: uid,
          likedItemId: match.matchedWith.id,
          mutualItemId: match.item.id,
          notificationId: match.id,
        }),
      });

      if (!res.ok) throw new Error('Failed to initiate chat');

      const data = await res.json();
      if (data.chatId) {
        openChat(data.chatId, match);
      }
    } catch (error) {
      console.error("Error opening chat:", error);
    }
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
          notifications.map(async (notif): Promise<HydratedMatch | null> => {
            const { itemId, mutualItemId, otherUserId } = notif.payload as any;

            // Fetch both items
            const item1Snap = await getDoc(doc(db, "items", mutualItemId));
            const item2Snap = await getDoc(doc(db, "items", itemId));

            if (!item1Snap.exists() || !item2Snap.exists()) return null;

            const item1Data = item1Snap.data();
            const item2Data = item2Snap.data();

            // Determine which item belongs to the logged-in user.
            const isItem1Mine = item1Data.userId === user.uid;

            const myItem = isItem1Mine 
              ? { ...item1Data, id: mutualItemId } 
              : { ...item2Data, id: itemId };
              
            const theirItem = isItem1Mine 
              ? { ...item2Data, id: itemId } 
              : { ...item1Data, id: mutualItemId };

            const createdAtDate = notif.createdAt?.toDate ? notif.createdAt.toDate() : new Date();

            return {
              id: notif.id,
              otherUserId: otherUserId || '',
              timestamp: createdAtDate,
              item: myItem,             // Always the current user's item
              matchedWith: theirItem,   // Always the other user's item
              status: notif.status,
              confirmed: notif.confirmed,
            };
          })
        );

        const cleanMatches = hydratedMatches
          .filter((m): m is HydratedMatch => m !== null)
          .filter((m) => m.confirmed !== true);

        // Fetch all chats to get lastMessage preview and chatId for each match
        try {
          const chatsRes = await fetch(`http://localhost:8000/chats?userId=${user.uid}`);
          if (chatsRes.ok) {
            const chatsData = await chatsRes.json();
            const chats: Array<{ chatId: string; participants: string[]; notificationId: string; lastMessage: string; lastMessageAt: any }> = chatsData.chats || [];
            setKnownChats(chats);

            for (const match of cleanMatches) {
              // First try to match by notificationId (works for the user who initiated the chat)
              let chat = chats.find(c => c.notificationId === match.id);

              // Fallback: match by participants (works for the other user in the match)
              if (!chat) {
                chat = chats.find(c =>
                  Array.isArray(c.participants) &&
                  c.participants.includes(user.uid) &&
                  c.participants.includes(match.otherUserId)
                );
              }

              if (chat) {
                match.chatId = chat.chatId;
                match.lastMessage = chat.lastMessage || '';
                match.lastMessageAt = chat.lastMessageAt ? new Date(chat.lastMessageAt) : undefined;
              }
            }
          }
        } catch {
        }

        // Override lastMessage with the last message sent by the OTHER user
        // so each user sees what the other person said, not their own last message
        await Promise.all(
          cleanMatches
            .filter(m => m.chatId && m.otherUserId)
            .map(async (match) => {
              try {
                const msgRef = collection(db, 'chats', match.chatId!, 'messages');
                // Get the last 20 messages and find the most recent from the other user
                const msgSnap = await getDocs(query(msgRef, orderBy('timestamp', 'desc'), limit(20)));
                const otherMsg = msgSnap.docs.find(d => d.data().senderId === match.otherUserId);
                if (otherMsg) {
                  match.lastMessage = otherMsg.data().message;
                } else {
                  match.lastMessage = '';
                }
              } catch {
                // keep existing value on error
              }
            })
        );

        // Sort by most recent chat activity, then by match timestamp
        cleanMatches.sort((a, b) => {
          const aTime = a.lastMessageAt ?? a.timestamp;
          const bTime = b.lastMessageAt ?? b.timestamp;
          return bTime.getTime() - aTime.getTime();
        });

        setMatches(cleanMatches);

      } catch (error) {
        console.error("Error fetching matches from notifications:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMatchesFromNotifications();
  }, [refreshKey]);

  // Chat View
  if (activeChat) {
    return (
      <ChatWindow
        key={activeChat.chatId}
        chatId={activeChat.chatId}
        notificationId={activeChat.notificationId}
        matchedWith={activeChat.matchedWith}
        initialStatus={activeChat.status}
        isFullyConfirmed={activeChat.confirmed}
        onClose={closeChat}
      />
    );
  }

  // --- Match Feed View ---
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
                  <span>
                    {match.lastMessageAt
                      ? `Active ${formatTimestamp(match.lastMessageAt)}`
                      : `Matched ${formatTimestamp(match.timestamp)}`}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  {/* Your Item */}
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

                  {/* Matched Item */}
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

                <div className="flex items-center gap-3 mb-6">
                  <img
                    src={match.matchedWith.userAvatar || 'https://via.placeholder.com/40'}
                    alt={match.matchedWith.userName}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{match.matchedWith.userName}</p>
                    {match.lastMessage ? (
                      <p className="text-sm text-gray-500 truncate">{match.lastMessage}</p>
                    ) : (
                      <p className="text-sm text-gray-400 italic">No messages yet</p>
                    )}
                  </div>
                  {match.lastMessageAt && (
                    <span className="text-xs text-gray-400 shrink-0">
                      {formatTimestamp(match.lastMessageAt)}
                    </span>
                  )}
                </div>

                {/* Open Chat Button */}
                <button 
                  onClick={() => handleOpenChat(match)}
                  className="w-full py-3 bg-purple-600 text-white rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-purple-700 transition-colors"
                >
                  <MessageCircle className="w-5 h-5" />
                  <span>Open Chat</span>
                </button>
                
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}