import { useState, useRef, useEffect } from 'react';
import { Item } from '../types';
import { Heart, Package, ChevronLeft, ChevronRight } from 'lucide-react';
import { getFeedItems, auth, addLikedItem, removeLikedItem } from '../firebase/firebase';


type SwipeViewProps = {
  userId: string | null;
  likedItems: string[];
  setLikedItems: React.Dispatch<React.SetStateAction<string[]>>;
};

export default function SwipeView({ userId, likedItems, setLikedItems }: SwipeViewProps) {
  const [items, setItems] = useState<Item[]>([]);
  const [order, setOrder] = useState<number[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  // const [likedItems, setLikedItems] = useState<string[]>([]);
  const [imageTrackById, setImageTrackById] = useState<Record<string, number>>({});
  const [imageNoTransitionById, setImageNoTransitionById] = useState<Record<string, boolean>>({});
  const [imageTransitioningById, setImageTransitioningById] = useState<Record<string, boolean>>({});
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const uid = userId ?? auth.currentUser?.uid;
      if (!uid) {
        console.warn("No user logged in");
        return;
      }

      // const liked = await getLikedItems(uid);
      // setLikedItems(liked);

      const { items: feedItems } = await getFeedItems({
        excludeUserId: uid ?? undefined,
        limitCount: 50,
      });

      setItems(feedItems as unknown as Item[]);
      setOrder(buildRandomOrder(feedItems as unknown as Item[]));
      setCurrentIndex(0);
    })();
  }, [userId]);

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
            await fetch(
            `http://127.0.0.1:8000/matches/check-and-notify?likerUserId=${uid}&likedItemId=${itemId}`,
            { method: "POST" }
            );
        } catch (serverErr) {
            console.warn("Backend notification failed (but like was saved):", serverErr);
        }    
    }
  } catch (e) {
    console.error("Failed to update liked items:", e);

    // rollback if DB write fails
    setLikedItems((prev) =>
      alreadyLiked ? [...prev, itemId] : prev.filter((id) => id !== itemId)
    );
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
  }, [currentItem]);

useEffect(() => {
  if (items.length <= 1 || order.length === 0) return;
  if (currentIndex >= order.length - 2) {
    setOrder((prev) => appendRandomOrder(items, prev));
  }
}, [currentIndex, items, order]);

  return (
    <div className="h-full relative">
      {/* Scrollable Content Container */}
      <div 
        ref={containerRef}
        className="h-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {orderedItems.map((item, index) => (
          <div
            key={item.id}
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
                    className="absolute left-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/30 backdrop-blur-md text-white flex items-center justify-center shadow-lg z-10 transition-all hover:bg-black/80 hover:backdrop-blur-0 hover:scale-110"
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
                    className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/30 backdrop-blur-md text-white flex items-center justify-center shadow-lg z-10 transition-all hover:bg-black/80 hover:backdrop-blur-0 hover:scale-110"
                    aria-label="Next image"
                  >
                    <ChevronRight className="h-6 w-6" />
                  </button>
                </>
              )}
              
              {/* Gradient Overlays */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 pointer-events-none" />
              
              {/* Top Info */}
              <div className="absolute top-4 left-4 right-20">
                <div className="flex items-center gap-3 mb-2">
                  <img
                    src={item.userAvatar}
                    alt={item.userName}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div className="text-white">
                    <p className="font-bold">{item.userName}</p>
                    {/* In future cases, set up if user wants to trade or sell for cash etc. 
                      as of now, assume user always wants to trade (since this is the main idea of the app)
                    */}
                    {/* <p className="text-sm text-white/80">Wants to trade</p> */}
                  </div>
                </div>
              </div>

              {/* Bottom Info */}
              <div className="absolute bottom-5 left-4 right-16 text-white">
                <h3 className="text-2xl font-bold mb-2">{item.title}</h3>
                <p className="text-white/90 text-sm mb-3 line-clamp-3">{item.description}</p>
                
                <div className="flex items-center gap-2">
                  <div className="bg-white/90 text-gray-900 backdrop-blur-sm px-3 py-1.5 rounded-full text-sm font-medium">
                    {item.category}
                  </div>
                  <div className="flex items-center gap-1 bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full text-sm">
                    <Package className="w-4 h-4" />
                    <span className="capitalize">{item.condition}</span>
                  </div>
                </div>
              </div>

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

  return [...currentOrder, ...nextBatch];
}

