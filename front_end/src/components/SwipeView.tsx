import { useState, useRef, useEffect } from 'react';
import { Item, MatchItem } from '../types';
import { Heart, Package, ChevronLeft, ChevronRight, Bookmark, MapPin } from 'lucide-react';
import {
  getFeedItems,
  getMyProfile,
  auth,
  addLikedItem,
  removeLikedItem,
  type Location,
} from '../firebase/firebase';
import { distanceKm, withinRadius } from '../utils/distance';
import { MatchPopupModal } from './MatchPopupModal';
import { useCreateOffer } from '../utils/Usecreateoffer';
import { toggleSavedListing, getSavedListings } from '../api/savedListings';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';

type SwipeViewProps = {
  userId: string | null;
  likedItems: string[];
  setLikedItems: React.Dispatch<React.SetStateAction<string[]>>;
};

type FeedItemWithDistance = Item & {
  distanceKmValue?: number;
};

export default function SwipeView({ userId, likedItems, setLikedItems }: SwipeViewProps) {
  const [items, setItems] = useState<FeedItemWithDistance[]>([]);
  const [order, setOrder] = useState<number[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [imageTrackById, setImageTrackById] = useState<Record<string, number>>({});
  const [imageNoTransitionById, setImageNoTransitionById] = useState<Record<string, boolean>>({});
  const [imageTransitioningById, setImageTransitioningById] = useState<Record<string, boolean>>({});
  const [matchPopupData, setMatchPopupData] = useState<MatchItem[] | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [savedItems, setSavedItems] = useState<string[]>([]);
  const [savingItems, setSavingItems] = useState<string[]>([]);
  const [userLocation, setUserLocation] = useState<Location | null>(null);
  const [radiusKm, setRadiusKm] = useState<number>(25);
  const [loadingFeed, setLoadingFeed] = useState(false);

  // ── Offer creation hook ────────────────────────────────────────────────────
  const { createOffer } = useCreateOffer();
  // ──────────────────────────────────────────────────────────────────────────

  // Load current user's saved distance settings
  useEffect(() => {
    (async () => {
      const uid = userId ?? auth.currentUser?.uid;
      if (!uid) return;

      try {
        const profile = await getMyProfile(uid);

        const location =
          profile.location &&
          typeof profile.location.lat === 'number' &&
          typeof profile.location.lng === 'number'
            ? profile.location
            : null;

        const savedRadius =
          typeof profile.radiusKm === 'number' && profile.radiusKm > 0
            ? profile.radiusKm
            : 25;

        setUserLocation(location);
        setRadiusKm(savedRadius);
      } catch (e) {
        console.error('Failed to load user distance settings:', e);
      }
    })();
  }, [userId]);

  useEffect(() => {
    (async () => {
      const uid = userId ?? auth.currentUser?.uid;
      if (!uid) {
        console.warn("No user logged in");
        return;
      }

      try {
        setLoadingFeed(true);

        // Fetch traded item IDs to exclude from feed
        const tradedItemIds: string[] = [];
        try {
          const res = await fetch(`${API_BASE}/trades/history?userId=${uid}`);
          if (res.ok) {
            const data = await res.json();
            for (const t of data.trades ?? []) {
              tradedItemIds.push(t.item1_id, t.item2_id);
            }
          }
        } catch { /* non-critical */ }

        const { items: feedItems } = await getFeedItems({
          excludeUserId: uid ?? undefined,
          excludeItemIds: tradedItemIds,
          limitCount: 50,
        });

        let visibleItems: FeedItemWithDistance[] = (feedItems as unknown as Item[])
          .filter((item) => item.isArchived !== true)
          .map((item) => ({
            ...item,
          }));

        // Only apply radius filtering if the user has a saved location
        if (userLocation) {
          visibleItems = visibleItems
            .filter((item) => item.location)
            .map((item) => ({
              ...item,
              distanceKmValue: distanceKm(userLocation, item.location as Location),
            }))
            .filter((item) =>
              item.location
                ? withinRadius(userLocation, item.location as Location, radiusKm)
                : false
            );
        }

        setItems(visibleItems);
        setOrder(buildRandomOrder(visibleItems));
        setCurrentIndex(0);

        try {
          const saved = await getSavedListings(uid);

          const savedArray = Array.isArray(saved)
            ? saved
            : Array.isArray((saved as any)?.savedListings)
            ? (saved as any).savedListings
            : Array.isArray((saved as any)?.listings)
            ? (saved as any).listings
            : Array.isArray((saved as any)?.data)
            ? (saved as any).data
            : [];

          const savedIds = savedArray
            .map((item: any) => item.listingId)
            .filter(Boolean);

          setSavedItems(savedIds);
        } catch (error) {
          console.warn("Failed to load saved listings:", error);
        }
      } catch (e) {
        console.error("Failed to load feed items:", e);
      } finally {
        setLoadingFeed(false);
      }
    })();
  }, [userId, userLocation, radiusKm]);

  const orderedItems = order.map((index) => items[index]).filter(Boolean);
  const currentItem = orderedItems[currentIndex];

  const isCurrentLiked = currentItem ? likedItems.includes(currentItem.id) : false;

  const getTrackIndex = (itemId: string, total: number) => {
    const raw = imageTrackById[itemId] ?? 1;
    if (!Number.isFinite(raw)) return 1;
    if (raw < 0) return 0;
    if (raw > total + 1) return total + 1;
    return raw;
  };

  const handleLike = async () => {
    if (!currentItem) return;

    const uid = userId ?? auth.currentUser?.uid;
    if (!uid) {
      console.warn("No user logged in");
      return;
    }

    const itemId = currentItem.id;
    const alreadyLiked = likedItems.includes(itemId);

    // Optimistic UI update (feels instant)
    setLikedItems((prev) =>
      alreadyLiked ? prev.filter((id) => id !== itemId) : [...prev, itemId]
    );

    try {
      if (alreadyLiked) {
        await removeLikedItem(uid, itemId);
      } else {
        await addLikedItem(uid, itemId);
        try {
          const res = await fetch(
            `${API_BASE}/matches/check-and-notify?likerUserId=${uid}&likedItemId=${itemId}`,
            { method: "POST" }
          );
          const data = await res.json();
          console.log('Match response:', data);
          if (data.matches?.length > 0) {
            setMatchPopupData(data.matches);
          }
        } catch (serverErr) {
          console.warn("Backend notification failed (but like was saved):", serverErr);
        }
      }
    } catch (e) {
      console.error("Failed to update liked items:", e);

      // Rollback if DB write fails
      setLikedItems((prev) =>
        alreadyLiked ? [...prev, itemId] : prev.filter((id) => id !== itemId)
      );
    }
  };

  const handleSave = async (item: Item) => {
    const uid = userId ?? auth.currentUser?.uid;
    if (!uid) {
      console.warn("No user logged in");
      return;
    }

    const itemId = item.id;
    const alreadySaved = savedItems.includes(itemId);

    if (savingItems.includes(itemId)) return;

    setSavingItems((prev) => [...prev, itemId]);

    setSavedItems((prev) =>
      alreadySaved ? prev.filter((id) => id !== itemId) : [...prev, itemId]
    );

    try {
      await toggleSavedListing(uid, itemId);
    } catch (error) {
      console.error("Failed to update saved listings:", error);

      setSavedItems((prev) =>
        alreadySaved ? [...prev, itemId] : prev.filter((id) => id !== itemId)
      );
    } finally {
      setSavingItems((prev) => prev.filter((id) => id !== itemId));
    }
  };

  // Handle scroll to change items
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let isScrolling: ReturnType<typeof setTimeout>;
    const handleScroll = () => {
      clearTimeout(isScrolling);
      isScrolling = setTimeout(() => {
        const scrollTop = container.scrollTop;
        const itemHeight = container.clientHeight;
        const newIndex = Math.round(scrollTop / itemHeight);
        if (newIndex !== currentIndex && newIndex < orderedItems.length) {
          setCurrentIndex(newIndex);
        }
      }, 50);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [currentIndex, orderedItems.length, order.length]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) {
        return;
      }

      if (!currentItem || currentItem.imageUrls.length <= 1) return;
      if (imageTransitioningById[currentItem.id]) return;

      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        setImageTransitioningById((prev) => ({ ...prev, [currentItem.id]: true }));
        setImageTrackById((prev) => {
          const current = prev[currentItem.id] ?? 1;
          const delta = event.key === 'ArrowRight' ? 1 : -1;
          const nextIndex = current + delta;
          return { ...prev, [currentItem.id]: nextIndex };
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentItem, imageTransitioningById]);

  useEffect(() => {
    if (items.length <= 1 || order.length === 0) return;
    if (currentIndex >= order.length - 2) {
      setOrder((prev) => appendRandomOrder(items, prev));
    }
  }, [currentIndex, items, order]);

  return (
    <div className="h-full relative">
      {loadingFeed && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-black/60 text-white text-sm px-3 py-1.5 rounded-full backdrop-blur-sm">
          Loading nearby items...
        </div>
      )}

      {!loadingFeed && userLocation && orderedItems.length > 0 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-black/60 text-white text-sm px-3 py-1.5 rounded-full backdrop-blur-sm">
          Showing items within {radiusKm} km
        </div>
      )}

      {!loadingFeed && orderedItems.length === 0 && (
        <div className="h-full flex items-center justify-center p-6 text-center">
          <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm">
            <h3 className="text-xl font-bold mb-2">No items found</h3>
            <p className="text-gray-600">
              {userLocation
                ? `There are no listings within ${radiusKm} km right now.`
                : 'There are no listings available right now.'}
            </p>
          </div>
        </div>
      )}

      {/* Scrollable Content Container */}
      <div
        ref={containerRef}
        className="h-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {orderedItems.map((item, idx) => (
          <div
            key={`${item.id}-${idx}`}
            className="h-full snap-start snap-always relative flex items-center justify-center"
          >
            {/* Item Card */}
            <div className="w-full h-full relative rounded-2xl overflow-hidden">
              {/* Image Slider */}
              <div className="w-full h-full overflow-hidden">
                <div
                  className={`flex h-full ${
                    imageNoTransitionById[item.id]
                      ? 'transition-none'
                      : 'transition-transform duration-300 ease-out'
                  }`}
                  style={{
                    transform: `translateX(-${getTrackIndex(item.id, item.imageUrls.length) * 100}%)`,
                  }}
                  onTransitionEnd={(event) => {
                    if (event.currentTarget !== event.target) return;

                    const total = item.imageUrls.length;
                    if (total <= 1) return;

                    const trackIndex = getTrackIndex(item.id, total);
                    if (trackIndex === 0) {
                      setImageNoTransitionById((prev) => ({ ...prev, [item.id]: true }));
                      setImageTrackById((prev) => ({ ...prev, [item.id]: total }));
                      requestAnimationFrame(() => {
                        requestAnimationFrame(() => {
                          setImageNoTransitionById((prev) => ({ ...prev, [item.id]: false }));
                          setImageTransitioningById((prev) => ({ ...prev, [item.id]: false }));
                        });
                      });
                      return;
                    }

                    if (trackIndex === total + 1) {
                      setImageNoTransitionById((prev) => ({ ...prev, [item.id]: true }));
                      setImageTrackById((prev) => ({ ...prev, [item.id]: 1 }));
                      requestAnimationFrame(() => {
                        requestAnimationFrame(() => {
                          setImageNoTransitionById((prev) => ({ ...prev, [item.id]: false }));
                          setImageTransitioningById((prev) => ({ ...prev, [item.id]: false }));
                        });
                      });
                      return;
                    }

                    setImageTransitioningById((prev) => ({ ...prev, [item.id]: false }));
                  }}
                >
                  {[item.imageUrls[item.imageUrls.length - 1], ...item.imageUrls, item.imageUrls[0]].map((url, imageIndex) => (
                    <img
                      key={`${item.id}-${imageIndex}`}
                      src={url}
                      alt={`${item.title} ${imageIndex + 1}`}
                      className="w-full h-full object-cover flex-shrink-0"
                    />
                  ))}
                </div>
              </div>

              {/* Image Indicators */}
              {item.imageUrls.length > 1 && (
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-2 z-10">
                  {item.imageUrls.map((_, dotIndex) => {
                    const total = item.imageUrls.length;
                    const activeIndex = ((getTrackIndex(item.id, total) - 1 + total) % total);
                    const isActive = dotIndex === activeIndex;

                    return (
                      <span
                        key={`${item.id}-dot-${dotIndex}`}
                        className={`rounded-full transition-all ${
                          isActive
                            ? 'bg-gray-200 w-2.5 h-2.5'
                            : 'bg-gray-500/70 w-2 h-2'
                        }`}
                      />
                    );
                  })}
                </div>
              )}

              {/* Image Controls */}
              {item.imageUrls.length > 1 && (
                <>
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      if (imageTransitioningById[item.id]) return;
                      setImageTransitioningById((prev) => ({ ...prev, [item.id]: true }));
                      setImageTrackById((prev) => {
                        const current = prev[item.id] ?? 1;
                        const nextIndex = current - 1;
                        return { ...prev, [item.id]: nextIndex };
                      });
                    }}
                    className="absolute left-3 top-1/2 -translate-y-1/2 h-11 w-11 rounded-full bg-black/30 backdrop-blur-md text-white flex items-center justify-center shadow-lg z-10 transition-all hover:bg-black/80 hover:backdrop-blur-0 hover:scale-110"
                    aria-label="Previous image"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </button>
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      if (imageTransitioningById[item.id]) return;
                      setImageTransitioningById((prev) => ({ ...prev, [item.id]: true }));
                      setImageTrackById((prev) => {
                        const current = prev[item.id] ?? 1;
                        const nextIndex = current + 1;
                        return { ...prev, [item.id]: nextIndex };
                      });
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 h-11 w-11 rounded-full bg-black/30 backdrop-blur-md text-white flex items-center justify-center shadow-lg z-10 transition-all hover:bg-black/80 hover:backdrop-blur-0 hover:scale-110"
                    aria-label="Next image"
                  >
                    <ChevronRight className="h-6 w-6" />
                  </button>
                </>
              )}

              {/* Gradient Overlays */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 pointer-events-none" />

              {/* Top Info */}
              <div className="absolute top-4 left-4 right-14">
                <div className="flex items-center gap-3 mb-2">
                  <img
                    src={item.userAvatar}
                    alt={item.userName}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div className="text-white">
                    <p className="font-bold">{item.userName}</p>
                  </div>
                </div>
              </div>

              {/* Bottom Info */}
              <div className="absolute bottom-5 left-4 right-16 text-white">
                <h3 className="text-2xl font-bold mb-2">{item.title}</h3>
                <p className="text-white/90 text-sm mb-3 line-clamp-3">{item.description}</p>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="bg-white/90 text-gray-900 backdrop-blur-sm px-3 py-1.5 rounded-full text-sm font-medium">
                    {item.category}
                  </div>
                  <div className="flex items-center gap-1 bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full text-sm">
                    <Package className="w-4 h-4" />
                    <span className="capitalize">{item.condition}</span>
                  </div>
                  {typeof item.distanceKmValue === 'number' && (
                    <div className="flex items-center gap-1 bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full text-sm">
                      <MapPin className="w-4 h-4" />
                      <span>{item.distanceKmValue.toFixed(1)} km away</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Save Button */}
              <button
                onClick={() => handleSave(item)}
                disabled={savingItems.includes(item.id)}
                className="absolute right-4 bottom-40 h-12 w-12 bg-white/20 backdrop-blur-md rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-transform group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Bookmark
                  className={`w-6 h-6 transition-all ${
                    savedItems.includes(item.id)
                      ? 'text-yellow-400 fill-yellow-400'
                      : 'text-gray-400 fill-gray-400'
                  }`}
                />
              </button>

              {/* Like Button (scrolls with card) */}
              <button
                onClick={handleLike}
                className="absolute right-4 bottom-24 h-12 w-12 bg-white/20 backdrop-blur-md rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-transform group"
              >
                <Heart
                  className={`w-6 h-6 transition-all group-hover:text-red-500 group-hover:fill-red-500 ${
                    isCurrentLiked ? 'text-red-500 fill-red-500' : 'text-gray-400 fill-gray-400'
                  }`}
                />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Match Popup Modal */}
      {matchPopupData && (
        <MatchPopupModal
          matches={matchPopupData}
          onCreateOffer={async (selectedItemIds) => {
            const uid = userId ?? auth.currentUser?.uid;
            if (!uid || !matchPopupData) return;

            await createOffer({
              fromUserId: uid,
              toUserId: matchPopupData[0].userB,
              offeredItemIds: selectedItemIds,
              requestedItemId: matchPopupData[0].itemB,
            });

            setMatchPopupData(null);
          }}
          onCancel={() => setMatchPopupData(null)}
        />
      )}
    </div>
  );
}

function buildRandomOrder(items: Item[], excludeId?: string | null) {
  const indices = items.map((_, index) => index);

  for (let i = indices.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  if (excludeId && indices.length > 1 && items[indices[0]]?.id === excludeId) {
    [indices[0], indices[1]] = [indices[1], indices[0]];
  }

  return indices;
}

function appendRandomOrder(items: Item[], currentOrder: number[]) {
  if (items.length === 0) return currentOrder;

  const lastIndex = currentOrder[currentOrder.length - 1];
  const lastId = items[lastIndex]?.id;
  const nextBatch = buildRandomOrder(items, lastId);

  return [...currentOrder, ...nextBatch];}