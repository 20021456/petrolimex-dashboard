"""
Petrolimex Dashboard - Data Pipeline Backend

Pipeline stages:
  ingestion  → Đọc dữ liệu từ nguồn (web scraping seenpro.net)
  transform  → Biến đổi, làm sạch dữ liệu
  load       → Ghi vào MySQL database
  utils      → Helper functions, logging, config
  models     → Data models & schemas
"""
