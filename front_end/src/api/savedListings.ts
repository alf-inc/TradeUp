const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

export async function toggleSavedListing(userId: string, listingId: string) {
  const response = await fetch(
    `${API_BASE}/saved-listings/toggle?userId=${encodeURIComponent(userId)}&listingId=${encodeURIComponent(listingId)}`,
    {
      method: "POST",
    }
  );

  if (!response.ok) {
    throw new Error("Failed to toggle saved listing");
  }

  return response.json();
}

export async function getSavedListings(userId: string) {
  const response = await fetch(
    `${API_BASE}/saved-listings?userId=${encodeURIComponent(userId)}`
  );

  if (!response.ok) {
    throw new Error("Failed to fetch saved listings");
  }

  return response.json();
}
