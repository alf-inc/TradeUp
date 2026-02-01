import { useState, useRef, useEffect } from 'react';
import { availableItems } from '../data/mockData';
import { Item } from '../types';
import { X, Heart, RotateCcw, Package } from 'lucide-react';

export function SwipeView() {
  const [items, setItems] = useState<Item[]>(availableItems);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [likedItems, setLikedItems] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentItem = items[currentIndex];
  const hasMoreItems = currentIndex < items.length;

  const handleLike = () => {
    if (currentItem) {
      setLikedItems([...likedItems, currentItem.id]);
    }
    handleNext();
  };

  const handlePass = () => {
    handleNext();
  };

  const handleNext = () => {
    if (currentIndex < items.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setCurrentIndex(items.length); // Trigger "no more items" state
    }
  };

  const handleUndo = () => {
    if (currentIndex > 0) {
      const prevIndex = currentIndex - 1;
      setCurrentIndex(prevIndex);
      if (likedItems.includes(items[prevIndex].id)) {
        setLikedItems(likedItems.filter(id => id !== items[prevIndex].id));
      }
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
        if (newIndex !== currentIndex && newIndex < items.length) {
          setCurrentIndex(newIndex);
        }
      }, 50);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [currentIndex, items.length]);

  if (!hasMoreItems) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-white rounded-2xl p-8 shadow-lg max-w-sm">
          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Heart className="w-8 h-8 text-purple-600" />
          </div>
          <h2 className="text-2xl font-bold mb-2">No more items!</h2>
          <p className="text-gray-600 mb-6">
            You've seen all available items. Check back later for new items or manage your matches!
          </p>
          <button
            onClick={() => setCurrentIndex(0)}
            className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-full font-medium hover:shadow-lg transition-shadow"
          >
            Start Over
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full relative">
      {/* Scrollable Content Container */}
      <div 
        ref={containerRef}
        className="h-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {items.map((item, index) => (
          <div
            key={item.id}
            className="h-full snap-start snap-always relative flex items-center justify-center"
          >
            {/* Item Card */}
            <div className="w-full h-full relative">
              {/* Image */}
              <img
                src={item.imageUrl}
                alt={item.title}
                className="w-full h-full object-cover"
              />
              
              {/* Gradient Overlays */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40" />
              
              {/* Top Info */}
              <div className="absolute top-4 left-4 right-20">
                <div className="flex items-center gap-3 mb-2">
                  <img
                    src={item.userAvatar}
                    alt={item.userName}
                    className="w-12 h-12 rounded-full object-cover border-2 border-white"
                  />
                  <div className="text-white">
                    <p className="font-bold">{item.userName}</p>
                    <p className="text-sm text-white/80">Wants to trade</p>
                  </div>
                </div>
              </div>

              {/* Category Badge */}
              <div className="absolute top-4 right-20 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full text-sm font-medium">
                {item.category}
              </div>
              
              {/* Bottom Info */}
              <div className="absolute bottom-20 left-4 right-20 text-white">
                <h3 className="text-2xl font-bold mb-2">{item.title}</h3>
                <p className="text-white/90 text-sm mb-3 line-clamp-3">{item.description}</p>
                
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full text-sm">
                    <Package className="w-4 h-4" />
                    <span className="capitalize">{item.condition}</span>
                  </div>
                </div>
              </div>

              {/* Progress Indicator */}
              <div className="absolute bottom-4 left-4 right-20 text-white/60 text-xs font-medium">
                {index + 1} / {items.length}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Side Action Buttons - TikTok Style */}
      <div className="absolute right-3 bottom-32 flex flex-col gap-4 z-10">
        {/* Like Button */}
        <button
          onClick={handleLike}
          className="w-14 h-14 bg-white/90 backdrop-blur-sm rounded-full shadow-lg flex flex-col items-center justify-center hover:scale-110 transition-transform group"
        >
          <Heart 
            className="w-7 h-7 text-purple-600 group-hover:fill-purple-600 transition-all" 
          />
        </button>

        {/* Pass Button */}
        <button
          onClick={handlePass}
          className="w-14 h-14 bg-white/90 backdrop-blur-sm rounded-full shadow-lg flex flex-col items-center justify-center hover:scale-110 transition-transform group"
        >
          <X className="w-7 h-7 text-red-500 group-hover:text-red-600 transition-colors" strokeWidth={2.5} />
        </button>

        {/* Undo Button */}
        <button
          onClick={handleUndo}
          disabled={currentIndex === 0}
          className="w-14 h-14 bg-white/90 backdrop-blur-sm rounded-full shadow-lg flex flex-col items-center justify-center hover:scale-110 transition-transform disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 group"
        >
          <RotateCcw className="w-6 h-6 text-gray-700 group-hover:text-gray-900 transition-colors" />
        </button>
      </div>

      {/* Scroll hint (only show on first item) */}
      {currentIndex === 0 && (
        <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 animate-bounce pointer-events-none z-10">
          <div className="bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-medium text-gray-700 shadow-lg">
            Scroll to see more
          </div>
        </div>
      )}
    </div>
  );
}

