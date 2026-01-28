"""
Update dữ liệu fuel_pump cho một ngày cụ thể
Script này được gọi từ API endpoint để cập nhật dữ liệu khi người dùng bấm nút "Cập nhật"
"""

import sys
import os
import argparse
from datetime import datetime

# Thêm parent directory vào path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from database.fuel_api import FuelAPI

# Import config
try:
    from database.config import FUEL_USERNAME, FUEL_PASSWORD, MYSQL_CONFIG
except ImportError:
    print("✗ Không tìm thấy file database/config.py")
    print("➜ Hãy kiểm tra lại cấu hình")
    exit(1)


def update_single_day(date_str: str) -> dict:
    """
    Cập nhật dữ liệu fuel_pump cho một ngày cụ thể
    
    Args:
        date_str: Ngày cần cập nhật (format: YYYY-MM-DD)
    
    Returns:
        Dictionary chứa kết quả:
        {
            "success": bool,
            "message": str,
            "deleted": int,
            "inserted": int,
            "date": str
        }
    """
    result = {
        "success": False,
        "message": "",
        "deleted": 0,
        "inserted": 0,
        "date": date_str
    }
    
    # Validate date format
    try:
        datetime.strptime(date_str, '%Y-%m-%d')
    except ValueError:
        result["message"] = f"Định dạng ngày không hợp lệ: {date_str}. Vui lòng dùng YYYY-MM-DD"
        return result
    
    print("=" * 70)
    print(f"   CẬP NHẬT DỮ LIỆU NGÀY: {date_str}")
    print("=" * 70)
    print(f"\nCấu hình:")
    print(f"  - Username: {FUEL_USERNAME}")
    print(f"  - MySQL Host: {MYSQL_CONFIG['host']}")
    print(f"  - MySQL Database: {MYSQL_CONFIG['database']}")
    print()
    
    # Khởi tạo API
    api = FuelAPI(
        username=FUEL_USERNAME,
        password=FUEL_PASSWORD,
        headless=True,
        mysql_config=MYSQL_CONFIG
    )
    
    try:
        # Đăng nhập
        print("🔐 Đang đăng nhập...")
        if not api.login():
            result["message"] = "Không thể đăng nhập. Vui lòng kiểm tra lại thông tin."
            return result
        
        # Kết nối MySQL
        print("\n📊 Đang kết nối MySQL...")
        if not api.connect_mysql():
            result["message"] = "Không thể kết nối MySQL"
            return result
        
        if not api.create_mysql_table():
            result["message"] = "Không thể tạo bảng fuel_pump"
            api.close_mysql()
            return result
        
        # Xóa dữ liệu cũ của ngày này
        print(f"\n🗑️  Đang xóa dữ liệu cũ của ngày {date_str}...")
        deleted = api.delete_data_by_date(date_str)
        result["deleted"] = deleted
        print(f"   ✓ Đã xóa {deleted} bản ghi")
        
        # Lấy dữ liệu mới từ server
        print(f"\n📥 Đang lấy dữ liệu mới từ server...")
        data = api.get_all_data_paginated(from_date=date_str, to_date=date_str)
        
        if data:
            # Insert dữ liệu mới
            print(f"\n💾 Đang lưu {len(data)} bản ghi vào MySQL...")
            success = api.insert_to_mysql(data)
            result["inserted"] = success
            print(f"   ✓ Đã lưu {success}/{len(data)} bản ghi")
            
            result["success"] = True
            result["message"] = f"Cập nhật thành công! Đã xóa {deleted} và thêm {success} bản ghi cho ngày {date_str}"
        else:
            result["success"] = True
            result["inserted"] = 0
            result["message"] = f"Không có dữ liệu mới cho ngày {date_str}"
        
        # Đóng kết nối
        api.close_mysql()
        
    except Exception as e:
        result["message"] = f"Lỗi: {str(e)}"
        print(f"\n✗ Lỗi: {e}")
        import traceback
        traceback.print_exc()
        
    finally:
        api.cleanup()
    
    print("\n" + "=" * 70)
    if result["success"]:
        print("✓ HOÀN THÀNH!")
    else:
        print("✗ THẤT BẠI!")
    print("=" * 70)
    
    return result


def main():
    """Main function với argument parsing"""
    parser = argparse.ArgumentParser(description='Cập nhật dữ liệu fuel_pump cho một ngày cụ thể')
    parser.add_argument('--date', type=str, required=True,
                        help='Ngày cần cập nhật (format: YYYY-MM-DD)')
    
    args = parser.parse_args()
    
    result = update_single_day(args.date)
    
    # In kết quả dạng JSON để API endpoint có thể parse
    import json
    print("\n--- RESULT JSON ---")
    print(json.dumps(result, ensure_ascii=False))
    
    # Exit code dựa trên kết quả
    exit(0 if result["success"] else 1)


if __name__ == "__main__":
    main()
