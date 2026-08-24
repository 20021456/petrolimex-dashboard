# Petrolimex Dashboard — Ứng dụng Desktop (Windows)

Bản đóng gói `.exe` của dashboard. Ứng dụng là **vỏ Electron**: nó mở đúng
dashboard Next.js đang chạy trên server (Dokploy/VPS), nên:

- Giao diện **y hệt bản web** hiện tại, không phải làm lại UI.
- **Cần có mạng** mới dùng được — không có chế độ offline.
- Server, MySQL, Python scraper vẫn chạy như cũ, không đụng gì tới.

Cái được thêm so với mở bằng trình duyệt: có icon + shortcut ngoài Desktop và
Start Menu, chạy trong cửa sổ riêng không có thanh địa chỉ, nhớ kích thước cửa
sổ và mức zoom, có trang báo lỗi kèm nút thử lại khi mất mạng.

## Nhúng sẵn địa chỉ máy chủ (khỏi phải nhập khi cài)

Điền một dòng địa chỉ vào `desktop/default-server.txt` **trước khi build** thì
app cài xong mở là vào thẳng dashboard, bỏ qua màn hình cấu hình:

```
https://fuel.tencongty.com
```

Build qua GitHub Actions thì khỏi sửa file: khi bấm **Run workflow**, điền địa
chỉ vào ô `server_url`, workflow tự ghi vào `default-server.txt` rồi build.

Không cần domain cũng được — điền thẳng IP kèm port, ví dụ
`http://14.225.1.2:3000` (VPS) hoặc `http://192.168.1.10:3000` (mạng nội bộ).
Điều kiện là port đó phải mở ra ngoài: `docker-compose.dokploy.yml` hiện chỉ
`expose: 3000` cho Traefik dùng nội bộ, muốn vào bằng IP thì đổi thành
`ports: ["3000:3000"]` và mở firewall. Dùng IP thì không có HTTPS, và QR code
cho nhân viên quét cũng sẽ trỏ về IP đó.

Thứ tự ưu tiên khi app tìm địa chỉ máy chủ:

1. Biến môi trường `PETROLIMEX_DASHBOARD_URL`
2. Địa chỉ người dùng tự nhập (lưu trong `config.json`)
3. Địa chỉ nhúng sẵn trong `default-server.txt`

## Người dùng cuối cài thế nào

1. Tải file `PetrolimexDashboard-Setup-<version>.exe`.
2. Bấm đúp để cài. Windows SmartScreen sẽ cảnh báo "Unknown publisher" vì file
   chưa mua chứng thư ký số — bấm **More info** → **Run anyway**.
3. Mở app, màn hình đầu tiên hỏi **địa chỉ máy chủ**, nhập ví dụ
   `https://fuel.tencongty.com` rồi bấm **Kết nối**.
4. Các lần sau app vào thẳng dashboard. Đổi địa chỉ ở menu **Tệp → Đổi địa chỉ
   máy chủ…**

Yêu cầu: Windows 10 trở lên, 64-bit.

## Build ra file .exe

### Cách 1 — GitHub Actions (khuyến nghị, không cần máy Windows)

Workflow `.github/workflows/build-desktop.yml`:

- Vào tab **Actions** → **Build Desktop App (Windows)** → **Run workflow**, xong
  tải file `.exe` ở mục **Artifacts**.
- Hoặc đẩy tag để vừa build vừa tạo release đính kèm file cài:

  ```bash
  git tag desktop-v1.0.0
  git push origin desktop-v1.0.0
  ```

### Cách 2 — Build trên máy Windows

```bash
cd desktop
npm install
npm run dist:win        # ra desktop/dist/PetrolimexDashboard-Setup-1.0.0.exe
```

Chạy thử không cần đóng gói: `npm start`.

### Cách 3 — Build trên Linux (cần wine)

```bash
sudo dpkg --add-architecture i386 && sudo apt-get update
sudo apt-get install -y --no-install-recommends wine wine32:i386
cd desktop && npm install && npm run dist:win
```

## Cấu hình

| Nội dung | Nơi lưu |
|---|---|
| Địa chỉ server, kích thước cửa sổ, mức zoom | `%APPDATA%\Petrolimex Dashboard\config.json` |
| Ghi đè địa chỉ server khi cài hàng loạt | Biến môi trường `PETROLIMEX_DASHBOARD_URL` |

Đặt `PETROLIMEX_DASHBOARD_URL` thì app bỏ qua màn hình cấu hình và luôn mở địa
chỉ đó — tiện khi triển khai cho nhiều máy cùng lúc.

## Nâng phiên bản

Sửa `version` trong `desktop/package.json` rồi build lại. App **không có
auto-update**; muốn cập nhật thì cài đè bản mới (không cần gỡ bản cũ, cấu hình
được giữ nguyên).

Lưu ý: mọi thay đổi trong `ui/` chỉ cần deploy lên server là app desktop thấy
ngay sau khi tải lại (F5) — không phải build lại `.exe`.

## Cấu trúc

| File | Việc |
|---|---|
| `main.js` | Tạo cửa sổ, đọc/ghi config, menu tiếng Việt, xử lý lỗi mạng |
| `preload.js` | Cầu nối IPC tối thiểu, chỉ cho trang cục bộ dùng |
| `renderer/setup.html` | Màn hình nhập địa chỉ máy chủ |
| `renderer/error.html` | Trang báo mất kết nối, có nút Thử lại / Đổi địa chỉ |
| `resources/icon.png` | Icon ứng dụng (dùng lại icon của dashboard) |
| `default-server.txt` | Địa chỉ máy chủ nhúng sẵn lúc build (để trống = app hỏi) |

Về bảo mật: cửa sổ bật `contextIsolation`, tắt `nodeIntegration`; các hàm IPC
chỉ nhận lệnh từ trang `file://` trong app, nên nội dung web tải từ server
không gọi được. Link ra ngoài domain đã cấu hình sẽ mở bằng trình duyệt mặc
định thay vì mở trong app.
