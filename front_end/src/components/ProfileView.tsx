import { useEffect, useState } from "react";
import { currentUser } from "../data/mockData";
import { Plus, Edit2, Trash2, X, Check } from "lucide-react";
import { AddItemModal } from "./AddItemModal";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { onAuthStateChanged } from "firebase/auth";
import { auth, getMyProfile, saveMyProfile } from "../firebase/firebase";

export function ProfileView() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [items, setItems] = useState(currentUser.items);

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
  }>({
    name: auth.currentUser?.displayName || currentUser.name || "My Profile",
    photoURL: "",
    bio: "",
  });

  // Edit form state (URL + Bio)
  const [editBio, setEditBio] = useState("");
  const [editPhotoURL, setEditPhotoURL] = useState("");

  const [loadingProfile, setLoadingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [saveError, setSaveError] = useState<string>("");

  // Load profile from Firestore when uid is available
  useEffect(() => {
    if (!uid) return;

    (async () => {
      setLoadingProfile(true);
      try {
        const p = await getMyProfile(uid);
        const bio = p.bio ?? "";
        const photoURL = p.photoURL ?? "";

        setProfile((prev) => ({
          ...prev,
          photoURL,
          bio,
        }));
        setEditBio(bio);
        setEditPhotoURL(photoURL);
      } finally {
        setLoadingProfile(false);
      }
    })();
  }, [uid]);

  const handleDeleteItem = (itemId: string) => {
    setItems(items.filter((item) => item.id !== itemId));
  };

  const handleCancelEdit = () => {
    setEditBio(profile.bio);
    setEditPhotoURL(profile.photoURL);
    setIsEditingProfile(false);
    setSaveError("");
  };

  const handleSaveProfile = async () => {
    if (!uid) return;

    setSavingProfile(true);
    setSaveError("");

    console.log("[US2] save start", { uid });

    try {
      const newBio = editBio.trim();
      const newPhotoURL = editPhotoURL.trim();

      console.log("[US2] saving profile to firestore...", { newBio, newPhotoURL });

      await saveMyProfile(uid, { bio: newBio, photoURL: newPhotoURL });

      console.log("[US2] save success ✅");

      setProfile((prev) => ({
        ...prev,
        bio: newBio,
        photoURL: newPhotoURL,
      }));

      setIsEditingProfile(false);
    } catch (e: any) {
      console.error("[US2] save failed ❌", e);
      setSaveError(e?.message ?? String(e));
    } finally {
      setSavingProfile(false);
      console.log("[US2] save end");
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
          <h2 className="text-xl font-bold mb-2">Profile</h2>
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
                />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-2xl font-bold">{profile.name}</h2>
                  <button
                    onClick={() => {
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
                      // fallback if URL invalid
                      (e.currentTarget as HTMLImageElement).src = currentUser.avatar;
                    }}
                  />
                </div>

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
                <div className="text-xs text-gray-400 text-right">
                  {editBio.length}/160
                </div>
              </div>

              {/* Error */}
              {saveError && (
                <div className="text-sm text-red-600">Save failed: {saveError}</div>
              )}

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

        {/* My Items Section (keep mock for now) */}
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

          {items.length === 0 ? (
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
              {items.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow"
                >
                  <div className="flex gap-4">
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className="w-32 h-32 object-cover"
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
              ))}
            </div>
          )}
        </div>
      </div>

      {isAddModalOpen && (
        <AddItemModal
          onClose={() => setIsAddModalOpen(false)}
          onAdd={(newItem) => {
            setItems([...items, newItem]);
            setIsAddModalOpen(false);
          }}
        />
      )}
    </div>
  );
}
