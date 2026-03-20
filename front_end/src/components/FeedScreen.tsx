import { useEffect, useMemo, useState } from "react";
import { getFeedItems, auth } from "../firebase/firebase";
import type { Item } from "../types";

export function FeedScreen() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedCategory, setSelectedCategory] = useState("All");
  const [sortBy, setSortBy] = useState("relevance");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const uid = auth.currentUser?.uid;
      const res = await getFeedItems({ excludeUserId: uid ?? undefined });
      setItems(res.items as Item[]);
      setLoading(false);
    })();
  }, []);

  const categories = useMemo(() => {
    return ["All", ...new Set(items.map((it) => it.category).filter(Boolean))];
  }, [items]);

  const displayItems = useMemo(() => {
    let filtered = [...items];

    // Category filter
    if (selectedCategory !== "All") {
      filtered = filtered.filter((it) => it.category === selectedCategory);
    }

    // Sorting
    if (sortBy === "title") {
      filtered.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortBy === "distance") {
      // 11.1 
      if ((filtered[0] as any)?.distance !== undefined) {
        filtered.sort(
          (a: any, b: any) => (a.distance ?? 0) - (b.distance ?? 0)
        );
      }
    }


    return filtered;
  }, [items, selectedCategory, sortBy]);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <div style={{ marginBottom: "16px", display: "flex", gap: "12px", alignItems: "center" }}>
        <div>
          <label htmlFor="category-select" style={{ marginRight: "8px" }}>
            Category:
          </label>
          <select
            id="category-select"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="sort-select" style={{ marginRight: "8px" }}>
            Sort by:
          </label>
          <select
            id="sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="relevance">Relevance</option>
            <option value="title">Title</option>
            <option value="distance">Distance</option>
          </select>
        </div>
      </div>

      {displayItems.length === 0 ? (
        <div>No items found.</div>
      ) : (
        displayItems.map((it) => (
          <div
            key={it.id}
            style={{
              border: "1px solid #ddd",
              borderRadius: "8px",
              padding: "12px",
              marginBottom: "12px",
            }}
          >
            <h3>{it.title}</h3>
            <p>{it.description}</p>
            <p>
              <strong>Category:</strong> {it.category}
            </p>
            <img
              src={it.imageUrls?.[0]}
              alt={it.title}
              style={{ maxWidth: "200px", borderRadius: "6px" }}
            />
          </div>
        ))
      )}
    </div>
  );
}