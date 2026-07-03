export const getProductEmoji = (categoryId: string, categories: {id: string, name: string}[]) => {
  const cat = categories.find((c) => c.id === categoryId);
  if (!cat) return "🍽️";
  const catName = cat.name.toLowerCase();
  
  if (catName.includes("minum") || catName.includes("kopi") || catName.includes("teh") || catName.includes("drink") || catName.includes("beverage")) {
    return "🥤";
  }
  if (catName.includes("makan") || catName.includes("nasi") || catName.includes("mie") || catName.includes("roti") || catName.includes("snack") || catName.includes("food") || catName.includes("cake") || catName.includes("dessert")) {
    return "🍽️";
  }
  return "🛍️";
};

export const formatIDR = (amount: number) => {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount);
};
