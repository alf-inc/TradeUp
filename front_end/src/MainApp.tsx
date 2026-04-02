import { useEffect, useState } from 'react';
import SwipeView from './components/SwipeView';
import { ProfileView } from './components/ProfileView';
import { MatchesView } from './components/MatchesView';
import { SavedItemsView } from './components/SavedItemsView';
import { Heart, User, MessageCircle, Settings, AlertTriangle } from 'lucide-react';

import { auth, getLikedItems } from "./firebase/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { NotificationsBell } from "./components/NotificationsBell";
import { SettingsModal } from "./components/SettingsModal";

type View = 'Listings' | 'matches' | 'profile' | 'saved';

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

  const [activeView, setActiveView] = useState<View>('Listings');
  const [showSettings, setShowSettings] = useState(false);

  // Unsaved profile edit tracking
  const [profileDirty, setProfileDirty] = useState(false);
  const [pendingNav, setPendingNav] = useState<View | null>(null);

  // Called by nav buttons — intercepts if profile edit has unsaved changes
  const handleNavigate = async (view: View) => {
    if (profileDirty && activeView === 'profile') {
      setPendingNav(view);
      return;
    }
    setActiveView(view);

    // Refresh liked items from Firestore when switching to Listings
    // so that backend changes (e.g. rejection unliking) are reflected
    if (view === 'Listings' && userId) {
      try {
        const likes = await getLikedItems(userId);
        setLikedItems(likes);
      } catch { /* non-critical */ }
    }
  };

  // User chose to discard changes and navigate away
  const handleDiscard = () => {
    if (pendingNav) {
      setProfileDirty(false);
      setActiveView(pendingNav);
      setPendingNav(null);
    }
  };

  // User chose to stay on the profile page
  const handleStay = () => {
    setPendingNav(null);
  };

  return (
    <div className={`min-h-screen bg-blue-50`}>
      <div className="max-w-md mx-auto h-screen flex flex-col relative">
        {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}

        {/* Unsaved changes prompt */}
        {pendingNav && (
          <div className="absolute inset-0 z-50 bg-black/50 flex items-center justify-center p-6">
            <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                </div>
                <h2 className="text-base font-bold text-gray-900">Unsaved Changes</h2>
              </div>
              <p className="text-sm text-gray-600 mb-5">
                You have unsaved changes to your profile. If you leave now they will be lost.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleStay}
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Stay
                </button>
                <button
                  onClick={handleDiscard}
                  className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors"
                >
                  Discard
                </button>
              </div>
            </div>
          </div>
        )}

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
          {activeView === 'profile' && (
            <ProfileView
              setActiveView={handleNavigate}
              onDirtyChange={setProfileDirty}
            />
          )}
          {activeView === 'saved' && <SavedItemsView />}
        </main>

        {/* Bottom Navigation */}
        <nav className="bg-white border-t border-gray-200 p-4">
          <div className="flex justify-around items-center">
            <button
              onClick={() => handleNavigate('Listings')}
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
              onClick={() => handleNavigate('matches')}
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
              onClick={() => handleNavigate('profile')}
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
