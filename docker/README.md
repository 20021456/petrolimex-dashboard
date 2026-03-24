# Docker Configuration

Cấu trúc Docker cho Petrolimex Dashboard - Dokploy deployment.

## 📁 Cấu trúc

```
docker/
├── python/
│   └── Dockerfile              # Python service (scraping + API)
├── nextjs/
│   ├── Dockerfile              # Next.js dashboard
│   └── entrypoint.sh           # Database initialization script
├── .env/
│   └── prod.env.example        # Environment variables template
└── docker-compose.yml          # Dokploy compose file
```

## 🚀 Deploy trên Dokploy

### 1. Cấu hình Compose Service

- **Compose File Path**: `docker/docker-compose.yml`
- **Source**: GitHub Repository

### 2. Environment Variables

Copy từ `docker/.env/prod.env.example` vào tab **Environment** của Dokploy.

### 3. Schedule Task (Auto-update)

- **Name**: `auto-update-fuel`
- **Cron**: `0 */6 * * *` (mỗi 6 giờ)
- **Command**: `python dags/etl_daily.py --mode 1`

## 📝 Lưu ý

- MySQL phải là external service trong Dokploy
- Lấy Internal Host từ MySQL service connection
- Database tables tự động khởi tạo lần đầu
