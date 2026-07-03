import React from 'react';
import { Category } from '../../types/models';

interface CategoryTabsProps {
  categories: Category[];
  selectedCategory: string | null;
  onSelectCategory: (id: string | null) => void;
}

export default function CategoryTabs({ categories, selectedCategory, onSelectCategory }: CategoryTabsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide">
      <button
        onClick={() => onSelectCategory(null)}
        className={`flex-none px-6 py-3 rounded-xl font-medium transition-all ${
          selectedCategory === null
            ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
            : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"
        }`}
      >
        <span className="mr-2">🍽️</span> Semua Menu (F1)
      </button>
      {categories.map((category, index) => (
        <button
          key={category.id}
          onClick={() => onSelectCategory(category.id)}
          className={`flex-none px-6 py-3 rounded-xl font-medium transition-all ${
            selectedCategory === category.id
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
              : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"
          }`}
        >
          {category.name} {index < 4 ? `(F${index + 2})` : ''}
        </button>
      ))}
    </div>
  );
}
