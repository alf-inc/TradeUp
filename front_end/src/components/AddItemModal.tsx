import { useEffect, useState } from 'react';
import { X, MapPin, LocateFixed } from 'lucide-react';
import type { Item, Condition } from "../types";
import type { Location } from "../firebase/firebase";
import { geocodeLocationQuery } from "../firebase/firebase";
import { currentUser } from '../data/mockData';
import { Button } from "./ui/button";

interface AddItemModalProps {
  onClose: () => void;
  // onAdd: (item: Item) => void;
  onAdd: (itemData: Omit<Item, "id" | "userId" | "userName" | "userAvatar">) => void;

  // Default item location from profile
  defaultLocation?: Location | null;
  defaultLocationLabel?: string;
}

function getBrowserLocation(): Promise<Location> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by this browser."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      () => reject(new Error("Failed to get current location.")),
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000,
      }
    );
  });
}

export function AddItemModal({
  onClose,
  onAdd,
  defaultLocation,
  defaultLocationLabel,
}: AddItemModalProps) {
  const [formData, setFormData] = useState<{
    title: string;
    description: string;
    imageUrl: string;
    category: string;
    condition: Condition;
  }>({
    title: "",
    description: "",
    imageUrl: "",
    category: "Electronics",
    condition: "good",
  });

  const [locationQuery, setLocationQuery] = useState("");
  const [locationLabel, setLocationLabel] = useState("");
  const [itemLocation, setItemLocation] = useState<Location | null>(null);
  const [resolvingLocation, setResolvingLocation] = useState(false);
  const [locationError, setLocationError] = useState("");

  useEffect(() => {
    if (defaultLocation) {
      setItemLocation(defaultLocation);
      setLocationLabel(defaultLocationLabel || "Profile location");
      setLocationQuery(defaultLocationLabel || "Profile location");
    }
  }, [defaultLocation, defaultLocationLabel]);

  const categories = [
    'Electronics',
    'Fashion',
    'Home & Garden',
    'Sports',
    'Music',
    'Books',
    'Appliances',
    'Games',
    'Other',
  ];

  const conditions = [
    { value: 'new', label: 'New' },
    { value: 'like-new', label: 'Like New' },
    { value: 'good', label: 'Good' },
    { value: 'fair', label: 'Fair' },
  ];

  const handleUseProfileLocation = () => {
    if (!defaultLocation) {
      setLocationError("No saved profile location found.");
      return;
    }

    setLocationError("");
    setItemLocation(defaultLocation);
    setLocationLabel(defaultLocationLabel || "Profile location");
    setLocationQuery(defaultLocationLabel || "Profile location");
  };

  const handleUseCurrentLocation = async () => {
    try {
      setResolvingLocation(true);
      setLocationError("");

      const coords = await getBrowserLocation();
      setItemLocation(coords);
      setLocationLabel("Current device location");
      setLocationQuery("Current device location");
    } catch (e: any) {
      setLocationError(e?.message ?? "Failed to get current location.");
    } finally {
      setResolvingLocation(false);
    }
  };

  const handleResolveManualLocation = async () => {
    const query = locationQuery.trim();
    if (!query) {
      setLocationError("Enter a city, address, or postal code first.");
      return;
    }

    try {
      setResolvingLocation(true);
      setLocationError("");

      const result = await geocodeLocationQuery(query);
      setItemLocation({ lat: result.lat, lng: result.lng });
      setLocationLabel(result.label);
      setLocationQuery(result.label);
    } catch (e: any) {
      setLocationError(e?.message ?? "Failed to resolve location.");
    } finally {
      setResolvingLocation(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!itemLocation) {
      setLocationError("Please choose a location for this item.");
      return;
    }

    // MOCK ITEM CREATION
    // const newItem: Item = {
    //   id: `my-item-${Date.now()}`,
    //   title: formData.title,
    //   description: formData.description,
    //   imageUrl: formData.imageUrl || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&h=600&fit=crop',
    //   category: formData.category,
    //   condition: formData.condition,
    //   userId: currentUser.id,
    //   userName: currentUser.name,
    //   userAvatar: currentUser.avatar,
    // };

    onAdd({
      title: formData.title,
      description: formData.description,
      imageUrls: [
        formData.imageUrl || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&h=600&fit=crop',
      ],
      category: formData.category,
      condition: formData.condition,
      location: itemLocation,
      locationLabel: locationLabel || locationQuery.trim(),
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-2xl font-bold">Add New Item</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Item Title*</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
              placeholder="e.g., Vintage Camera"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Description*</label>
            <textarea
              required
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none h-24 resize-none"
              placeholder="Describe your item..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Image URL</label>
            <input
              type="url"
              value={formData.imageUrl}
              onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
              placeholder="https://example.com/image.jpg"
            />
            <p className="text-xs text-gray-500 mt-1">Leave blank for default image</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Category*</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
            >
              {categories.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Condition*</label>
            <select
              value={formData.condition}
              onChange={(e) => setFormData({ ...formData, condition: e.target.value as Condition })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
            >
              {conditions.map((condition) => (
                <option key={condition.value} value={condition.value}>
                  {condition.label}
                </option>
              ))}
            </select>
          </div>

          {/* Item Location */}
          <div className="space-y-3 rounded-xl border border-gray-200 p-4 bg-gray-50">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-gray-500" />
              <label className="text-sm font-medium">Item Location*</label>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleUseProfileLocation}
                disabled={resolvingLocation}
              >
                Use Profile Location
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={handleUseCurrentLocation}
                disabled={resolvingLocation}
              >
                <LocateFixed className="w-4 h-4 mr-2" />
                {resolvingLocation ? "Getting location..." : "Use Current Location"}
              </Button>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Or enter a city, address, or postal code
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={locationQuery}
                  onChange={(e) => setLocationQuery(e.target.value)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                  placeholder="Toronto, ON"
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleResolveManualLocation}
                  disabled={resolvingLocation}
                >
                  Resolve
                </Button>
              </div>
            </div>

            {itemLocation && (
              <div className="text-xs text-gray-600 bg-white rounded-lg border p-3">
                <div className="font-medium text-gray-800">{locationLabel}</div>
                <div>
                  lat: {itemLocation.lat.toFixed(6)}, lng: {itemLocation.lng.toFixed(6)}
                </div>
              </div>
            )}

            {locationError && (
              <p className="text-sm text-red-600">{locationError}</p>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:shadow-lg transition-shadow font-medium"
            >
              Add Item
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}