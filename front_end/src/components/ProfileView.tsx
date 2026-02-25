import { useEffect, useState } from "react";
import { currentUser } from "../data/mockData";
import { Plus, Edit2, Trash2, X, Check } from "lucide-react";
import { AddItemModal } from "./AddItemModal";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { onAuthStateChanged } from "firebase/auth";
import { auth, getMyProfile, saveMyProfile, saveNewItem, getUserItems, deleteItem } from "../firebase/firebase";

type ProfileState = {
  name: string;
  photoURL: string;
  bio: string;
  // NEW:
  location: { lat: number; lng: number };
  radiusKm: number;
};

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
  const [profile, setProfile] = useState<ProfileState>({
    name: "My Profile",
    photoURL: "",
    bio: "",
    location: currentUser.location, // fallback default
    radiusKm: currentUser.radiusKm ?? 10, // fallback default
  });

  // Edit form state
  const [editBio, setEditBio] = useState("");
  const [editPhotoURL, setEditPhotoURL] = useState("");
  const [editName, setEditName] = useState("");

  // NEW: edit radius + location
  const [editRadiusKm, setEditRadiusKm] = useState<number>(profile.radiusKm);
  const [editLat, setEditLat] = useState<string>(String(profile.location.lat));
  const [editLng, setEditLng] = useState<string>(String(profile.location.lng));

  const [loadingProfile, setLoadingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [saveError, setSaveError] = useState<string>("");

  // Item loading + error
  const [loadingItems, setLoadingItems] = useState(false);
  const [itemsError, setItemsError] = useState("");

  // Load profile + items from Firestore when uid is available
  useEffect(() => {
    if (!uid) return;

    (async () => {
      setLoadingProfile(true);
      setLoadingItems(true);
      setItemsError("");

      try {
        const p: any = await getMyProfile(uid);

        const name = p?.name ?? "My Profile";
        const bio = p?.bio ?? "";
        const photoURL = p?.photoURL ?? "";

        // NEW: location + radius (fallback to mock defaults)
        const location = p?.location?.lat != null && p?.location?.lng != null
          ? { lat: Number(p.location.lat), lng: Number(p.location.lng) }
          : currentUser.location;

        const radiusKm = p?.radiusKm != null ? Number(p.radiusKm) : (currentUser.radiusKm ?? 10);

        setProfile({
          name,
          photoURL,
          bio,
          location,
          radiusKm,
        });

        setEditName(name);
        setEditBio(bio);
        setEditPhotoURL(photoURL);

        setEditRadiusKm(radiusKm);
        setEditLat(String(location.lat));
        setEditLng(String(location.lng));

        // Load user's items
        const userItems = await getUserItems(uid);
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

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm("Are you sure you want to delete this item?")) return;
    try {
      await deleteItem(itemId);
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

    setEditRadiusKm(profile.radiusKm);
    setEditLat(String(profile.location.lat));
    setEditLng(String(profile.location.lng));

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

      // NEW: parse + validate location & radius
      const lat = Number(editLat);
      const lng = Number(editLng);

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        throw new Error("Latitude/Longitude must be valid numbers.");
      }
      if (lat < -90 || lat > 90) {
        throw new Error("Latitude must be between -90 and 90.");
      }
      if (lng < -180 || lng > 180) {
        throw new Error("Longitude must be between -180 and 180.");
      }

      const radiusKm = Number(editRadiusKm);
      const safeRadiusKm = [5, 10, 25].includes(radiusKm) ? radiusKm : 10;

      const payload = {
        name: newName,
        bio: newBio,
        photoURL: newPhotoURL,
        // NEW fields:
        location: { lat, lng },
        radiusKm: safeRadiusKm,
      };

      await saveMyProfile(uid, payload);

      setProfile({
        name: newName,
        bio: newBio,
        photoURL: newPhotoURL,
        location: { lat, lng },
        radiusKm: safeRadiusKm,
      });

      setIsEditingProfile(false);
    } catch (e: any) {
      console.error("[Profile] save failed ❌", e);
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

                      setEditRadiusKm(profile.radiusKm);
                      setEditLat(String(profile.location.lat));
                      setEditLng(String(profile.location.lng));

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

                {/* NEW: show radius + location summary */}
                <div className="mt-3 text-sm text-gray-600">
                  <div>
                    <span className="font-semibold">Discovery radius:</span> {profile.radiusKm} km
                  </div>
                  <div>
                    <span className="font-semibold">Location:</span>{" "}
                    {profile.location.lat.toFixed(4)}, {profile.location.lng.toFixed(4)}
                  </div>
                </div>
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

                {/* Edit Name */}
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

                {/* Edit Photo */}
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

              {/* NEW: Radius selector */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Discovery Radius
                </label>
                <select
                  value={editRadiusKm}
                  onChange={(e) => setEditRadiusKm(Number(e.target.value))}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                >
                  <option value={5}>5 km</option>
                  <option value={10}>10 km</option>
                  <option value={25}>25 km</option>
                </select>
                <p className="text-xs text-gray-500">
                  This controls which listings appear in your feed based on distance.
                </p>
              </div>

              {/* NEW: Location inputs */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Location (Latitude / Longitude)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    value={editLat}
                    onChange={(e) => setEditLat(e.target.value)}
                    placeholder="Latitude (e.g., 43.6532)"
                    className="text-sm"
                  />
                  <Input
                    value={editLng}
                    onChange={(e) => setEditLng(e.target.value)}
                    placeholder="Longitude (e.g., -79.3832)"
                    className="text-sm"
                  />
                </div>
                <p className="text-xs text-gray-500">
                  For demo purposes you can enter coordinates directly. (Later you can switch to postal code.)
                </p>
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
                <p className="text-2xl font-bold text-purple-600">8</p>
                <p className="text-sm text-gray-500">Trades</p>
              </div>
            </div>
          )}
        </div>

        {/* My Items Section */}
        <div className="mb-6">
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
            <div className="bg-white rounded-2xl p-6 shadow-lg text-gray-600">Loading your items...</div>
          ) : itemsError ? (
            <div className="bg-white rounded-2xl p-6 shadow-lg text-red-600">{itemsError}</div>
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
        </div>
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
                // NEW: attach location so distance filtering works later
                location: profile.location,
                createdAt: Date.now(),
              };

              const newId = await saveNewItem(newItemData);
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