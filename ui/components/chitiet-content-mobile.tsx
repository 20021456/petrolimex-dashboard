"use client"

// ════════════════════════════════════════════════════════════════
// Báo cáo — bản mobile, port từ design ReportScreen (hifi-screens).
// Nhận state đã tính từ useReport (chia sẻ với bản web).
// ════════════════════════════════════════════════════════════════

import * as React from "react"
import { HX, Icon, FuelDot, fuelKind, fuelEntryByKind, Delta, ProgressBar } from "@/components/htx-kit"
import {
  type ReportState,
  type Period,
  type RetailSale,
  AreaChart,
  useRetailSales,
  fmtNum,
  fmtBig,
  KIND_COLOR,
  rangeLabel,
  toYmd,
  fmt1,
  signL,
  signP,
  RECON_STATUS,
  diffColorOf,
  ReconHourBars,
} from "@/components/chitiet-content"
import { useStaff, type StaffMember } from "@/components/cabanhang-content"
import { useRetailProducts, type PosProduct } from "@/components/pos-page"

const TABS: { k: Period; t: string }[] = [
  { k: "today", t: "Hôm nay" },
  { k: "week", t: "Tuần" },
  { k: "month", t: "Tháng" },
  { k: "quarter", t: "Quý" },
  { k: "year", t: "Năm" },
]

const accentBorder = "rgba(6,214,160,0.32)"

export function ChiTietContentMobile({ report }: { report: ReportState }) {
  const {
    period,
    setPeriod,
    ranges,
    meta,
    loading,
    revenue,
    prevRevenue,
    liters,
    prevLiters,
    txCount,
    prevTxCount,
    revDelta,
    diffText,
    cur,
    prev,
    revenueComma,
    prevComma,
    byFuel,
    byPump,
    bestPump,
    reconcile,
    refDate,
    setRefDate,
    refIsToday,
  } = report

  const { staff } = useStaff()
  const { products: retailProducts } = useRetailProducts()
  const retailSales = useRetailSales(ranges.cur.from, ranges.cur.to)
  const activeStaffForReport = React.useMemo(
    () => staff.filter((s) => s.active !== false),
    [staff]
  )

  const viewLabel = refIsToday ? meta.label.toLowerCase() : rangeLabel(period, ranges.cur)

  return (
    <div style={{ color: HX.text, fontFamily: HX.font }}>
      {/* Period segmented */}
      <div
        style={{
          display: "flex",
          padding: 3,
          background: HX.surface,
          borderRadius: 12,
          border: `1px solid ${HX.hairline}`,
          marginBottom: 12,
        }}
      >
        {TABS.map((p) => {
          const on = period === p.k
          return (
            <div
              key={p.k}
              onClick={() => setPeriod(p.k)}
              className="hxw-press"
              style={{
                flex: 1,
                textAlign: "center",
                padding: "8px 0",
                borderRadius: 9,
                background: on ? HX.elevated : "transparent",
                color: on ? HX.text : HX.text2,
                fontSize: 12,
                fontWeight: on ? 600 : 500,
                cursor: "pointer",
                boxShadow: on ? `0 1px 0 ${HX.hairlineStrong} inset` : "none",
              }}
            >
              {p.t}
            </div>
          )
        })}
      </div>

      {/* Compare label + date picker */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          marginBottom: 14,
        }}
      >
        <span style={{ fontSize: 11, color: HX.text3, minWidth: 0 }}>
          So sánh{" "}
          <span style={{ color: HX.text2, fontWeight: 500 }}>
            {refIsToday ? meta.compare : rangeLabel(period, ranges.prev)}
          </span>
          {loading && <span style={{ marginLeft: 6 }}>· Đang tải…</span>}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          {!refIsToday && (
            <button
              onClick={() => setRefDate(new Date())}
              className="hxw-press"
              style={{
                padding: "6px 10px",
                borderRadius: 999,
                background: "transparent",
                color: HX.accent,
                border: `1px solid ${accentBorder}`,
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              Hôm nay
            </button>
          )}
          <label
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 10px",
              background: HX.surface,
              borderRadius: 999,
              border: `1px solid ${HX.hairline}`,
              fontSize: 12,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            <Icon name="calendar" size={13} color={HX.text2} />
            {rangeLabel(period, ranges.cur)}
            <input
              type="date"
              value={toYmd(refDate)}
              max={toYmd(new Date())}
              onClick={(e) => {
                const el = e.currentTarget as HTMLInputElement & { showPicker?: () => void }
                el.showPicker?.()
              }}
              onChange={(e) => {
                const v = e.target.value
                if (!v) return
                const [y, m, d] = v.split("-").map(Number)
                setRefDate(new Date(y, m - 1, d))
              }}
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                opacity: 0,
                cursor: "pointer",
                colorScheme: "dark",
              }}
            />
          </label>
        </div>
      </div>

      {/* Big revenue */}
      <div style={{ marginBottom: 14 }}>
        <div
          style={{
            fontSize: 11,
            color: HX.text3,
            fontWeight: 500,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          Tổng doanh thu · {meta.label}
        </div>
        <div
          className="hx-num"
          style={{
            fontSize: 36,
            fontWeight: 800,
            letterSpacing: "-0.03em",
            color: HX.text,
            marginTop: 4,
            lineHeight: 1,
          }}
        >
          {fmtNum(revenue)}
          <span style={{ fontSize: 18, color: HX.text2, fontWeight: 500 }}> ₫</span>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginTop: 8,
            flexWrap: "wrap",
          }}
        >
          {prevRevenue > 0 && <Delta value={revDelta} />}
          <span style={{ fontSize: 12, color: HX.text2 }}>{diffText}</span>
        </div>
      </div>

      {/* Chart card */}
      <div
        style={{
          background: HX.surface,
          border: `1px solid ${HX.hairline}`,
          borderRadius: 14,
          padding: 14,
          marginBottom: 14,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginBottom: 10,
            flexWrap: "wrap",
            gap: 6,
          }}
        >
          <span style={{ fontSize: 13, color: HX.text2, fontWeight: 600 }}>
            {meta.chartHeader[0].toUpperCase() + meta.chartHeader.slice(1)}
          </span>
          <span style={{ fontSize: 11, color: HX.text3 }}>
            <span className="hx-num" style={{ color: HX.text2, fontWeight: 600 }}>
              {revenueComma}
            </span>
            {prevRevenue > 0 && (
              <>
                {" · "}
                <span className="hx-num">{prevComma}</span>
              </>
            )}
          </span>
        </div>
        <AreaChart
          key={period}
          data={cur.data}
          prevData={prev.data}
          w={340}
          h={140}
          color={HX.accent}
        />
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: 4,
            fontSize: 10,
            color: HX.text3,
          }}
        >
          {cur.labels.map((l, i) => (
            <span key={i}>{l}</span>
          ))}
        </div>
      </div>

      {/* By fuel */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 10 }}>
          Theo loại nhiên liệu
        </div>
        <div
          style={{
            background: HX.surface,
            border: `1px solid ${HX.hairline}`,
            borderRadius: 14,
            padding: 14,
          }}
        >
          {byFuel.map((r, i) => {
            const diffColor =
              r.diffLiters == null
                ? HX.text3
                : Math.abs(r.diffLiters) < 1
                  ? HX.text2
                  : r.diffLiters > 0
                    ? HX.warn
                    : HX.bad
            return (
              <div
                key={r.kind}
                style={{
                  paddingTop: i === 0 ? 0 : 12,
                  paddingBottom: i === byFuel.length - 1 ? 0 : 12,
                  borderBottom:
                    i < byFuel.length - 1 ? `1px solid ${HX.hairline}` : "none",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 6,
                    gap: 8,
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}
                  >
                    <FuelDot kind={r.kind} />
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{r.name}</span>
                    <span style={{ fontSize: 11, color: HX.text3 }}>
                      · {r.bon} · {fmtNum(r.liters)} L
                    </span>
                  </div>
                  <div
                    className="hx-num"
                    style={{ fontSize: 13, fontWeight: 600, flexShrink: 0 }}
                  >
                    {fmtNum(r.revenue)}
                    <span style={{ fontSize: 10, color: HX.text3, fontWeight: 400 }}>
                      {" "}
                      ₫
                    </span>
                  </div>
                </div>
                <ProgressBar pct={r.pct} color={KIND_COLOR[r.kind]} h={5} />
                {/* Thực tế vs chênh lệch */}
                {(r.actualLiters != null || r.diffLiters != null) && (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginTop: 6,
                      fontSize: 11,
                    }}
                  >
                    <span style={{ color: HX.text3 }}>
                      Thực tế:{" "}
                      <span className="hx-num" style={{ color: HX.text2, fontWeight: 600 }}>
                        {r.actualLiters != null ? `${fmtNum(r.actualLiters)} L` : "—"}
                      </span>
                    </span>
                    <span
                      className="hx-num"
                      style={{ color: diffColor, fontWeight: 600 }}
                    >
                      {r.diffLiters != null
                        ? `${r.diffLiters > 0 ? "+" : ""}${fmtNum(r.diffLiters)} L`
                        : "—"}
                    </span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* By pump (compact) */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 10 }}>Theo cột bơm</div>
        <div
          style={{
            background: HX.surface,
            border: `1px solid ${HX.hairline}`,
            borderRadius: 14,
            padding: 14,
          }}
        >
          {byPump.length === 0 ? (
            <div
              style={{
                padding: "20px 0",
                textAlign: "center",
                color: HX.text3,
                fontSize: 12,
              }}
            >
              Chưa có dữ liệu cột bơm
            </div>
          ) : (
            byPump.map((p, i) => {
              const diffColor =
                p.diffLiters == null
                  ? HX.text3
                  : Math.abs(p.diffLiters) < 1
                    ? HX.text2
                    : p.diffLiters > 0
                      ? HX.warn
                      : HX.bad
              return (
                <div
                  key={p.cotBom}
                  style={{
                    paddingTop: i === 0 ? 0 : 10,
                    paddingBottom: i === byPump.length - 1 ? 0 : 10,
                    borderBottom:
                      i < byPump.length - 1 ? `1px solid ${HX.hairline}` : "none",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 10,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        minWidth: 0,
                      }}
                    >
                      <FuelDot kind={p.fuel} size={7} />
                      <span style={{ fontSize: 13, fontWeight: 600 }}>Cột {p.cotBom}</span>
                      <span
                        style={{
                          fontSize: 11,
                          color: HX.text3,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        · {fuelEntryByKind(p.fuel)?.name || p.fuel} · {fmtNum(p.count)} GD
                      </span>
                    </div>
                    <div
                      className="hx-num"
                      style={{ fontSize: 13, fontWeight: 700, flexShrink: 0 }}
                    >
                      {fmtBig(p.revenue)}
                      <span style={{ fontSize: 10, color: HX.text3, fontWeight: 400 }}>
                        {" "}
                        ₫
                      </span>
                    </div>
                  </div>
                  {(p.actualLiters != null || p.diffLiters != null) && (
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginTop: 4,
                        fontSize: 11,
                      }}
                    >
                      <span style={{ color: HX.text3 }}>
                        DB:{" "}
                        <span className="hx-num" style={{ color: HX.text2, fontWeight: 600 }}>
                          {fmtNum(p.dbLiters)} L
                        </span>
                        {" · "}Thực tế:{" "}
                        <span className="hx-num" style={{ color: HX.text2, fontWeight: 600 }}>
                          {p.actualLiters != null ? `${fmtNum(p.actualLiters)} L` : "—"}
                        </span>
                      </span>
                      <span
                        className="hx-num"
                        style={{ color: diffColor, fontWeight: 700 }}
                      >
                        {p.diffLiters != null
                          ? `${p.diffLiters > 0 ? "+" : ""}${fmtNum(p.diffLiters)} L`
                          : "—"}
                      </span>
                    </div>
                  )}
                </div>
              )
            })
          )}
          {bestPump && (
            <div
              style={{
                marginTop: 12,
                padding: 10,
                borderRadius: 10,
                background: HX.accentSoft,
                border: `1px solid ${accentBorder}`,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 10,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 10,
                    color: HX.accent,
                    fontWeight: 600,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                  }}
                >
                  Hiệu quả nhất
                </div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    marginTop: 2,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {bestPump.name}
                </div>
              </div>
              <div
                className="hx-num"
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: HX.accent,
                  flexShrink: 0,
                }}
              >
                {fmtBig(bestPump.avg)}
                <span style={{ fontSize: 10, fontWeight: 400 }}> ₫/GD</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Đối chiếu Thực tế vs Đồng hồ */}
      {period === "today" && <ReconcileMobile data={reconcile} dateLabel={viewLabel} />}

      {/* So sánh */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 10 }}>So sánh</div>
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}
        >
          <div
            style={{
              padding: 14,
              background: HX.surface,
              border: `1px solid ${HX.hairline}`,
              borderRadius: 14,
            }}
          >
            <div style={{ fontSize: 11, color: HX.text3 }}>{meta.compareSubLabel}</div>
            <div
              className="hx-num"
              style={{ fontSize: 18, fontWeight: 700, color: HX.text2, marginTop: 6 }}
            >
              {fmtBig(prevRevenue)}
            </div>
            <div style={{ fontSize: 11, color: HX.text3, marginTop: 4 }}>
              {fmtNum(prevLiters)} L · {fmtNum(prevTxCount)} GD
            </div>
          </div>
          <div
            style={{
              padding: 14,
              background: HX.accentSoft,
              border: `1px solid ${accentBorder}`,
              borderRadius: 14,
            }}
          >
            <div style={{ fontSize: 11, color: HX.accent, fontWeight: 600 }}>
              {meta.compareLabel}
            </div>
            <div
              className="hx-num"
              style={{ fontSize: 18, fontWeight: 700, color: HX.accent, marginTop: 6 }}
            >
              {fmtBig(revenue)}
            </div>
            <div style={{ fontSize: 11, color: HX.text2, marginTop: 4 }}>
              {fmtNum(liters)} L · {fmtNum(txCount)} GD
            </div>
          </div>
        </div>
      </div>

      {/* Nhân viên · sản phẩm bán + tồn kho — card layout (fit 1 screen) */}
      <div style={{ marginTop: 16 }}>
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>
          Nhân viên · {meta.label}
        </div>
        <div style={{ fontSize: 11, color: HX.text3, marginBottom: 10 }}>
          Số lượng bán theo từng nhân viên + tồn kho hiện tại
        </div>
        <StaffMobileList
          activeStaff={activeStaffForReport}
          products={retailProducts}
          sales={retailSales}
        />
      </div>
    </div>
  )
}

function ReconcileMobile({ data, dateLabel }: { data: any; dateLabel: string }) {
  const [open, setOpen] = React.useState<number | null>(null)
  const cols: any[] = data?.columns || []
  const sum = data?.summary
  const th = data?.thresholds || { warnL: 20, warnPct: 1.5, outlierL: 200 }
  const excluded: any[] = data?.excluded || []

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <span style={{ fontSize: 16, fontWeight: 600 }}>Đối chiếu Thực tế vs Đồng hồ</span>
        <span
          style={{
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: "0.06em",
            color: HX.accent,
            background: "rgba(255,90,31,0.12)",
            border: `1px solid ${accentBorder}`,
            padding: "2px 7px",
            borderRadius: 6,
          }}
        >
          TRỌNG TÂM
        </span>
      </div>
      <div style={{ fontSize: 11, color: HX.text3, marginBottom: 10 }}>
        Đồng hồ tổng vs giao dịch · ngưỡng ±{fmt1(th.warnL)} L / ±{fmt1(th.warnPct)}% · {dateLabel}
      </div>

      {!data ? (
        <div
          style={{
            background: HX.surface,
            border: `1px solid ${HX.hairline}`,
            borderRadius: 14,
            padding: 24,
            textAlign: "center",
            color: HX.text3,
            fontSize: 12,
          }}
        >
          Đang tải…
        </div>
      ) : cols.length === 0 ? (
        <div
          style={{
            background: HX.surface,
            border: `1px solid ${HX.hairline}`,
            borderRadius: 14,
            padding: 24,
            textAlign: "center",
            color: HX.text3,
            fontSize: 12,
          }}
        >
          Chưa có dữ liệu đồng hồ để đối chiếu
        </div>
      ) : (
        <>
          {/* Summary */}
          <div
            style={{
              background: HX.surface,
              border: `1px solid ${HX.hairline}`,
              borderRadius: 14,
              padding: 14,
              marginBottom: 10,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 11, color: HX.text3 }}>Chênh lệch ròng toàn trạm</div>
                <div
                  className="hx-num"
                  style={{ fontSize: 24, fontWeight: 800, color: diffColorOf(sum.netDiff), marginTop: 2 }}
                >
                  {signL(sum.netDiff)}
                </div>
                <div className="hx-num" style={{ fontSize: 11, color: HX.text3, marginTop: 2 }}>
                  trên {fmt1(sum.totalMeter)} L máy · {signP(sum.netPct)}
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, flexShrink: 0 }}>
                {([
                  ["warn", sum.counts.warn, "vượt ngưỡng"],
                  ["watch", sum.counts.watch, "cần theo dõi"],
                  ["ok", sum.counts.ok, "bình thường"],
                ] as Array<[string, number, string]>).map(([k, n, t]) => (
                  <div key={k} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
                    <span style={{ width: 6, height: 6, borderRadius: 3, background: RECON_STATUS[k].color }} />
                    <span style={{ color: HX.text2 }}>
                      <b style={{ color: HX.text }}>{n}</b> {t}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            {(sum.worstColumn || sum.worstHour) && (
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  marginTop: 10,
                  paddingTop: 10,
                  borderTop: `1px solid ${HX.hairline}`,
                  fontSize: 11,
                  color: HX.text3,
                  flexWrap: "wrap",
                }}
              >
                {sum.worstColumn && (
                  <span>
                    Lệch nhiều nhất:{" "}
                    <b style={{ color: HX.text2 }}>Cột {sum.worstColumn.cotBom}</b> ({signL(sum.worstColumn.diff)})
                  </span>
                )}
                {sum.worstHour && (
                  <span className="hx-num" style={{ marginLeft: "auto" }}>
                    {sum.worstHour.fromHm}–{sum.worstHour.toHm}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Per-column list */}
          <div
            style={{
              background: HX.surface,
              border: `1px solid ${HX.hairline}`,
              borderRadius: 14,
              padding: 14,
            }}
          >
            {cols.map((c, i) => {
              const st = RECON_STATUS[c.status]
              const isOpen = open === c.cotBom
              return (
                <div
                  key={c.cotBom}
                  style={{
                    paddingTop: i === 0 ? 0 : 10,
                    paddingBottom: i < cols.length - 1 ? 10 : 0,
                    borderBottom: i < cols.length - 1 ? `1px solid ${HX.hairline}` : "none",
                  }}
                >
                  <div
                    onClick={() => setOpen(isOpen ? null : c.cotBom)}
                    className="hxw-press"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 10,
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                      <FuelDot kind={fuelKind(c.fuel)} size={7} />
                      <span style={{ fontSize: 13, fontWeight: 600, flexShrink: 0 }}>Cột {c.cotBom}</span>
                      <span
                        style={{
                          fontSize: 11,
                          color: HX.text3,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {c.fuel}
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                      <span className="hx-num" style={{ fontSize: 13, fontWeight: 700, color: diffColorOf(c.diff) }}>
                        {signL(c.diff)}
                      </span>
                      <span style={{ width: 7, height: 7, borderRadius: 4, background: st.color }} />
                      <span style={{ display: "inline-flex", transform: isOpen ? "rotate(180deg)" : "none" }}>
                        <Icon name="chevronDown" size={13} color={HX.text3} />
                      </span>
                    </div>
                  </div>

                  {isOpen && (
                    <div style={{ marginTop: 10 }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 8,
                          fontSize: 11,
                          color: HX.text3,
                          marginBottom: 10,
                        }}
                      >
                        <span>
                          Số máy:{" "}
                          <b className="hx-num" style={{ color: HX.text2 }}>
                            {fmt1(c.meter)} L
                          </b>
                        </span>
                        <span>
                          Thực tế:{" "}
                          <b className="hx-num" style={{ color: HX.text2 }}>
                            {fmt1(c.actual)} L
                          </b>
                        </span>
                        <span className="hx-num" style={{ color: diffColorOf(c.diff) }}>
                          {signP(c.pct)} · {st.label}
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: HX.text3, marginBottom: 4 }}>
                        Chênh lệch theo giờ{" "}
                        <span style={{ fontSize: 10 }}>(đỏ = thiếu · vàng = thừa)</span>
                      </div>
                      <ReconHourBars hourly={c.hourly} />
                      {c.topHours.length > 0 && (
                        <div style={{ marginTop: 10 }}>
                          <div style={{ fontSize: 11, fontWeight: 600, color: HX.text2, marginBottom: 4 }}>
                            Khung giờ lệch nhiều nhất
                          </div>
                          {c.topHours.map((thh: any, j: number) => (
                            <div
                              key={j}
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                padding: "5px 0",
                                borderBottom:
                                  j < c.topHours.length - 1 ? `1px dashed ${HX.hairline}` : "none",
                                fontSize: 11,
                              }}
                            >
                              <span className="hx-num" style={{ color: HX.text2 }}>
                                {thh.fromHm}–{thh.toHm}
                              </span>
                              <span className="hx-num" style={{ fontWeight: 700, color: diffColorOf(thh.diff) }}>
                                {signL(thh.diff)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {excluded.length > 0 && (
            <div
              style={{
                marginTop: 10,
                padding: "10px 12px",
                background: "rgba(255,214,10,0.08)",
                border: "1px solid rgba(255,214,10,0.25)",
                borderRadius: 12,
                fontSize: 11,
                color: HX.text2,
                display: "flex",
                gap: 8,
              }}
            >
              <Icon name="alert" size={14} color={HX.warn} />
              <span>
                Đã loại <b style={{ color: HX.text }}>{excluded.length} bản ghi</b> nghi lỗi đồng hồ (chênh &gt;{" "}
                {fmt1(th.outlierL)} L) khỏi đối chiếu.
              </span>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function StaffMobileList({
  activeStaff,
  products,
  sales,
}: {
  activeStaff: StaffMember[]
  products: PosProduct[]
  sales: RetailSale[]
}) {
  // Pivot: Map<sku|name, Map<staffName, qty>>.
  const pivot = React.useMemo(() => {
    const m = new Map<string, Map<string, number>>()
    sales.forEach((s) => {
      const key = s.sku || s.item_name
      if (!key) return
      const seller = s.seller_name || "(không ghi nhận)"
      if (!m.has(key)) m.set(key, new Map())
      const inner = m.get(key)!
      inner.set(seller, (inner.get(seller) || 0) + s.quantity)
    })
    return m
  }, [sales])
  const qtyFor = (sku: string, name: string, staffName: string) => {
    const bySku = pivot.get(sku)
    const byName = pivot.get(name)
    let t = 0
    if (bySku?.has(staffName)) t += bySku.get(staffName) || 0
    if (byName && byName !== bySku && byName.has(staffName)) {
      t += byName.get(staffName) || 0
    }
    return t
  }
  if (products.length === 0) {
    return (
      <div
        style={{
          padding: 30,
          textAlign: "center",
          color: HX.text3,
          fontSize: 12,
          background: HX.surface,
          border: `1px dashed ${HX.hairlineStrong}`,
          borderRadius: 12,
        }}
      >
        Chưa có sản phẩm bán lẻ
      </div>
    )
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {products.map((p) => {
        const low = p.stock < p.min_stock
        return (
          <div
            key={p.sku}
            style={{
              background: HX.surface,
              border: `1px solid ${HX.hairline}`,
              borderRadius: 12,
              padding: 12,
            }}
          >
            {/* Top row */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: "rgba(255,177,88,0.10)",
                  border: "1px solid rgba(255,177,88,0.18)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Icon name="drop" size={14} color={HX.accent2} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: HX.text,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {p.name}
                </div>
                <div style={{ fontSize: 10, color: HX.text3, marginTop: 2 }}>
                  {p.cat} · {p.sku}
                </div>
              </div>
              <div
                style={{
                  padding: "4px 10px",
                  borderRadius: 8,
                  background: low ? HX.badSoft : HX.bg,
                  border: low
                    ? "1px solid rgba(255,69,58,0.28)"
                    : `1px solid ${HX.hairlineStrong}`,
                  textAlign: "right",
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    fontSize: 9,
                    color: HX.text3,
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                    fontWeight: 600,
                  }}
                >
                  Tồn
                </div>
                <div
                  className="hx-num"
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: low ? HX.bad : HX.text,
                    marginTop: 1,
                    letterSpacing: "-0.01em",
                  }}
                >
                  {fmtNum(p.stock)}
                  <span
                    style={{
                      fontSize: 10,
                      color: HX.text3,
                      fontWeight: 400,
                    }}
                  >
                    {" / "}
                    {fmtNum(p.min_stock)}
                  </span>
                </div>
              </div>
            </div>

            {/* Staff chips */}
            {activeStaff.length > 0 && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: `repeat(${activeStaff.length}, 1fr)`,
                  gap: 6,
                  marginTop: 10,
                  paddingTop: 10,
                  borderTop: `1px solid ${HX.hairline}`,
                }}
              >
                {activeStaff.map((s) => {
                  const qty = qtyFor(p.sku, p.name, s.name)
                  return (
                    <div
                      key={s.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "5px 7px",
                        borderRadius: 7,
                        background: HX.bg,
                        border: `1px solid ${HX.hairline}`,
                        minWidth: 0,
                      }}
                    >
                      <div
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: 5,
                          background: s.color,
                          color: "#fff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 8,
                          fontWeight: 700,
                          flexShrink: 0,
                        }}
                      >
                        {s.initials}
                      </div>
                      <span
                        className="hx-num"
                        style={{
                          flex: 1,
                          textAlign: "right",
                          fontSize: 14,
                          fontWeight: qty > 0 ? 700 : 500,
                          color: qty > 0 ? HX.text : "rgba(255,255,255,0.28)",
                          letterSpacing: "-0.01em",
                        }}
                      >
                        {qty}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
