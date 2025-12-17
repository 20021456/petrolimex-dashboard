# Fuel Data Scraper - Auto Update + Modern Dashboard

Script Python tự động lấy dữ liệu từ http://fuel.net và import vào MySQL với **Dashboard hiện đại** sử dụng **Next.js + shadcn/ui**.

## ✨ Tính năng chính

- ✅ **Auto-Update Thông Minh**: Tự động phát hiện ngày cuối, xóa cache và update dữ liệu mới
- ✅ **MySQL Integration**: Tự động import và update database
- ✅ **Scheduler**: Chạy định kỳ tự động (mỗi 6 giờ)
- ✅ **Smart Cleanup**: Tự động xóa dữ liệu cũ > 3 tháng
- ⭐ **Modern Dashboard**: Giao diện web hiện đại với Next.js + shadcn/ui + Tailwind CSS
- 📱 **Responsive Design**: Tối ưu hoàn toàn cho mobile và desktop
- 📊 **Quản lý kho**: QR Code scanning, inventory tracking
- 💰 **Quản lý giá**: Dynamic pricing cho nhiên liệu và sản phẩm

---

## 🐳 Docker Deployment (Khuyến nghị)

### 🚀 Deploy lên Dokploy (Production)

#### Bước 1: Push code lên GitHub

```bash
# Nếu là repository mới
git init
git add .
git commit -m "Initial commit - Fuel Dashboard"
git remote add origin https://github.com/YOUR_USERNAME/petrolimex-dashboard.git
git branch -M main
git push -u origin main
```

#### Bước 2: Tạo MySQL Database trên Dokploy

1. Vào Dokploy dashboard > Project của bạn
2. Click **+ Create Service** > **Database**
3. Cấu hình:
   - **Database Type**: MySQL
   - **Version**: 8.0
   - **Database Name**: `petrolimex`
   - **Root Password**: Đặt password mạnh (lưu lại!)
4. Click **Create** và đợi database khởi động
5. Vào tab **Internal Connection** để lấy **Internal Host** (ví dụ: `mysql-abc123`)

#### Bước 3: Tạo Compose Service trên Dokploy

1. Click **+ Create Service** > **Compose**
2. Cấu hình:
   - **Name**: `fuel-dashboard`
   - **Source**: GitHub Repository
   - **Repository**: `YOUR_USERNAME/petrolimex-dashboard`
   - **Branch**: `main`
   - **Compose File Path**: `docker-compose.dokploy.yml`

#### Bước 4: Cấu hình Environment Variables

Vào tab **Environment** và thêm:

```env
# MySQL (lấy Internal Host từ bước 2)
MYSQL_HOST=mysql-abc123
MYSQL_ROOT_PASSWORD=your-strong-password
MYSQL_DATABASE=petrolimex

# Fuel Credentials
FUEL_USERNAME=your-fuel-username
FUEL_PASSWORD=your-fuel-password

# Optional
NODE_ENV=production
TZ=Asia/Ho_Chi_Minh
```

#### Bước 5: Cấu hình Domain (Cloudflare)

1. Trong Cloudflare DNS, thêm record:
   - **Type**: `A`
   - **Name**: `fuel` (hoặc subdomain bạn muốn)
   - **IPv4**: IP của server Dokploy
   - **Proxy**: Proxied (đám mây cam)

2. Trong Dokploy, vào tab **Domains**:
   - Click **Add Domain**
   - Nhập: `fuel.yourdomain.com`
   - **Container Port**: `3000`
   - Enable **HTTPS**

#### Bước 6: Deploy

1. Click **Deploy** trong Dokploy
2. Theo dõi logs để đảm bảo kết nối MySQL thành công
3. Truy cập: `https://fuel.yourdomain.com`

**Lưu ý:**
- Dashboard tự động khởi tạo database tables lần đầu
- Python service tự động scraping data mỗi 6 giờ
- Dokploy tự động routing qua Traefik (không cần config ports)

---

### 💻 Local Development với Docker

**Bước 1: Khởi động Docker Desktop**
- Mở Docker Desktop application
- Đợi cho đến khi hiển thị "Docker Desktop is running"

**Bước 2: Chạy Docker Compose**

```bash
# Build và khởi động (local với ports exposed)
docker-compose -f docker-compose.local.yml up --build -d

# Xem logs
docker-compose -f docker-compose.local.yml logs -f

# Dừng containers
docker-compose -f docker-compose.local.yml down
```

**Truy cập Dashboard:**
- http://localhost:3000

---

## 📖 Hướng dẫn sử dụng Dashboard

### 🏠 Trang chủ Dashboard

**Truy cập:** http://localhost:3000 (hoặc domain Dokploy của bạn)

**Các chức năng chính:**

1. **Thống kê tổng quan**
   - Tổng giao dịch hôm nay
   - Doanh thu hôm nay
   - Số lượng giao dịch
   - Tốc độ bơm trung bình

2. **Bộ lọc**
   - Lọc theo khoảng thời gian
   - Lọc theo loại nhiên liệu
   - Lọc theo khách hàng

3. **Biểu đồ**
   - Doanh thu theo loại nhiên liệu (có thể kéo thả để sắp xếp)
   - Giờ cao điểm bơm nhiên liệu
   - Responsive: Tối ưu cho cả mobile và desktop

4. **Bảng giao dịch**
   - Xem chi tiết các giao dịch gần nhất
   - Trên mobile: Hiển thị dạng card để dễ đọc
   - Trên desktop: Hiển thị dạng bảng đầy đủ

5. **Export dữ liệu**
   - Xuất CSV theo bộ lọc đã chọn

---

### 📦 Quản lý kho (/kho)

**Truy cập:** http://localhost:3000/kho

**Chức năng:**

1. **Xem danh sách kho**
   - Hiển thị tất cả sản phẩm
   - Số lượng tồn kho
   - Đơn vị tính

2. **Thêm/Sửa sản phẩm**
   - Click "Thêm hàng hóa"
   - Nhập thông tin: Tên, Danh mục, Số lượng
   - Tự động tạo QR code

3. **🆕 QR Code với Link Web (v6.9.0)**
   - Tạo QR code chứa link web unique
   - Khi khách hàng quét QR sẽ mở trang xác nhận
   - Hiển thị thông tin: Tên khách hàng, Sản phẩm, Số lượng
   - Nút "Đồng ý" để xác nhận đã nhận hàng
   - Hiển thị thông báo "Cảm ơn Quý khách" sau khi xác nhận
   - Link: `/xacnhan/[token]`

4. **Quản lý giá**
   - Click vào giá sản phẩm để chỉnh sửa
   - Cập nhật giá real-time

5. **Tìm kiếm và Lọc**
   - Tìm theo tên sản phẩm
   - Lọc theo danh mục (Nhiên liệu, Dầu nhớt, Phụ kiện)

---

### 📱 Trang xác nhận QR (/xacnhan/[token])

**Truy cập:** Quét QR code từ trang Quản lý kho

**Luồng hoạt động:**

1. Nhân viên tạo QR code trong trang `/kho` với thông tin:
   - Tên khách hàng
   - Sản phẩm (chọn từ danh sách)
   - Số lượng

2. Hệ thống tự động tạo:
   - Link web unique (ví dụ: `/xacnhan/abc123def456...`)
   - QR code chứa link đó
   - Lưu thông tin vào database

3. Khách hàng quét QR code:
   - Mở trang web hiển thị thông tin đơn hàng
   - Xem chi tiết: Tên, Sản phẩm, Số lượng
   - Bấm nút "Đồng ý" để xác nhận

4. Sau khi xác nhận:
   - Hiển thị thông báo "Cảm ơn Quý khách!"
   - Lưu trạng thái xác nhận vào database
   - QR code chỉ có thể xác nhận 1 lần

---

### 📊 Chi tiết giao dịch (/chitiet)

**Truy cập:** http://localhost:3000/chitiet

**Chức năng:**

1. **Xem dữ liệu chi tiết**
   - Bảng giao dịch đầy đủ với phân trang
   - Thông tin: Mã bơm, Loại nhiên liệu, Số lít, Giá, Thành tiền, Thời gian

2. **Export báo cáo**
   - Xuất CSV cho phân tích

---

## 🔐 MySQL Data Management

### Backup Database

```bash
docker exec fuel_mysql mysqldump -uroot -p[PASSWORD] petrolimex > backup_$(date +%Y%m%d).sql
```

### Restore Database

```bash
docker exec -i fuel_mysql mysql -uroot -p[PASSWORD] petrolimex < backup.sql
```

### Truy cập MySQL từ bên ngoài (Local)

**Sử dụng `docker-compose.local.yml`** - đã expose port 3306 sẵn

**Kết nối bằng MySQL Workbench/DBeaver:**
- Host: localhost
- Port: 3306
- User: root
- Password: (như trong .env hoặc `minhtrung02`)
- Database: petrolimex

---

## 🔍 Troubleshooting

| Vấn đề | Giải pháp |
|--------|-----------|
| Python error | Cài Python từ python.org, sau đó chạy `setup.bat` |
| MySQL connection | Check MySQL đang chạy, password trong `database/config.py` |
| npm install error | Dùng `npm install --legacy-peer-deps` |
| Port 3000 đã dùng | Tắt app khác hoặc `PORT=3001 npm run dev` |
| Dashboard không load | Check `.env.local` trong folder `ui/` |
| API error | Check MySQL running và config đúng |
| **Table 'fuel_pump' doesn't exist** | **Auto-fixed**: Restart dashboard container. Script tự động tạo tables khi khởi động |
| **Docker connection error** | **Khởi động Docker Desktop**, sau đó chạy lại `start-local.bat` |
| **MySQL connection timeout** | **Đã fix trong v6.8.0** - Dashboard có connection pool và retry logic. Nếu vẫn lỗi: check `docker ps` |
| **ModuleNotFoundError: database.config** | Pull code mới và rebuild: `docker-compose build --no-cache` |
| **GROUP BY error / ONLY_FULL_GROUP_BY** | **Đã fix trong v6.7.2** - Pull code mới và rebuild dashboard |
| **Client-side exception occurred** | **Đã fix trong v6.8.0** - Database connection được tối ưu. Pull code mới và rebuild |

### 🔧 Khởi tạo Database Tables

Database tables được **TỰ ĐỘNG** tạo khi dashboard khởi động lần đầu thông qua `docker-entrypoint-dashboard.sh`.

Nếu gặp lỗi "Table doesn't exist", restart dashboard container:
```bash
# Dokploy
docker restart fuel-revenue-oimsud-dashboard-1

# Local
docker restart fuel_dashboard
```

---

## ⚙️ Cấu hình Environment Variables

Tạo file `.env` trong thư mục root:

```bash
# MySQL Config
MYSQL_ROOT_PASSWORD=your_password
MYSQL_DATABASE=petrolimex
MYSQL_PORT=3306

# Fuel Credentials
FUEL_USERNAME=your_username
FUEL_PASSWORD=your_password

# Dashboard Port (for local only)
DASHBOARD_PORT=3000
```

**Lưu ý:**
- Trên Dokploy: Cấu hình trong Dokploy dashboard (Environment Variables)
- Local: File `.env` sẽ tự động được Docker Compose đọc

---

## 📁 Cấu trúc Project

```
Python/Fuel/
├── database/                      # Module database và API
│   ├── fuel_api.py               # API chính & MySQL
│   ├── config.py                 # Cấu hình (sử dụng env vars)
│   └── *.sql                     # SQL scripts
│
├── scripts/                       # Scripts chạy tác vụ
│   ├── demo_auto_update.py       # Auto-update script
│   └── scheduler_with_reload.py
│
├── ui/                            # Web Dashboard (Next.js)
│   ├── app/
│   │   ├── api/                  # API routes
│   │   ├── dashboard/            # Dashboard page
│   │   ├── chitiet/              # Chi tiết page
│   │   └── kho/                 # Quản lý kho page
│   ├── components/               # React components
│   └── lib/                      # Utils & helpers
│
├── docker-compose.yml            # Production (Dokploy)
├── docker-compose.local.yml      # Local development
├── Dockerfile.python             # Python service
├── Dockerfile.nextjs             # Next.js dashboard
├── docker-entrypoint-dashboard.sh # Dashboard entrypoint (auto DB init)
│
├── setup.bat                     # ⭐ Setup Python + MySQL
├── run_auto_update.bat           # ⭐ Update dữ liệu fuel
├── run_dashboard.bat             # ⭐ Chạy dashboard local
│
└── README.md                     # File này
```

### 🔧 Scripts chính (Windows)

| Script | Mô tả | Sử dụng khi |
|--------|-------|-------------|
| `setup.bat` | Setup Python dependencies + MySQL tables | Lần đầu setup project |
| `run_auto_update.bat` | Scrape và update dữ liệu fuel | Cần cập nhật data mới |
| `run_dashboard.bat` | Chạy dashboard Next.js | Development local (không dùng Docker) |

---

## 🎯 Các tính năng nâng cao

### 1. Drag & Drop Charts
- Kéo thả biểu đồ để sắp xếp lại dashboard
- Tự động lưu vị trí

### 2. Real-time Updates
- Dashboard tự động refresh data
- Không cần reload trang

### 3. QR Code Integration
- Tự động tạo QR cho sản phẩm
- Quét QR để cập nhật inventory nhanh

### 4. Mobile Optimization
- Header responsive với collapsible filters
- Cards layout thay vì table trên mobile
- Charts tối ưu cho màn hình nhỏ
- Touch-friendly controls

### 5. Smart Filtering
- Lọc theo ngày, tuần, tháng, tùy chỉnh
- Lọc theo loại nhiên liệu
- Lọc theo khách hàng
- Export CSV theo bộ lọc

---

## 🔗 References

- [shadcn/ui](https://ui.shadcn.com) - UI Components
- [Next.js](https://nextjs.org) - React Framework
- [Tailwind CSS](https://tailwindcss.com) - CSS Framework
- [Playwright](https://playwright.dev/python/) - Web Scraping
- [Dokploy](https://dokploy.com) - Deployment Platform

---

**Version**: 6.9.4  
**Last updated**: 2025-11-23

### 🔧 Phiên bản 6.9.4 - Use Real MySQL Client (Not MariaDB)
- ✅ **REFACTOR**: Đổi base image từ `node:20-alpine` → `node:20-slim` (Debian)
- ✅ Cài đặt `default-mysql-client` (MySQL client thật, không phải MariaDB)
- ✅ Xóa workaround `--mysql-native-password=ON` (không cần nữa)
- ✅ Tương thích 100% với MySQL 8.0 authentication plugins
- ✅ Image size tăng nhẹ nhưng compatibility tốt hơn nhiều

### 📝 Changelog các phiên bản trước
- **v6.9.2**: Dùng MYSQL_PWD env + inline --skip-ssl
- **v6.9.1**: Config file approach (reverted)
- **v6.8.9**: Fix API endpoints cho Docker
- **v6.8.8**: Suppress hydration warnings
- **v6.8.7**: Python ssl_disabled config

### 📝 Changelog v6.8.7
- ✅ **FIX CRITICAL**: Thêm `ssl_disabled: True` vào Python MySQL config
- ✅ Python script giờ kết nối MySQL thành công
- ✅ Auto-update script hoạt động bình thường

### 📝 Changelog các phiên bản trước
- **v6.8.6**: Fix Python healthcheck + remove dashboard dependency on Python
- **v6.8.5**: Cấu hình MySQL `--skip-ssl` trong docker-compose
- **v6.8.4**: Fix SSL bằng cách thêm `--skip-ssl` vào mysql commands (reverted)
- **v6.8.3**: Fix MySQL healthcheck + thêm debug logging
- **v6.8.2**: Fix recursive copy error trong Dockerfile
- **v6.8.1**: Fix reactStrictMode config position
- **v6.8.0**: Connection pool + retry logic + tăng timeout

---

## 📞 Hỗ trợ

Nếu gặp vấn đề:
1. Xem phần **Troubleshooting** ở trên
2. Check logs: `docker-compose logs -f`
3. Restart containers: `docker-compose restart`
4. Rebuild nếu cần: `docker-compose build --no-cache`
