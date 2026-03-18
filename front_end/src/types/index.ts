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
}

export interface UserProfile {
  id: string;
  name: string;
  avatar: string;
  bio: string;
  items: Item[];
}

export interface Match {
  id: string;
  item: Item;
  matchedWith: Item;
  timestamp: Date;
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