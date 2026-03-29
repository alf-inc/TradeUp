import { useEffect, useState } from 'react';
import SwipeView from './components/SwipeView';
import { ProfileView } from './components/ProfileView';
import { MatchesView } from './components/MatchesView';
import { SavedItemsView } from './components/SavedItemsView';
import { Heart, User, MessageCircle, Settings } from 'lucide-react';

import { auth, getLikedItems } from "./firebase/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { NotificationsBell } from "./components/NotificationsBell";
import { SettingsModal } from "./components/SettingsModal";


export default function App() {

  const [likedItems, setLikedItems] = useState<string[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setUserId(null);
        setLikedItems([]);
        return;
      }

      setUserId(user.uid);

      // Load liked items from Firestore
      try {
        const likes = await getLikedItems(user.uid);
        setLikedItems(likes);
      } catch (e) {
        console.error("Failed to load liked items:", e);
        setLikedItems([]);
      }
    });

    return () => unsub();
  }, []);
  
  const [activeView, setActiveView] = useState<'Listings' | 'matches' | 'profile' | 'saved'>('Listings');
  const [showSettings, setShowSettings] = useState(false);

  return (
    <div className={`min-h-screen bg-blue-50`}>
      <div className="max-w-md mx-auto h-screen flex flex-col relative">
        {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
        {/* Header */}
        <header className="bg-white shadow-sm p-4 relative z-10">
          <div className="relative flex items-center justify-center">
            <h1 className="text-2xl font-bold text-center bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              TradeUp
            </h1>

            <div className="absolute right-0 flex items-center gap-1">
              <NotificationsBell userId={userId} />
              <button
                className="relative p-2.5 rounded-lg hover:bg-gray-100"
                aria-label="Settings"
                onClick={() => setShowSettings(true)}
              >
                <Settings className="w-6 h-6 text-gray-700" />
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-hidden">
          {activeView === 'Listings' && ( 
            <SwipeView
            userId={userId}
            likedItems={likedItems}
            setLikedItems={setLikedItems}
            />
          )}
          {activeView === 'matches' && <MatchesView />}
          {activeView === 'profile' && <ProfileView setActiveView={setActiveView} />}
          {activeView === 'saved' && <SavedItemsView />}
        </main>

        {/* Bottom Navigation */}
        <nav className="bg-white border-t border-gray-200 p-4">
          <div className="flex justify-around items-center">
            <button
              onClick={() => setActiveView('Listings')}
              className={`flex flex-col items-center gap-1 p-3 rounded-lg transition-colors ${
                activeView === 'Listings'
                  ? 'text-purple-600 bg-purple-50'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Heart className="w-6 h-6" />
              <span className="text-xs">Listings</span>
            </button>
            <button
              onClick={() => setActiveView('matches')}
              className={`flex flex-col items-center gap-1 p-3 rounded-lg transition-colors ${
                activeView === 'matches'
                  ? 'text-purple-600 bg-purple-50'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <MessageCircle className="w-6 h-6" />
              <span className="text-xs">Matches</span>
            </button>
            <button
              onClick={() => setActiveView('profile')}
              className={`flex flex-col items-center gap-1 p-3 rounded-lg transition-colors ${
                activeView === 'profile'
                  ? 'text-purple-600 bg-purple-50'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <User className="w-6 h-6" />
              <span className="text-xs">Profile</span>
            </button>
          </div>
        </nav>
      </div>
    </div>
  );
}