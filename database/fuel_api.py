"""
Script để lấy dữ liệu từ fuel.net (Trang Mã Bơm - Theo dõi bán hàng)
Sử dụng Playwright để tự động hóa browser và lấy dữ liệu
"""

from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError
from bs4 import BeautifulSoup
import pandas as pd
from datetime import datetime, timedelta
import json
import time
import sys
import io
from typing import Dict, List, Optional
import mysql.connector
from mysql.connector import Error

# Fix encoding for Windows console
if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

class FuelAPI:
    """Class để tương tác với fuel.net bằng Playwright"""
    
    BASE_URL = "http://seenpro.net/"
    DATA_URL = f"{BASE_URL}/theodoibanhang.php"
    ONLINE_URL = f"{BASE_URL}/online.php"
    PRICE_URL = f"{BASE_URL}/quanlygia.php"
    TANK_URL = f"{BASE_URL}/khohang.php"
    
    def __init__(self, username: str, password: str, headless: bool = True, mysql_config: Optional[Dict] = None):
        """
        Khởi tạo API client
        
        Args:
            username: Tên đăng nhập fuel
            password: Mật khẩu
            headless: Chạy browser ẩn (True) hoặc hiển thị (False)
            mysql_config: Dictionary chứa thông tin kết nối MySQL (optional)
        """
        self.username = username
        self.password = password
        self.headless = headless
        self.mysql_config = mysql_config
        self.mysql_connection = None
        self.playwright = None
        self.browser = None
        self.context = None
        self.page = None
        self.is_logged_in = False
        
    def login(self) -> bool:
        """
        Đăng nhập vào fuel.net bằng Playwright
        
        Returns:
            True nếu đăng nhập thành công
        """
        try:
            print("🌐 Đang khởi động browser...")
            self.playwright = sync_playwright().start()
            self.browser = self.playwright.chromium.launch(headless=self.headless)
            self.context = self.browser.new_context()
            self.page = self.context.new_page()
            
            # Đi đến trang đăng nhập
            print(f"🔐 Đang đăng nhập với tài khoản: {self.username}")
            self.page.goto(self.BASE_URL)
            self.page.wait_for_load_state('networkidle')
            
            # Điền thông tin đăng nhập
            self.page.fill('input[placeholder="Tài khoản"], input[name="taikhoan"]', self.username)
            self.page.fill('input[placeholder="Mật khẩu"], input[name="matkhau"]', self.password)
            
            # Click nút đăng nhập
            self.page.click('button:has-text("Đăng nhập")')
            self.page.wait_for_load_state('networkidle')
            
            # Kiểm tra đăng nhập thành công
            time.sleep(0.3)  # Tối ưu: giảm từ 1s → 0.3s
            
            # Kiểm tra xem có redirect về trang quản lý không
            current_url = self.page.url
            if 'quanlycuahang' in current_url or 'menu.php' in current_url:
                self.is_logged_in = True
                print("✓ Đăng nhập thành công!")
                return True
            
            # Kiểm tra xem trang có chứa text đăng nhập thất bại không
            page_content = self.page.content()
            if 'ĐĂNG NHẬP' in page_content and 'Tài khoản' in page_content:
                print("✗ Đăng nhập thất bại! Kiểm tra lại username/password")
                self.cleanup()
                return False
            
            # Nếu không chắc, thử truy cập trang quản lý
            self.page.goto(f"{self.BASE_URL}/quanlycuahang.php")
            self.page.wait_for_load_state('networkidle')
            
            if 'ĐĂNG NHẬP' not in self.page.content():
                self.is_logged_in = True
                print("✓ Đăng nhập thành công!")
                
                # Vào trang Mã Bơm để thiết lập session đúng cách
                print("📊 Đang truy cập trang Mã Bơm...")
                self.page.goto(self.DATA_URL)
                self.page.wait_for_load_state('networkidle')
                time.sleep(0.3)  # Tối ưu: giảm từ 1s → 0.3s
                print("✓ Đã vào trang Mã Bơm")
                
                return True
            else:
                print("✗ Đăng nhập thất bại!")
                self.cleanup()
                return False
                
        except Exception as e:
            print(f"✗ Lỗi khi đăng nhập: {e}")
            self.cleanup()
            return False
    
    def cleanup(self):
        """Đóng browser và dọn dẹp"""
        try:
            if self.page:
                self.page.close()
            if self.context:
                self.context.close()
            if self.browser:
                self.browser.close()
            if self.playwright:
                self.playwright.stop()
        except:
            pass
    
    def get_pump_data(
        self,
        from_date: str,
        to_date: str,
        customer: str = "",
        pump_column: str = "",
        fuel_type: str = "",
        start: int = 0
    ) -> List[Dict]:
        """
        Lấy dữ liệu từ trang Mã Bơm
        
        Args:
            from_date: Từ ngày (YYYY-MM-DD)
            to_date: Đến ngày (YYYY-MM-DD)
            customer: Mã số thuế khách hàng
            pump_column: Mã cột bơm (CB01, CB02, ...)
            fuel_type: Loại nhiên liệu
            start: Vị trí phân trang (0, 11, 22...)
            
        Returns:
            List các dictionary chứa thông tin giao dịch
        """
        if not self.is_logged_in:
            print("✗ Chưa đăng nhập! Vui lòng gọi login() trước.")
            return []
        
        try:
            # Build URL với params
            url = f"{self.DATA_URL}?t1={from_date}&t2={to_date}&kh={customer}&cb={pump_column}&nl={fuel_type}&dkt=&ts=&dkl=&ls=&tt=&sx=&start={start}"
            
            # Navigate đến trang
            self.page.goto(url)
            self.page.wait_for_load_state('networkidle')
            time.sleep(1)  # Đợi trang load xong
            
            # Kiểm tra xem có bị redirect về trang login không
            current_url = self.page.url
            if 'ĐĂNG NHẬP' in self.page.content().upper() and 'theodoibanhang' not in current_url:
                print("✗ Session đã hết hạn hoặc chưa vào được trang Mã Bơm")
                return []
            
            # Lấy HTML
            html = self.page.content()
            
            return self._parse_html(html)
                
        except Exception as e:
            print(f"✗ Lỗi khi lấy dữ liệu: {e}")
            return []
    
    def parse_datetime(self, text):
        """Parse datetime từ text dạng '15:51:10 11/10/2025'"""
        text = ' '.join(text.split())
        try:
            return datetime.strptime(text, '%H:%M:%S %d/%m/%Y')
        except:
            try:
                # Thử format khác nếu có
                return datetime.strptime(text, '%H:%M:%S%d/%m/%Y')
            except:
                print(f"⚠️  Không thể parse datetime: {text}")
                return None
    
    def clean_number(self, text):
        """Làm sạch số, loại bỏ dấu phẩy, chấm, khoảng trắng"""
        if not text:
            return 0.0
        # Loại bỏ dấu chấm phân cách hàng nghìn, thay dấu phẩy thập phân bằng dấu chấm
        text = text.replace('.', '').replace(',', '.').replace('"', '').strip()
        try:
            return float(text)
        except:
            return 0.0
    
    def _parse_html(self, html: str) -> List[Dict]:
        """
        Parse HTML để extract dữ liệu bảng
        
        Args:
            html: HTML content
            
        Returns:
            List các dictionary chứa thông tin giao dịch
        """
        soup = BeautifulSoup(html, 'html.parser')
        data = []
        
        # Tìm tất cả các div.rowx (mỗi row là 1 transaction)
        rows = soup.find_all('div', class_='rowx')
        
        for row in rows:
            try:
                # Extract thông tin từ các div con theo class
                ma_bom_div = row.find('div', class_='maBom')
                nhien_lieu_div = row.find('div', class_='nhienLieu')
                gia_div = row.find('div', class_='donGia')
                lit_div = row.find('div', class_='soLit')
                tien_div = row.find('div', class_='thanhTien')
                time_div = row.find('div', class_='thoiGianKetThucBom')
                customer_div = row.find('div', class_='khachHang')
                invoice_div = row.find('div', class_='eHD')
                
                # Extract text từ <p> trong mỗi div
                ma_bom = ma_bom_div.find('p').get_text(strip=True) if ma_bom_div and ma_bom_div.find('p') else ''
                nhien_lieu = nhien_lieu_div.find('p').get_text(strip=True) if nhien_lieu_div and nhien_lieu_div.find('p') else ''
                gia = gia_div.find('p').get_text(strip=True) if gia_div and gia_div.find('p') else ''
                lit = lit_div.find('p').get_text(strip=True) if lit_div and lit_div.find('p') else ''
                tien = tien_div.find('p').get_text(strip=True) if tien_div and tien_div.find('p') else ''
                
                # Thời gian (có thể có <br> tag)
                thoi_gian = ''
                if time_div and time_div.find('p'):
                    thoi_gian = ' '.join(time_div.find('p').stripped_strings)
                
                # Khách hàng
                khach_hang = 'N/A'
                if customer_div and customer_div.find('p'):
                    khach_hang = customer_div.find('p').get_text(strip=True)
                
                # Hóa đơn
                hoa_don = '-'
                if invoice_div and invoice_div.find('p'):
                    hoa_don = invoice_div.find('p').get_text(strip=True)
                
                # Validate và clean data
                if ma_bom and nhien_lieu and ma_bom.startswith('CB'):
                    transaction = {
                        'ma_bom': ma_bom,
                        'nhien_lieu': nhien_lieu,
                        'gia': self.clean_number(gia),
                        'lit': self.clean_number(lit),
                        'tien': self.clean_number(tien),
                        'ket_thuc_bom': self.parse_datetime(thoi_gian),
                        'khach_hang': khach_hang,
                        'hoa_don': hoa_don
                    }
                    data.append(transaction)
                    
            except Exception as e:
                # Skip rows có lỗi
                continue
        
        return data
    
    def get_all_data_paginated(
        self,
        from_date: str,
        to_date: str,
        **kwargs
    ) -> List[Dict]:
        """
        Lấy tất cả dữ liệu (tự động phân trang)
        
        Args:
            from_date: Từ ngày (YYYY-MM-DD)
            to_date: Đến ngày (YYYY-MM-DD)
            **kwargs: Các tham số filter khác
            
        Returns:
            List tất cả giao dịch
        """
        all_data = []
        start = 0
        page = 1
        
        print(f"\n📊 Đang lấy dữ liệu từ {from_date} đến {to_date}...")
        
        while True:
            print(f"   Trang {page}...", end=' ')
            data = self.get_pump_data(from_date, to_date, start=start, **kwargs)
            
            if not data:
                print("(Hết dữ liệu)")
                break
            
            print(f"✓ {len(data)} giao dịch")
            all_data.extend(data)
            
            # Kiểm tra nếu số lượng < 11 thì là trang cuối
            if len(data) < 11:
                break
            
            start += 11
            page += 1
            time.sleep(0.5)  # Delay để tránh quá tải server
        
        print(f"\n✓ Tổng cộng: {len(all_data)} giao dịch")
        return all_data
    
    def export_to_csv(self, data: List[Dict], filename: str):
        """
        Export dữ liệu ra file CSV
        
        Args:
            data: List các dictionary
            filename: Tên file output
        """
        if not data:
            print("✗ Không có dữ liệu để export")
            return
        
        df = pd.DataFrame(data)
        df.to_csv(filename, index=False, encoding='utf-8-sig')
        print(f"✓ Đã lưu {len(data)} giao dịch vào {filename}")
    
    def export_to_json(self, data: List[Dict], filename: str):
        """
        Export dữ liệu ra file JSON
        
        Args:
            data: List các dictionary
            filename: Tên file output
        """
        if not data:
            print("✗ Không có dữ liệu để export")
            return
        
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"✓ Đã lưu {len(data)} giao dịch vào {filename}")
    
    def connect_mysql(self) -> bool:
        """
        Kết nối đến MySQL database
        
        Returns:
            True nếu kết nối thành công
        """
        if not self.mysql_config:
            print("✗ Chưa cấu hình MySQL")
            return False
        
        try:
            self.mysql_connection = mysql.connector.connect(**self.mysql_config)
            
            if self.mysql_connection.is_connected():
                print(f"✓ Kết nối MySQL thành công - Database: {self.mysql_config['database']}")
                return True
            else:
                print("✗ Không thể kết nối MySQL")
                return False
                
        except Error as e:
            print(f"✗ Lỗi khi kết nối MySQL: {e}")
            return False
    
    def create_mysql_table(self) -> bool:
        """
        Tạo bảng fuel_pump trong MySQL nếu chưa tồn tại
        
        Returns:
            True nếu tạo thành công
        """
        if not self.mysql_connection or not self.mysql_connection.is_connected():
            print("✗ Chưa kết nối MySQL")
            return False
        
        create_table_query = """
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
            UNIQUE KEY unique_ma_bom (ma_bom)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        """
        
        try:
            cursor = self.mysql_connection.cursor()
            cursor.execute(create_table_query)
            self.mysql_connection.commit()
            print("✓ Tạo/kiểm tra bảng 'fuel_pump' thành công")
            cursor.close()
            return True
            
        except Error as e:
            print(f"✗ Lỗi khi tạo bảng: {e}")
            return False
    
    def insert_to_mysql(self, data: List[Dict]) -> int:
        """
        Insert dữ liệu vào MySQL
        
        Args:
            data: List các dictionary chứa dữ liệu
        
        Returns:
            Số bản ghi được insert thành công
        """
        if not self.mysql_connection or not self.mysql_connection.is_connected():
            print("✗ Chưa kết nối MySQL")
            return 0
        
        if not data:
            print("✗ Không có dữ liệu để insert")
            return 0
        
        insert_query = """
        INSERT INTO fuel_pump 
        (ma_bom, nhien_lieu, gia, lit, tien, ket_thuc_bom, khach_hang, hoa_don)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        ON DUPLICATE KEY UPDATE
            nhien_lieu = VALUES(nhien_lieu),
            gia = VALUES(gia),
            lit = VALUES(lit),
            tien = VALUES(tien),
            ket_thuc_bom = VALUES(ket_thuc_bom),
            khach_hang = VALUES(khach_hang),
            hoa_don = VALUES(hoa_don)
        """
        
        success_count = 0
        error_count = 0
        
        try:
            cursor = self.mysql_connection.cursor()
            
            for record in data:
                try:
                    values = (
                        record['ma_bom'],
                        record['nhien_lieu'],
                        record['gia'],
                        record['lit'],
                        record['tien'],
                        record['ket_thuc_bom'],
                        record['khach_hang'],
                        record.get('hoa_don', '-')
                    )
                    
                    cursor.execute(insert_query, values)
                    success_count += 1
                    
                except Error as e:
                    error_count += 1
                    print(f"✗ Lỗi khi insert {record['ma_bom']}: {e}")
            
            self.mysql_connection.commit()
            cursor.close()
            
            print(f"✓ Insert thành công {success_count}/{len(data)} bản ghi")
            if error_count > 0:
                print(f"⚠️  Có {error_count} bản ghi lỗi")
            
            return success_count
            
        except Error as e:
            print(f"✗ Lỗi khi insert dữ liệu: {e}")
            return 0
    
    def export_to_mysql(self, data: List[Dict]) -> int:
        """
        Export dữ liệu ra MySQL (wrapper cho insert_to_mysql)
        
        Args:
            data: List các dictionary
            
        Returns:
            Số bản ghi được insert thành công
        """
        if not self.mysql_config:
            print("✗ Chưa cấu hình MySQL. Vui lòng truyền mysql_config khi khởi tạo FuelAPI")
            return 0
        
        # Kết nối MySQL
        if not self.connect_mysql():
            return 0
        
        # Tạo bảng
        if not self.create_mysql_table():
            self.close_mysql()
            return 0
        
        # Insert dữ liệu
        result = self.insert_to_mysql(data)
        
        # Đóng kết nối
        self.close_mysql()
        
        return result
    
    def close_mysql(self):
        """Đóng kết nối MySQL"""
        if self.mysql_connection and self.mysql_connection.is_connected():
            self.mysql_connection.close()
            print("✓ Đã đóng kết nối MySQL")
    
    def get_last_update_date(self) -> Optional[datetime]:
        """
        Lấy ngày của bản ghi mới nhất trong MySQL
        
        Returns:
            datetime của bản ghi mới nhất hoặc None nếu chưa có dữ liệu
        """
        if not self.mysql_connection or not self.mysql_connection.is_connected():
            print("✗ Chưa kết nối MySQL")
            return None
        
        try:
            cursor = self.mysql_connection.cursor()
            
            # Lấy thời gian của bản ghi mới nhất
            query = """
            SELECT MAX(ket_thuc_bom) as last_date
            FROM fuel_pump
            WHERE ket_thuc_bom IS NOT NULL
            """
            
            cursor.execute(query)
            result = cursor.fetchone()
            cursor.close()
            
            if result and result[0]:
                last_date = result[0]
                print(f"ℹ️  Dữ liệu mới nhất trong DB: {last_date.strftime('%Y-%m-%d %H:%M:%S')}")
                return last_date
            else:
                print("ℹ️  Chưa có dữ liệu trong database")
                return None
                
        except Error as e:
            print(f"✗ Lỗi khi lấy ngày cập nhật cuối: {e}")
            return None
    
    def get_record_count(self) -> int:
        """
        Đếm tổng số bản ghi trong MySQL
        
        Returns:
            Số lượng bản ghi
        """
        if not self.mysql_connection or not self.mysql_connection.is_connected():
            print("✗ Chưa kết nối MySQL")
            return 0
        
        try:
            cursor = self.mysql_connection.cursor()
            cursor.execute("SELECT COUNT(*) FROM fuel_pump")
            result = cursor.fetchone()
            cursor.close()
            return result[0] if result else 0
        except Error as e:
            print(f"✗ Lỗi khi đếm bản ghi: {e}")
            return 0
    
    def cleanup_old_data(self, months: int = 3) -> int:
        """
        Xóa các bản ghi có thời gian kết thúc bơm quá N tháng
        
        Args:
            months: Số tháng (mặc định 3 tháng)
        
        Returns:
            Số bản ghi đã xóa
        """
        if not self.mysql_connection or not self.mysql_connection.is_connected():
            print("✗ Chưa kết nối MySQL")
            return 0
        
        try:
            cursor = self.mysql_connection.cursor()
            
            # Xóa các bản ghi có ket_thuc_bom quá N tháng
            delete_query = """
            DELETE FROM fuel_pump 
            WHERE ket_thuc_bom < DATE_SUB(NOW(), INTERVAL %s MONTH)
            """
            
            cursor.execute(delete_query, (months,))
            deleted_count = cursor.rowcount
            self.mysql_connection.commit()
            cursor.close()
            
            if deleted_count > 0:
                print(f"✓ Đã xóa {deleted_count} bản ghi có thời gian kết thúc bơm quá {months} tháng")
            else:
                print(f"ℹ️  Không có bản ghi nào quá {months} tháng để xóa")
            
            return deleted_count
            
        except Error as e:
            print(f"✗ Lỗi khi xóa dữ liệu cũ: {e}")
            return 0
    
    def delete_data_by_date(self, date_str: str) -> int:
        """
        Xóa tất cả dữ liệu của một ngày cụ thể
        
        Args:
            date_str: Ngày cần xóa (format: YYYY-MM-DD)
        
        Returns:
            Số bản ghi đã xóa
        """
        if not self.mysql_connection or not self.mysql_connection.is_connected():
            print("✗ Chưa kết nối MySQL")
            return 0
        
        try:
            cursor = self.mysql_connection.cursor()
            
            # Xóa tất cả bản ghi trong ngày đó
            delete_query = """
            DELETE FROM fuel_pump 
            WHERE DATE(ket_thuc_bom) = %s
            """
            
            cursor.execute(delete_query, (date_str,))
            deleted_count = cursor.rowcount
            self.mysql_connection.commit()
            cursor.close()
            
            return deleted_count
            
        except Error as e:
            print(f"✗ Lỗi khi xóa dữ liệu ngày {date_str}: {e}")
            return 0
    
    def auto_update(self, max_days_back: int = 90) -> int:
        """
        TỰ ĐỘNG CẬP NHẬT THÔNG MINH
        - Phát hiện ngày cuối cùng đã cập nhật trong database
        - Xóa cache của ngày cuối cùng đó
        - Lấy lại dữ liệu từ ngày cuối cùng đến hôm nay
        
        Đảm bảo:
        - Không bị mất dữ liệu (luôn lấy lại toàn bộ ngày cuối)
        - Dữ liệu luôn up-to-date (cập nhật đến thời điểm hiện tại)
        
        Args:
            max_days_back: Số ngày tối đa lùi lại nếu database rỗng (mặc định 90)
        
        Returns:
            Tổng số bản ghi đã import thành công
        """
        print("="*70)
        print("   FUEL AUTO UPDATE - CẬP NHẬT THÔNG MINH")
        print("="*70)
        
        # Kết nối MySQL
        if not self.connect_mysql():
            return 0
        
        if not self.create_mysql_table():
            self.close_mysql()
            return 0
        
        # Kiểm tra số bản ghi hiện tại
        current_count = self.get_record_count()
        print(f"\n📊 Trạng thái hiện tại:")
        print(f"   - Số bản ghi trong DB: {current_count:,}")
        
        # Lấy ngày cập nhật cuối cùng
        last_update = self.get_last_update_date()
        today = datetime.now()
        
        # Xác định khoảng thời gian cần lấy
        if last_update:
            # Lấy ngày cuối cùng đã cập nhật (không quan tâm giờ)
            last_update_date = last_update.date()
            today_date = today.date()
            
            # Xóa cache của ngày cuối cùng và cập nhật lại từ ngày đó
            start_date = last_update_date
            
            print(f"\n🔄 Chế độ: CẬP NHẬT THÔNG MINH")
            print(f"   - Ngày cập nhật cuối: {last_update_date.strftime('%Y-%m-%d')} (lúc {last_update.strftime('%H:%M:%S')})")
            print(f"   - Sẽ xóa cache ngày: {start_date.strftime('%Y-%m-%d')}")
            print(f"   - Lấy lại từ ngày: {start_date.strftime('%Y-%m-%d')}")
            print(f"   - Đến ngày: {today_date.strftime('%Y-%m-%d')}")
            
            # Convert to datetime for processing
            start_datetime = datetime.combine(start_date, datetime.min.time())
            days_to_fetch = (today_date - start_date).days + 1
            print(f"   - Số ngày cần lấy: {days_to_fetch}")
        else:
            # Chưa có dữ liệu - lấy N ngày gần nhất
            start_date = (today - timedelta(days=max_days_back - 1)).date()
            start_datetime = datetime.combine(start_date, datetime.min.time())
            
            print(f"\n🆕 Chế độ: KHỞI TẠO DỮ LIỆU MỚI")
            print(f"   - Từ ngày: {start_date.strftime('%Y-%m-%d')}")
            print(f"   - Đến ngày: {today.strftime('%Y-%m-%d')}")
            print(f"   - Số ngày: {max_days_back}")
        
        # Xóa dữ liệu cũ quá 3 tháng (nếu có)
        if current_count > 0:
            print("\n" + "-"*70)
            print("🧹 CLEANUP DỮ LIỆU CŨ")
            print("-"*70)
            self.cleanup_old_data(months=3)
            print("-"*70)
        
        # Lấy dữ liệu từng ngày
        total_success = 0
        total_records = 0
        failed_dates = []
        
        current_date = start_datetime
        day_count = 0
        total_days = (today.date() - start_date).days + 1
        
        print(f"\n🚀 BẮT ĐẦU LẤY DỮ LIỆU")
        print("="*70)
        
        while current_date.date() <= today.date():
            day_count += 1
            date_str = current_date.strftime('%Y-%m-%d')
            
            print(f"\n📊 [{day_count}/{total_days}] Đang xử lý ngày: {date_str}")
            print("-"*70)
            
            try:
                # Xóa cache của ngày cuối cùng (chỉ xóa lần đầu tiên trong vòng lặp)
                if last_update and current_date.date() == last_update.date() and day_count == 1:
                    print(f"🗑️  Xóa cache ngày cuối cùng: {date_str}")
                    try:
                        cursor = self.mysql_connection.cursor()
                        delete_query = """
                        DELETE FROM fuel_pump 
                        WHERE DATE(ket_thuc_bom) = %s
                        """
                        cursor.execute(delete_query, (date_str,))
                        self.mysql_connection.commit()
                        deleted_rows = cursor.rowcount
                        cursor.close()
                        print(f"   ✓ Đã xóa {deleted_rows} bản ghi")
                    except Exception as e:
                        print(f"   ✗ Lỗi khi xóa: {e}")
                
                # Lấy dữ liệu cho ngày này
                data = self.get_all_data_paginated(from_date=date_str, to_date=date_str)
                
                if data:
                    # Insert dữ liệu
                    success = self.insert_to_mysql(data)
                    total_success += success
                    total_records += len(data)
                    print(f"✓ Ngày {date_str}: Import {success}/{len(data)} bản ghi")
                else:
                    print(f"ℹ️  Ngày {date_str}: Không có dữ liệu")
                
                # Delay giữa các ngày để tránh spam server
                if current_date.date() < today.date():
                    time.sleep(1)
                    
            except Exception as e:
                print(f"✗ Lỗi khi xử lý ngày {date_str}: {str(e)}")
                failed_dates.append(date_str)
            
            # Chuyển sang ngày tiếp theo
            current_date += timedelta(days=1)
        
        # Lấy số bản ghi sau khi update
        new_count = self.get_record_count()
        
        # Đóng kết nối
        self.close_mysql()
        
        # Tổng kết
        print("\n" + "="*70)
        print("📊 KẾT QUẢ TỔNG HỢP")
        print("="*70)
        print(f"✓ Số bản ghi trước khi update: {current_count:,}")
        print(f"✓ Số bản ghi sau khi update: {new_count:,}")
        print(f"✓ Đã thêm mới: {new_count - current_count:,} bản ghi")
        print(f"✓ Số ngày đã xử lý: {day_count}/{total_days}")
        print(f"✓ Tổng số giao dịch lấy được: {total_records:,}")
        print(f"✓ Đã import thành công: {total_success:,} bản ghi")
        
        if failed_dates:
            print(f"\n⚠️  Các ngày bị lỗi ({len(failed_dates)}):")
            for date in failed_dates:
                print(f"   - {date}")
        
        print("="*70)
        
        return total_success
    
    def run_date_range(self, days_back: int = 90) -> int:
        """
        Chạy lấy dữ liệu theo từng ngày từ N ngày trước đến hôm nay và import vào MySQL
        (CHẾ ĐỘ CŨ - Khuyên dùng auto_update() thay thế)
        
        Args:
            days_back: Số ngày lùi lại (mặc định 90 ngày)
        
        Returns:
            Tổng số bản ghi đã import thành công
        """
        # Tính ngày bắt đầu và kết thúc
        today = datetime.now()
        start_date = today - timedelta(days=days_back)
        
        print("="*70)
        print("   FUEL AUTO IMPORT - LẤY DỮ LIỆU VÀ IMPORT VÀO MYSQL")
        print("="*70)
        print(f"\n📅 Khoảng thời gian:")
        print(f"   - Từ ngày: {start_date.strftime('%Y-%m-%d')}")
        print(f"   - Đến ngày: {today.strftime('%Y-%m-%d')}")
        print(f"   - Tổng cộng: {days_back + 1} ngày")
        
        # Kết nối MySQL một lần cho tất cả các ngày
        if not self.connect_mysql():
            return 0
        
        if not self.create_mysql_table():
            self.close_mysql()
            return 0
        
        # Xóa dữ liệu cũ quá 3 tháng
        print("\n" + "-"*70)
        print("🧹 CLEANUP DỮ LIỆU CŨ")
        print("-"*70)
        self.cleanup_old_data(months=3)
        print("-"*70)
        
        # Loop qua từng ngày
        total_success = 0
        total_records = 0
        failed_dates = []
        
        current_date = start_date
        day_count = 0
        
        while current_date <= today:
            day_count += 1
            date_str = current_date.strftime('%Y-%m-%d')
            
            print(f"\n📊 [{day_count}/{days_back + 1}] Đang xử lý ngày: {date_str}")
            print("-"*70)
            
            try:
                # Lấy dữ liệu cho ngày này
                data = self.get_all_data_paginated(from_date=date_str, to_date=date_str)
                
                if data:
                    # Insert dữ liệu
                    success = self.insert_to_mysql(data)
                    total_success += success
                    total_records += len(data)
                    print(f"✓ Ngày {date_str}: Import {success}/{len(data)} bản ghi")
                else:
                    print(f"ℹ️  Ngày {date_str}: Không có dữ liệu")
                
                # Delay giữa các ngày để tránh spam server
                if current_date < today:
                    time.sleep(1)
                    
            except Exception as e:
                print(f"✗ Lỗi khi xử lý ngày {date_str}: {str(e)}")
                failed_dates.append(date_str)
            
            # Chuyển sang ngày tiếp theo
            current_date += timedelta(days=1)
        
        # Đóng kết nối
        self.close_mysql()
        
        # Tổng kết
        print("\n" + "="*70)
        print("📊 KẾT QUẢ TỔNG HỢP")
        print("="*70)
        print(f"✓ Tổng số ngày xử lý: {day_count}")
        print(f"✓ Tổng số bản ghi: {total_records}")
        print(f"✓ Đã import thành công: {total_success} bản ghi")
        
        if failed_dates:
            print(f"\n⚠️  Các ngày bị lỗi ({len(failed_dates)}):")
            for date in failed_dates:
                print(f"   - {date}")
        
        print("="*70)
        
        return total_success
    
    def get_online_status(self) -> List[Dict]:
        """
        Lấy dữ liệu từ trang Theo Dõi Online
        
        Returns:
            List các dictionary chứa thông tin trạng thái cột bơm
        """
        if not self.is_logged_in:
            print("✗ Chưa đăng nhập! Vui lòng gọi login() trước.")
            return []
        
        try:
            print("📊 Đang lấy dữ liệu Theo Dõi Online...")
            self.page.goto(self.ONLINE_URL)
            self.page.wait_for_load_state('networkidle')
            time.sleep(0.3)  # Tối ưu: giảm từ 2s → 0.3s
            
            # Lấy HTML
            html = self.page.content()
            soup = BeautifulSoup(html, 'html.parser')
            
            data = []
            # Tìm tất cả các cột bơm (div.show-cot)
            pump_divs = soup.find_all('div', class_='show-cot')
            
            for pump_div in pump_divs:
                try:
                    # Lấy tên cột
                    tencot_div = pump_div.find('div', class_='tencot')
                    if not tencot_div:
                        continue
                    
                    # Lấy tên cột từ tencotleft
                    tencotleft = tencot_div.find('div', class_='tencotleft')
                    name = tencotleft.find('p').get_text(strip=True) if tencotleft and tencotleft.find('p') else ''
                    
                    # Lấy loại nhiên liệu từ boxnhienlieu
                    boxnhienlieu = tencot_div.find('div', class_=lambda x: x and 'boxnhienlieu' in x)
                    fuel_type = boxnhienlieu.find('p').get_text(strip=True) if boxnhienlieu and boxnhienlieu.find('p') else ''
                    
                    # Lấy thông tin chi tiết từ div.info
                    info_div = pump_div.find('div', class_='info')
                    if not info_div:
                        continue
                    
                    pump_data = {
                        'ten_cot': name,
                        'nhien_lieu': fuel_type,
                        'tien': '',
                        'lit': '',
                        'gia': '',
                        'total': ''
                    }
                    
                    # Parse từng field
                    flex_divs = info_div.find_all('div', class_='flex')
                    for flex_div in flex_divs:
                        left = flex_div.find('div', class_='info-left')
                        right = flex_div.find('div', class_='info-right')
                        
                        if left and right:
                            label = left.get_text(strip=True).upper()
                            # Lấy giá trị từ <p> bên trong right-box
                            p_tag = right.find('p')
                            value = p_tag.get_text(strip=True) if p_tag else right.get_text(strip=True)
                            
                            if 'TIỀN' in label:
                                pump_data['tien'] = value
                            elif 'LÍT' in label:
                                pump_data['lit'] = value
                            elif 'GIÁ' in label:
                                pump_data['gia'] = value
                            elif 'TOTAL' in label:
                                pump_data['total'] = value
                    
                    data.append(pump_data)
                    
                except Exception as e:
                    print(f"⚠️  Lỗi parse cột bơm: {e}")
                    continue
            
            print(f"✓ Lấy được {len(data)} cột bơm")
            return data
            
        except Exception as e:
            print(f"✗ Lỗi khi lấy dữ liệu online: {e}")
            return []
    
    def get_fuel_prices(self) -> List[Dict]:
        """
        Lấy dữ liệu từ trang Giá Nhiên Liệu
        
        Returns:
            List các dictionary chứa thông tin giá nhiên liệu
        """
        if not self.is_logged_in:
            print("✗ Chưa đăng nhập! Vui lòng gọi login() trước.")
            return []
        
        try:
            print("💰 Đang lấy dữ liệu Giá Nhiên Liệu...")
            self.page.goto(self.PRICE_URL)
            self.page.wait_for_load_state('networkidle')
            time.sleep(0.3)  # Tối ưu: giảm từ 1s → 0.3s
            
            # Lấy HTML
            html = self.page.content()
            soup = BeautifulSoup(html, 'html.parser')
            
            data = []
            # Tìm tất cả tên nhiên liệu
            ten_nl_divs = soup.find_all('div', class_='tennhienlieucu')
            
            for idx, ten_div in enumerate(ten_nl_divs):
                try:
                    ten_p = ten_div.find('p')
                    if not ten_p:
                        continue
                    
                    nhien_lieu = ten_p.get_text(strip=True)
                    
                    # Tìm giá tương ứng (div tiếp theo)
                    gia_div = ten_div.find_next_sibling('div', class_='giacu')
                    gia_ban = 0
                    if gia_div:
                        gia_p = gia_div.find('p')
                        if gia_p:
                            gia_ban = self.clean_number(gia_p.get_text(strip=True))
                    
                    # Tìm thời gian áp dụng
                    time_div = gia_div.find_next_sibling('div', class_='thoigiancapnhat') if gia_div else None
                    ngay_ap_dung = ''
                    if time_div:
                        time_p = time_div.find('p')
                        if time_p:
                            ngay_ap_dung = time_p.get_text(strip=True).split('<br>')[0] if '<br>' in str(time_p) else time_p.get_text(strip=True)
                    
                    price_data = {
                        'nhien_lieu': nhien_lieu,
                        'gia_ban': gia_ban,
                        'gia_nhap': gia_ban,  # Trang này không có giá nhập riêng, dùng giá bán
                        'ngay_ap_dung': ngay_ap_dung
                    }
                    data.append(price_data)
                    
                except Exception as e:
                    print(f"⚠️  Lỗi khi parse giá: {e}")
                    continue
            
            print(f"✓ Lấy được {len(data)} giá nhiên liệu")
            return data
            
        except Exception as e:
            print(f"✗ Lỗi khi lấy dữ liệu giá nhiên liệu: {e}")
            return []
    
    def get_tank_inventory(self) -> List[Dict]:
        """
        Lấy dữ liệu từ trang Bồn Bể (Kho hàng)
        
        Returns:
            List các dictionary chứa thông tin tồn kho bồn bể
        """
        if not self.is_logged_in:
            print("✗ Chưa đăng nhập! Vui lòng gọi login() trước.")
            return []
        
        try:
            print("🛢️  Đang lấy dữ liệu Bồn Bể...")
            self.page.goto(self.TANK_URL)
            self.page.wait_for_load_state('networkidle')
            time.sleep(0.3)  # Tối ưu: giảm từ 1s → 0.3s
            
            # Lấy HTML
            html = self.page.content()
            soup = BeautifulSoup(html, 'html.parser')
            
            data = []
            # Tìm tất cả các bồn bể
            tank_divs = soup.find_all('div', class_='boxBon')
            
            for tank_div in tank_divs:
                try:
                    tank_data = {
                        'ten_bon': '',
                        'nhien_lieu': '',
                        'ton_kho': 0.0,
                        'dung_tich': 0.0,
                        'ty_le': '0%'
                    }
                    
                    # Lấy tên bồn
                    ten_bon_div = tank_div.find('div', class_='tenBon')
                    if ten_bon_div:
                        ten_p = ten_bon_div.find('p')
                        if ten_p:
                            ten_full = ten_p.get_text(strip=True)
                            # Tách tên và nhiên liệu (ví dụ: "BỒN 1 - RON95-III")
                            if ' - ' in ten_full:
                                parts = ten_full.split(' - ')
                                tank_data['ten_bon'] = parts[0].strip()
                                tank_data['nhien_lieu'] = parts[1].strip() if len(parts) > 1 else ''
                            else:
                                tank_data['ten_bon'] = ten_full
                                tank_data['nhien_lieu'] = ''
                    
                    # Lấy tồn kho
                    ton_kho_div = tank_div.find('div', class_='tonKho')
                    if ton_kho_div:
                        ton_p = ton_kho_div.find('p')
                        if ton_p:
                            ton_text = ton_p.get_text(strip=True)
                            # Parse "Tồn kho ước tính: -114484.67 lít"
                            if ':' in ton_text:
                                ton_value = ton_text.split(':')[1].replace('lít', '').strip()
                                tank_data['ton_kho'] = self.clean_number(ton_value)
                    
                    # Tính tỷ lệ nếu có dung tích (giả sử dung tích không có trong UI này)
                    # Tạm thời để ty_le = "N/A" vì không có thông tin dung tích trên trang
                    tank_data['ty_le'] = 'N/A'
                    
                    if tank_data['ten_bon']:
                        data.append(tank_data)
                        
                except Exception as e:
                    print(f"⚠️  Lỗi khi parse bồn: {e}")
                    continue
            
            print(f"✓ Lấy được {len(data)} bồn bể")
            return data
            
        except Exception as e:
            print(f"✗ Lỗi khi lấy dữ liệu bồn bể: {e}")
            return []


def main():
    """Ví dụ sử dụng"""
    
    # Import config
    try:
        from config import FUEL_USERNAME, FUEL_PASSWORD, MYSQL_CONFIG
    except ImportError:
        print("✗ Không tìm thấy file config.py")
        print("ℹ️  Hãy tạo file config.py từ config_sample.py")
        return
    
    # Parse command line arguments
    import sys
    headless = True
    days_back = 90
    mode = "auto"  # auto = auto-update thông minh, full = lấy toàn bộ, csv = export CSV
    
    if len(sys.argv) > 1:
        if '--show' in sys.argv:
            headless = False
            print("ℹ️  Chế độ: Hiển thị browser")
        
        # Kiểm tra nếu có tùy chọn số ngày
        for arg in sys.argv[1:]:
            if arg.startswith('--days='):
                try:
                    days_back = int(arg.split('=')[1])
                    print(f"ℹ️  Số ngày: {days_back}")
                except:
                    print("⚠️  Không thể parse số ngày, dùng mặc định 90 ngày")
        
        # Kiểm tra mode
        if '--csv' in sys.argv:
            mode = "csv"
        elif '--full' in sys.argv:
            mode = "full"
        elif '--auto' in sys.argv:
            mode = "auto"
    else:
        print("ℹ️  Chế độ: Auto-update (dùng --full để lấy toàn bộ, --csv để export CSV)")
        print("ℹ️  Browser: Ẩn (dùng --show để hiển thị)")
        print("ℹ️  Số ngày tối đa: 90 ngày (dùng --days=N để thay đổi)")
    
    # Khởi tạo API client với MySQL config
    print("="*70)
    print("   FUEL DATA SCRAPER - AUTO UPDATE")
    print("="*70)
    print(f"\n⚙️  Cấu hình:")
    print(f"   - Username: {FUEL_USERNAME}")
    print(f"   - MySQL Host: {MYSQL_CONFIG['host']}")
    print(f"   - MySQL Database: {MYSQL_CONFIG['database']}")
    print(f"   - Mode: {mode.upper()}")
    print()
    
    api = FuelAPI(FUEL_USERNAME, FUEL_PASSWORD, headless=headless, mysql_config=MYSQL_CONFIG)
    
    try:
        # Đăng nhập
        if not api.login():
            print("\n✗ Không thể đăng nhập. Vui lòng kiểm tra lại thông tin.")
            return
        
        if mode == "auto":
            # AUTO UPDATE - Tự động phát hiện và chỉ lấy dữ liệu mới
            print(f"\n🤖 Chế độ: AUTO UPDATE - Cập nhật thông minh")
            print(f"   (Tự động phát hiện dữ liệu cuối và chỉ lấy dữ liệu mới)")
            total_imported = api.auto_update(max_days_back=days_back)
            
            if total_imported > 0:
                print(f"\n✓ HOÀN THÀNH! Đã import {total_imported} bản ghi mới vào MySQL")
            else:
                print(f"\n✓ HOÀN THÀNH! Database đã được cập nhật")
        
        elif mode == "full":
            # FULL IMPORT - Lấy toàn bộ N ngày (chế độ cũ)
            print(f"\n🚀 Chế độ: FULL IMPORT - Lấy toàn bộ {days_back} ngày")
            total_imported = api.run_date_range(days_back=days_back)
            
            if total_imported > 0:
                print(f"\n✓ HOÀN THÀNH! Đã import {total_imported} bản ghi vào MySQL")
            else:
                print(f"\n⚠️  Không có dữ liệu để import")
        
        else:
            # Export ra CSV & JSON
            today = datetime.now()
            from_date = (today - timedelta(days=days_back)).strftime('%Y-%m-%d')
            to_date = today.strftime('%Y-%m-%d')
            
            print(f"\n📊 Đang lấy dữ liệu từ {from_date} đến {to_date} ({days_back} ngày)...")
            data = api.get_all_data_paginated(from_date=from_date, to_date=to_date)
            
            if data:
                # Export ra CSV & JSON
                filename = f'fuel_data_{days_back}days_{to_date}.csv'
                api.export_to_csv(data, filename)
                api.export_to_json(data, f'fuel_data_{days_back}days_{to_date}.json')
                
                # Thống kê
                print(f"\n✓ Đã lấy {len(data)} giao dịch trong {days_back} ngày")
                
                # Tính tổng tiền và lít
                total_amount = sum(tx['tien'] for tx in data)
                total_liters = sum(tx['lit'] for tx in data)
                
                print(f"💰 Tổng doanh thu: {total_amount:,.0f} VNĐ")
                print(f"⛽ Tổng lít bán: {total_liters:,.2f} L")
            else:
                print("\n⚠️  Không có dữ liệu!")
        
        print("\n" + "="*70)
        print("✓ HOÀN THÀNH!")
        print("="*70)
        
    finally:
        # Đóng browser
        api.cleanup()


if __name__ == "__main__":
    main()

