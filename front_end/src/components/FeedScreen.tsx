import { useEffect, useState } from "react";
import { getFeedItems, auth } from "../firebase/firebase";
import type { Item } from "../types";

export function FeedScreen() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const uid = auth.currentUser?.uid;
      const res = await getFeedItems({ excludeUserId: uid ?? undefined });
      setItems(res.items as Item[]);
      setLoading(false);
    })();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      {items.map((it) => (
        <div key={it.id}>
          <h3>{it.title}</h3>
          <p>{it.description}</p>
          <img src={it.imageUrls?.[0]} alt={it.title} />
        </div>
      ))}
    </div>
  );
}