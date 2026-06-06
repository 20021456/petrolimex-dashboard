"""
Auto-Update với options
- Mode 1: Auto-update thông minh (chỉ lấy dữ liệu mới)
- Mode 2: Reload từ cuối tháng 8/2025
- Mode 3: Reload với số ngày tùy chỉnh
"""

import sys
import os
import argparse
from datetime import datetime, timedelta

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from src.ingestion.fuel_api import FuelAPI

try:
    from src.utils.config import FUEL_USERNAME, FUEL_PASSWORD, MYSQL_CONFIG
except ImportError:
    print("✗ Không tìm thấy file src/utils/config.py")
    print("➜ Hãy kiểm tra lại cấu hình")
    exit(1)


def run_auto_update(api, max_days=90):
    """Chạy auto-update thông minh"""
    print("=" * 70)
    print("   MODE 1: AUTO UPDATE - CẬP NHẬT THÔNG MINH")
    print("=" * 70)
    print(f"\nCấu hình:")
    print(f"  - Username: {FUEL_USERNAME}")
    print(f"  - MySQL Host: {MYSQL_CONFIG['host']}")
    print(f"  - MySQL Database: {MYSQL_CONFIG['database']}")
    print()
    print("Tính năng:")
    print("  ✓ Tự động phát hiện ngày cuối cùng trong DB")
    print("  ✓ Chỉ lấy dữ liệu mới từ ngày cuối đến hôm nay")
    print("  ✓ Không lấy lại dữ liệu đã có")
    print("  ✓ Update dữ liệu nếu có thay đổi")
    print("  ✓ Tự động cleanup dữ liệu cũ > 3 tháng")
    print("  ✓ Cập nhật dữ liệu bồn bể")
    print()
    
    print(f"🚀 BẮT ĐẦU AUTO UPDATE...")
    print("-" * 70)
    
    total_imported = api.auto_update(max_days_back=max_days)
    
    # Bảng fuel_tanks đã được xóa — UI lấy 3 bồn từ config cứng trong
    # /api/fuel/tanks. Không upsert vào bảng đó nữa.

    # Snapshot TOTAL của các cột bơm (dùng so sánh sản lượng thực tế vs DB)
    print("\n" + "-" * 70)
    print("📊 SNAPSHOT TOTAL CỘT BƠM")
    print("-" * 70)
    log_pump_totals(api)

    if total_imported > 0:
        print(f"\n✅ THÀNH CÔNG! Đã cập nhật {total_imported:,} bản ghi mới")
    else:
        print(f"\n✅ THÀNH CÔNG! Dữ liệu đã up-to-date")


def log_pump_totals(api):
    """Snapshot TOTAL của các cột bơm vào pump_total_log."""
    try:
        online_data = api.get_online_status()
        if not online_data:
            print("ℹ️  Không có dữ liệu online để snapshot TOTAL")
            return
        if not api.connect_mysql():
            print("✗ Không thể kết nối MySQL để log pump totals")
            return
        ok = api.log_pump_totals(online_data)
        api.close_mysql()
        if ok > 0:
            print(f"✅ Đã snapshot TOTAL của {ok} cột bơm")
        else:
            print("⚠️  Không snapshot được TOTAL nào")
    except Exception as e:
        print(f"✗ Lỗi khi log pump totals: {e}")


def run_reload_from_august(api):
    """Reload từ cuối tháng 8/2025"""
    start_date = datetime(2025, 8, 25)
    end_date = datetime.now()
    days_diff = (end_date - start_date).days + 1
    
    print("=" * 70)
    print("   MODE 2: RELOAD TỪ CUỐI THÁNG 8/2025")
    print("=" * 70)
    print(f"\nCấu hình:")
    print(f"  - Username: {FUEL_USERNAME}")
    print(f"  - MySQL Host: {MYSQL_CONFIG['host']}")
    print(f"  - MySQL Database: {MYSQL_CONFIG['database']}")
    print()
    print(f"Khoảng thời gian:")
    print(f"  - Từ ngày: {start_date.strftime('%d/%m/%Y')} (Cuối tháng 8/2025)")
    print(f"  - Đến ngày: {end_date.strftime('%d/%m/%Y')} (Hôm nay)")
    print(f"  - Tổng số ngày: {days_diff} ngày")
    print()
    
    print(f"🚀 BẮT ĐẦU RELOAD...")
    print("-" * 70)
    
    if not api.connect_mysql():
        print("\n✗ Không thể kết nối MySQL")
        return
    
    if not api.create_mysql_table():
        print("\n✗ Không thể tạo bảng fuel_pump")
        api.close_mysql()
        return
    
    total_success = 0
    current_date = start_date
    day_count = 0
    
    while current_date.date() <= end_date.date():
        day_count += 1
        date_str = current_date.strftime('%Y-%m-%d')
        
        try:
            data = api.get_all_data_paginated(from_date=date_str, to_date=date_str)
            
            if data:
                success = api.insert_to_mysql(data)
                total_success += success
                print(f"✓ [{day_count}/{days_diff}] {date_str}: {success}/{len(data)} bản ghi")
            
            if current_date.date() < end_date.date():
                import time
                time.sleep(1)
                
        except Exception as e:
            print(f"✗ Lỗi ngày {date_str}: {str(e)}")
        
        current_date += timedelta(days=1)
    
    api.close_mysql()
    print(f"\n✅ THÀNH CÔNG! Đã reload {total_success:,} bản ghi")


def run_reload_days(api, days):
    """Reload N ngày gần nhất (XÓA CACHE CŨ trước khi insert mới)"""
    end_date = datetime.now()
    start_date = end_date - timedelta(days=days - 1)
    
    print("=" * 70)
    print(f"   MODE 3: RELOAD {days} NGÀY GẦN NHẤT")
    print("=" * 70)
    print(f"\nCấu hình:")
    print(f"  - Username: {FUEL_USERNAME}")
    print(f"  - MySQL Host: {MYSQL_CONFIG['host']}")
    print(f"  - MySQL Database: {MYSQL_CONFIG['database']}")
    print()
    print(f"Khoảng thời gian:")
    print(f"  - Từ ngày: {start_date.strftime('%d/%m/%Y')}")
    print(f"  - Đến ngày: {end_date.strftime('%d/%m/%Y')}")
    print(f"  - Tổng số ngày: {days} ngày")
    print()
    print("⚠️  CHÚ Ý: Sẽ XÓA CACHE CŨ của từng ngày trước khi reload!")
    print()
    
    print(f"🚀 BẮT ĐẦU RELOAD...")
    print("-" * 70)
    
    if not api.connect_mysql():
        print("\n✗ Không thể kết nối MySQL")
        return
    
    if not api.create_mysql_table():
        print("\n✗ Không thể tạo bảng fuel_pump")
        api.close_mysql()
        return
    
    total_success = 0
    total_deleted = 0
    current_date = start_date
    day_count = 0
    
    while current_date.date() <= end_date.date():
        day_count += 1
        date_str = current_date.strftime('%Y-%m-%d')
        
        try:
            # XÓA CACHE CŨ của ngày này trước
            deleted = api.delete_data_by_date(date_str)
            total_deleted += deleted
            
            # Lấy dữ liệu mới từ server
            data = api.get_all_data_paginated(from_date=date_str, to_date=date_str)
            
            if data:
                success = api.insert_to_mysql(data)
                total_success += success
                print(f"✓ [{day_count}/{days}] {date_str}: Xóa {deleted} | Insert {success}/{len(data)} bản ghi")
            else:
                print(f"✓ [{day_count}/{days}] {date_str}: Xóa {deleted} | Không có dữ liệu mới")
            
            if current_date.date() < end_date.date():
                import time
                time.sleep(1)
                
        except Exception as e:
            print(f"✗ Lỗi ngày {date_str}: {str(e)}")
        
        current_date += timedelta(days=1)
    
    api.close_mysql()
    print(f"\n✅ THÀNH CÔNG!")
    print(f"   - Đã xóa: {total_deleted:,} bản ghi cũ")
    print(f"   - Đã thêm: {total_success:,} bản ghi mới")


def main():
    """Main function với argument parsing"""
    parser = argparse.ArgumentParser(description='Fuel Auto Update với options')
    parser.add_argument('--mode', type=int, choices=[1, 2, 3], default=1,
                        help='Mode: 1=Auto-update, 2=Reload từ tháng 8, 3=Reload N ngày')
    parser.add_argument('--days', type=int, default=90,
                        help='Số ngày (dùng cho mode 3)')
    
    args = parser.parse_args()
    
    # Khởi tạo API
    api = FuelAPI(
        username=FUEL_USERNAME,
        password=FUEL_PASSWORD,
        headless=True,
        mysql_config=MYSQL_CONFIG
    )
    
    try:
        # Đăng nhập
        if not api.login():
            print("\n✗ Không thể đăng nhập. Vui lòng kiểm tra lại thông tin.")
            return
        
        # Chạy mode tương ứng
        if args.mode == 1:
            run_auto_update(api, args.days)
        elif args.mode == 2:
            run_reload_from_august(api)
        elif args.mode == 3:
            run_reload_days(api, args.days)
        
        print("\n" + "=" * 70)
        print("✓ HOÀN THÀNH!")
        print("=" * 70)
        
    except Exception as e:
        print(f"\n✗ Lỗi: {e}")
        import traceback
        traceback.print_exc()
        
    finally:
        api.cleanup()


if __name__ == "__main__":
    main()

