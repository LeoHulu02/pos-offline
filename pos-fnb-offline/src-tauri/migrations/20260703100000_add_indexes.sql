-- Add indexes to improve query performance on large tables

-- Orders
CREATE INDEX IF NOT EXISTS idx_orders_shift_id ON orders(shift_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);

-- Order Items
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);

-- Order Item Modifiers
CREATE INDEX IF NOT EXISTS idx_order_item_modifiers_order_item_id ON order_item_modifiers(order_item_id);

-- Payments
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_method ON payments(method);

-- Products & Categories
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_categories_is_active ON categories(is_active);

-- Product Variants
CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON product_variants(product_id);

-- Modifiers
CREATE INDEX IF NOT EXISTS idx_modifier_groups_product_id ON modifier_groups(product_id);
CREATE INDEX IF NOT EXISTS idx_modifiers_modifier_group_id ON modifiers(modifier_group_id);
