CREATE TABLE business_settings (
    id TEXT PRIMARY KEY,
    business_name TEXT NOT NULL,
    address TEXT NOT NULL,
    phone TEXT NOT NULL,
    business_type TEXT NOT NULL,
    currency TEXT NOT NULL DEFAULT 'IDR',
    default_tax_rate_bp INTEGER NOT NULL DEFAULT 0,
    default_service_charge_rate_bp INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE roles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT
);

CREATE TABLE users (
    id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    pin_hash TEXT,
    role_id TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES roles(id)
);

CREATE TABLE categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE products (
    id TEXT PRIMARY KEY,
    category_id TEXT NOT NULL,
    name TEXT NOT NULL,
    base_price INTEGER NOT NULL,
    description TEXT,
    image_path TEXT,
    is_active BOOLEAN NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id)
);

CREATE TABLE product_variants (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,
    name TEXT NOT NULL,
    price INTEGER NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE modifier_groups (
    id TEXT PRIMARY KEY,
    product_id TEXT,
    name TEXT NOT NULL,
    min_select INTEGER NOT NULL DEFAULT 0,
    max_select INTEGER,
    is_required BOOLEAN NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE modifiers (
    id TEXT PRIMARY KEY,
    modifier_group_id TEXT NOT NULL,
    name TEXT NOT NULL,
    price_delta INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (modifier_group_id) REFERENCES modifier_groups(id)
);

CREATE TABLE orders (
    id TEXT PRIMARY KEY,
    order_number TEXT NOT NULL UNIQUE,
    shift_id TEXT NOT NULL,
    cashier_id TEXT NOT NULL,
    order_type TEXT NOT NULL,
    customer_note TEXT,
    table_note TEXT,
    subtotal INTEGER NOT NULL,
    discount_amount INTEGER NOT NULL DEFAULT 0,
    tax_rate_bp INTEGER NOT NULL,
    tax_amount INTEGER NOT NULL,
    service_charge_rate_bp INTEGER NOT NULL,
    service_charge_amount INTEGER NOT NULL,
    total_amount INTEGER NOT NULL,
    status TEXT NOT NULL, -- unpaid/paid/void/refund
    void_reason TEXT,
    voided_by TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE order_items (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    product_variant_id TEXT,
    product_name_snapshot TEXT NOT NULL,
    variant_name_snapshot TEXT,
    qty INTEGER NOT NULL,
    unit_price INTEGER NOT NULL,
    modifier_total INTEGER NOT NULL,
    note TEXT,
    line_total INTEGER NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id)
);

CREATE TABLE order_item_modifiers (
    id TEXT PRIMARY KEY,
    order_item_id TEXT NOT NULL,
    modifier_id TEXT NOT NULL,
    modifier_name_snapshot TEXT NOT NULL,
    price_delta_snapshot INTEGER NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_item_id) REFERENCES order_items(id)
);

CREATE TABLE payments (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    method TEXT NOT NULL,
    amount INTEGER NOT NULL,
    amount_received INTEGER,
    change_amount INTEGER,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id)
);

CREATE TABLE shifts (
    id TEXT PRIMARY KEY,
    cashier_id TEXT NOT NULL,
    starting_cash INTEGER NOT NULL,
    expected_cash INTEGER,
    actual_cash INTEGER,
    variance_amount INTEGER,
    status TEXT NOT NULL, -- open/closed
    opened_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    closed_at DATETIME,
    FOREIGN KEY (cashier_id) REFERENCES users(id)
);

CREATE TABLE cash_movements (
    id TEXT PRIMARY KEY,
    shift_id TEXT NOT NULL,
    type TEXT NOT NULL, -- cash_in/cash_out
    amount INTEGER NOT NULL,
    note TEXT NOT NULL,
    created_by TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (shift_id) REFERENCES shifts(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE receipts (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    printed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    printed_by TEXT NOT NULL,
    is_reprint BOOLEAN NOT NULL DEFAULT 0,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (printed_by) REFERENCES users(id)
);

CREATE TABLE app_settings (
    id TEXT PRIMARY KEY,
    key TEXT NOT NULL UNIQUE,
    value TEXT NOT NULL,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE audit_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    description TEXT NOT NULL,
    metadata_json TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Seed roles
INSERT INTO roles (id, name, description) VALUES 
('role-admin', 'admin', 'Administrator with full access'),
('role-cashier', 'kasir', 'Cashier for handling transactions');
