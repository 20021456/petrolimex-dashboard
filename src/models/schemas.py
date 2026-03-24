"""
Data models cho Petrolimex Dashboard
Định nghĩa cấu trúc dữ liệu cho từng loại entity
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional


@dataclass
class FuelTransaction:
    """Giao dịch bơm xăng dầu"""
    ma_bom: str
    cot_bom: int = 0
    nhien_lieu: str = ""
    gia: float = 0.0
    lit: float = 0.0
    tien: float = 0.0
    ket_thuc_bom: Optional[datetime] = None
    khach_hang: str = "N/A"
    hoa_don: str = "-"


@dataclass
class TankData:
    """Dữ liệu bồn bể (kho hàng)"""
    ten_bon: str
    nhien_lieu: str = ""
    ton_kho: float = 0.0
    dung_tich: float = 0.0
    ty_le: str = "N/A"
    cot_bom: str = ""


@dataclass
class FuelPrice:
    """Giá nhiên liệu"""
    nhien_lieu: str
    gia_ban: float = 0.0
    gia_nhap: float = 0.0
    ngay_ap_dung: str = ""


@dataclass
class OnlinePumpStatus:
    """Trạng thái cột bơm online"""
    ten_cot: str
    nhien_lieu: str = ""
    tien: str = ""
    lit: str = ""
    gia: str = ""
    total: str = ""
