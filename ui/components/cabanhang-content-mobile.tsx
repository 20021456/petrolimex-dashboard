"use client"

// ════════════════════════════════════════════════════════════════
// Ca bán hàng — bản mobile, port từ design MobileShiftScreen.
// Hero ca đang chạy + KPI grid + lịch sử ca.
// ════════════════════════════════════════════════════════════════

import * as React from "react"
import { toast } from "sonner"
import { HX, Icon } from "@/components/htx-kit"
import {
  type ShiftStore,
  Avatar,
  OpenShiftModal,
  CloseShiftModal,
  useShiftSummary,
  fmtNum,
  fmtBig,
  fmtTimeShort,
  fmtDateShort,
  fmtDuration,
} from "@/components/cabanhang-content"

interface Props {
  store: ShiftStore
  onNavigate?: (view: string) => void
}

export function CaBanHangContentMobile({ store, onNavigate }: Props) {
  const { shifts, current, openShift, closeShift, hydrated } = store
  const { summary } = useShiftSummary(current)
  const [openModal, setOpenModal] = React.useState(false)
  const [closeModal, setCloseModal] = React.useState(false)
  const [tick, setTick] = React.useState(0)

  React.useEffect(() => {
    if (!current) return
    const t = setInterval(() => setTick((x) => x + 1), 30000)
    return () => clearInterval(t)
  }, [current])
  void tick

  const duration = current ? Date.now() - current.startTs : 0
  const closedShifts = shifts.filter((s) => s.status === "closed")

  return (
    <div style={{ color: HX.text, fontFamily: HX.font }}>
      {current && summary ? (
        <>
          {/* Live shift hero */}
          <div
            style={{
              background: `linear-gradient(135deg, ${HX.accent} 0%, ${HX.accentDark} 100%)`,
              border: "none",
              color: "#fff",
              borderRadius: 16,
              padding: 16,
              marginBottom: 12,
              boxShadow: "0 12px 32px -8px rgba(255,90,31,0.45)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 10,
                opacity: 0.9,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: 3, background: "#fff" }} />
              Đang mở · {current.id} · {fmtDuration(duration)}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 10 }}>
              <Avatar
                initials={current.staffInitials}
                size={38}
                color="rgba(255,255,255,0.25)"
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 800,
                    letterSpacing: "-0.01em",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {current.staffName}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    opacity: 0.85,
                    marginTop: 2,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  Mở {fmtTimeShort(current.startTs)}
                  {current.note ? ` · ${current.note}` : ""}
                </div>
              </div>
              <div
                onClick={() => setCloseModal(true)}
                className="hxw-press"
                style={{
                  padding: "7px 12px",
                  borderRadius: 999,
                  background: "rgba(255,255,255,0.22)",
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#fff",
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              >
                Đóng ca
              </div>
            </div>
            <div
              style={{
                marginTop: 14,
                paddingTop: 12,
                borderTop: "1px solid rgba(255,255,255,0.2)",
                display: "flex",
                justifyContent: "space-between",
                gap: 10,
              }}
            >
              <div>
                <div style={{ fontSize: 10, opacity: 0.85, fontWeight: 600 }}>Doanh thu</div>
                <div className="hx-num" style={{ fontSize: 20, fontWeight: 800, marginTop: 2 }}>
                  {fmtBig(summary.revenue)}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 10, opacity: 0.85, fontWeight: 600 }}>Giao dịch</div>
                <div className="hx-num" style={{ fontSize: 20, fontWeight: 800, marginTop: 2 }}>
                  {fmtNum(summary.txCount)}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 10, opacity: 0.85, fontWeight: 600 }}>Tồn quỹ</div>
                <div className="hx-num" style={{ fontSize: 20, fontWeight: 800, marginTop: 2 }}>
                  {fmtBig(current.openCash + summary.cashRevenue)}
                </div>
              </div>
            </div>
          </div>

          {/* KPI 2x2 */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>
              Thống kê ca đang chạy
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <MiniKpi
                label="Xăng dầu"
                value={fmtBig(summary.revenue)}
                color={HX.accent}
                hint={`${summary.txCount} GD`}
              />
              <MiniKpi
                label="Sản lượng"
                value={fmtNum(summary.liters)}
                color={HX.do}
                hint="lít"
              />
              <MiniKpi
                label="Quỹ đầu ca"
                value={fmtBig(current.openCash)}
                color={HX.text2}
                hint="tiền mặt khởi đầu"
              />
              <MiniKpi
                label="Tồn quỹ dự kiến"
                value={fmtBig(current.openCash + summary.cashRevenue)}
                color={HX.good}
                hint="quỹ + doanh thu"
              />
            </div>
          </div>

          {/* Quick actions */}
          <div style={{ marginBottom: 14, display: "flex", flexDirection: "column", gap: 8 }}>
            <ActionRow
              icon="plus"
              color={HX.accent}
              title="Tạo giao dịch bán lẻ"
              sub="Mở trang Bán hàng để ghi nhận"
              onClick={() => onNavigate?.("kho")}
            />
          </div>
        </>
      ) : (
        hydrated && (
          <div
            style={{
              padding: 30,
              textAlign: "center",
              background: HX.surface,
              border: `1px dashed ${HX.hairlineStrong}`,
              borderRadius: 16,
              marginBottom: 14,
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 16,
                background: HX.accentSoft,
                border: `1px solid ${HX.hairlineStrong}`,
                margin: "0 auto",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon name="clock" size={28} color={HX.accent} />
            </div>
            <div style={{ marginTop: 14, fontSize: 15, fontWeight: 700 }}>
              Chưa có ca nào đang mở
            </div>
            <div
              style={{
                marginTop: 6,
                fontSize: 12,
                color: HX.text2,
                lineHeight: 1.5,
              }}
            >
              Mở ca để bắt đầu ghi nhận doanh thu trong khung giờ của bạn.
            </div>
            <button
              type="button"
              onClick={() => setOpenModal(true)}
              className="hxw-press"
              style={{
                marginTop: 16,
                height: 44,
                padding: "0 18px",
                borderRadius: 12,
                background: `linear-gradient(135deg, ${HX.accent} 0%, ${HX.accentDark} 100%)`,
                color: "#fff",
                fontSize: 14,
                fontWeight: 700,
                border: "1px solid transparent",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                cursor: "pointer",
              }}
            >
              <Icon name="plus" size={14} color="#fff" strokeWidth={2.2} />
              Mở ca mới
            </button>
          </div>
        )
      )}

      {/* History */}
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>
          Lịch sử ca
        </div>
        {closedShifts.length === 0 ? (
          <div
            style={{
              padding: 24,
              textAlign: "center",
              color: HX.text3,
              fontSize: 12,
              background: HX.surface,
              border: `1px dashed ${HX.hairlineStrong}`,
              borderRadius: 14,
            }}
          >
            Chưa có ca đã đóng
          </div>
        ) : (
          <div
            style={{
              background: HX.surface,
              border: `1px solid ${HX.hairline}`,
              borderRadius: 14,
              overflow: "hidden",
            }}
          >
            {closedShifts.map((s, i) => {
              const dur = (s.endTs || Date.now()) - s.startTs
              return (
                <div
                  key={s.id}
                  style={{
                    padding: "11px 14px",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    borderBottom:
                      i < closedShifts.length - 1 ? `1px solid ${HX.hairline}` : "none",
                  }}
                >
                  <Avatar initials={s.staffInitials} size={32} color={s.staffColor} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {s.staffName}
                      </span>
                      <span style={{ fontSize: 10, color: HX.text3 }}>· {fmtDuration(dur)}</span>
                    </div>
                    <div className="hx-num" style={{ fontSize: 10, color: HX.text3, marginTop: 1 }}>
                      {s.id} · {fmtDateShort(s.startTs)} · {fmtTimeShort(s.startTs)} –{" "}
                      {s.endTs ? fmtTimeShort(s.endTs) : "—"}
                    </div>
                  </div>
                  <div
                    className="hx-num"
                    style={{ fontSize: 13, fontWeight: 700, flexShrink: 0, textAlign: "right" }}
                  >
                    {fmtBig(s.revenue || 0)}
                    <span style={{ fontSize: 10, color: HX.text3, fontWeight: 400 }}> ₫</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {openModal && (
        <OpenShiftModal
          onClose={() => setOpenModal(false)}
          onConfirm={(staffId, cash, note) => {
            openShift(staffId, cash, note)
            toast.success("Đã mở ca bán hàng mới")
          }}
        />
      )}
      {closeModal && current && (
        <CloseShiftModal
          shift={current}
          summary={summary}
          onClose={() => setCloseModal(false)}
          onConfirm={(closeCash) => {
            closeShift(
              closeCash,
              summary?.revenue || 0,
              summary?.txCount || 0,
              summary?.liters || 0
            )
            toast.success(`Đã đóng ca ${current.id}`)
          }}
        />
      )}
    </div>
  )
}

function MiniKpi({
  label,
  value,
  color,
  hint,
}: {
  label: string
  value: string
  color: string
  hint?: string
}) {
  return (
    <div
      style={{
        padding: 11,
        background: HX.surface,
        border: `1px solid ${HX.hairline}`,
        borderRadius: 12,
      }}
    >
      <div style={{ fontSize: 10, color: HX.text3, fontWeight: 500 }}>{label}</div>
      <div
        className="hx-num"
        style={{ fontSize: 15, fontWeight: 800, color, marginTop: 3 }}
      >
        {value}
      </div>
      {hint && (
        <div style={{ fontSize: 10, color: HX.text3, marginTop: 1 }}>{hint}</div>
      )}
    </div>
  )
}

function ActionRow({
  icon,
  color,
  title,
  sub,
  onClick,
}: {
  icon: "plus" | "alert"
  color: string
  title: string
  sub: string
  onClick?: () => void
}) {
  return (
    <div
      onClick={onClick}
      className="hxw-press"
      style={{
        padding: 14,
        background: HX.surface,
        border: `1px solid ${HX.hairline}`,
        borderRadius: 14,
        display: "flex",
        alignItems: "center",
        gap: 12,
        cursor: "pointer",
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 9,
          background: color + "22",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon name={icon} size={17} color={color} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: HX.text }}>{title}</div>
        <div style={{ fontSize: 11, color: HX.text3, marginTop: 2 }}>{sub}</div>
      </div>
      <Icon name="chevron" size={14} color={HX.text3} />
    </div>
  )
}
