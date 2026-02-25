import type { Location } from "./location";
export type { Location } from "./location";

export type Condition = "new" | "like-new" | "good" | "fair";

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
  location: Location;
}

export interface UserProfile {
  id: string;
  name: string;
  avatar: string;
  bio: string;
  items: Item[];
  location: Location;
  radiusKm?: number;
}

export interface Match {
  id: string;
  item: Item;
  matchedWith: Item;
  timestamp: Date;
}
