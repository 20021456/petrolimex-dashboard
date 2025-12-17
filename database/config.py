"""
File cấu hình cho Fuel API
Tự động detect Docker environment và sử dụng env variables

QUAN TRỌNG: 
- File này an toàn để push lên Git vì sử dụng environment variables
- Không chứa thông tin nhạy cảm hardcode
- Tự động detect Docker vs Local environment
"""
import os

# Kiểm tra nếu đang chạy trong Docker (dựa vào MYSQL_HOST env var)
IS_DOCKER = os.getenv('MYSQL_HOST') is not None

if IS_DOCKER:
    # Cấu hình từ Docker environment variables
    FUEL_USERNAME = os.getenv('FUEL_USERNAME', 'htxthanhsonna')
    FUEL_PASSWORD = os.getenv('FUEL_PASSWORD', 'thanhson@123')
    
    MYSQL_CONFIG = {
        'host': os.getenv('MYSQL_HOST', 'mysql'),
        'user': os.getenv('MYSQL_USER', 'root'),
        'password': os.getenv('MYSQL_PASSWORD', 'minhtrung02'),
        'database': os.getenv('MYSQL_DATABASE', 'petrolimex'),
        'port': int(os.getenv('MYSQL_PORT', '3306')),
        'ssl_disabled': True  # Disable SSL for Docker environment
    }
    print(f"🐳 Running in Docker mode - MySQL: {MYSQL_CONFIG['host']}:{MYSQL_CONFIG['port']}")
else:
    # Cấu hình cho local development (đọc từ env nếu có, fallback về defaults)
    FUEL_USERNAME = os.getenv('FUEL_USERNAME', 'htxthanhsonna')
    FUEL_PASSWORD = os.getenv('FUEL_PASSWORD', 'thanhson@123')
    
    MYSQL_CONFIG = {
        'host': os.getenv('DB_HOST', 'localhost'),
        'user': os.getenv('DB_USER', 'root'),
        'password': os.getenv('DB_PASSWORD', 'minhtrung02'),
        'database': os.getenv('DB_NAME', 'petrolimex'),
        'port': int(os.getenv('DB_PORT', '3306')),
        'ssl_disabled': True  # Disable SSL for local development
    }
    print(f"💻 Running in local mode - MySQL: {MYSQL_CONFIG['host']}:{MYSQL_CONFIG['port']}")

