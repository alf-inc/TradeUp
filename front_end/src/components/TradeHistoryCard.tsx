import { ArrowRightLeft, Star } from "lucide-react";
import type { CompletedTrade } from "../types";

interface TradeHistoryCardProps {
  trade: CompletedTrade;
}

function RatingBadge({ label, rating }: { label: string; rating: number | null | undefined }) {
  if (rating == null) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-full">
        <Star className="w-3 h-3" />
        {label}: Not rated
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs text-yellow-700 bg-yellow-50 px-2 py-1 rounded-full">
      <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
      {label}: {rating}/10
    </span>
  );
}

export function TradeHistoryCard({ trade }: TradeHistoryCardProps) {
  const fallbackImg = "https://ui-avatars.com/api/?background=e9d5ff&color=7c3aed&name=?";

  const formattedDate = trade.completedAt
    ? new Date(trade.completedAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "Date unknown";

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
      {/* Top bar: partner info + date */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <img
            src={trade.partnerAvatar || fallbackImg}
            alt={trade.partnerName || "Trade partner"}
            className="w-8 h-8 rounded-full object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = fallbackImg;
            }}
          />
          <div>
            <p className="text-sm font-semibold text-gray-800">
              {trade.partnerName || "Unknown User"}
            </p>
            <p className="text-xs text-gray-400">{formattedDate}</p>
          </div>
        </div>
        <span className="text-xs font-medium text-green-700 bg-green-50 px-2 py-1 rounded-full capitalize">
          {trade.status === "confirmed" ? "Completed" : trade.status}
        </span>
      </div>

      {/* Items exchanged: Given → Received */}
      <div className="px-4 py-3">
        <div className="flex items-center gap-3">
          {/* Item given */}
          <div className="flex-1 flex items-center gap-3 bg-red-50/60 rounded-lg p-2">
            <img
              src={trade.givenItemImage || fallbackImg}
              alt={trade.givenItemTitle || "Item given"}
              className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = fallbackImg;
              }}
            />
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-red-400 mb-0.5">
                You Gave
              </p>
              <p className="text-sm font-medium text-gray-800 truncate">
                {trade.givenItemTitle || "Unknown Item"}
              </p>
            </div>
          </div>

          {/* Arrow */}
          <ArrowRightLeft className="w-5 h-5 text-purple-400 flex-shrink-0" />

          {/* Item received */}
          <div className="flex-1 flex items-center gap-3 bg-green-50/60 rounded-lg p-2">
            <img
              src={trade.receivedItemImage || fallbackImg}
              alt={trade.receivedItemTitle || "Item received"}
              className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = fallbackImg;
              }}
            />
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-green-500 mb-0.5">
                You Got
              </p>
              <p className="text-sm font-medium text-gray-800 truncate">
                {trade.receivedItemTitle || "Unknown Item"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Ratings row */}
      <div className="flex items-center gap-2 px-4 pb-4 flex-wrap">
        <RatingBadge label="Your rating" rating={trade.myRating} />
        <RatingBadge label="Their rating" rating={trade.partnerRating} />
      </div>
    </div>
  );
}
