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
    item_name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL DEFAULT 0,
    unit VARCHAR(20) NOT NULL DEFAULT 'lít',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
        
        echo "✅ Database tables created successfully!"
    else
        echo "✅ Database tables already exist"
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

