"""
Flask API Server cho Python Container
Cho phép Next.js dashboard gọi để trigger cập nhật dữ liệu
"""

import sys
import os

# Thêm parent directory vào path trước khi import
APP_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if APP_DIR not in sys.path:
    sys.path.insert(0, APP_DIR)

# Print để debug
print(f"🐳 Running in Docker mode - Working dir: {os.getcwd()}")
print(f"🐳 APP_DIR: {APP_DIR}")
print(f"🐳 sys.path: {sys.path[:3]}...")

from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS

# Import config và check kết nối
try:
    from database.config import FUEL_USERNAME, FUEL_PASSWORD, MYSQL_CONFIG
    print(f"🐳 Running in Docker mode - MySQL: {MYSQL_CONFIG.get('host')}:{MYSQL_CONFIG.get('port', 3306)}")
except Exception as e:
    print(f"⚠️ Warning: Could not import config: {e}")
    MYSQL_CONFIG = None

app = Flask(__name__)
CORS(app)  # Cho phép cross-origin requests


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'ok',
        'service': 'fuel-python-api',
        'timestamp': datetime.now().isoformat(),
        'mysql_configured': MYSQL_CONFIG is not None
    })


@app.route('/api/update-fuel-data', methods=['POST'])
def update_fuel_data():
    """
    API endpoint để cập nhật dữ liệu fuel_pump cho một ngày cụ thể
    
    Request body:
    {
        "date": "YYYY-MM-DD"
    }
    
    Response:
    {
        "success": bool,
        "message": str,
        "deleted": int,
        "inserted": int,
        "date": str
    }
    """
    data = None
    try:
        data = request.get_json()
        
        if not data or 'date' not in data:
            return jsonify({
                'success': False,
                'message': 'Thiếu tham số date',
                'deleted': 0,
                'inserted': 0,
                'date': ''
            }), 400
        
        date_str = data['date']
        
        # Validate date format
        try:
            datetime.strptime(date_str, '%Y-%m-%d')
        except ValueError:
            return jsonify({
                'success': False,
                'message': f'Định dạng ngày không hợp lệ: {date_str}. Vui lòng dùng YYYY-MM-DD',
                'deleted': 0,
                'inserted': 0,
                'date': date_str
            }), 400
        
        # Import và chạy update trực tiếp
        print(f"[API] Nhận request cập nhật ngày: {date_str}")
        
        from database.fuel_api import FuelAPI
        from database.config import FUEL_USERNAME, FUEL_PASSWORD, MYSQL_CONFIG
        
        result = {
            "success": False,
            "message": "",
            "deleted": 0,
            "inserted": 0,
            "date": date_str
        }
        
        # Khởi tạo API
        api = FuelAPI(
            username=FUEL_USERNAME,
            password=FUEL_PASSWORD,
            headless=True,
            mysql_config=MYSQL_CONFIG
        )
        
        try:
            # Đăng nhập
            print("[API] Đang đăng nhập...")
            if not api.login():
                result["message"] = "Không thể đăng nhập. Vui lòng kiểm tra lại thông tin."
                return jsonify(result), 500
            
            # Kết nối MySQL
            print("[API] Đang kết nối MySQL...")
            if not api.connect_mysql():
                result["message"] = "Không thể kết nối MySQL"
                return jsonify(result), 500
            
            if not api.create_mysql_table():
                result["message"] = "Không thể tạo bảng fuel_pump"
                api.close_mysql()
                return jsonify(result), 500
            
            # Xóa dữ liệu cũ của ngày này
            print(f"[API] Đang xóa dữ liệu cũ của ngày {date_str}...")
            deleted = api.delete_data_by_date(date_str)
            result["deleted"] = deleted
            print(f"[API] Đã xóa {deleted} bản ghi")
            
            # Lấy dữ liệu mới từ server
            print(f"[API] Đang lấy dữ liệu mới từ server...")
            data_list = api.get_all_data_paginated(from_date=date_str, to_date=date_str)
            
            if data_list:
                # Insert dữ liệu mới
                print(f"[API] Đang lưu {len(data_list)} bản ghi vào MySQL...")
                success = api.insert_to_mysql(data_list)
                result["inserted"] = success
                print(f"[API] Đã lưu {success}/{len(data_list)} bản ghi")
                
                result["success"] = True
                result["message"] = f"Cập nhật thành công! Đã xóa {deleted} và thêm {success} bản ghi cho ngày {date_str}"
            else:
                result["success"] = True
                result["inserted"] = 0
                result["message"] = f"Không có dữ liệu mới cho ngày {date_str}"
            
            # Đóng kết nối
            api.close_mysql()
            
        finally:
            api.cleanup()
        
        print(f"[API] Kết quả: {result}")
        status_code = 200 if result['success'] else 500
        return jsonify(result), status_code
        
    except Exception as e:
        print(f"[API] Lỗi: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'message': f'Lỗi server: {str(e)}',
            'deleted': 0,
            'inserted': 0,
            'date': data.get('date', '') if data else ''
        }), 500


@app.route('/api/auto-update', methods=['POST'])
def auto_update():
    """
    API endpoint để chạy auto-update (cập nhật thông minh)
    """
    try:
        from database.fuel_api import FuelAPI
        from database.config import FUEL_USERNAME, FUEL_PASSWORD, MYSQL_CONFIG
        
        print("[API] Bắt đầu auto-update...")
        
        api = FuelAPI(
            username=FUEL_USERNAME,
            password=FUEL_PASSWORD,
            headless=True,
            mysql_config=MYSQL_CONFIG
        )
        
        try:
            if not api.login():
                return jsonify({
                    'success': False,
                    'message': 'Không thể đăng nhập'
                }), 500
            
            total_imported = api.auto_update(max_days_back=90)
            
            return jsonify({
                'success': True,
                'message': f'Auto-update thành công! Đã cập nhật {total_imported} bản ghi',
                'total_imported': total_imported
            })
            
        finally:
            api.cleanup()
            
    except Exception as e:
        print(f"[API] Lỗi auto-update: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'message': f'Lỗi: {str(e)}'
        }), 500


@app.route('/api/test', methods=['GET'])
def test_endpoint():
    """Test endpoint để kiểm tra API hoạt động"""
    try:
        from database.config import FUEL_USERNAME, MYSQL_CONFIG
        return jsonify({
            'status': 'ok',
            'fuel_username': FUEL_USERNAME,
            'mysql_host': MYSQL_CONFIG.get('host'),
            'mysql_database': MYSQL_CONFIG.get('database')
        })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


if __name__ == '__main__':
    port = int(os.environ.get('API_PORT', 5000))
    print(f"🚀 Starting Fuel Python API Server on port {port}...")
    app.run(host='0.0.0.0', port=port, debug=False, threaded=True)
