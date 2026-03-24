"""
Scheduler với options - Tự động chạy cập nhật hoặc reload định kỳ
Hỗ trợ:
  - Auto-update: Chỉ lấy dữ liệu mới
  - Reload: Load lại từ cuối tháng 8/2025
"""

import sys
import os
import time
import schedule
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


def run_auto_update():
    """Chạy auto-update - chỉ lấy dữ liệu mới"""
    print("\n" + "=" * 70)
    print(f"🕐 {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} - AUTO UPDATE")
    print("=" * 70)
    
    api = FuelAPI(
        username=FUEL_USERNAME,
        password=FUEL_PASSWORD,
        headless=True,
        mysql_config=MYSQL_CONFIG
    )
    
    try:
        if api.login():
            total_imported = api.auto_update(max_days_back=90)
            
            if total_imported > 0:
                print(f"\n✅ Đã cập nhật {total_imported:,} bản ghi mới")
            else:
                print(f"\n✅ Dữ liệu đã up-to-date")
        else:
            print("\n✗ Không thể đăng nhập")
            
    except Exception as e:
        print(f"\n✗ Lỗi: {e}")
        import traceback
        traceback.print_exc()
        
    finally:
        api.cleanup()
    
    print("=" * 70)
    print(f"✓ HOÀN THÀNH - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 70)


def run_reload_from_august():
    """Reload từ cuối tháng 8/2025"""
    print("\n" + "=" * 70)
    print(f"🕐 {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} - RELOAD TỪ THÁNG 8")
    print("=" * 70)
    
    # Xác định khoảng thời gian
    start_date = datetime(2025, 8, 25)
    end_date = datetime.now()
    days_diff = (end_date - start_date).days + 1
    
    print(f"\n📊 Khoảng thời gian: {start_date.strftime('%d/%m/%Y')} - {end_date.strftime('%d/%m/%Y')}")
    print(f"📊 Số ngày: {days_diff}")
    
    api = FuelAPI(
        username=FUEL_USERNAME,
        password=FUEL_PASSWORD,
        headless=True,
        mysql_config=MYSQL_CONFIG
    )
    
    try:
        if not api.login():
            print("\n✗ Không thể đăng nhập")
            return
        
        if not api.connect_mysql():
            print("\n✗ Không thể kết nối MySQL")
            return
        
        if not api.create_mysql_table():
            print("\n✗ Không thể tạo bảng fuel_pump")
            api.close_mysql()
            return
        
        # Load dữ liệu từng ngày
        total_success = 0
        total_records = 0
        
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
                    total_records += len(data)
                    print(f"✓ [{day_count}/{days_diff}] {date_str}: {success}/{len(data)} bản ghi")
                
                if current_date.date() < end_date.date():
                    time.sleep(1)
                    
            except Exception as e:
                print(f"✗ Lỗi ngày {date_str}: {str(e)}")
            
            current_date += timedelta(days=1)
        
        api.close_mysql()
        
        print(f"\n✅ Đã reload {total_success:,} bản ghi")
        
    except Exception as e:
        print(f"\n✗ Lỗi: {e}")
        import traceback
        traceback.print_exc()
        
    finally:
        api.cleanup()
    
    print("=" * 70)
    print(f"✓ HOÀN THÀNH - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 70)


def main():
    """Chạy scheduler với options"""
    parser = argparse.ArgumentParser(description='Scheduler với options')
    parser.add_argument('--mode', choices=['auto', 'reload'], default='auto',
                        help='Chế độ: auto (cập nhật mới) hoặc reload (load từ tháng 8)')
    parser.add_argument('--interval', type=int, default=6,
                        help='Khoảng thời gian giữa các lần chạy (giờ)')
    parser.add_argument('--run-once', action='store_true',
                        help='Chạy một lần rồi thoát (không schedule)')
    
    args = parser.parse_args()
    
    mode_name = "AUTO UPDATE" if args.mode == 'auto' else "RELOAD TỪ THÁNG 8"
    
    print("=" * 70)
    print(f"   FUEL SCHEDULER - {mode_name}")
    print("=" * 70)
    print(f"\n⚙️  Cấu hình:")
    print(f"   - Username: {FUEL_USERNAME}")
    print(f"   - MySQL Host: {MYSQL_CONFIG['host']}")
    print(f"   - MySQL Database: {MYSQL_CONFIG['database']}")
    print(f"   - Mode: {mode_name}")
    
    if not args.run_once:
        print(f"   - Interval: Mỗi {args.interval} giờ")
        print()
        print("Nhấn Ctrl+C để dừng...")
    
    print("=" * 70)
    
    # Chọn function dựa trên mode
    task_func = run_auto_update if args.mode == 'auto' else run_reload_from_august
    
    # Chạy ngay lần đầu
    print("\n🚀 Chạy lần đầu tiên...")
    task_func()
    
    if args.run_once:
        print("\n✓ Đã chạy xong (run-once mode)")
        return
    
    # Schedule chạy định kỳ
    schedule.every(args.interval).hours.do(task_func)
    
    # Hiển thị lịch trình
    next_run = schedule.next_run()
    if next_run:
        print(f"\n⏰ Lần chạy tiếp theo: {next_run.strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Chạy scheduler
    try:
        while True:
            schedule.run_pending()
            time.sleep(60)  # Check mỗi phút
            
    except KeyboardInterrupt:
        print("\n\n✋ Đã dừng scheduler")
        print("=" * 70)


if __name__ == "__main__":
    main()

