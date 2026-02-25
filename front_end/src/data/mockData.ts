import type { Item, UserProfile, Match } from "../types";

export const currentUser: UserProfile = {
  id: "user-1",
  name: "Alex Morgan",
  avatar:
    "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop",
  bio: "Love collecting vintage items and tech gadgets. Always looking for interesting trades!",
  // Default location: Downtown Toronto (fallback if Firestore profile is missing location)
  location: { lat: 43.6532, lng: -79.3832 },
  // Default radius: 10km (fallback if Firestore profile is missing radiusKm)
  radiusKm: 10,
  items: [
    {
      id: "my-item-1",
      title: "Vintage Polaroid Camera",
      description: "Working Polaroid OneStep camera from the 80s. Great condition!",
      imageUrls: [
        "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800&h=600&fit=crop",
      ],
      category: "Electronics",
      condition: "good",
      userId: "user-1",
      userName: "Alex Morgan",
      userAvatar:
        "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop",
      location: { lat: 43.6532, lng: -79.3832 },
    },
    {
      id: "my-item-2",
      title: "Stack of Classic Vinyl Records",
      description:
        "20+ vinyl records from the 70s-80s. Various artists including Queen, Beatles, Pink Floyd.",
      imageUrls: [
        "https://images.unsplash.com/photo-1496293455970-f8581aae0e3b?w=800&h=600&fit=crop",
      ],
      category: "Music",
      condition: "like-new",
      userId: "user-1",
      userName: "Alex Morgan",
      userAvatar:
        "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop",
      location: { lat: 43.6532, lng: -79.3832 },
    },
    {
      id: "my-item-3",
      title: "Leather Messenger Bag",
      description: "Handmade leather messenger bag, barely used. Perfect for work or school.",
      imageUrls: [
        "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&h=600&fit=crop",
      ],
      category: "Fashion",
      condition: "like-new",
      userId: "user-1",
      userName: "Alex Morgan",
      userAvatar:
        "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop",
      location: { lat: 43.6532, lng: -79.3832 },
    },
  ],
};

// NOTE: Locations below are spread across GTA so your radius filter demo is obvious later.
// Downtown-ish items: ~0–8km away
// Mid-range: ~10–20km away
// Far: ~25–40km away
export const availableItems: Item[] = [
  {
    id: "item-1",
    title: "Mechanical Keyboard",
    description: "Cherry MX Blue switches, RGB backlit. Perfect for gaming and typing.",
    imageUrls: [
      "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&h=600&fit=crop",
    ],
    category: "Electronics",
    condition: "like-new",
    userId: "user-2",
    userName: "Jamie Chen",
    userAvatar:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop",
    location: { lat: 43.6617, lng: -79.3950 }, // near UofT
  },
  {
    id: "item-2",
    title: "Succulent Plant Collection",
    description: "5 beautiful succulents in ceramic pots. Easy to care for!",
    imageUrls: [
      "https://images.unsplash.com/photo-1459156212016-c812468e2115?w=800&h=600&fit=crop",
    ],
    category: "Home & Garden",
    condition: "new",
    userId: "user-3",
    userName: "Sam Rivera",
    userAvatar:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop",
    location: { lat: 43.6426, lng: -79.3871 }, // near CN Tower
  },
  {
    id: "item-3",
    title: "Acoustic Guitar",
    description: "Yamaha acoustic guitar in excellent condition. Comes with case and strap.",
    imageUrls: [
      "https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=800&h=600&fit=crop",
    ],
    category: "Music",
    condition: "good",
    userId: "user-4",
    userName: "Taylor Kim",
    userAvatar:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop",
    location: { lat: 43.7001, lng: -79.4163 }, // midtown-ish
  },
  {
    id: "item-4",
    title: "Espresso Machine",
    description: "De'Longhi espresso maker. Makes perfect coffee every time.",
    imageUrls: [
      "https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?w=800&h=600&fit=crop",
    ],
    category: "Appliances",
    condition: "good",
    userId: "user-5",
    userName: "Casey Anderson",
    userAvatar:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop",
    location: { lat: 43.6539, lng: -79.4512 }, // west end-ish
  },
  {
    id: "item-5",
    title: "Yoga Mat & Accessories",
    description: "Premium yoga mat with blocks and strap. Barely used.",
    imageUrls: [
      "https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=800&h=600&fit=crop",
    ],
    category: "Sports",
    condition: "like-new",
    userId: "user-6",
    userName: "Morgan Lee",
    userAvatar:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop",
    location: { lat: 43.7549, lng: -79.3883 }, // North York-ish (farther)
  },
  {
    id: "item-6",
    title: "Vintage Film Camera",
    description: "Canon AE-1 35mm film camera with 50mm lens. Fully functional.",
    imageUrls: [
      "https://images.unsplash.com/photo-1495121553079-4c61bcce1894?w=800&h=600&fit=crop",
    ],
    category: "Electronics",
    condition: "good",
    userId: "user-7",
    userName: "Jordan Park",
    userAvatar:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop",
    location: { lat: 43.5890, lng: -79.6441 }, // Mississauga-ish (far)
  },
  {
    id: "item-7",
    title: "Designer Sunglasses",
    description: "Ray-Ban Wayfarer sunglasses with original case. Classic style.",
    imageUrls: [
      "https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=800&h=600&fit=crop",
    ],
    category: "Fashion",
    condition: "like-new",
    userId: "user-8",
    userName: "Riley Cooper",
    userAvatar:
      "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400&h=400&fit=crop",
    location: { lat: 43.7764, lng: -79.2318 }, // Scarborough-ish (far)
  },
  {
    id: "item-8",
    title: "Board Game Collection",
    description: "3 popular board games: Catan, Ticket to Ride, and Pandemic. All complete.",
    imageUrls: [
      "https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1495121553079-4c61bcce1894?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=800&h=600&fit=crop",
    ],
    category: "Games",
    condition: "good",
    userId: "user-9",
    userName: "Avery Brooks",
    userAvatar:
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&h=400&fit=crop",
    location: { lat: 43.8577, lng: -79.3370 }, // Markham-ish (far)
  },
];

export const mockMatches: Match[] = [
  {
    id: "match-1",
    item: currentUser.items[0],
    matchedWith: availableItems[5],
    timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
  },
  {
    id: "match-2",
    item: currentUser.items[1],
    matchedWith: availableItems[2],
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
  },
];