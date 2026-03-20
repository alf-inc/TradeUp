import React, { useEffect, useState, useRef } from 'react';
import { X, Send } from 'lucide-react';
import { auth } from '../firebase/firebase';

interface Message {
  messageId: string;
  senderId: string;
  message: string;
  timestamp?: any;
}

interface ChatWindowProps {
  chatId: string;
  matchedWith: {
    userName: string;
    userAvatar?: string;
  };
  onClose: () => void;
}

export function ChatWindow({ chatId, matchedWith, onClose }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  
  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentUserId = auth.currentUser?.uid;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!currentUserId || !chatId) return;

    let isMounted = true;

    const initializeChat = async () => {
      try {
        const res = await fetch(`http://localhost:8000/chats/${chatId}/messages?userId=${currentUserId}`);
        if (res.ok && isMounted) {
          const data = await res.json();
          setMessages(data.messages || []);
        }

        const wsUrl = `ws://localhost:8000/chats/ws/${chatId}?userId=${currentUserId}`;
        const ws = new WebSocket(wsUrl);

        ws.onmessage = (event) => {
          const incomingMessage = JSON.parse(event.data);
          
          if (incomingMessage.error) {
            console.error('WebSocket Error:', incomingMessage.error);
            return;
          }

          if (isMounted) {
            setMessages((prev) => [...prev, incomingMessage]);
          }
        };

        wsRef.current = ws;
      } catch (error) {
        console.error('Failed to initialize chat:', error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    initializeChat();

    return () => {
      isMounted = false;
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [chatId, currentUserId]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !wsRef.current || !currentUserId) return;

    const payload = {
      senderId: currentUserId,
      message: inputText.trim(),
    };

    wsRef.current.send(JSON.stringify(payload));
    setInputText('');
  };

  if (!currentUserId) return null;

  return (
    <div className="h-full flex flex-col bg-gray-50 absolute inset-0 z-50">
      {/* Header */}
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <img
            src={matchedWith.userAvatar || 'https://via.placeholder.com/40'}
            alt={matchedWith.userName}
            className="w-10 h-10 rounded-full object-cover border border-gray-200"
          />
          <h2 className="text-lg font-bold text-gray-800">{matchedWith.userName}</h2>
        </div>
        <button 
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          aria-label="Close Chat"
        >
          <X className="w-6 h-6 text-gray-700" />
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="flex h-full items-center justify-center text-gray-500">Loading chat...</div>
        ) : messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-gray-500">No messages yet. Say hi!</div>
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
      <div className="bg-white border-t p-4 pb-6">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-gray-100 border-transparent focus:bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-200 rounded-full px-4 py-2 outline-none transition-all"
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="bg-purple-600 text-white p-2 rounded-full hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center w-10 h-10 shrink-0"
          >
            <Send className="w-5 h-5 ml-1" />
          </button>
        </form>
      </div>
    </div>
  );
}