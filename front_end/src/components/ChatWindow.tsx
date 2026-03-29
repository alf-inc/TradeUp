import React, { useEffect, useState, useRef } from 'react';
import { X, Send, Check, Clock, Ban } from 'lucide-react';
import { doc, updateDoc, collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase/firebase';

interface Message {
  messageId: string;
  senderId: string;
  message: string;
  timestamp?: any;
}

interface ChatWindowProps {
  chatId: string;
  notificationId?: string;
  matchedWith: {
    userName: string;
    userAvatar?: string;
  };
  initialStatus?: 'accepted' | 'rejected';
  isFullyConfirmed?: boolean;
  readOnly?: boolean;
  onClose: () => void;
}

export function ChatWindow({ chatId, notificationId, matchedWith, initialStatus,
  isFullyConfirmed, readOnly, onClose }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [wsReady, setWsReady] = useState(false);

  const [tradeState, setTradeState] = useState<'idle' | 'waiting' | 'confirmed' | 'rejected'>(() => {
    if (isFullyConfirmed) return 'confirmed';
    if (initialStatus === 'accepted') return 'waiting';
    if (initialStatus === 'rejected') return 'rejected';
    return 'idle';
  });
  const [isConfirming, setIsConfirming] = useState(false);
  
  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentUserId = auth.currentUser?.uid;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!currentUserId || !chatId) return;

    let isMounted = true;
    let unsubscribe: (() => void) | null = null;

    const initializeChat = async () => {
      setFetchError(null);
      setLoading(true);

      try {
        // 1. Setup Firestore Real-time Listener
        // We target the subcollection: chats/{chatId}/messages
        const messagesRef = collection(db, "chats", chatId, "messages");
        const q = query(messagesRef, orderBy("timestamp", "asc"));

        unsubscribe = onSnapshot(q, (snapshot) => {
          if (!isMounted) return;

          const updatedMessages = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
              messageId: doc.id,
              senderId: data.senderId,
              message: data.message,
              timestamp: data.timestamp,
            } as Message;
          });

          setMessages(updatedMessages);
          setLoading(false); // Data has arrived
        }, (error) => {
          console.error("Firestore onSnapshot error:", error);
          if (isMounted) setFetchError("Failed to sync messages.");
        });

        // 2. Keep WebSocket for WRITING if needed by backend logic
        // But we no longer use ws.onmessage to update the state
        if (!readOnly) {
          const wsUrl = `ws://localhost:8000/chats/ws/${chatId}?userId=${currentUserId}`;
          const ws = new WebSocket(wsUrl);

          ws.onopen = () => { if (isMounted) setWsReady(true); };
          ws.onclose = () => { if (isMounted) setWsReady(false); };
          
          // Note: We ignore ws.onmessage because onSnapshot handles the UI update
          wsRef.current = ws;
        }
      } catch (error) {
        if (isMounted) {
          setFetchError(error instanceof Error ? error.message : 'Could not connect.');
          setLoading(false);
        }
      }
    };

    initializeChat();

    // Cleanup: This runs when the component unmounts or chatId changes
    return () => {
      isMounted = false;
      if (unsubscribe) {
        unsubscribe(); // Critical: Detach the Firestore listener
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [chatId, currentUserId]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !wsRef.current || !currentUserId) return;
    if (wsRef.current.readyState !== WebSocket.OPEN) return;

    const payload = {
      senderId: currentUserId,
      message: inputText.trim(),
    };

    wsRef.current.send(JSON.stringify(payload));
    setInputText('');
  };

  const handleConfirmTrade = async () => {
    if (!notificationId) return;
    setIsConfirming(true);
    try {
      // 1. Update YOUR notification to 'accepted' in Firestore
      const notifRef = doc(db, 'notifications', notificationId);
      await updateDoc(notifRef, {
        status: 'accepted'
      });

      // 2. Ping the backend to check if the OTHER user also accepted
      const res = await fetch(`http://localhost:8000/trades/confirm?notificationId=${notificationId}`, {
        method: 'POST'
      });

      if (res.ok) {
        const data = await res.json();
        
        // 3. Update UI based on backend response
        if (data.confirmed) {
          setTradeState('confirmed');
        } else {
          // You accepted, but the backend couldn't confirm because the other user hasn't yet
          setTradeState('waiting'); 
        }
      } else {
        const text = await res.text();
        console.error("Failed to confirm trade:", text);
      }
    } catch (error) {
      console.error("Error confirming trade:", error);
    } finally {
      setIsConfirming(false);
    }
  };

  if (!currentUserId) return null;

  return (
    <div className="h-full flex flex-col bg-gray-50 absolute inset-0 z-50">
      {/* Header */}
      <div className="bg-white border-b px-3 py-3 flex items-center justify-between gap-2 shadow-sm">
        <div className="flex items-center gap-3 min-w-0">
          <img
            src={matchedWith.userAvatar || `https://ui-avatars.com/api/?background=e9d5ff&color=7c3aed&name=${encodeURIComponent(matchedWith.userName || '?')}`}
            alt={matchedWith.userName}
            className="w-10 h-10 rounded-full object-cover border border-gray-200 shrink-0"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = `https://ui-avatars.com/api/?background=e9d5ff&color=7c3aed&name=${encodeURIComponent(matchedWith.userName || '?')}`;
            }}
          />
          <h2 className="text-base font-bold text-gray-800 truncate">{matchedWith.userName}</h2>
        </div>
        
        {/* Header Action Buttons */}
        <div className="flex items-center gap-2">
          {readOnly ? (
            <span className="flex items-center gap-1 px-3 py-2 rounded-full text-sm font-medium bg-green-100 text-green-700">
              <Check className="w-4 h-4" />
              <span>Trade Completed</span>
            </span>
          ) : (
            <button
              onClick={handleConfirmTrade}
              disabled={tradeState !== 'idle' || isConfirming}
              className={`flex items-center gap-1 px-3 py-2 rounded-full text-sm font-medium transition-colors min-h-[44px] ${
                tradeState === 'confirmed'
                  ? 'bg-green-100 text-green-700 cursor-default'
                  : tradeState === 'waiting'
                  ? 'bg-yellow-100 text-yellow-700 cursor-default'
                  : tradeState === 'rejected'
                  ? 'bg-red-100 text-red-700 cursor-default'
                  : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
              }`}
            >
              {isConfirming ? (
                <span>Processing...</span>
              ) : tradeState === 'confirmed' ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Confirmed!</span>
                </>
              ) : tradeState === 'waiting' ? (
                <>
                  <Clock className="w-4 h-4" />
                  <span>Waiting for {matchedWith.userName}...</span>
                </>
              ) : tradeState === 'rejected' ? (
                <>
                  <Ban className="w-4 h-4" />
                  <span>Trade Declined</span>
                </>
              ) : (
                <span>Confirm Trade</span>
              )}
            </button>
          )}

          <button
            onClick={onClose}
            className="p-2.5 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Close Chat"
          >
            <X className="w-6 h-6 text-gray-700" />
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="flex h-full items-center justify-center text-gray-500">Loading chat...</div>
        ) : fetchError ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center px-4">
            <p className="text-red-500 text-sm">{fetchError}</p>
            <button
              onClick={() => {
                setFetchError(null);
                setLoading(true);
                const run = async () => {
                  try {
                    const res = await fetch(`http://localhost:8000/chats/${chatId}/messages?userId=${currentUserId}`);
                    if (!res.ok) throw new Error(`Failed to load messages (${res.status})`);
                    const data = await res.json();
                    setMessages(data.messages || []);
                  } catch (err) {
                    setFetchError(err instanceof Error ? err.message : 'Could not load messages. Please try again.');
                  } finally {
                    setLoading(false);
                  }
                };
                run();
              }}
              className="text-sm text-purple-600 underline hover:text-purple-800"
            >
              Retry
            </button>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-gray-500">
            {readOnly ? 'No messages were exchanged.' : 'No messages yet. Say hi!'}
          </div>
        ) : (
          messages.map((msg, index) => {
            const isMe = msg.senderId === currentUserId;
            return (
              <div 
                key={msg.messageId || index} 
                className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
              >
                <div 
                  className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                    isMe 
                      ? 'bg-purple-600 text-white rounded-br-sm' 
                      : 'bg-white border text-gray-800 rounded-bl-sm shadow-sm'
                  }`}
                >
                  <p className="break-words">{msg.message}</p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      {readOnly ? (
        <div className="bg-gray-50 border-t px-4 py-3 text-center text-sm text-gray-400">
          This trade has been completed. Chat is read-only.
        </div>
      ) : (
        <div className="bg-white border-t p-4 pb-6">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 bg-gray-100 border-transparent focus:bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-200 rounded-full px-4 py-2.5 outline-none transition-all"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || !wsReady}
              className="bg-purple-600 text-white p-2 rounded-full hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center w-11 h-11 shrink-0"
            >
              <Send className="w-5 h-5 ml-1" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
