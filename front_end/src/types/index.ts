export type Condition = "new" | "like-new" | "good" | "fair";
export type NotificationType = "MUTUAL_MATCH";

export interface MatchItem {
  userA: string;
  userB: string;
  itemA: string;
  itemATitle: string;
  itemAImage: string;
  itemACategory: string;
  itemB: string;
  itemBTitle: string;
  itemBImage: string;
  itemBCategory: string;
}

export interface MatchCheckResponse {
  matchFound: boolean;
  matches: MatchItem[];
}
export type Location = { lat: number; lng: number };

export interface Item {
  id: string;
  title: string;
  description: string;
  imageUrls: string[];
  category: string;
  condition: Condition;
  userId: string;
  userName: string;
  userAvatar: string;
  location?: Location | null;
  locationLabel?: string;
  createdAt?: number;
}

export interface UserProfile {
  id: string;
  name: string;
  avatar: string;
  bio: string;
  items: Item[];
  location?: Location | null;
  locationLabel?: string;
  radiusKm?: number;
}

export interface Match {
  id: string;
  item: Item;
  matchedWith: Item;
  timestamp: Date;
}

export interface CompletedTrade {
  id: string;                  // trade document ID (matchKey)
  tradeId: string;             // same as id / matchKey
  user1Id: string;
  user2Id: string;
  item1Id: string;
  item2Id: string;
  user1Rating: number | null;
  user2Rating: number | null;
  status: string;              // "confirmed" | "completed"
  completedAt?: number;        // timestamp

  // Resolved display fields (populated by frontend after fetching)
  item1Title?: string;
  item1Image?: string;
  item2Title?: string;
  item2Image?: string;
  partnerName?: string;
  partnerAvatar?: string;
  givenItemTitle?: string;     // item the current user gave
  givenItemImage?: string;
  receivedItemTitle?: string;  // item the current user received
  receivedItemImage?: string;
  myRating?: number | null;    // rating the current user gave
  partnerRating?: number | null; // rating the partner gave
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  read: boolean;
  createdAt?: any; // whatever your backend returns
  payload: {
    otherUserId: string;
    itemId: string;
    mutualItemId: string;
    matchKey: string;

    // NEW display fields (what your UI is trying to read)
    otherUserName?: string;
    otherUserAvatar?: string;
    itemTitle?: string;
    mutualItemTitle?: string;
  };
}