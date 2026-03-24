#!/bin/sh
# Dashboard entrypoint script - Auto initialize database tables

set -e

echo "🚀 Starting Fuel Dashboard..."

# Function to check if MySQL is ready
wait_for_mysql() {
    echo "⏳ Waiting for MySQL to be ready..."
    echo "   DB_HOST: ${DB_HOST}"
    echo "   DB_USER: ${DB_USER}"
    echo "   DB_NAME: ${DB_NAME}"
    
    max_attempts=60
    attempt=0
    
    # MYSQL_PWD is set via environment variable, use mysql without -p
    while [ $attempt -lt $max_attempts ]; do
        # Test connection with skip-ssl inline option
        if mysql -h"${DB_HOST}" -u"${DB_USER}" --skip-ssl -e "SELECT 1" 2>&1 | grep -q "1"; then
            echo "✅ MySQL is ready!"
            return 0
        fi
        
        # Show error on first few attempts for debugging
        if [ $attempt -lt 3 ]; then
            echo "  Debug: $(mysql -h"${DB_HOST}" -u"${DB_USER}" --skip-ssl -e "SELECT 1" 2>&1 | head -1)"
        fi
        
        attempt=$((attempt + 1))
        echo "  Attempt $attempt/$max_attempts..."
        sleep 3
    done
    
    echo "❌ MySQL connection timeout!"
    echo "   Last error: $(mysql -h"${DB_HOST}" -u"${DB_USER}" --skip-ssl -e "SELECT 1" 2>&1)"
    return 1
}

# Function to initialize database tables
init_database() {
    echo "📊 Checking database tables..."
    
    # Check if fuel_pump table exists
    TABLE_EXISTS=$(mysql -h"${DB_HOST}" -u"${DB_USER}" --skip-ssl -N -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='${DB_NAME}' AND table_name='fuel_pump';" 2>/dev/null || echo "0")
    
    if [ "$TABLE_EXISTS" = "0" ]; then
        echo "🔧 Creating database tables..."
        
        # Create fuel_pump table
        mysql -h"${DB_HOST}" -u"${DB_USER}" --skip-ssl "${DB_NAME}" <<'EOF'
CREATE TABLE IF NOT EXISTS fuel_pump (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ma_bom VARCHAR(50) NOT NULL,
    nhien_lieu VARCHAR(50),
    gia DECIMAL(10, 2),
    lit DECIMAL(10, 2),
    tien DECIMAL(15, 2),
    ket_thuc_bom TIMESTAMP NULL,
    khach_hang VARCHAR(100),
    hoa_don VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_ma_bom (ma_bom),
    KEY idx_ket_thuc_bom (ket_thuc_bom),
    KEY idx_created_at (created_at),
    KEY idx_nhien_lieu (nhien_lieu)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
EOF
        
        # Create inventory_items table
        mysql -h"${DB_HOST}" -u"${DB_USER}" --skip-ssl "${DB_NAME}" <<'EOF'
CREATE TABLE IF NOT EXISTS inventory_items (
    id VARCHAR(50) PRIMARY KEY,
    customer_name VARCHAR(255),
    seller_name VARCHAR(255),
    item_name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'fuel',
    quantity DECIMAL(10, 2) NOT NULL DEFAULT 0,
    unit VARCHAR(20) NOT NULL DEFAULT 'lít',
    sale_time DATETIME,
    payment_status ENUM('unpaid', 'paid') NOT NULL DEFAULT 'unpaid',
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_category (category),
    INDEX idx_item_name (item_name),
    INDEX idx_customer_name (customer_name),
    INDEX idx_seller_name (seller_name),
    INDEX idx_created_at (created_at),
    INDEX idx_payment_status (payment_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
EOF
        
        # Create fuel_prices table
        mysql -h"${DB_HOST}" -u"${DB_USER}" --skip-ssl "${DB_NAME}" <<'EOF'
CREATE TABLE IF NOT EXISTS fuel_prices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    fuel_name VARCHAR(100) NOT NULL UNIQUE,
    price DECIMAL(15, 2) NOT NULL DEFAULT 0,
    unit VARCHAR(20) NOT NULL DEFAULT 'lít',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO fuel_prices (fuel_name, price, unit) VALUES
    ('Xăng RON 95', 25000, 'lít'),
    ('Xăng E5 RON 92', 23000, 'lít'),
    ('Dầu Diesel', 21000, 'lít'),
    ('Dầu DO', 20000, 'lít'),
    ('Dầu FO', 18000, 'lít'),
    ('Dầu nhớt động cơ', 150000, 'chai'),
    ('Dầu nhớt xe máy', 50000, 'chai');
EOF

        # Create qr_codes table (v6.9.0 - QR with web link)
        mysql -h"${DB_HOST}" -u"${DB_USER}" --skip-ssl "${DB_NAME}" <<'EOF'
CREATE TABLE IF NOT EXISTS qr_codes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    token VARCHAR(64) UNIQUE NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    seller_name VARCHAR(255),
    item_name VARCHAR(255) NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL,
    unit VARCHAR(20) NOT NULL DEFAULT 'lít',
    payment_status ENUM('unpaid', 'paid') NOT NULL DEFAULT 'unpaid',
    is_confirmed BOOLEAN DEFAULT FALSE,
    confirmed_at DATETIME,
    inventory_id VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_token (token),
    INDEX idx_seller_name (seller_name),
    INDEX idx_inventory_id (inventory_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
EOF
        
        # Create fuel_tanks table (v6.9.5 - Tank storage data)
        mysql -h"${DB_HOST}" -u"${DB_USER}" --skip-ssl "${DB_NAME}" <<'EOF'
CREATE TABLE IF NOT EXISTS fuel_tanks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ten_bon VARCHAR(100) NOT NULL,
    nhien_lieu VARCHAR(50),
    ton_kho DECIMAL(15, 2) DEFAULT 0,
    dung_tich DECIMAL(15, 2) DEFAULT 0,
    ty_le VARCHAR(10) DEFAULT 'N/A',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_ten_bon (ten_bon)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
EOF
        
        echo "✅ Database tables created successfully!"
    else
        echo "✅ Database tables already exist"
    fi
    
    # Always ensure fuel_tanks table exists (v6.9.5)
    TANKS_EXISTS=$(mysql -h"${DB_HOST}" -u"${DB_USER}" --skip-ssl -N -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='${DB_NAME}' AND table_name='fuel_tanks';" 2>/dev/null || echo "0")
    
    if [ "$TANKS_EXISTS" = "0" ]; then
        echo "🔧 Creating fuel_tanks table..."
        mysql -h"${DB_HOST}" -u"${DB_USER}" --skip-ssl "${DB_NAME}" <<'EOF'
CREATE TABLE IF NOT EXISTS fuel_tanks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ten_bon VARCHAR(100) NOT NULL,
    nhien_lieu VARCHAR(50),
    ton_kho DECIMAL(15, 2) DEFAULT 0,
    dung_tich DECIMAL(15, 2) DEFAULT 0,
    ty_le VARCHAR(10) DEFAULT 'N/A',
    cot_bom VARCHAR(100) DEFAULT '',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_ten_bon (ten_bon)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
EOF
        echo "✅ fuel_tanks table created!"
    else
        # Thêm cột cot_bom nếu chưa có (v6.9.6)
        COT_BOM_EXISTS=$(mysql -h"${DB_HOST}" -u"${DB_USER}" --skip-ssl -N -e "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema='${DB_NAME}' AND table_name='fuel_tanks' AND column_name='cot_bom';" 2>/dev/null || echo "0")
        if [ "$COT_BOM_EXISTS" = "0" ]; then
            echo "🔧 Adding cot_bom column to fuel_tanks..."
            mysql -h"${DB_HOST}" -u"${DB_USER}" --skip-ssl "${DB_NAME}" -e "ALTER TABLE fuel_tanks ADD COLUMN cot_bom VARCHAR(100) DEFAULT '';" 2>/dev/null || true
            echo "✅ cot_bom column added!"
        fi
    fi

    # Thêm cột cot_bom cho fuel_pump nếu chưa có (v6.9.7)
    PUMP_COT_BOM_EXISTS=$(mysql -h"${DB_HOST}" -u"${DB_USER}" --skip-ssl -N -e "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema='${DB_NAME}' AND table_name='fuel_pump' AND column_name='cot_bom';" 2>/dev/null || echo "0")
    if [ "$PUMP_COT_BOM_EXISTS" = "0" ]; then
        echo "🔧 Adding cot_bom column to fuel_pump..."
        mysql -h"${DB_HOST}" -u"${DB_USER}" --skip-ssl "${DB_NAME}" -e "ALTER TABLE fuel_pump ADD COLUMN cot_bom INT DEFAULT 0;" 2>/dev/null || true
        echo "✅ cot_bom column added to fuel_pump!"
    fi

    # Tạo bảng fuel_inventory_import nếu chưa có (v6.10.0 - Quản lý nhập hàng/tồn kho)
    INVENTORY_IMPORT_EXISTS=$(mysql -h"${DB_HOST}" -u"${DB_USER}" --skip-ssl -N -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='${DB_NAME}' AND table_name='fuel_inventory_import';" 2>/dev/null || echo "0")
    if [ "$INVENTORY_IMPORT_EXISTS" = "0" ]; then
        echo "🔧 Creating fuel_inventory_import table..."
        mysql -h"${DB_HOST}" -u"${DB_USER}" --skip-ssl "${DB_NAME}" <<'EOF'
CREATE TABLE IF NOT EXISTS fuel_inventory_import (
    id INT AUTO_INCREMENT PRIMARY KEY,
    fuel_name VARCHAR(100) NOT NULL,
    quantity DECIMAL(15, 2) NOT NULL,
    import_time DATETIME NOT NULL,
    note VARCHAR(255) DEFAULT '',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_fuel_name (fuel_name),
    INDEX idx_import_time (import_time),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
EOF
        echo "✅ fuel_inventory_import table created!"
    fi

    # Thêm cột seller_name cho inventory_items nếu chưa có (v6.10.1 - Người bán)
    INV_SELLER_EXISTS=$(mysql -h"${DB_HOST}" -u"${DB_USER}" --skip-ssl -N -e "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema='${DB_NAME}' AND table_name='inventory_items' AND column_name='seller_name';" 2>/dev/null || echo "0")
    if [ "$INV_SELLER_EXISTS" = "0" ]; then
        echo "🔧 Adding seller_name column to inventory_items..."
        mysql -h"${DB_HOST}" -u"${DB_USER}" --skip-ssl "${DB_NAME}" -e "ALTER TABLE inventory_items ADD COLUMN seller_name VARCHAR(255) AFTER customer_name;" 2>/dev/null || true
        mysql -h"${DB_HOST}" -u"${DB_USER}" --skip-ssl "${DB_NAME}" -e "CREATE INDEX idx_seller_name ON inventory_items (seller_name);" 2>/dev/null || true
        echo "✅ seller_name column added to inventory_items!"
    fi

    # Thêm cột seller_name cho qr_codes nếu chưa có (v6.10.1 - Người bán)
    QR_SELLER_EXISTS=$(mysql -h"${DB_HOST}" -u"${DB_USER}" --skip-ssl -N -e "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema='${DB_NAME}' AND table_name='qr_codes' AND column_name='seller_name';" 2>/dev/null || echo "0")
    if [ "$QR_SELLER_EXISTS" = "0" ]; then
        echo "🔧 Adding seller_name column to qr_codes..."
        mysql -h"${DB_HOST}" -u"${DB_USER}" --skip-ssl "${DB_NAME}" -e "ALTER TABLE qr_codes ADD COLUMN seller_name VARCHAR(255) AFTER customer_name;" 2>/dev/null || true
        mysql -h"${DB_HOST}" -u"${DB_USER}" --skip-ssl "${DB_NAME}" -e "CREATE INDEX idx_seller_name ON qr_codes (seller_name);" 2>/dev/null || true
        echo "✅ seller_name column added to qr_codes!"
    fi
    
    # Show tables
    echo ""
    echo "📋 Current tables:"
    mysql -h"${DB_HOST}" -u"${DB_USER}" --skip-ssl -e "SHOW TABLES;" "${DB_NAME}" 2>/dev/null || true
}

# Main execution
if wait_for_mysql; then
    init_database
else
    echo "⚠️  Continuing without database initialization (MySQL not ready)"
fi

echo ""
echo "🎉 Starting Next.js server..."
echo ""

# Start Next.js (check if standalone exists, otherwise use npm start)
if [ -f ".next/standalone/server.js" ]; then
    echo "📦 Using standalone mode..."
    exec node .next/standalone/server.js
else
    echo "📦 Using npm start..."
    exec npm start
fi

