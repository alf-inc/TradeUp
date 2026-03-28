import { useEffect, useState } from "react";
import { auth } from "../firebase/firebase";
import { getSavedListings, toggleSavedListing } from "../api/savedListings";

type SavedItem = {
  id?: string;
  listingId?: string;
  title?: string;
  description?: string;
  imageUrls?: string[];
  category?: string;
  condition?: string;
};

export function SavedItemsView() {
  const [savedItems, setSavedItems] = useState<SavedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingIds, setUpdatingIds] = useState<string[]>([]);

  const userId = auth.currentUser?.uid ?? null;

  useEffect(() => {
    const fetchSavedItems = async () => {
      if (!userId) {
        setSavedItems([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");
        
        const result = await getSavedListings(userId);
        console.log("saved listings response:", result);

        const items = Array.isArray(result.savedListings) ? result.savedListings : [];
        console.log("items after extraction:", items);
        console.log("items length:", items.length);

        setSavedItems(items);

      } catch (err) {
        console.error("Failed to fetch saved listings:", err);
        setError("Could not load saved items.");
        setSavedItems([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSavedItems();
  }, [userId]);

  const handleUnsave = async (listingId: string) => {
    if (!userId || !listingId) return;

    try {
      setUpdatingIds((prev) => [...prev, listingId]);
      await toggleSavedListing(userId, listingId);
      setSavedItems((prev) => prev.filter((item) => (item.listingId ?? item.id) !== listingId));
    } catch (err) {
      console.error("Failed to unsave listing:", err);
      alert("Failed to update saved item.");
    } finally {
      setUpdatingIds((prev) => prev.filter((id) => id !== listingId));
    }
  };

  if (loading) {
    return (
      <div className="h-full overflow-y-auto p-4">
        <div className="bg-white rounded-2xl p-6 shadow-lg text-gray-600">
          Loading saved items...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full overflow-y-auto p-4">
        <div className="bg-white rounded-2xl p-6 shadow-lg text-red-600">
          {error}
        </div>
      </div>
    );
  }

  if (savedItems.length === 0) {
    return (
      <div className="h-full overflow-y-auto p-4">
        <div className="bg-white rounded-2xl p-8 shadow-lg text-center">
          <h2 className="text-2xl font-bold mb-3">Saved Items</h2>
          <p className="text-gray-600 mb-2">You have no saved items yet.</p>
          <p className="text-gray-500 text-sm">
            Start saving items from the feed to view them here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-4">
      <div className="bg-white rounded-2xl p-6 shadow-lg mb-6">
        <h2 className="text-2xl font-bold">Saved Items</h2>
        <p className="text-sm text-gray-500 mt-1">
          View and manage the listings you have saved.
        </p>
      </div>

      <div className="grid gap-4">
        {savedItems.map((item) => {
          const actualListingId = item.listingId ?? item.id ?? "";
          const thumb = item.imageUrls?.[0] || "https://via.placeholder.com/150";

          return (
            <div
              key={actualListingId}
              className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow"
            >
              <div className="flex gap-4">
                <img
                  src={thumb}
                  alt={item.title || "Saved item"}
                  className="w-24 h-24 object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = "https://via.placeholder.com/150";
                  }}
                />

                <div className="flex-1 p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-bold mb-1">{item.title || "Untitled item"}</h4>
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                        {item.description || "No description available."}
                      </p>
                    </div>

                    <button
                      onClick={() => handleUnsave(actualListingId)}
                      disabled={!actualListingId || updatingIds.includes(actualListingId)}
                      className="px-3 py-2 rounded-full bg-red-50 text-red-600 text-sm font-medium hover:bg-red-100 disabled:opacity-50 min-h-[44px]"
                    >
                      {updatingIds.includes(actualListingId) ? "Updating..." : "Unsave"}
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    {item.category && (
                      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                        {item.category}
                      </span>
                    )}
                    {item.condition && (
                      <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full capitalize">
                        {item.condition}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}