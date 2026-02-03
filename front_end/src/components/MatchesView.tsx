import { mockMatches } from '../data/mockData';
import { MessageCircle, Clock } from 'lucide-react';

export function MatchesView() {
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

  return (
    <div className="h-full overflow-y-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Your Matches</h2>

      {mockMatches.length === 0 ? (
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
          {mockMatches.map((match) => (
            <div
              key={match.id}
              className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow"
            >
              <div className="p-4">
                {/* Match Header */}
                <div className="flex items-center gap-2 mb-4 text-sm text-gray-500">
                  <Clock className="w-4 h-4" />
                  <span>Matched {formatTimestamp(match.timestamp)}</span>
                </div>

                {/* Items */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  {/* Your Item */}
                  <div>
                    <p className="text-xs text-gray-500 mb-2">Your Item</p>
                    <div className="relative">
                      <img
                        src={match.item.imageUrls[0]}
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
                        src={match.matchedWith.imageUrls[0]}
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

                {/* Matched User Info */}
                <div className="flex items-center gap-3 mb-4">
                  <img
                    src={match.matchedWith.userAvatar}
                    alt={match.matchedWith.userName}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div className="flex-1">
                    <p className="font-medium">{match.matchedWith.userName}</p>
                    <p className="text-sm text-gray-500">wants to trade</p>
                  </div>
                </div>

                {/* Action Button */}
                <button className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-full font-medium hover:shadow-lg transition-shadow flex items-center justify-center gap-2">
                  <MessageCircle className="w-5 h-5" />
                  <span>Start Chat</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}