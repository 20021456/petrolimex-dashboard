"""
Transform - Logic biến đổi, làm sạch dữ liệu

Hiện tại transform logic nằm trong src/ingestion/fuel_api.py:
  - _parse_html()      : Parse HTML → structured data
  - clean_number()     : Làm sạch số từ text
  - clean_tank_number(): Làm sạch số bồn bể
  - parse_datetime()   : Parse datetime từ text

TODO: Tách transform logic ra module riêng khi cần mở rộng
"""
