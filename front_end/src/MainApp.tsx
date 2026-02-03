import { useState } from 'react';
import { SwipeView } from './components/SwipeView';
import { ProfileView } from './components/ProfileView';
import { MatchesView } from './components/MatchesView';
import { Heart, User, MessageCircle } from 'lucide-react';

export default function App() {
  const [activeView, setActiveView] = useState<'Listings' | 'matches' | 'profile'>('Listings');

  return (
    <div className={`min-h-screen bg-blue-50`}>
      <div className="max-w-md mx-auto h-screen flex flex-col">
        {/* Header */}
        <header className="bg-Wihte shadow-sm p-4 relative z-10">
          <h1 className="text-2xl font-bold text-center bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            TradeUp
          </h1>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-hidden">
          {activeView === 'Listings' && <SwipeView />}
          {activeView === 'matches' && <MatchesView />}
          {activeView === 'profile' && <ProfileView />}
        </main>

        {/* Bottom Navigation */}
        <nav className="bg-white border-t border-gray-200 p-4">
          <div className="flex justify-around items-center">
            <button
              onClick={() => setActiveView('Listings')}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
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
              className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
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
              className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
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