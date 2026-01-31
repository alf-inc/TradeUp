import { useState } from "react";
import { currentUser } from "../data/mockData";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { AddItemModal } from "./AddItemModal";
import type { Item } from "../types";


export function ProfileView() {
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [items, setItems] = useState<Item[]>(currentUser.items);

    const handleDeleteItem = (itemId: string) => {
    setItems(items.filter(item => item.id !== itemId));
    };

    return (
    <div className="h-full overflow-y-auto">
        <div className="p-6">
        {/* Profile Header */}
        <div className="bg-white rounded-2xl p-6 shadow-lg mb-6">
            <div className="flex items-start gap-4 mb-4">
            <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="w-20 h-20 rounded-full object-cover"
            />
            <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                <h2 className="text-2xl font-bold">{currentUser.name}</h2>
                <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                    <Edit2 className="w-4 h-4 text-gray-600" />
                </button>
                </div>
                <p className="text-gray-600">{currentUser.bio}</p>
            </div>
            </div>
            
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-100">
            <div className="text-center">
                <p className="text-2xl font-bold text-purple-600">{items.length}</p>
                <p className="text-sm text-gray-500">Items</p>
            </div>
            <div className="text-center">
                <p className="text-2xl font-bold text-purple-600">12</p>
                <p className="text-sm text-gray-500">Matches</p>
            </div>
            <div className="text-center">
                <p className="text-2xl font-bold text-purple-600">8</p>
                <p className="text-sm text-gray-500">Trades</p>
            </div>
            </div>
        </div>

        {/* My Items Section */}
        <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold">My Items for Trade</h3>
            <button
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-full hover:shadow-lg transition-shadow"
            >
                <Plus className="w-4 h-4" />
                <span>Add Item</span>
            </button>
            </div>

            {items.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 shadow-lg text-center">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Plus className="w-8 h-8 text-purple-600" />
                </div>
                <p className="text-gray-600 mb-4">You haven't added any items yet.</p>
                <button
                onClick={() => setIsAddModalOpen(true)}
                className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-2 rounded-full hover:shadow-lg transition-shadow"
                >
                Add Your First Item
                </button>
            </div>
            ) : (
            <div className="grid gap-4">
                {items.map((item) => (
                <div
                    key={item.id}
                    className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow"
                >
                    <div className="flex gap-4">
                    <img
                        src={item.imageUrl}
                        alt={item.title}
                        className="w-32 h-32 object-cover"
                    />
                    <div className="flex-1 p-4">
                        <div className="flex items-start justify-between mb-2">
                        <div>
                            <h4 className="font-bold mb-1">{item.title}</h4>
                            <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                            {item.description}
                            </p>
                        </div>
                        <button
                            onClick={() => handleDeleteItem(item.id)}
                            className="p-2 hover:bg-red-50 rounded-full transition-colors group"
                        >
                            <Trash2 className="w-4 h-4 text-gray-400 group-hover:text-red-500" />
                        </button>
                        </div>
                        <div className="flex items-center gap-2">
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                            {item.category}
                        </span>
                        <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full capitalize">
                            {item.condition}
                        </span>
                        </div>
                    </div>
                    </div>
                </div>
                ))}
            </div>
            )}
        </div>
        </div>

        {isAddModalOpen && (
        <AddItemModal
            onClose={() => setIsAddModalOpen(false)}
            onAdd={(newItem) => {
            setItems([...items, newItem]);
            setIsAddModalOpen(false);
            }}
        />
        )}
    </div>
    );
}