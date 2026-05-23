"use client"

// ════════════════════════════════════════════════════════════════
// Ca bán hàng — bản mobile, port từ design MobileShiftScreen.
// Hero ca đang chạy + KPI grid + lịch sử ca.
// ════════════════════════════════════════════════════════════════

import * as React from "react"
import { HX, Icon } from "@/components/htx-kit"
import {
  type ShiftStore,
  type ShiftTemplate,
  type StaffState,
  type StaffMember,
  Avatar,
  OpenShiftModal,
  CloseShiftModal,
  StaffEditModal,
  useShiftSummary,
  useTemplates,
  useAssignments,
  useStaffList,
  TEMPLATE_COLOR_MAP,
  fmtNum,
  fmtBig,
  fmtTmplDuration,
  fmtTimeShort,
  fmtDateShort,
  fmtDuration,
  isTemplateActiveNow,
} from "@/components/cabanhang-content"

interface Props {
  store: ShiftStore
  staffState: StaffState
  onNavigate?: (view: string) => void
}

function getWeekRange(now = new Date()) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const dow = (today.getDay() + 6) % 7 // 0 = Monday
  const from = new Date(today)
  from.setDate(today.getDate() - dow)
  const to = new Date(from)
  to.setDate(from.getDate() + 6)
  return { from, to }
}
function ymdKey(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export function CaBanHangContentMobile({ store, staffState, onNavigate }: Props) {
  const liveStaff = useStaffList()
  const { addStaff, updateStaff, removeStaff } = staffState
  const [staffEdit, setStaffEdit] = React.useState<StaffMember | "new" | null>(null)
  const { shifts, current, openShift, closeShift, hydrated } = store
  const { summary } = useShiftSummary(current)
  const { templates } = useTemplates()
  const weekRange = React.useMemo(() => getWeekRange(), [])
  const { assignments, setAssignment, clearAssignment } = useAssignments(
    weekRange.from,
    weekRange.to
  )
  const [openModal, setOpenModal] = React.useState(false)
  const [closeModal, setCloseModal] = React.useState(false)
  const [editCell, setEditCell] = React.useState<{
    date: string
    templateId: string
    currentStaffId: string
    isOverride: boolean
  } | null>(null)
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

      {/* Nhân viên — horizontal scroll */}
      <div style={{ marginBottom: 14 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginBottom: 8,
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 700 }}>Nhân viên</div>
          <span
            onClick={() => setStaffEdit("new")}
            className="hxw-press"
            style={{
              fontSize: 12,
              color: HX.accent,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            + Thêm
          </span>
        </div>
        <div
          className="hxw-scroll"
          style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4 }}
        >
          {liveStaff.map((s) => {
            const isOnShift = current?.staffId === s.id
            const isActive = s.active !== false
            return (
              <div
                key={s.id}
                onClick={() => setStaffEdit(s)}
                className="hxw-press"
                style={{
                  flex: "0 0 128px",
                  padding: 12,
                  borderRadius: 12,
                  background: HX.surface,
                  border: `1px solid ${isOnShift ? HX.accent + "88" : HX.hairline}`,
                  position: "relative",
                  cursor: "pointer",
                  opacity: isActive ? 1 : 0.55,
                }}
              >
                {isOnShift && (
                  <span
                    style={{
                      position: "absolute",
                      top: 8,
                      right: 8,
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      background: HX.good,
                    }}
                  />
                )}
                <Avatar initials={s.initials} size={36} color={s.color} />
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    marginTop: 8,
                    letterSpacing: "-0.01em",
                  }}
                >
                  {s.name}
                </div>
                <div
                  style={{
                    fontSize: 9,
                    fontWeight: 600,
                    padding: "1px 6px",
                    borderRadius: 999,
                    background: HX.bg,
                    border: `1px solid ${HX.hairlineStrong}`,
                    color: HX.text2,
                    letterSpacing: "0.04em",
                    display: "inline-block",
                    marginTop: 4,
                  }}
                >
                  {s.role}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Khung ca cố định */}
      <div style={{ marginBottom: 14 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginBottom: 8,
          }}
        >
          <div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>Khung ca cố định</div>
            <div style={{ fontSize: 10, color: HX.text3, marginTop: 1 }}>
              Lặp lại mỗi ngày · nhân viên mặc định
            </div>
          </div>
          <span style={{ fontSize: 11, color: HX.text3 }}>{templates.length} khung</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {templates.map((t) => {
            const staff = liveStaff.find((s) => s.id === t.default_staff_id)
            const color = TEMPLATE_COLOR_MAP[t.color] || HX.accent
            const isNow = isTemplateActiveNow(t)
            return (
              <div
                key={t.id}
                style={{
                  position: "relative",
                  overflow: "hidden",
                  padding: 12,
                  borderRadius: 12,
                  background: HX.surface,
                  border: isNow ? `1px solid ${color}88` : `1px solid ${HX.hairline}`,
                  opacity: t.active ? 1 : 0.55,
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: 3,
                    background: color,
                  }}
                />
                <div style={{ display: "flex", alignItems: "center", gap: 12, paddingLeft: 6 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        flexWrap: "wrap",
                      }}
                    >
                      <Icon name="clock" size={12} color={color} />
                      <span style={{ fontSize: 13, fontWeight: 700 }}>{t.name}</span>
                      {isNow && (
                        <span
                          style={{
                            fontSize: 9,
                            fontWeight: 700,
                            padding: "1px 6px",
                            borderRadius: 999,
                            background: color + "22",
                            color,
                            letterSpacing: "0.06em",
                            textTransform: "uppercase",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <span
                            style={{
                              width: 5,
                              height: 5,
                              borderRadius: 3,
                              background: color,
                            }}
                          />
                          Đang diễn ra
                        </span>
                      )}
                      {!t.active && (
                        <span
                          style={{
                            fontSize: 9,
                            color: HX.text3,
                            fontWeight: 600,
                            letterSpacing: "0.06em",
                            textTransform: "uppercase",
                          }}
                        >
                          Tắt
                        </span>
                      )}
                    </div>
                    <div
                      className="hx-num"
                      style={{
                        fontSize: 17,
                        fontWeight: 800,
                        color,
                        letterSpacing: "-0.02em",
                        marginTop: 4,
                      }}
                    >
                      {String(t.start_hour).padStart(2, "0")}:
                      {String(t.start_minute).padStart(2, "0")}
                      <span style={{ color: HX.text3, fontWeight: 500 }}> → </span>
                      {String(t.end_hour).padStart(2, "0")}:
                      {String(t.end_minute).padStart(2, "0")}
                      <span
                        style={{
                          fontSize: 10,
                          color: HX.text3,
                          fontWeight: 500,
                          marginLeft: 8,
                        }}
                      >
                        {fmtTmplDuration(t)}
                      </span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        marginTop: 6,
                      }}
                    >
                      <Avatar initials={staff?.initials || "?"} size={22} color={staff?.color} />
                      <span style={{ fontSize: 11, color: HX.text2 }}>Mặc định:</span>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>
                        {staff?.name || "—"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Lịch ca trong tuần */}
      <WeeklySchedule
        templates={templates.filter((t) => t.active)}
        from={weekRange.from}
        to={weekRange.to}
        assignments={assignments}
        currentShiftStaffId={current?.staffId}
        onCellClick={(cell) => setEditCell(cell)}
      />

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
          onConfirm={(s, cash, note) => {
            openShift(s, cash, note)
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
          }}
        />
      )}

      {staffEdit && (
        <StaffEditModal
          staff={staffEdit === "new" ? null : staffEdit}
          onClose={() => setStaffEdit(null)}
          onSave={async (data) => {
            if (staffEdit === "new") {
              const ok = await addStaff(data)
              if (ok) setStaffEdit(null)
            } else {
              const ok = await updateStaff(staffEdit.id, data)
              if (ok) setStaffEdit(null)
            }
          }}
          onDelete={
            staffEdit !== "new"
              ? async () => {
                  const ok = await removeStaff(staffEdit.id)
                  if (ok) setStaffEdit(null)
                }
              : undefined
          }
        />
      )}
      {editCell && (
        <AssignmentEditSheet
          date={editCell.date}
          templateId={editCell.templateId}
          currentStaffId={editCell.currentStaffId}
          isOverride={editCell.isOverride}
          defaultStaffId={
            templates.find((t) => t.id === editCell.templateId)?.default_staff_id || ""
          }
          onClose={() => setEditCell(null)}
          onPick={async (staffId) => {
            const tpl = templates.find((t) => t.id === editCell.templateId)
            const defaultId = tpl?.default_staff_id || ""
            if (staffId === defaultId && editCell.isOverride) {
              await clearAssignment(editCell.date, editCell.templateId)
            } else if (staffId !== defaultId) {
              await setAssignment(editCell.date, editCell.templateId, staffId)
            }
            setEditCell(null)
          }}
        />
      )}
    </div>
  )
}

function WeeklySchedule({
  templates,
  from,
  to,
  assignments,
  currentShiftStaffId,
  onCellClick,
}: {
  templates: ShiftTemplate[]
  from: Date
  to: Date
  assignments: { assign_date: string; template_id: string; staff_id: string; note: string }[]
  currentShiftStaffId?: string
  onCellClick: (cell: {
    date: string
    templateId: string
    currentStaffId: string
    isOverride: boolean
  }) => void
}) {
  const staffList = useStaffList()
  const days = React.useMemo(() => {
    const arr: Date[] = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(from)
      d.setDate(from.getDate() + i)
      arr.push(d)
    }
    return arr
  }, [from])
  const overrideMap = React.useMemo(() => {
    const m = new Map<string, string>()
    assignments.forEach((a) => m.set(`${a.assign_date}::${a.template_id}`, a.staff_id))
    return m
  }, [assignments])
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayKey = ymdKey(today)
  const wd = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"]

  if (templates.length === 0) return null

  return (
    <div style={{ marginBottom: 14 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: 8,
        }}
      >
        <div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>Lịch ca trong tuần</div>
          <div style={{ fontSize: 10, color: HX.text3, marginTop: 1 }}>
            Chạm ô để đổi nhân viên hoặc khôi phục mặc định
          </div>
        </div>
        <span style={{ fontSize: 11, color: HX.text3 }}>
          {String(from.getDate()).padStart(2, "0")}/{String(from.getMonth() + 1).padStart(2, "0")} →{" "}
          {String(to.getDate()).padStart(2, "0")}/{String(to.getMonth() + 1).padStart(2, "0")}
        </span>
      </div>
      <div
        style={{
          background: HX.surface,
          border: `1px solid ${HX.hairline}`,
          borderRadius: 14,
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "54px repeat(7, 1fr)",
            background: HX.bg,
            borderBottom: `1px solid ${HX.hairline}`,
          }}
        >
          <div />
          {days.map((d, i) => {
            const key = ymdKey(d)
            const isToday = key === todayKey
            return (
              <div
                key={i}
                style={{
                  padding: "7px 2px",
                  textAlign: "center",
                  background: isToday ? HX.accentSoft : "transparent",
                  borderLeft: `1px solid ${HX.hairline}`,
                }}
              >
                <div
                  style={{
                    fontSize: 9,
                    color: isToday ? HX.accent : HX.text3,
                    fontWeight: 600,
                  }}
                >
                  {wd[i]}
                </div>
                <div
                  className="hx-num"
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: isToday ? HX.accent : HX.text,
                    marginTop: 1,
                  }}
                >
                  {d.getDate()}
                </div>
              </div>
            )
          })}
        </div>
        {/* Rows per template */}
        {templates.map((t, ti) => {
          const color = TEMPLATE_COLOR_MAP[t.color] || HX.accent
          return (
            <div
              key={t.id}
              style={{
                display: "grid",
                gridTemplateColumns: "54px repeat(7, 1fr)",
                borderBottom:
                  ti < templates.length - 1 ? `1px solid ${HX.hairline}` : "none",
              }}
            >
              <div
                style={{
                  padding: "8px 6px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  background: HX.bg,
                  gap: 2,
                }}
              >
                <span
                  style={{ width: 16, height: 3, background: color, borderRadius: 2 }}
                />
                <span style={{ fontSize: 10, fontWeight: 600 }}>
                  {t.name.replace("Ca ", "")}
                </span>
                <span
                  className="hx-num"
                  style={{ fontSize: 8, color: HX.text3 }}
                >
                  {String(t.start_hour).padStart(2, "0")}–
                  {String(t.end_hour).padStart(2, "0")}
                </span>
              </div>
              {days.map((d, di) => {
                const dateKey = ymdKey(d)
                const overrideId = overrideMap.get(`${dateKey}::${t.id}`)
                const staffId = overrideId || t.default_staff_id
                const s = staffList.find((x) => x.id === staffId)
                const isOverride = !!overrideId
                const isPart = !!s?.partTime
                void isPart
                const isToday = dateKey === todayKey
                const isCurrent = isToday && currentShiftStaffId === staffId
                return (
                  <div
                    key={di}
                    onClick={() =>
                      onCellClick({
                        date: dateKey,
                        templateId: t.id,
                        currentStaffId: staffId,
                        isOverride,
                      })
                    }
                    className="hxw-press"
                    style={{
                      padding: "8px 2px",
                      borderLeft: `1px solid ${HX.hairline}`,
                      background: isToday ? "rgba(255,122,59,0.04)" : "transparent",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 2,
                      cursor: "pointer",
                    }}
                  >
                    <div
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: 13,
                        background: isOverride ? HX.accent : s?.color || HX.surface,
                        border: isOverride
                          ? "none"
                          : `1px solid ${HX.hairlineStrong}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#fff",
                        fontSize: 9,
                        fontWeight: 700,
                        letterSpacing: "-0.01em",
                        position: "relative",
                      }}
                    >
                      {s?.initials || "?"}
                      {isCurrent && (
                        <span
                          style={{
                            position: "absolute",
                            bottom: -1,
                            right: -1,
                            width: 7,
                            height: 7,
                            borderRadius: 4,
                            background: HX.good,
                            border: `1.5px solid ${HX.elevated}`,
                          }}
                        />
                      )}
                    </div>
                    {isOverride && (
                      <span
                        style={{
                          fontSize: 7,
                          fontWeight: 700,
                          color: HX.accent,
                          letterSpacing: "0.05em",
                        }}
                      >
                        ĐỔI
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
      <div
        style={{
          display: "flex",
          gap: 12,
          marginTop: 8,
          fontSize: 9,
          color: HX.text3,
          flexWrap: "wrap",
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          <span style={{ width: 12, height: 12, borderRadius: 6, background: HX.accent }} /> Đã đổi
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          <span style={{ width: 6, height: 6, borderRadius: 3, background: HX.good }} /> Đang trực
        </span>
      </div>
    </div>
  )
}

function AssignmentEditSheet({
  date,
  templateId,
  currentStaffId,
  isOverride,
  defaultStaffId,
  onClose,
  onPick,
}: {
  date: string
  templateId: string
  currentStaffId: string
  isOverride: boolean
  defaultStaffId: string
  onClose: () => void
  onPick: (staffId: string) => void
}) {
  void templateId
  const staffList = useStaffList().filter(
    (s) => s.active !== false || s.id === currentStaffId
  )
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 460,
          background: HX.elevated,
          border: `1px solid ${HX.hairlineStrong}`,
          borderTopLeftRadius: 18,
          borderTopRightRadius: 18,
          padding: "16px 18px 24px",
        }}
      >
        <div
          style={{
            width: 36,
            height: 4,
            borderRadius: 2,
            background: HX.hairlineStrong,
            margin: "0 auto 14px",
          }}
        />
        <div
          style={{
            fontSize: 11,
            color: HX.text3,
            fontWeight: 600,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          Phân ca · {date}
        </div>
        <div style={{ fontSize: 15, fontWeight: 700, color: HX.text, marginTop: 2 }}>
          Chọn nhân viên trực
        </div>
        <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 6 }}>
          {staffList.map((s) => {
            const on = s.id === currentStaffId
            const isDef = s.id === defaultStaffId
            return (
              <div
                key={s.id}
                onClick={() => onPick(s.id)}
                className="hxw-press"
                style={{
                  padding: 10,
                  borderRadius: 12,
                  background: on ? HX.accentSoft : HX.surface,
                  border: on ? `1.5px solid ${HX.accent}` : `1px solid ${HX.hairline}`,
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  cursor: "pointer",
                }}
              >
                <Avatar initials={s.initials} size={36} color={s.color} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{s.name}</div>
                  <div style={{ fontSize: 11, color: HX.text3, marginTop: 2 }}>
                    {s.role}
                    {isDef ? " · Mặc định" : ""}
                  </div>
                </div>
                {on && (
                  <Icon name="chevron" size={14} color={HX.accent} strokeWidth={2.4} />
                )}
              </div>
            )
          })}
        </div>
        {isOverride && (
          <div
            onClick={() => onPick(defaultStaffId)}
            className="hxw-press"
            style={{
              marginTop: 10,
              padding: 12,
              borderRadius: 12,
              border: `1px dashed ${HX.hairlineStrong}`,
              textAlign: "center",
              fontSize: 12,
              fontWeight: 600,
              color: HX.text2,
              cursor: "pointer",
            }}
          >
            Khôi phục mặc định
          </div>
        )}
        <div
          onClick={onClose}
          className="hxw-press"
          style={{
            marginTop: 10,
            padding: 12,
            borderRadius: 12,
            background: "transparent",
            border: `1px solid ${HX.hairlineStrong}`,
            textAlign: "center",
            fontSize: 13,
            fontWeight: 600,
            color: HX.text2,
            cursor: "pointer",
          }}
        >
          Đóng
        </div>
      </div>
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
