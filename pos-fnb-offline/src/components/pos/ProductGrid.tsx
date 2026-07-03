import React from 'react';
import { Product, Category } from '../../types/models';
import { getProductEmoji, formatIDR } from '../../utils/helpers';

interface ProductGridProps {
  products: Product[];
  categories: Category[];
  selectedCategory: string | null;
  searchQuery: string;
  onProductClick: (product: Product) => void;
}

export default function ProductGrid({ products, categories, selectedCategory, searchQuery, onProductClick }: ProductGridProps) {
  const filteredProducts = products.filter(p => {
    const matchesCategory = selectedCategory ? p.category_id === selectedCategory : true;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-20">
      {filteredProducts.map((product) => (
        <div
          key={product.id}
          onClick={() => onProductClick(product)}
          className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md hover:border-indigo-100 transition-all cursor-pointer group active:scale-95 flex flex-col"
        >
          <div className="bg-gray-50 rounded-xl aspect-square flex items-center justify-center mb-3 group-hover:bg-indigo-50 transition-colors">
            {product.image_path ? (
              <img src={product.image_path} alt={product.name} className="w-full h-full object-cover rounded-xl" />
            ) : (
              <span className="text-4xl group-hover:scale-110 transition-transform">
                {getProductEmoji(product.category_id, categories)}
              </span>
            )}
          </div>
          <h3 className="font-semibold text-gray-900 leading-tight mb-1">{product.name}</h3>
          <p className="text-indigo-600 font-bold mt-auto">{formatIDR(product.base_price)}</p>
        </div>
      ))}
      
      {filteredProducts.length === 0 && (
        <div className="col-span-full py-12 text-center text-gray-400">
          <p className="text-lg">Tidak ada produk yang ditemukan</p>
        </div>
      )}
    </div>
  );
}
