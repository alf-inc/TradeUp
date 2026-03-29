import { useState } from "react";
import {
  ArrowDownUp,
  MessageCircle,
  Star,
  Upload,
  Download,
  CheckCircle,
} from "lucide-react";
import type { CompletedTrade } from "../types";
import { submitTradeRating } from "../api/trades";
import { auth } from "../firebase/firebase";

interface TradeHistoryCardProps {
  trade: CompletedTrade;
  onViewChat?: (trade: CompletedTrade) => void;
  onRatingSubmitted?: () => void;
}

function RatingBadge({
  label,
  rating,
}: {
  label: string;
  rating: number | null | undefined;
}) {
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

export function TradeHistoryCard({
  trade,
  onViewChat,
  onRatingSubmitted,
}: TradeHistoryCardProps) {
  const fallbackImg =
    "https://ui-avatars.com/api/?background=e9d5ff&color=7c3aed&name=?";
  const currentUserId = auth.currentUser?.uid ?? null;

  const [selectedScore, setSelectedScore] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [justSubmitted, setJustSubmitted] = useState(false);
  const [submittedScore, setSubmittedScore] = useState<number | null>(
    trade.myRating ?? null
  );

  const formattedDate = trade.completedAt
    ? new Date(trade.completedAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "Date unknown";

  const displayMyRating = submittedScore ?? trade.myRating ?? null;
  const canShowRatingForm =
    trade.status === "confirmed" && displayMyRating == null;

  const handleSubmitRating = async () => {
    if (!currentUserId) {
      setSubmitError("You must be logged in to submit a rating.");
      return;
    }

    if (displayMyRating != null) {
      setSubmitError("You have already submitted a rating for this trade.");
      return;
    }

    if (selectedScore == null || selectedScore < 1 || selectedScore > 10) {
      setSubmitError("Please select a rating from 1 to 10.");
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitError("");

      await submitTradeRating({
        tradeId: trade.tradeId,
        raterUserId: currentUserId,
        score: selectedScore,
      });

      setSubmittedScore(selectedScore);
      setJustSubmitted(true);
      onRatingSubmitted?.();
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Failed to submit rating."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
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
        <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 px-2 py-1 rounded-full capitalize">
          <CheckCircle className="w-3 h-3" />
          {trade.status === "confirmed" ? "Completed" : trade.status}
        </span>
      </div>

      <div className="px-4 py-3">
        <div className="flex flex-col items-center gap-2">
          <div className="w-full flex items-center gap-3 bg-red-50/60 rounded-lg p-3">
            <img
              src={trade.givenItemImage || fallbackImg}
              alt={trade.givenItemTitle || "Item given"}
              className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = fallbackImg;
              }}
            />
            <div className="min-w-0">
              <p className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-red-400 mb-0.5">
                <Upload className="w-3 h-3" />
                You Gave
              </p>
              <p className="text-sm font-medium text-gray-800 truncate">
                {trade.givenItemTitle || "Unknown Item"}
              </p>
            </div>
          </div>

          <ArrowDownUp className="w-5 h-5 text-purple-400 flex-shrink-0" />

          <div className="w-full flex items-center gap-3 bg-green-50/60 rounded-lg p-3">
            <img
              src={trade.receivedItemImage || fallbackImg}
              alt={trade.receivedItemTitle || "Item received"}
              className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = fallbackImg;
              }}
            />
            <div className="min-w-0">
              <p className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-green-500 mb-0.5">
                <Download className="w-3 h-3" />
                You Got
              </p>
              <p className="text-sm font-medium text-gray-800 truncate">
                {trade.receivedItemTitle || "Unknown Item"}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 px-4 pb-4 flex-wrap">
        <RatingBadge label="Your rating" rating={displayMyRating} />
        <RatingBadge label="Their rating" rating={trade.partnerRating} />
      </div>

      {canShowRatingForm && (
        <div className="px-4 pb-4">
          <div className="rounded-xl border border-purple-100 bg-purple-50 p-4">
            <p className="text-sm font-semibold text-gray-800 mb-2">
              Rate your trade with {trade.partnerName || "this user"}
            </p>

            <div className="grid grid-cols-5 gap-2 mb-3">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
                <button
                  key={score}
                  type="button"
                  onClick={() => setSelectedScore(score)}
                  disabled={isSubmitting}
                  className={`h-9 rounded-lg border text-sm font-medium transition-colors ${
                    selectedScore === score
                      ? "bg-purple-600 text-white border-purple-600"
                      : "bg-white text-purple-700 border-purple-200 hover:bg-purple-100"
                  }`}
                >
                  {score}
                </button>
              ))}
            </div>

            {submitError && (
              <p className="text-sm text-red-500 mb-3">{submitError}</p>
            )}

            <button
              type="button"
              onClick={handleSubmitRating}
              disabled={isSubmitting}
              className="w-full py-2.5 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition-colors disabled:opacity-60"
            >
              {isSubmitting ? "Submitting..." : "Submit Rating"}
            </button>
          </div>
        </div>
      )}

      {justSubmitted && (
        <div className="px-4 pb-4">
          <p className="text-sm text-green-600 font-medium">
            Rating submitted successfully.
          </p>
        </div>
      )}

      {onViewChat && (
        <div className="px-4 pb-4">
          <button
            onClick={() => onViewChat(trade)}
            className="w-full py-2.5 bg-purple-100 text-purple-700 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-purple-200 transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            <span>View Chat</span>
          </button>
        </div>
      )}
    </div>
  );
}