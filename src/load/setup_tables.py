"""
Script để tạo bảng fuel_prices và inventory_items trong database
"""

import sys
import os

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

import mysql.connector
from src.utils.config import MYSQL_CONFIG

def create_tables():
    """Tạo bảng fuel_prices TRƯỚC, inventory_items SAU"""
    connection = None
    cursor = None
    
    try:
        # Kết nối database
        connection = mysql.connector.connect(**MYSQL_CONFIG)
        cursor = connection.cursor()
        
        print("✓ Đã kết nối database")
        
        # ========================================
        # 1. TẠO BẢNG FUEL_PRICES TRƯỚC
        # ========================================
        print("\n[1/2] Đang tạo bảng fuel_prices...")
        
        sql_dir = os.path.join(PROJECT_ROOT, 'src', 'storage')
        with open(os.path.join(sql_dir, 'create_price_table.sql'), 'r', encoding='utf-8') as f:
            sql_content = f.read()
            sql_commands = [cmd.strip() for cmd in sql_content.split(';') if cmd.strip() and not cmd.strip().startswith('--')]
            
            for command in sql_commands:
                try:
                    cursor.execute(command)
                except mysql.connector.Error as e:
                    if e.errno == 1050:  # Table already exists
                        print("  ⚠ Bảng fuel_prices đã tồn tại, bỏ qua...")
                    else:
                        raise
        
        connection.commit()
        print("✓ Đã tạo bảng fuel_prices thành công")
        
        # Kiểm tra dữ liệu prices
        try:
            cursor.execute("SELECT COUNT(*) FROM fuel_prices")
            count = cursor.fetchone()[0]
            print(f"✓ Tổng số sản phẩm có giá: {count}")
        except:
            print("  ⚠ Không thể kiểm tra dữ liệu fuel_prices")
        
        # ========================================
        # 2. TẠO BẢNG INVENTORY_ITEMS SAU
        # ========================================
        print("\n[2/2] Đang tạo bảng inventory_items...")
        
        with open(os.path.join(sql_dir, 'create_inventory_table.sql'), 'r', encoding='utf-8') as f:
            sql_content = f.read()
            sql_commands = [cmd.strip() for cmd in sql_content.split(';') if cmd.strip() and not cmd.strip().startswith('--')]
            
            for command in sql_commands:
                try:
                    cursor.execute(command)
                except mysql.connector.Error as e:
                    if e.errno == 1050:  # Table already exists
                        print("  ⚠ Bảng inventory_items đã tồn tại, bỏ qua...")
                    else:
                        raise
        
        connection.commit()
        print("✓ Đã tạo bảng inventory_items thành công")
        
        # Kiểm tra dữ liệu inventory
        try:
            cursor.execute("SELECT COUNT(*) FROM inventory_items")
            count = cursor.fetchone()[0]
            print(f"✓ Tổng số vật tư trong kho: {count}")
        except:
            print("  ⚠ Không thể kiểm tra dữ liệu inventory_items")
        
        return True
        
    except mysql.connector.Error as e:
        print(f"✗ Lỗi database: {e}")
        if connection:
            connection.rollback()
        return False
    except FileNotFoundError as e:
        print(f"✗ Không tìm thấy file SQL: {e}")
        return False
    except Exception as e:
        print(f"✗ Lỗi: {e}")
        if connection:
            connection.rollback()
        return False
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()

if __name__ == "__main__":
    print("=" * 60)
    print("   SETUP DATABASE TABLES")
    print("=" * 60)
    print()
    
    success = create_tables()
    
    if success:
        print("\n" + "=" * 60)
        print("✓ HOÀN THÀNH! Các bảng đã sẵn sàng")
        print("  - fuel_prices (Quản lý giá) ← ƯU TIÊN")
        print("  - inventory_items (Quản lý kho)")
        print("=" * 60)
    else:
        print("\n" + "=" * 60)
        print("✗ CÓ LỖI XẢY RA")
        print("=" * 60)
    
    input("\nNhấn Enter để thoát...")
