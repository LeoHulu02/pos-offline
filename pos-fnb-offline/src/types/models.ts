export interface User {
  id: string;
  full_name: string;
  username: string;
  role: string;
}

export interface Shift {
  id: string;
  cashier_id: string;
  starting_cash: number;
  expected_cash: number | null;
  actual_cash: number | null;
  variance_amount: number | null;
  status: string;
  opened_at: string;
  closed_at: string | null;
}

export interface Category {
  id: string;
  name: string;
  sort_order?: number;
  is_active?: boolean;
}

export interface Product {
  id: string;
  category_id: string;
  category_name?: string;
  name: string;
  base_price: number;
  description?: string;
  image_path?: string;
  is_active?: boolean;
}

export interface CartModifier {
  modifier_id: string;
  name: string;
  price_delta: number;
}

export interface CartItem {
  cart_id: string; // unique string for cart item to handle same product with different modifiers
  product_id: string;
  product_name: string;
  variant_id?: string;
  variant_name?: string;
  qty: number;
  base_price: number;
  subtotal: number;
  notes?: string;
  modifiers: CartModifier[];
}
