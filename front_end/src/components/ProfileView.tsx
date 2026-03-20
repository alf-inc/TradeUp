import { useEffect, useState } from "react";
import { currentUser } from "../data/mockData";
import { Plus, Edit2, Trash2, X, Check, History } from "lucide-react";
import { AddItemModal } from "./AddItemModal";
import { TradeHistoryCard } from "./TradeHistoryCard";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";
import { onAuthStateChanged } from "firebase/auth";
import {
  auth,
  getMyProfile,
  saveMyProfile,
  saveNewItem,
  getUserItems,
  deleteItem,
  getTradeHistory,
} from "../firebase/firebase";
import type { CompletedTrade } from "../types";

export function ProfileView() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  const [items, setItems] = useState<any[]>([]);

  // Auth state
  const [uid, setUid] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUid(user?.uid ?? null);
      setAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // Profile state (Firestore)
  const [profile, setProfile] = useState<{
    name: string;
    photoURL: string;
    bio: string;
    averageRating: number;
    ratingsReceivedCount: number;
    completedTradeCount: number;
  }>({
    name: "My Profile",
    photoURL: "",
    bio: "",
    averageRating: 0,
    ratingsReceivedCount: 0,
    completedTradeCount: 0,
  });

  // Edit form state (URL + Bio)
  const [editBio, setEditBio] = useState("");
  const [editPhotoURL, setEditPhotoURL] = useState("");
  const [editName, setEditName] = useState("");

  const [loadingProfile, setLoadingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [saveError, setSaveError] = useState<string>("");

  // NEW: Item loading + error
  const [loadingItems, setLoadingItems] = useState(false);
  const [itemsError, setItemsError] = useState("");

  // Trade history state
  const [tradeHistory, setTradeHistory] = useState<CompletedTrade[]>([]);
  const [loadingTrades, setLoadingTrades] = useState(false);
  const [tradesError, setTradesError] = useState("");

  // Load profile + items from Firestore when uid is available
  useEffect(() => {
    if (!uid) return;

    (async () => {
      setLoadingProfile(true);
      setLoadingItems(true);
      setItemsError("");

      try {
        const p = await getMyProfile(uid);

        const name = p.name ?? "My Profile";
        const bio = p.bio ?? "";
        const photoURL = p.photoURL ?? "";
        const averageRating =
          typeof p.average_rating === "number" ? p.average_rating : 0;
        const ratingsReceivedCount =
          typeof p.ratings_received_count === "number"
            ? p.ratings_received_count
            : 0;
        const completedTradeCount =
          typeof p.completed_trade_count === "number"
            ? p.completed_trade_count
            : 0;

        setProfile((prev) => ({
          ...prev,
          name,
          photoURL,
          bio,
          averageRating,
          ratingsReceivedCount,
          completedTradeCount,
        }));
        setEditName(name);
        setEditBio(bio);
        setEditPhotoURL(photoURL);

        // Load user's items
        const userItems = await getUserItems(uid);

        // Optional: sort newest first if createdAt exists
        userItems.sort((a: any, b: any) => (b.createdAt ?? 0) - (a.createdAt ?? 0));

        setItems(userItems);
      } catch (error) {
        console.error("Error loading profile/items:", error);
        setItemsError("Failed to load your items.");
      } finally {
        setLoadingProfile(false);
        setLoadingItems(false);
      }
    })();
  }, [uid]);

  // Load completed trade history from backend when uid is available
  useEffect(() => {
    if (!uid) {
      setTradeHistory([]);
      setTradesError("");
      setLoadingTrades(false);
      return;
    }

    (async () => {
      setLoadingTrades(true);
      setTradesError("");

      try {
        const history = await getTradeHistory(uid);
        setTradeHistory(history);

        // Keep the trade counter in sync with real loaded history
        setProfile((prev) => ({
          ...prev,
          completedTradeCount: history.length,
        }));
      } catch (error) {
        console.error("Error loading trade history:", error);
        setTradesError("Failed to load trade history.");
      } finally {
        setLoadingTrades(false);
      }
    })();
  }, [uid]);

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm("Are you sure you want to delete this item?")) return;
    try {
      await deleteItem(itemId); // Delete from Firestore

      // Functional update prevents stale-state bugs
      setItems((prev) => prev.filter((item) => item.id !== itemId));
    } catch (e) {
      console.error("Failed to delete item", e);
      alert("Failed to delete item");
    }
  };

  const handleCancelEdit = () => {
    setEditName(profile.name);
    setEditBio(profile.bio);
    setEditPhotoURL(profile.photoURL);
    setIsEditingProfile(false);
    setSaveError("");
  };

  const handleSaveProfile = async () => {
    if (!uid) return;

    setSavingProfile(true);
    setSaveError("");

    try {
      const newName = editName.trim().slice(0, 11);
      const newBio = editBio.trim();
      const newPhotoURL = editPhotoURL.trim();

      console.log("[US2] saving profile to firestore...", {
        newName,
        newBio,
        newPhotoURL,
      });

      await saveMyProfile(uid, {
        name: newName,
        bio: newBio,
        photoURL: newPhotoURL,
      });

      setProfile((prev) => ({
        ...prev,
        name: newName,
        bio: newBio,
        photoURL: newPhotoURL,
      }));

      setIsEditingProfile(false);
    } catch (e: any) {
      console.error("[US2] save failed ❌", e);
      setSaveError(e?.message ?? String(e));
    } finally {
      setSavingProfile(false);
    }
  };

  // Auth gating
  if (!authReady) {
    return <div className="p-6">Checking login...</div>;
  }

  if (!uid) {
    return (
      <div className="p-6">
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <h2 className="text-xl font-bold mb-2">
            {(profile.name?.trim() ? profile.name : "My Profile").slice(0, 11)}
          </h2>
          <p className="text-gray-600">Please log in to edit your profile.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6">
        {/* Profile Header */}
        <div className="bg-white rounded-2xl p-6 shadow-lg mb-6">
          {loadingProfile ? (
            <div className="text-gray-600">Loading profile...</div>
          ) : !isEditingProfile ? (
            <div className="flex items-start gap-4 mb-4">
              <div className="relative">
                <img
                  src={profile.photoURL || currentUser.avatar}
                  alt={profile.name}
                  className="w-20 h-20 rounded-full object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = currentUser.avatar;
                  }}
                />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-2xl font-bold">{profile.name}</h2>
                  <button
                    onClick={() => {
                      setEditName(profile.name);
                      setEditBio(profile.bio);
                      setEditPhotoURL(profile.photoURL);
                      setSaveError("");
                      setIsEditingProfile(true);
                    }}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <Edit2 className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
                <p className="text-gray-600 italic">
                  {profile.bio || "No bio yet. Add one to help people know you better!"}
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  Rating:{" "}
                  <span className="font-semibold text-gray-700">
                    {profile.averageRating.toFixed(2)}/10
                  </span>{" "}
                  ({profile.ratingsReceivedCount}{" "}
                  {profile.ratingsReceivedCount === 1 ? "rating" : "ratings"})
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg">Edit Profile</h3>
                <div className="flex gap-2">
                  <button
                    onClick={handleCancelEdit}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
                    disabled={savingProfile}
                    title="Cancel"
                  >
                    <X className="w-5 h-5" />
                  </button>
                  <button
                    onClick={handleSaveProfile}
                    className="p-2 hover:bg-green-50 rounded-full transition-colors text-green-600"
                    disabled={savingProfile}
                    title="Save"
                  >
                    <Check className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Preview */}
              <div className="flex flex-col items-center gap-4 py-4">
                <div className="relative group">
                  <img
                    src={editPhotoURL || profile.photoURL || currentUser.avatar}
                    alt="Preview"
                    className="w-24 h-24 rounded-full object-cover border-4 border-purple-100"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = currentUser.avatar;
                    }}
                  />
                </div>

                {/*Edit Name*/}
                <div className="w-full space-y-2">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Edit Name
                  </label>
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Enter your name"
                    className="text-sm"
                    maxLength={11}
                  />
                </div>

                {/*Edit Photo*/}
                <div className="w-full space-y-2">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Profile Photo URL
                  </label>
                  <Input
                    value={editPhotoURL}
                    onChange={(e) => setEditPhotoURL(e.target.value)}
                    placeholder="https://example.com/photo.jpg"
                    className="text-sm"
                  />
                  <p className="text-xs text-gray-500">
                    Paste an image link. We store it in Firestore (no Storage / billing required).
                  </p>
                </div>
              </div>

              {/* Bio */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Bio
                </label>
                <Textarea
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  placeholder="Tell us about yourself..."
                  className="min-h-[100px]"
                  maxLength={160}
                />
                <div className="text-xs text-gray-400 text-right">{editBio.length}/160</div>
              </div>

              {/* Error */}
              {saveError && <div className="text-sm text-red-600">Save failed: {saveError}</div>}

              <Button
                onClick={handleSaveProfile}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white"
                disabled={savingProfile}
              >
                {savingProfile ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          )}

          {/* Stats */}
          {!isEditingProfile && (
            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-100">
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-600">{items.length}</p>
                <p className="text-sm text-gray-500">Items</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-600">12</p>
                <p className="text-sm text-gray-500">Matches</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-600">
                  {profile.completedTradeCount}
                </p>
                <p className="text-sm text-gray-500">Trades</p>
              </div>
            </div>
          )}
        </div>

        {/* Tabbed Section: My Items / Trade History */}
        <Tabs defaultValue="listings" className="mb-6">
          <TabsList className="w-full bg-gray-100 p-1 rounded-xl mb-4">
            <TabsTrigger
              value="listings"
              className="flex-1 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg text-sm font-semibold"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              My Listings ({items.length})
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="flex-1 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg text-sm font-semibold"
            >
              <History className="w-4 h-4 mr-1.5" />
              Trade History ({tradeHistory.length})
            </TabsTrigger>
          </TabsList>

          {/* ── My Listings Tab ── */}
          <TabsContent value="listings">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">My Items for Trade</h3>
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-full hover:shadow-lg transition-shadow"
              >
                <Plus className="w-4 h-4" />
                <span>Add Item</span>
              </button>
            </div>

            {loadingItems ? (
              <div className="bg-white rounded-2xl p-6 shadow-lg text-gray-600">
                Loading your items...
              </div>
            ) : itemsError ? (
              <div className="bg-white rounded-2xl p-6 shadow-lg text-red-600">
                {itemsError}
              </div>
            ) : items.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 shadow-lg text-center">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Plus className="w-8 h-8 text-purple-600" />
                </div>
                <p className="text-gray-600 mb-4">You haven't added any items yet.</p>
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-2 rounded-full hover:shadow-lg transition-shadow"
                >
                  Add Your First Item
                </button>
              </div>
            ) : (
              <div className="grid gap-4">
                {items.map((item) => {
                  const thumb = item.imageUrls?.[0] || currentUser.avatar;

                  return (
                    <div
                      key={item.id}
                      className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow"
                    >
                      <div className="flex gap-4">
                        <img
                          src={thumb}
                          alt={item.title}
                          className="w-32 h-32 object-cover"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src = currentUser.avatar;
                          }}
                        />
                        <div className="flex-1 p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h4 className="font-bold mb-1">{item.title}</h4>
                              <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                                {item.description}
                              </p>
                            </div>
                            <button
                              onClick={() => handleDeleteItem(item.id)}
                              className="p-2 hover:bg-red-50 rounded-full transition-colors group"
                            >
                              <Trash2 className="w-4 h-4 text-gray-400 group-hover:text-red-500" />
                            </button>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                              {item.category}
                            </span>
                            <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full capitalize">
                              {item.condition}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* ── Trade History Tab ── */}
          <TabsContent value="history">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">Trade History</h3>
            </div>

            {loadingTrades ? (
              <div className="bg-white rounded-2xl p-6 shadow-lg text-gray-600">
                Loading trade history...
              </div>
            ) : tradesError ? (
              <div className="bg-white rounded-2xl p-6 shadow-lg text-red-600">
                {tradesError}
              </div>
            ) : tradeHistory.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 shadow-lg text-center">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <History className="w-8 h-8 text-purple-600" />
                </div>
                <h4 className="text-lg font-semibold text-gray-700 mb-2">
                  No trades yet
                </h4>
                <p className="text-gray-500 text-sm max-w-xs mx-auto">
                  Once you complete a trade with another user, it will appear here
                  with all the details.
                </p>
              </div>
            ) : (
              <div className="grid gap-4">
                {tradeHistory.map((trade) => (
                  <TradeHistoryCard key={trade.id} trade={trade} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {isAddModalOpen && (
        <AddItemModal
          onClose={() => setIsAddModalOpen(false)}
          onAdd={async (partialItem) => {
            try {
              const newItemData = {
                ...partialItem,
                userId: uid,
                userName: profile.name,
                userAvatar: profile.photoURL || currentUser.avatar,
                createdAt: Date.now(),
              };

              const newId = await saveNewItem(newItemData);

              // Functional update to avoid stale state
              setItems((prev) => [{ ...newItemData, id: newId }, ...prev]);

              setIsAddModalOpen(false);
            } catch (error) {
              console.error("Failed to add item:", error);
              alert("Could not save item.");
            }
          }}
        />
      )}
    </div>
  );
}