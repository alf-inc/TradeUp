import { useState } from 'react';
import { X, Check, Package } from 'lucide-react';
import type { MatchItem } from '../types';

interface MatchPopupModalProps {
  matches: MatchItem[];
  onCreateOffer: (selectedItemIds: string[]) => void;
  onCancel: () => void;
}

export function MatchPopupModal({ matches, onCreateOffer, onCancel }: MatchPopupModalProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleItem = (itemId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const handleCreateOffer = () => {
    onCreateOffer(Array.from(selectedIds));
  };

  // The item User A just liked (same across all matches)
  const requestedItem = matches[0];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="text-xl font-bold">It's a Match!</h2>
            <p className="text-sm text-gray-500 mt-1">
              Select items to offer for <span className="font-medium text-gray-700">{requestedItem.itemBTitle}</span>
            </p>
          </div>
          <button
            onClick={onCancel}
            className="p-2.5 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Item List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <p className="text-xs text-gray-400 uppercase tracking-wide font-medium px-1">
            Your items they liked ({matches.length})
          </p>

          {matches.map((match) => {
            const isSelected = selectedIds.has(match.itemA);

            return (
              <button
                key={match.itemA}
                type="button"
                onClick={() => toggleItem(match.itemA)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                  isSelected
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                {/* Checkbox */}
                <div
                  className={`w-6 h-6 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                    isSelected
                      ? 'bg-purple-600 border-purple-600'
                      : 'border-gray-300'
                  }`}
                >
                  {isSelected && <Check className="w-4 h-4 text-white" />}
                </div>

                {/* Item Image */}
                {match.itemAImage ? (
                  <img
                    src={match.itemAImage}
                    alt={match.itemATitle}
                    className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <Package className="w-6 h-6 text-gray-400" />
                  </div>
                )}

                {/* Item Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{match.itemATitle}</p>
                  <p className="text-sm text-gray-500">{match.itemACategory}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 space-y-3">
          <p className="text-center text-sm text-gray-500">
            {selectedIds.size > 0
              ? `${selectedIds.size} item${selectedIds.size > 1 ? 's' : ''} selected`
              : 'Select at least one item'}
          </p>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-full font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCreateOffer}
              disabled={selectedIds.size === 0}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full font-medium hover:shadow-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none"
            >
              Create Offer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
