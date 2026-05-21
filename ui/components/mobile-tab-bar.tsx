"use client"

// ════════════════════════════════════════════════════════════════
// Thanh điều hướng dưới cùng cho mobile — port từ design TabBar
// (hifi-kit.jsx): 5 slot với FAB ở giữa + sheet "Khác".
// ════════════════════════════════════════════════════════════════

import * as React from "react"
import { HX, Icon } from "@/components/htx-kit"

interface MobileTabBarProps {
  activeView: string
  onNavigate: (view: string) => void
  onPriceClick?: () => void
}

type IconName = "home" | "fuel" | "receipt" | "user" | "chart" | "refresh"

interface Slot {
  k: string
  icon: IconName
  label: string
  fab?: boolean
}

const SLOTS: Slot[] = [
  { k: "dashboard", icon: "home", label: "Trang chủ" },
  { k: "tonkho", icon: "fuel", label: "Tồn kho" },
  { k: "kho", icon: "receipt", label: "Xuất kho", fab: true },
  { k: "khachquen", icon: "user", label: "Khách quen" },
  { k: "more", icon: "home", label: "Khác" },
]

const MORE_KEYS = ["tx", "chitiet", "giaoca", "gia"]

interface MoreItem {
  k: string
  icon: IconName
  label: string
  sub: string
  color: string
  action?: "price"
}

const MORE_ITEMS: MoreItem[] = [
  { k: "tx", icon: "receipt", label: "Giao dịch", sub: "Lịch sử bán hàng", color: HX.accent2 },
  { k: "chitiet", icon: "chart", label: "Báo cáo", sub: "Doanh thu · sản lượng", color: HX.do },
  { k: "giaoca", icon: "refresh", label: "Giao ca", sub: "Bàn giao ca làm việc", color: HX.accent },
  { k: "gia", icon: "chart", label: "Đơn giá", sub: "Cập nhật giá bán", color: HX.doPlus, action: "price" },
]

function DotsIcon({ color }: { color: string }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      {[6, 12].map((cy) =>
        [5, 12, 19].map((cx) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="1.5" fill={color} />)
      )}
    </svg>
  )
}

export function MobileTabBar({ activeView, onNavigate, onPriceClick }: MobileTabBarProps) {
  const [showMore, setShowMore] = React.useState(false)
  const activeKey = MORE_KEYS.includes(activeView) ? "more" : activeView

  return (
    <>
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          height: 72,
          paddingBottom: "env(safe-area-inset-bottom)",
          background: "rgba(10,13,18,0.92)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderTop: `1px solid ${HX.hairline}`,
          display: "flex",
          alignItems: "flex-start",
          paddingTop: 8,
          zIndex: 40,
        }}
      >
        {SLOTS.map((it) => {
          const isActive = activeKey === it.k
          const handle = () => {
            if (it.k === "more") setShowMore(true)
            else onNavigate(it.k)
          }

          if (it.fab) {
            return (
              <div
                key={it.k}
                style={{ flex: 1, display: "flex", justifyContent: "center", position: "relative" }}
              >
                <div
                  className="hxw-press"
                  onClick={handle}
                  style={{
                    position: "absolute",
                    top: -22,
                    width: 56,
                    height: 56,
                    borderRadius: 18,
                    background: `linear-gradient(135deg, ${HX.accent} 0%, ${HX.accentDark} 100%)`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 10px 24px -6px rgba(255,90,31,0.55), 0 0 0 4px rgba(10,13,18,1)",
                    color: "#fff",
                    cursor: "pointer",
                  }}
                >
                  <Icon name="receipt" size={22} color="#fff" strokeWidth={1.9} />
                </div>
                <span
                  style={{
                    position: "absolute",
                    top: 40,
                    fontSize: 10,
                    fontWeight: 700,
                    color: isActive ? HX.accent : HX.text2,
                    whiteSpace: "nowrap",
                  }}
                >
                  {it.label}
                </span>
              </div>
            )
          }

          return (
            <div
              key={it.k}
              className="hxw-press"
              onClick={handle}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 3,
                color: isActive ? HX.accent : HX.text3,
                cursor: "pointer",
              }}
            >
              {it.k === "more" ? (
                <DotsIcon color={isActive ? HX.accent : HX.text3} />
              ) : (
                <Icon
                  name={it.icon}
                  size={24}
                  strokeWidth={isActive ? 2.1 : 1.7}
                  color={isActive ? HX.accent : HX.text3}
                />
              )}
              <span style={{ fontSize: 10.5, fontWeight: isActive ? 600 : 500 }}>{it.label}</span>
            </div>
          )
        })}
      </div>

      {showMore && (
        <MoreSheet
          activeView={activeView}
          onClose={() => setShowMore(false)}
          onPick={(item) => {
            setShowMore(false)
            if (item.action === "price") onPriceClick?.()
            else onNavigate(item.k)
          }}
        />
      )}
    </>
  )
}

function MoreSheet({
  activeView,
  onClose,
  onPick,
}: {
  activeView: string
  onClose: () => void
  onPick: (item: MoreItem) => void
}) {
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => {
    const t = setTimeout(() => setMounted(true), 10)
    return () => clearTimeout(t)
  }, [])

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        background: mounted ? "rgba(0,0,0,0.55)" : "rgba(0,0,0,0)",
        backdropFilter: mounted ? "blur(6px)" : "none",
        WebkitBackdropFilter: mounted ? "blur(6px)" : "none",
        display: "flex",
        alignItems: "flex-end",
        transition: "background .25s ease",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          background: HX.elevated,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          border: `1px solid ${HX.hairlineStrong}`,
          borderBottom: "none",
          padding: "14px 18px 28px",
          transform: mounted ? "translateY(0)" : "translateY(100%)",
          transition: "transform .3s cubic-bezier(0.2, 0.8, 0.2, 1)",
          boxShadow: "0 -20px 40px -10px rgba(0,0,0,0.6)",
        }}
      >
        <div
          style={{ width: 40, height: 4, borderRadius: 2, background: HX.hairlineStrong, margin: "0 auto 16px" }}
        />
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginBottom: 16,
            padding: "0 4px",
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 600, color: HX.text }}>Thêm chức năng</div>
          <span
            onClick={onClose}
            style={{ fontSize: 13, color: HX.accent, fontWeight: 600, padding: "4px 10px", cursor: "pointer" }}
          >
            Đóng
          </span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {MORE_ITEMS.map((a) => {
            const isActive = activeView === a.k
            return (
              <div
                key={a.k}
                className="hxw-press"
                onClick={() => onPick(a)}
                style={{
                  padding: 14,
                  borderRadius: 14,
                  background: isActive ? HX.accentSoft : HX.surface,
                  border: isActive ? `1.5px solid ${HX.accent}` : `1px solid ${HX.hairline}`,
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 11,
                    background: a.color + "22",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 12,
                  }}
                >
                  <Icon name={a.icon} size={20} color={a.color} />
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: HX.text }}>{a.label}</div>
                <div style={{ fontSize: 11, color: HX.text2, marginTop: 2 }}>{a.sub}</div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
