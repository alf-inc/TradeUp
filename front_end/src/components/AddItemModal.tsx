import { useState } from 'react';
import { X } from 'lucide-react';
import type { Item, Condition } from "../types";
import { currentUser } from '../data/mockData';

interface AddItemModalProps {
  onClose: () => void;
  // onAdd: (item: Item) => void;
  onAdd: (itemData: Omit<Item, "id" | "userId" | "userName" | "userAvatar">) => void;
}

export function AddItemModal({ onClose, onAdd }: AddItemModalProps) {
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
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
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Condition*</label>
            <div className="grid grid-cols-2 gap-2">
              {conditions.map((cond) => (
                <button
                  key={cond.value}
                  type="button"
                  onClick={() =>
                    setFormData({
                      ...formData,
                      condition: cond.value as 'new' | 'like-new' | 'good' | 'fair',
                    })
                  }
                  className={`px-4 py-2 rounded-lg border-2 transition-colors ${
                    formData.condition === cond.value
                      ? 'border-purple-600 bg-purple-50 text-purple-700 font-medium'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {cond.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-full font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full font-medium hover:shadow-lg transition-shadow"
            >
              Add Item
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

