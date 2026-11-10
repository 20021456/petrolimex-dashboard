# Dockerfile cho Python service (scraping & auto-update + API server)
FROM python:3.11-slim

WORKDIR /app

# Cài đặt dependencies hệ thống
# - tini: làm PID 1 để thu dọn tiến trình zombie (xem ENTRYPOINT bên dưới)
# - procps: có sẵn `ps`/`top` khi cần `docker exec` vào kiểm tra
RUN apt-get update && apt-get install -y \
    gcc \
    default-libmysqlclient-dev \
    pkg-config \
    curl \
    tini \
    procps \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements và cài đặt Python packages
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Cài đặt Playwright browsers
RUN playwright install chromium
RUN playwright install-deps chromium

# Copy source code (pipeline structure)
COPY src/ ./src/
COPY dags/ ./dags/

# Tạo thư mục data lake
RUN mkdir -p data/raw data/processed data/output

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app
ENV API_PORT=5000

# Expose API port
EXPOSE 5000

# tini làm PID 1 (init) của container.
# Mỗi lần Chromium đóng, vài tiến trình con của nó bị gán về PID 1 dưới dạng
# zombie. Nếu PID 1 là `python server.py` thì không ai thu dọn → mỗi lần
# schedule chạy để lại ~2 zombie, tích tụ tới khi container cạn pids limit và
# Chromium crash lúc launch (signal=SIGTRAP). tini thu dọn chúng ngay.
ENTRYPOINT ["/usr/bin/tini", "--"]

# Chạy Flask API server để nhận requests từ Next.js dashboard
# Schedule Task của Dokploy vẫn có thể chạy: python dags/etl_daily.py --mode 1
CMD ["python", "src/api/server.py"]

