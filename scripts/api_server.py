"""
Flask API Server cho Python Container
Cho phép Next.js dashboard gọi để trigger cập nhật dữ liệu
"""

import sys
import os
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS

# Thêm parent directory vào path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from scripts.update_single_day import update_single_day

app = Flask(__name__)
CORS(app)  # Cho phép cross-origin requests


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'ok',
        'service': 'fuel-python-api',
        'timestamp': datetime.now().isoformat()
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
        
        # Gọi function update
        print(f"[API] Nhận request cập nhật ngày: {date_str}")
        result = update_single_day(date_str)
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


if __name__ == '__main__':
    port = int(os.environ.get('API_PORT', 5000))
    print(f"🚀 Starting Fuel Python API Server on port {port}...")
    app.run(host='0.0.0.0', port=port, debug=False)
