#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Script helper để lấy dữ liệu từ Fuel API và trả về JSON
Được gọi bởi Next.js API routes
"""

import sys
import json
import argparse

from fuel_api import FuelAPI
from config import FUEL_USERNAME, FUEL_PASSWORD

def main():
    try:
        parser = argparse.ArgumentParser(description='Lấy dữ liệu từ Fuel')
        parser.add_argument('--type', choices=['online', 'prices', 'tanks'], required=True,
                            help='Loại dữ liệu cần lấy')
        
        args = parser.parse_args()
        
        # Khởi tạo API (headless mode)
        api = FuelAPI(FUEL_USERNAME, FUEL_PASSWORD, headless=True, mysql_config=None)
        
        try:
            # Đăng nhập
            if not api.login():
                result = {"success": False, "error": "Không thể đăng nhập Fuel", "data": [], "count": 0}
                print(json.dumps(result, ensure_ascii=False), flush=True)
                sys.exit(1)
            
            # Lấy dữ liệu theo loại
            if args.type == 'online':
                data = api.get_online_status()
            elif args.type == 'prices':
                data = api.get_fuel_prices()
            elif args.type == 'tanks':
                data = api.get_tank_inventory()
            else:
                data = []
            
            # Convert datetime objects to string nếu có
            for item in data:
                for key, value in list(item.items()):
                    if hasattr(value, 'isoformat'):
                        item[key] = value.isoformat()
            
            # Trả về JSON
            result = {
                "success": True,
                "data": data,
                "count": len(data)
            }
            print(json.dumps(result, ensure_ascii=False), flush=True)
            
        except Exception as e:
            result = {"success": False, "error": str(e), "data": [], "count": 0}
            print(json.dumps(result, ensure_ascii=False), flush=True)
            sys.exit(1)
        finally:
            api.cleanup()
            
    except Exception as e:
        result = {"success": False, "error": f"Script error: {str(e)}", "data": [], "count": 0}
        print(json.dumps(result, ensure_ascii=False), flush=True)
        sys.exit(1)

if __name__ == "__main__":
    main()
