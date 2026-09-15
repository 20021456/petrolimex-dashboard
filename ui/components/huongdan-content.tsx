"use client"

// ════════════════════════════════════════════════════════════════
// Hướng dẫn sử dụng — trang phụ cho người mới dùng.
// Nội dung mô tả đúng nhãn/nút thực tế của từng màn hình trong app.
// Dữ liệu hướng dẫn nằm trong GUIDES bên dưới; giao diện chỉ render.
// ════════════════════════════════════════════════════════════════

import * as React from "react"
import { HX, Icon, useIsMobile, type IconName } from "@/components/htx-kit"

interface HuongDanContentProps {
  onNavigate?: (view: string) => void
}

// ── Kiểu dữ liệu ──────────────────────────────────────────────
type NoteKind = "info" | "warn" | "tip"

interface Note {
  kind: NoteKind
  text: string
}

interface Task {
  id: string
  title: string
  /** Mô tả ngắn khi nào cần thao tác này */
  when?: string
  steps: string[]
  notes?: Note[]
  /** Khác biệt trên điện thoại */
  mobile?: string[]
}

interface Guide {
  id: string
  title: string
  sub: string
  icon: IconName
  color: string
  /** view id trong dashboard để nút "Mở trang" nhảy tới */
  view?: string
  intro: string
  tasks: Task[]
}

// ── Nội dung hướng dẫn ────────────────────────────────────────
// Quy ước: chữ nằm giữa **…** là tên nút / nhãn / trường trên màn hình.

const QUICK_START: { title: string; sub: string; view: string; icon: IconName; color: string }[] = [
  { title: "Thêm nhân viên", sub: "Ca bán hàng → Thêm nhân viên", view: "giaoca", icon: "user", color: HX.accent2 },
  { title: "Mở ca làm việc", sub: "Ca bán hàng → Mở ca mới", view: "giaoca", icon: "clock", color: HX.accent },
  { title: "Cập nhật đơn giá", sub: "Đơn giá → bấm vào số giá", view: "gia", icon: "chart", color: HX.doPlus },
  { title: "Nhập hàng vào kho", sub: "Nhập kho → 3 bước", view: "nhap", icon: "plus", color: HX.good },
  { title: "Bán hàng tại quầy", sub: "Bán hàng → Lưu giao dịch", view: "kho", icon: "receipt", color: HX.accentDark },
  { title: "Thu nợ khách quen", sub: "Công nợ → Ghi nhận thu nợ", view: "khachquen", icon: "alert", color: HX.bad },
]

const GUIDES: Guide[] = [
  // ─────────────────────────────────────────────────────────────
  {
    id: "tongquan",
    title: "Làm quen với giao diện",
    sub: "Thanh điều hướng · thanh tiêu đề · máy tính và điện thoại",
    icon: "home",
    color: HX.accent,
    view: "dashboard",
    intro:
      "Ứng dụng có một thanh điều hướng bên trái (trên máy tính) hoặc thanh tab dưới đáy (trên điện thoại). Mỗi mục là một màn hình chức năng. Thanh tiêu đề phía trên luôn hiển thị tên màn hình đang mở và mốc dữ liệu mới nhất.",
    tasks: [
      {
        id: "tongquan-nav",
        title: "Các màn hình trong ứng dụng",
        steps: [
          "**Trang chủ** — tổng quan doanh thu hôm nay, tồn kho bồn, giao dịch gần đây.",
          "**Giao dịch** — lịch sử bơm xăng dầu và đơn bán lẻ, lọc theo ngày, gán khách hàng.",
          "**Bán Hàng** — máy bán lẻ tại quầy (POS): dầu nhớt, mỡ, phụ kiện…",
          "**Tồn Kho** — mức xăng dầu trong từng bồn và tồn kho sản phẩm bán lẻ.",
          "**Nhập Kho** — ghi nhận hàng nhập (xăng dầu vào bồn hoặc sản phẩm bán lẻ).",
          "**Báo Cáo** — doanh thu, sản lượng theo kỳ và đối soát số máy với giao dịch.",
          "**Công Nợ** — sổ khách quen: theo dõi nợ và ghi nhận thu tiền.",
          "**Ca Bán Hàng** — nhân viên, khung ca, mở/đóng ca, lịch phân công tuần.",
          "**Đơn Giá** — cập nhật giá xăng dầu từng cột bơm và giá sản phẩm bán lẻ.",
          "**Hướng Dẫn** — chính là trang bạn đang đọc.",
        ],
      },
      {
        id: "tongquan-header",
        title: "Các nút trên thanh tiêu đề (máy tính)",
        steps: [
          "Nút **Cập nhật** (biểu tượng mũi tên xoay): đồng bộ giao dịch và số liệu bồn bể mới nhất từ nguồn. Hiện thông báo *Đang cập nhật dữ liệu từ nguồn… (có thể mất vài phút)*, xong sẽ tự tải lại trang.",
          "Nút cam **Bán hàng** (dấu +): mở nhanh màn hình bán lẻ tại quầy.",
          "Ô **Tìm kiếm…**: tìm nhanh trong dữ liệu thống kê nền. Mỗi màn hình như Giao dịch, Bán hàng, Công nợ có ô tìm riêng chính xác hơn.",
        ],
        notes: [
          { kind: "info", text: "Dòng phụ dưới tên màn hình ghi *cập nhật HH:MM · ngày* là mốc giao dịch mới nhất đã có trong hệ thống, không phải giờ hiện tại." },
          { kind: "warn", text: "Nếu thấy khung đỏ *Lỗi kết nối*, hãy kiểm tra máy chủ cơ sở dữ liệu rồi bấm **Thử lại**." },
        ],
      },
      {
        id: "tongquan-mobile",
        title: "Dùng trên điện thoại",
        steps: [
          "Thanh tab dưới đáy gồm **Trang chủ**, **Tồn kho**, nút tròn cam **Bán hàng** ở giữa, **Công nợ** và **Khác**.",
          "Bấm **Khác** để mở bảng chọn thêm: **Giao dịch**, **Báo cáo**, **Ca bán hàng**, **Nhập kho**, **Đơn giá**, **Hướng dẫn**.",
          "Giao diện tự chuyển sang bản điện thoại khi màn hình hẹp hơn 768px; một số bảng được rút gọn thành thẻ, một số chỉ số phụ được ẩn bớt.",
        ],
        notes: [
          { kind: "tip", text: "Nhân viên bán hàng có thể dùng trang rút gọn tại đường dẫn **/nhanvien**, chỉ gồm hai chức năng Bán hàng và Công nợ." },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  {
    id: "trangchu",
    title: "Trang chủ",
    sub: "Đọc nhanh tình hình trong ngày",
    icon: "home",
    color: HX.accent2,
    view: "dashboard",
    intro:
      "Trang chủ tổng hợp số liệu hôm nay: doanh thu, số lít, số giao dịch, mức tồn từng bồn, doanh thu theo giờ và các giao dịch gần nhất. Không cần thao tác gì, chỉ cần đọc.",
    tasks: [
      {
        id: "trangchu-doc",
        title: "Đọc các khối trên Trang chủ",
        steps: [
          "Thẻ cam **Doanh thu hôm nay**: tổng tiền, số lít, số giao dịch và mức tăng/giảm *vs hôm qua*.",
          "Thẻ **Tổng tồn … bồn**: tổng lít còn trong các bồn. Ô cảnh báo phía dưới cho biết bồn thấp nhất còn bao nhiêu % và *dự kiến hết sau* bao lâu; bấm vào để sang **Tồn kho**.",
          "Hàng thẻ **Lít bán**, **Giao dịch**, **TB/GD**, **Khách lẻ** so với hôm qua.",
          "Khối **Tồn kho theo bồn**: mỗi bồn có nhãn đỏ **Sắp hết** khi dưới 25%.",
          "Khối **Doanh thu theo giờ** (giờ *Đông nhất* / *Vắng nhất*) và **Theo loại nhiên liệu**.",
          "Khối **Chỉ số TOTAL theo giờ**: số đọc cộng dồn của từng cột bơm chốt cuối mỗi giờ.",
          "Khối **Giao dịch gần đây**: bấm **Xem tất cả →** để sang màn hình Giao dịch.",
        ],
        notes: [
          { kind: "tip", text: "Trong bảng Giao dịch gần đây, cột **Khách hàng** bấm được để gán khách quen hoặc đánh dấu *Ghi nợ* cho giao dịch bơm xăng (xem mục Giao dịch)." },
        ],
        mobile: [
          "Chỉ hiện 3 thẻ **Lít bán**, **Giao dịch**, **TB/GD**; không có khối *Chỉ số TOTAL theo giờ*.",
          "Danh sách giao dịch gần đây rút gọn còn 15 dòng.",
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  {
    id: "dongia",
    title: "Đơn giá",
    sub: "Cập nhật giá xăng dầu · giá bán lẻ · thêm sản phẩm mới",
    icon: "chart",
    color: HX.doPlus,
    view: "gia",
    intro:
      "Màn hình Đơn giá có hai khu: **Giá xăng dầu** (5 thẻ, mỗi thẻ một cột bơm) và **Giá sản phẩm bán lẻ** (bảng sản phẩm). Giá mới áp dụng ngay cho các giao dịch sau đó.",
    tasks: [
      {
        id: "gia-xangdau",
        title: "Cập nhật giá xăng dầu cho một cột bơm",
        when: "Khi có giá mới công bố hoặc cần chỉnh tay giá của một cột.",
        steps: [
          "Mở **Đơn Giá** trong thanh điều hướng.",
          "Ở khu **Giá xăng dầu**, tìm thẻ của cột cần sửa (góc dưới phải ghi **Cột 1** … **Cột 5**, phía trên ghi loại nhiên liệu như RON95-III, DO 0,05S-II).",
          "Bấm thẳng vào **con số giá** trên thẻ. Một ô nhập hiện ra với giá hiện tại được điền sẵn.",
          "Gõ giá mới (chỉ nhập chữ số, đơn vị ₫/lít).",
          "Nhấn **Enter** hoặc bấm nút **✓** để lưu. Nhấn **Esc** nếu muốn hủy.",
          "Thấy thông báo *Đã cập nhật giá Cột n* là xong. Thẻ sẽ hiện nhãn **Đã chỉnh** và dòng *Giá gốc … · ngày* phía dưới.",
        ],
        notes: [
          { kind: "warn", text: "Giá phải tuân theo công bố của Bộ Công Thương. Hệ thống chỉ lưu khi giá lớn hơn 0 và khác giá hiện tại." },
          { kind: "tip", text: "Muốn quay về giá gốc do cột bơm ghi nhận: bấm nút mũi tên xoay **Khôi phục giá gốc** ở góc dưới phải thẻ (chỉ hiện khi thẻ đang có nhãn *Đã chỉnh*)." },
        ],
        mobile: ["5 thẻ cột bơm nằm trên dải cuộn ngang; cách bấm vào số giá để sửa giống hệt máy tính."],
      },
      {
        id: "gia-banle",
        title: "Cập nhật giá sản phẩm bán lẻ",
        when: "Khi đổi giá dầu nhớt, mỡ, phụ kiện… bán tại quầy.",
        steps: [
          "Mở **Đơn Giá**, kéo xuống khu **Giá sản phẩm bán lẻ**.",
          "Tìm sản phẩm bằng ô **Tìm theo tên, SKU…** hoặc bấm chip nhóm: **Tất cả**, **Dầu nhớt**, **Dầu pha xăng**, **Mỡ**, **Khác**.",
          "Bấm vào ô **Giá bán hiện tại** của sản phẩm, gõ giá mới rồi nhấn **Enter** (hoặc bấm ra ngoài) để lưu; **Esc** để hủy.",
          "Hoặc chỉnh nhanh bằng nút **−5%** / **+5%** ở cột **Điều chỉnh nhanh**: giá mới được làm tròn tới hàng trăm và lưu ngay, không hỏi lại.",
          "Thông báo *Đã cập nhật giá sản phẩm* xác nhận đã lưu.",
        ],
        notes: [
          { kind: "info", text: "Giá mới hiển thị ngay ở màn hình **Bán Hàng** và **Tồn Kho**." },
        ],
      },
      {
        id: "gia-themsp",
        title: "Thêm sản phẩm bán lẻ mới vào danh mục",
        when: "Khi trạm bắt đầu bán một mặt hàng chưa có trong hệ thống.",
        steps: [
          "Mở **Đơn Giá**, bấm nút cam **Thêm sản phẩm** ở khu **Giá sản phẩm bán lẻ**.",
          "Nhập **Tên sản phẩm** (ví dụ *Dầu Castrol GTX 1L*) và chọn **Đơn vị tính** (chai, lon, lít, cái, can, xô, bình, gói, hộp, bộ).",
          "Chọn **Nhóm hàng**: **Dầu nhớt**, **Dầu pha xăng**, **Mỡ**, **Khác**, hoặc bấm **Nhóm mới** rồi đặt tên, chọn biểu tượng và màu.",
          "Kiểm tra **Mã SKU**: hệ thống tự sinh theo nhóm và tên; có thể bấm **Tạo lại mã SKU** hoặc tự gõ. Nếu báo *SKU đã tồn tại — chọn mã khác* thì phải đổi mã.",
          "Nhập **Giá bán (bắt buộc)**. Nhập thêm **Giá vốn (nhập vào)** nếu muốn xem lợi nhuận và biên lãi.",
          "Tùy chọn: nhập **Tồn kho ban đầu** gồm **Số lượng nhập** và **Cảnh báo khi dưới** (mức tối thiểu để báo *Sắp hết*).",
          "Khi chân hộp thoại báo *Sẵn sàng thêm vào danh mục*, bấm **Thêm sản phẩm**.",
          "Thông báo *Đã thêm \"tên sản phẩm\" vào danh mục* là xong. Sản phẩm xuất hiện ngay ở Bán hàng, Tồn kho và Đơn giá.",
        ],
        notes: [
          { kind: "warn", text: "Nút **Thêm sản phẩm** chỉ sáng khi đã có tên, nhóm, SKU hợp lệ và giá bán lớn hơn 0." },
          { kind: "tip", text: "Màn hình Nhập kho không có nút thêm sản phẩm; muốn nhập một mặt hàng mới hãy tạo sản phẩm ở đây trước rồi mới nhập kho." },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  {
    id: "nhapkho",
    title: "Nhập kho",
    sub: "Ghi nhận xăng dầu vào bồn · sản phẩm bán lẻ · sửa phiếu nhập",
    icon: "plus",
    color: HX.good,
    view: "nhap",
    intro:
      "Trên máy tính, Nhập kho đi theo 3 bước hiển thị ở thanh trên cùng: **Chọn loại nhập** → **Nhập hàng** → **Xác nhận**. Sau khi xác nhận, tồn kho cập nhật ngay và mỗi dòng hàng tạo một phiếu trong lịch sử nhập.",
    tasks: [
      {
        id: "nhap-xangdau",
        title: "Nhập xăng dầu vào bồn",
        when: "Khi xe bồn giao hàng.",
        steps: [
          "Mở **Nhập Kho**. Ở bước **Chọn loại nhập**, bấm thẻ **Xăng dầu** (hệ thống chuyển ngay sang bước 2).",
          "Điền **Thông tin chung**: **Nhà cung cấp** (mặc định *Petrolimex KV5*), **Mã hợp đồng**, **Số hóa đơn**, **Ngày · giờ nhập** (mặc định giờ hiện tại), **Người ghi nhận**, **Xe bồn / tài xế**.",
          "Ở khu **Hàng nhập**, chọn bồn trong danh sách (hiển thị *TÊN BỒN — nhiên liệu (tồn/dung tích L)*), nhập **Số lượng (L)** và **Đơn giá nhập** (₫/L). Cột **Thành tiền** tự tính.",
          "Cần nhập nhiều bồn cùng đợt: bấm **Thêm bồn khác**. Muốn bỏ một dòng: bấm **×** cuối dòng.",
          "Tùy chọn ghi **Ghi chú thêm cho cả đợt**. Thẻ **Tóm tắt đợt nhập** bên phải hiển thị số dòng, tổng lít và **Tổng giá trị**.",
          "Bấm **Xem lại & xác nhận** (chỉ bật khi có ít nhất một dòng đã chọn bồn và số lượng > 0).",
          "Ở bước **Xác nhận**, kiểm tra lại thông tin và bảng hàng nhập. Cần sửa thì bấm **Quay lại sửa**.",
          "Bấm **Xác nhận nhập kho**. Thông báo *Đã ghi nhận n phiếu nhập xăng dầu · x L* hiện ra và hệ thống tự chuyển sang màn hình **Tồn Kho** để bạn kiểm tra mức bồn mới.",
        ],
        notes: [
          { kind: "info", text: "Trạm có 3 bồn cố định: Bồn 1 RON95-III (cột 2, 3), Bồn 2 DO 0,05S-II (cột 1, 4), Bồn 3 DO 0,001S-V (cột 5)." },
        ],
        mobile: [
          "Không có thanh 3 bước: bấm thẻ **Xăng dầu**, điền form rồi bấm nút dính đáy **Xác nhận nhập kho · tổng ₫** là lưu ngay.",
          "Có thêm ô **Mã số thuế**; các ô thông tin chung không điền sẵn nên cần tự gõ.",
        ],
      },
      {
        id: "nhap-banle",
        title: "Nhập sản phẩm bán lẻ",
        when: "Khi nhập thêm dầu nhớt, mỡ, phụ kiện… từ nhà cung cấp.",
        steps: [
          "Mở **Nhập Kho**, bấm thẻ **Sản phẩm bán lẻ**.",
          "Điền **Thông tin chung**: **Nhà cung cấp**, **Số hóa đơn**, **Ngày · giờ nhập**, **Người ghi nhận**.",
          "Ở khu **Chọn mặt hàng nhập**, gõ vào ô **Tìm tên / SKU…** rồi bấm **Thêm** cạnh sản phẩm. Mỗi lần bấm cộng thêm 1; nút đổi thành **+1 (số lượng)**.",
          "Sản phẩm đã chọn hiện ở danh sách phía trên với bộ đếm **−** / ô số / **+** để chỉnh số lượng nhanh.",
          "Tùy chọn ghi **Ghi chú thêm cho cả đợt**, rồi bấm **Xem lại & xác nhận**.",
          "Kiểm tra bảng **Hàng nhập** ở bước Xác nhận và bấm **Xác nhận nhập kho**. Thông báo *Đã nhập n mặt hàng · m sản phẩm* là xong; tồn kho được cộng dồn theo SKU.",
        ],
        notes: [
          { kind: "tip", text: "Sản phẩm chưa có trong danh mục? Sang **Đơn Giá → Thêm sản phẩm** để tạo trước, sau đó quay lại nhập kho." },
        ],
        mobile: [
          "Danh sách sản phẩm hiện luôn số tồn hiện tại và bộ đếm **−/+** ngay trên dòng; chỉ có ô **Ghi chú (tuỳ chọn)**, không có thông tin nhà cung cấp.",
        ],
      },
      {
        id: "nhap-sua",
        title: "Sửa hoặc xoá một phiếu nhập xăng dầu",
        when: "Khi nhập nhầm số lượng, nhầm bồn hoặc nhầm ngày.",
        steps: [
          "Mở **Nhập Kho**, ở bước 1 kéo xuống khu **Nhập gần đây** (20 phiếu xăng dầu mới nhất).",
          "Bấm **Sửa** trên dòng cần chỉnh: hộp thoại **Sửa phiếu nhập** cho phép đổi **Loại nhiên liệu**, **Số lượng (lít)**, **Ngày · giờ nhập**, **Ghi chú**. Bấm **Lưu thay đổi**.",
          "Bấm **Xoá** để bỏ phiếu; xác nhận *Xoá phiếu nhập này? Tồn kho sẽ tính lại.* Thông báo *Đã xoá phiếu nhập* là xong.",
        ],
        notes: [
          { kind: "info", text: "Chức năng sửa/xoá phiếu chỉ có trên máy tính; bản điện thoại chỉ xem lịch sử nhập gần đây." },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  {
    id: "tonkho",
    title: "Tồn kho",
    sub: "Mức bồn xăng dầu · sản phẩm bán lẻ sắp hết",
    icon: "fuel",
    color: HX.do,
    view: "tonkho",
    intro:
      "Màn hình Tồn kho có hai tab: **Xăng dầu** (số lít trong từng bồn, đọc từ cảm biến bồn bể) và **Bán lẻ** (số lượng từng sản phẩm so với mức tối thiểu).",
    tasks: [
      {
        id: "tonkho-bon",
        title: "Kiểm tra mức xăng dầu trong bồn",
        steps: [
          "Mở **Tồn Kho**, chọn tab **Xăng dầu**.",
          "Thẻ tổng quan **TỔNG TỒN n BỒN** cho biết tổng lít trên tổng dung tích, cùng thẻ **ĐÃ BÁN HÔM NAY**.",
          "Mỗi thẻ bồn hiển thị hình bồn, số lít hiện có */ dung tích*, phần trăm, các cột bơm thuộc bồn và dự báo *~n giờ / ~n ngày ở tốc độ hiện tại*.",
          "Nhãn **SẮP HẾT** (đỏ) xuất hiện khi bồn dưới 25%; **ỔN ĐỊNH** (xanh) khi còn nhiều.",
          "Nếu có bồn thấp, băng đỏ *n bồn cần đặt nhập gấp* hiện trên đầu; bấm **Ghi nhận nhập kho →** để sang màn hình Nhập kho.",
        ],
        notes: [
          { kind: "info", text: "Số liệu bồn được làm mới khi bấm **Cập nhật** trên thanh tiêu đề." },
        ],
        mobile: ["Không có băng cảnh báo và dự báo giờ; nút **Ghi nhận nhập kho** nằm cuối trang."],
      },
      {
        id: "tonkho-banle",
        title: "Xem sản phẩm bán lẻ sắp hết",
        steps: [
          "Mở **Tồn Kho**, chọn tab **Bán lẻ**.",
          "Thẻ **SẮP HẾT** cho biết bao nhiêu sản phẩm đang dưới mức tối thiểu.",
          "Lọc theo nhóm bằng chip **Tất cả**, **Dầu nhớt**, **Dầu pha xăng**, **Mỡ**, **Khác**.",
          "Trong bảng, cột **TỒN / MIN** so sánh số tồn với mức cảnh báo; dòng dưới mức có nhãn đỏ **SẮP HẾT**.",
          "Cần nhập thêm: sang **Nhập Kho → Sản phẩm bán lẻ**. Muốn đổi mức tối thiểu hoặc giá: sang **Đơn Giá**.",
        ],
        notes: [
          { kind: "info", text: "Bảng ở đây chỉ để xem. Cột *BÁN HÔM NAY* hiện chưa có số liệu." },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  {
    id: "banhang",
    title: "Bán hàng (POS)",
    sub: "Bán lẻ tại quầy · chọn khách · thanh toán · ghi nợ",
    icon: "receipt",
    color: HX.accentDark,
    view: "kho",
    intro:
      "Màn hình Bán hàng gồm lưới sản phẩm bên trái và phiếu **Hoá đơn mới** bên phải. Chọn hàng, chọn người bán và khách hàng, chọn hình thức thanh toán rồi bấm **Lưu giao dịch**.",
    tasks: [
      {
        id: "pos-ban",
        title: "Bán một đơn hàng tại quầy",
        steps: [
          "Mở **Bán Hàng** (hoặc bấm nút cam **Bán hàng** trên thanh tiêu đề).",
          "Tìm sản phẩm bằng ô **Tìm sản phẩm, mã SKU…** hoặc chip nhóm hàng. Bấm vào thẻ sản phẩm hoặc nút **+** để thêm vào hoá đơn.",
          "Trong phiếu bên phải, chỉnh số lượng bằng **−** / **+** hoặc gõ số trực tiếp; bấm **×** để bỏ một dòng, **Xoá hết** để làm trống giỏ.",
          "Kiểm tra **NGƯỜI BÁN**: nếu đang có ca mở, tên nhân viên tự điền (nhãn *CA ĐANG MỞ*). Nếu chưa mở ca, chọn người bán trong danh sách.",
          "Nhập **KHÁCH HÀNG**: gõ tên (có gợi ý từ sổ Công nợ) hoặc bấm **Khách lẻ**.",
          "Chọn **THANH TOÁN**: **Đã trả**, **1 phần** hoặc **Nợ** (xem mục bên dưới).",
          "Kiểm tra khung **TỔNG CỘNG** rồi bấm **Lưu giao dịch**. Thông báo *Đã lưu n mặt hàng (m SP) · tổng ₫* là xong; giỏ tự trống và tồn kho trừ ngay.",
        ],
        notes: [
          { kind: "warn", text: "Nút **Lưu giao dịch** bị mờ khi thiếu người bán, thiếu tên khách, hoặc số tiền trả một phần không hợp lệ. Dòng nhắc bên dưới nút cho biết còn thiếu gì." },
          { kind: "warn", text: "Sản phẩm hết hàng có nhãn **HẾT HÀNG** và không thêm được. Thêm quá số tồn sẽ báo *Chỉ còn n trong kho — không thể thêm*." },
          { kind: "tip", text: "Bấm lại vào thẻ sản phẩm đã có trong giỏ sẽ **bỏ hẳn** sản phẩm đó khỏi giỏ; muốn cộng thêm hãy dùng nút **+**." },
        ],
        mobile: [
          "Phiếu bán là bảng dính ở đáy màn hình: bấm **Xem giỏ** để mở chi tiết, **Thu lại** để đóng.",
          "Nút lưu ghi rõ số tiền: **Lưu hoá đơn · tổng ₫**. Liên kết **Xoá giỏ hàng** nằm dưới cùng.",
        ],
      },
      {
        id: "pos-khach",
        title: "Thêm khách vào đơn bán lẻ (khách quen, khách lẻ, khách mới)",
        when: "Cần ghi tên người mua, đặc biệt khi bán nợ.",
        steps: [
          "**Khách lẻ** (khách vãng lai, trả ngay): bấm nút **Khách lẻ** cạnh ô tên, chữ *Khách lẻ* được điền tự động.",
          "**Khách quen đã có trong sổ**: gõ vài chữ vào ô **KHÁCH HÀNG** và chọn tên trong danh sách gợi ý. Giao dịch sẽ gắn với hồ sơ khách đó và hiện trong **Công Nợ**.",
          "**Khách mới chưa có trong sổ**: hãy tạo hồ sơ trước tại **Công Nợ → Thêm khách quen** (nhập **Tên khách**, **Số điện thoại**, **Ghi chú** rồi bấm **Thêm khách**). Sau đó quay lại Bán hàng và chọn tên từ gợi ý.",
          "Với đơn ghi nợ, chọn **Nợ** hoặc **1 phần** ở mục **THANH TOÁN** trước khi bấm **Lưu giao dịch**.",
        ],
        notes: [
          { kind: "warn", text: "Nếu gõ một tên không có trong sổ và lưu luôn, giao dịch chỉ lưu tên dạng chữ tự do, **không** tạo hồ sơ khách quen và không theo dõi được công nợ. Vì vậy với khách mua nợ hãy tạo khách quen trước." },
          { kind: "info", text: "Tên khách vừa thêm ở Công nợ sẽ xuất hiện trong gợi ý của Bán hàng sau khi tải lại trang." },
        ],
      },
      {
        id: "pos-thanhtoan",
        title: "Thanh toán một phần hoặc ghi nợ",
        steps: [
          "Trong mục **THANH TOÁN** chọn **Đã trả** (mặc định, khách trả đủ), **1 phần** hoặc **Nợ**.",
          "Chọn **1 phần**: nhập **SỐ TIỀN ĐÃ TRẢ**; hệ thống hiển thị *Còn nợ … ₫* ngay bên dưới. Số tiền phải lớn hơn 0 và nhỏ hơn tổng.",
          "Chọn **Nợ**: toàn bộ đơn ghi nợ cho khách, số đã trả bằng 0.",
          "Bấm **Lưu giao dịch**. Khoản nợ hiện ngay trong **Công Nợ** dưới tên khách để thu sau.",
        ],
        notes: [
          { kind: "info", text: "Mỗi mặt hàng trong giỏ được lưu thành một dòng riêng, nên một hoá đơn nhiều mặt hàng sẽ hiện thành nhiều dòng trong Công nợ và Giao dịch." },
        ],
      },
      {
        id: "pos-thoigian",
        title: "Sửa ngày giờ của hoá đơn",
        when: "Ghi bù một đơn đã bán trước đó.",
        steps: [
          "Khi giỏ có hàng, nhìn dòng **Thời gian ghi nhận:** dưới phiếu (mặc định chạy theo giờ hiện tại).",
          "Bấm **Sửa**, chọn ngày giờ mong muốn trong ô chọn ngày-giờ.",
          "Muốn quay lại giờ hiện tại, bấm **Giờ hiện tại**. Sau đó lưu giao dịch như bình thường.",
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  {
    id: "congno",
    title: "Công nợ",
    sub: "Thêm khách quen · thu nợ · xem lịch sử mua",
    icon: "alert",
    color: HX.bad,
    view: "khachquen",
    intro:
      "Công nợ là sổ khách quen. Danh sách hiển thị **TỔNG MUA**, **ĐÃ TRẢ**, **CÒN NỢ** của từng khách; bấm vào một khách để xem chi tiết và ghi nhận thu tiền.",
    tasks: [
      {
        id: "congno-them",
        title: "Thêm khách quen mới",
        steps: [
          "Mở **Công Nợ**, bấm nút cam **Thêm khách quen** (điện thoại: **Thêm khách**).",
          "Nhập **TÊN KHÁCH** (bắt buộc, ví dụ *anh Công Thành*), **SỐ ĐIỆN THOẠI** và **GHI CHÚ** (ví dụ *Xưởng cơ khí, Khối 3*) nếu có.",
          "Bấm **Thêm khách**. Thông báo *Đã thêm khách quen \"tên\"* là xong.",
        ],
        notes: [
          { kind: "tip", text: "Khách vừa tạo dùng được ngay khi gán cho giao dịch xăng dầu ở màn hình Giao dịch, và hiện trong gợi ý ở Bán hàng sau khi tải lại trang." },
        ],
      },
      {
        id: "congno-thu",
        title: "Ghi nhận thu nợ",
        steps: [
          "Mở **Công Nợ**, giữ chip **Đang nợ** (mặc định) để chỉ thấy khách còn nợ; có thể gõ tên vào ô **Tìm tên khách hàng…**.",
          "Bấm vào dòng khách (hoặc liên kết **Chi tiết ›**) để mở trang chi tiết.",
          "Bấm **Ghi nhận thu nợ** (chỉ hiện khi khách còn nợ).",
          "Nhập **SỐ TIỀN THU** hoặc bấm chip nhanh **Tất cả**, **½**, **100.000**, **500.000**, **1.0 tr**. Ghi thêm **GHI CHÚ** nếu cần (ví dụ *Trả qua chuyển khoản*).",
          "Xem dòng *Sau khi thu, còn nợ … ₫* hoặc *Sau khi thu, đã trả hết ✓*, rồi bấm **Xác nhận thu**.",
          "Thông báo *Đã ghi nhận thu … ₫* là xong; khoản thu xuất hiện thành dòng **TT** trong lịch sử của ngày hôm đó.",
        ],
        notes: [
          { kind: "warn", text: "Nút **Xác nhận thu** chỉ sáng khi số tiền lớn hơn 0 và không vượt quá số đang nợ." },
        ],
      },
      {
        id: "congno-lichsu",
        title: "Xem lịch sử mua hàng của một khách",
        steps: [
          "Mở trang chi tiết khách. Phần đầu hiển thị số **CÒN NỢ** hoặc **KHÔNG NỢ**, số điện thoại, số giao dịch xăng dầu và bán lẻ.",
          "Dùng bộ lọc **Tất cả** / **Còn nợ** / **Đã trả** trong khu **Lịch sử giao dịch**.",
          "Các dòng được gom theo ngày. Thẻ **XD** là giao dịch xăng dầu, **BL** là bán lẻ, **TT** là lần thu tiền. Bên phải mỗi dòng ghi *Nợ … ₫* hoặc *Đã trả ✓*.",
          "Bấm **Quay lại danh sách** để trở về.",
        ],
        mobile: ["Không có ô tìm kiếm và các thẻ thống kê; cuộn danh sách và dùng chip lọc **Đang nợ** / **Tất cả** / **Đã trả hết**."],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  {
    id: "giaodich",
    title: "Giao dịch",
    sub: "Lọc lịch sử · gán khách hàng · đánh dấu ghi nợ cho giao dịch xăng dầu",
    icon: "receipt",
    color: HX.accent2,
    view: "tx",
    intro:
      "Màn hình Giao dịch có hai tab: **Xăng dầu** (giao dịch từ cột bơm, đồng bộ tự động) và **Bán lẻ** (đơn bán tại quầy). Giao dịch xăng dầu chỉ sửa được tên khách và trạng thái Đã trả / Ghi nợ.",
    tasks: [
      {
        id: "tx-loc",
        title: "Tìm và lọc giao dịch xăng dầu",
        steps: [
          "Mở **Giao dịch**, tab **Xăng dầu**.",
          "Gõ vào ô **Tìm mã GD, bơm, khách, số tiền…** để lọc ngay trong danh sách.",
          "Bấm chip nhiên liệu **Tất cả**, **RON95-III**, **DO 0,05S-II**, **DO 0,001S-V**.",
          "Chọn ngày cụ thể trong ô chọn ngày, hoặc bấm nút khoảng thời gian để chọn **Hôm nay**, **3 ngày qua**, **7 ngày qua**, **30 ngày qua**.",
          "Bảng gom theo ngày với cột **Mã GD**, **Giờ**, **Loại**, **Lít**, **Đơn giá**, **Bơm**, **Khách hàng**, **Thanh toán**, **Số tiền**. Dòng cuối bảng cho biết *a / b giao dịch trong khoảng đã chọn*.",
        ],
      },
      {
        id: "tx-gankhach",
        title: "Gán khách hàng hoặc ghi nợ cho một giao dịch bơm xăng",
        when: "Khách quen đổ xăng trả sau, cần gắn giao dịch vào tên khách để theo dõi nợ.",
        steps: [
          "Trong bảng (Giao dịch hoặc Trang chủ), bấm vào ô ở cột **Khách hàng** của giao dịch (đang hiện *Khách lẻ* hoặc *N/A*).",
          "Trong hộp **Khách hàng**, gõ vào ô **Chọn hoặc gõ tên...** để lọc danh sách khách quen.",
          "Chọn trạng thái **Đã trả** hoặc **Ghi nợ**.",
          "Bấm một tên trong danh sách để lưu ngay, hoặc bấm **Lưu** để lưu tên đã gõ. **Huỷ** để đóng không lưu.",
          "Giao dịch được đánh dấu chấm đỏ nếu *Ghi nợ* và hiện trong **Công Nợ** dưới tên khách.",
        ],
        notes: [
          { kind: "info", text: "Tên gõ tay không khớp khách quen sẽ được lưu dạng chữ tự do (hộp thoại báo *Không khớp khách quen nào — sẽ lưu làm tên tự do*)." },
          { kind: "tip", text: "Các gán khách hàng này được giữ nguyên sau mỗi lần bấm **Cập nhật** đồng bộ dữ liệu, bạn không cần làm lại." },
        ],
      },
      {
        id: "tx-banle",
        title: "Xem đơn bán lẻ",
        steps: [
          "Chuyển sang tab **Bán lẻ** để xem các đơn đã lưu từ màn hình Bán hàng.",
          "Bảng gồm **Khách hàng**, **Người bán**, **Sản phẩm**, **SL**, **Thành tiền**, **Đã trả**, **Trạng thái** (*Đã trả* / *Trả 1 phần* / *Ghi nợ*), **Giờ**.",
        ],
        notes: [
          { kind: "info", text: "Đơn bán lẻ sau khi lưu không sửa hoặc xoá được từ giao diện; hãy kiểm tra kỹ trước khi bấm **Lưu giao dịch**." },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  {
    id: "baocao",
    title: "Báo cáo",
    sub: "Doanh thu theo kỳ · đối soát số máy · bán hàng theo nhân viên",
    icon: "chart",
    color: HX.do,
    view: "chitiet",
    intro:
      "Báo cáo tổng hợp doanh thu, sản lượng theo kỳ và so sánh với kỳ trước. Riêng kỳ **Hôm nay** có thêm khối đối soát giữa đồng hồ tổng của cột bơm và tổng giao dịch.",
    tasks: [
      {
        id: "bc-ky",
        title: "Xem báo cáo theo kỳ",
        steps: [
          "Mở **Báo Cáo**, chọn kỳ ở dải tab: **Hôm nay**, **Tuần này**, **Tháng này**, **Quý**, **Năm**.",
          "Muốn xem một ngày trong quá khứ: bấm nút lịch (đang ghi khoảng ngày của kỳ) và chọn ngày. Toàn bộ báo cáo tính quanh ngày đó; bấm **Về hôm nay** để quay lại.",
          "Thẻ **Tổng doanh thu** hiển thị số tiền và mức chênh so với kỳ trước; các thẻ **Sản lượng**, **Giao dịch** bên cạnh.",
          "Khối **Theo loại nhiên liệu** và **Theo cột bơm** so sánh lít theo **Giao dịch** với lít theo **Số máy** và cột **Chênh lệch**.",
          "Biểu đồ **Doanh thu theo giờ / ngày / tuần / tháng**: đường liền là kỳ này, đường đứt là kỳ trước.",
          "Khối **Nhân viên** cuối trang: số lượng bán từng sản phẩm theo nhân viên trực ca và tồn kho hiện tại.",
        ],
        notes: [
          { kind: "info", text: "Màn hình này chưa có nút xuất file hoặc in. Thẻ *Lợi nhuận gộp* hiện chưa có số liệu vì chưa nhập giá vốn." },
        ],
      },
      {
        id: "bc-doisoat",
        title: "Đối soát số máy với giao dịch (kỳ Hôm nay)",
        when: "Cuối ngày, kiểm tra cột bơm nào lệch giữa đồng hồ tổng và giao dịch ghi nhận.",
        steps: [
          "Chọn tab **Hôm nay** để khối **Đối chiếu Giao dịch vs Số máy** xuất hiện.",
          "Đọc 4 thẻ tóm tắt: **Chênh lệch ròng toàn trạm**, **Cột lệch nhiều nhất**, **Khung giờ lệch lớn nhất**, **Tình trạng các cột**.",
          "Bảng từng cột bơm có cột **Số máy (ĐH)**, **Giao dịch**, **Chênh lệch**, **%** và **Trạng thái**: *Bình thường*, *Cần theo dõi*, *Vượt ngưỡng*.",
          "Bấm vào một dòng cột bơm để mở biểu đồ **Chênh lệch theo giờ** (thanh đỏ = thiếu, vàng = thừa) và danh sách khung giờ lệch nhiều nhất.",
        ],
        notes: [
          { kind: "info", text: "Ngưỡng cảnh báo mặc định: ±20 L hoặc ±1,5%. Khoảng chênh trên 200 L được đánh dấu nghi trễ hoặc lỗi đồng hồ nhưng vẫn tính vào tổng." },
          { kind: "warn", text: "Nếu báo *Chưa có dữ liệu đồng hồ để đối chiếu*, hãy bấm **Cập nhật** trên thanh tiêu đề để đồng bộ số đọc mới." },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  {
    id: "cabanhang",
    title: "Ca bán hàng",
    sub: "Nhân viên · khung ca · mở/đóng ca · lịch tuần",
    icon: "clock",
    color: HX.accent,
    view: "giaoca",
    intro:
      "Ca bán hàng quản lý ai đang trực và doanh thu tính từ lúc mở ca tới lúc đóng ca. Khi có ca đang mở, màn hình Bán hàng tự điền người bán là nhân viên trực ca.",
    tasks: [
      {
        id: "ca-nhanvien",
        title: "Thêm hoặc sửa nhân viên",
        steps: [
          "Mở **Ca Bán Hàng**, kéo xuống khu **Nhân viên**, bấm **Thêm nhân viên** (điện thoại: **+ Thêm**).",
          "Nhập **HỌ TÊN** (ít nhất 2 ký tự), chọn **VAI TRÒ** (*Chủ nhiệm*, *Trưởng ca*, *Nhân viên*, *Kế toán*), **SỐ ĐIỆN THOẠI**, **MÀU NHẬN DIỆN**. Bật **Nhân viên thời vụ (part-time)** nếu chỉ làm theo ngày.",
          "Bấm **Thêm nhân viên**. Thông báo *Đã thêm nhân viên* là xong.",
          "Muốn sửa: bấm **Chỉnh sửa** trên thẻ nhân viên (điện thoại: chạm vào thẻ). Có thể tắt công tắc **Đang hoạt động** để tạm ngưng, hoặc bấm **Xoá nhân viên**.",
        ],
        notes: [
          { kind: "warn", text: "Không thể tạm ngưng nhân viên đang trực ca. Hãy đóng ca trước." },
        ],
      },
      {
        id: "ca-khung",
        title: "Tạo khung ca cố định",
        when: "Thiết lập một lần các ca lặp mỗi ngày (ví dụ ca sáng 6h–14h).",
        steps: [
          "Trong khu **Khung ca cố định**, bấm **Thêm khung ca** (điện thoại: **+ Khung**).",
          "Đặt **TÊN KHUNG**, **GIỜ BẮT ĐẦU**, **GIỜ KẾT THÚC**, chọn **NHÂN VIÊN MẶC ĐỊNH** và **MÀU KHUNG**.",
          "Bấm **Thêm khung ca**. Bấm vào thẻ khung để chỉnh lại hoặc dùng công tắc để tạm tắt.",
        ],
        notes: [
          { kind: "info", text: "Khi một ca gắn với khung giờ đã quá giờ kết thúc, hệ thống tự đóng ca đó và tự mở ca mới theo lịch mà không hỏi lại." },
        ],
      },
      {
        id: "ca-mo",
        title: "Mở ca làm việc",
        steps: [
          "Mở **Ca Bán Hàng**. Khi chưa có ca, bấm **Mở ca mới**.",
          "Chọn **NHÂN VIÊN TRỰC CA** trong lưới thẻ.",
          "Nhập **QUỸ TIỀN MẶT ĐẦU CA** (mặc định 2.000.000 ₫, là tiền để thối lại cho khách) và **GHI CHÚ** nếu cần.",
          "Bấm **Mở ca**. Thông báo *Đã mở ca bán hàng mới* là xong; thẻ cam hiển thị *Đang mở · mã ca*, thời gian đã chạy và doanh thu tính từ lúc mở.",
        ],
        notes: [
          { kind: "tip", text: "Nhập nhầm quỹ đầu ca? Bấm **Sửa** cạnh *Quỹ đầu ca* (điện thoại: chạm ô **Quỹ đầu ca**) để chỉnh." },
        ],
      },
      {
        id: "ca-dong",
        title: "Đóng ca và kiểm két",
        steps: [
          "Bấm **Đóng ca** (nút góc phải hoặc ô hành động nhanh **Đóng ca — Kiểm két & kết thúc ca làm việc**).",
          "Đọc **TÓM TẮT CA**: *Quỹ đầu ca*, *Doanh thu tiền mặt*, *Tổng doanh thu*, *Số giao dịch*.",
          "Đếm tiền trong két và nhập vào **TIỀN MẶT THỰC TẾ CUỐI CA**. Hệ thống so với *Dự kiến* và báo **Khớp két ✓**, **Thừa … ₫** hoặc **Thiếu … ₫**.",
          "Bấm **Xác nhận đóng ca**. Ca chuyển xuống khu **Lịch sử ca** với thời lượng, số giao dịch và doanh thu.",
        ],
      },
      {
        id: "ca-lich",
        title: "Phân công nhân viên trong lịch tuần",
        when: "Đổi người trực cho một ngày cụ thể mà không đổi khung ca mặc định.",
        steps: [
          "Trong khu **Lịch ca trong tuần**, bấm vào ô giao giữa khung ca và ngày (**T2 … CN**).",
          "Chọn nhân viên trong hộp **Chọn nhân viên trực**. Ô chuyển sang nét đứt và ghi *Đã đổi*.",
          "Muốn trả về nhân viên mặc định của khung: mở lại ô đó và bấm **Khôi phục mặc định**.",
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  {
    id: "nhanvien",
    title: "Trang nhân viên & xác nhận QR",
    sub: "Giao diện rút gọn cho nhân viên · khách quét mã xác nhận nhận hàng",
    icon: "user",
    color: HX.e5,
    intro:
      "Ngoài trang quản lý chính, ứng dụng có một trang dành cho nhân viên bán hàng và một trang xác nhận đơn hàng dành cho khách.",
    tasks: [
      {
        id: "nv-trang",
        title: "Trang nhân viên /nhanvien",
        steps: [
          "Mở đường dẫn **/nhanvien** trên cùng địa chỉ máy chủ (ví dụ *https://ten-mien/nhanvien*).",
          "Trang chỉ có hai chức năng: **Bán hàng** (POS bán lẻ, thao tác giống mục Bán hàng ở trên) và **Công nợ** (theo dõi, thu nợ khách quen).",
          "Trên điện thoại, chuyển giữa hai chức năng bằng thanh tab dưới đáy; góc phải có huy hiệu *Nhân viên*.",
        ],
        notes: [
          { kind: "tip", text: "Nên cho nhân viên dùng trang này trên điện thoại để không đụng tới đơn giá, nhập kho và báo cáo." },
        ],
      },
      {
        id: "nv-qr",
        title: "Khách xác nhận đơn hàng qua mã QR",
        steps: [
          "Khách quét mã QR do hệ thống cấp và mở trang **Xác nhận đơn hàng** (đường dẫn dạng */xacnhan/mã*).",
          "Trang hiển thị **Khách hàng**, **Sản phẩm**, **Số lượng** và **Trạng thái** *Ghi nợ* nếu đơn chưa thanh toán.",
          "Khách bấm **Đồng ý** để xác nhận đã nhận hàng. Trang báo *Xác Nhận Thành Công!*; mở lại lần sau sẽ hiện *Đã Xác Nhận* kèm thời điểm.",
        ],
        notes: [
          { kind: "info", text: "Mỗi mã chỉ xác nhận được một lần. Hiện chưa có màn hình tạo mã QR trong giao diện quản lý; mã được cấp từ phía máy chủ." },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  {
    id: "faq",
    title: "Câu hỏi thường gặp",
    sub: "Xử lý các tình huống hay gặp khi mới dùng",
    icon: "help",
    color: HX.warn,
    intro: "Một số tình huống thường gặp và cách xử lý nhanh.",
    tasks: [
      {
        id: "faq-1",
        title: "Số liệu trên Trang chủ hoặc Báo cáo chưa có giao dịch mới nhất?",
        steps: [
          "Bấm **Cập nhật** trên thanh tiêu đề (máy tính) để đồng bộ từ nguồn. Việc này có thể mất vài phút, trang sẽ tự tải lại khi xong.",
          "Kiểm tra mốc *cập nhật HH:MM · ngày* ở dòng phụ dưới tên màn hình để biết dữ liệu mới tới đâu.",
        ],
      },
      {
        id: "faq-2",
        title: "Bán hàng không bấm được nút Lưu giao dịch?",
        steps: [
          "Đọc dòng nhắc dưới nút: *Hãy chọn người bán*, *Hãy nhập tên khách hàng* hoặc *Nhập số tiền đã trả (lớn hơn 0 và nhỏ hơn tổng)*.",
          "Chưa mở ca thì phải chọn người bán thủ công trong danh sách; hoặc mở ca ở **Ca Bán Hàng** để tự điền.",
        ],
      },
      {
        id: "faq-3",
        title: "Muốn thêm khách mới ngay khi đang bán hàng?",
        steps: [
          "Màn hình Bán hàng không tạo hồ sơ khách. Sang **Công Nợ → Thêm khách quen**, tạo xong quay lại chọn tên từ gợi ý (tải lại trang nếu chưa thấy).",
          "Nếu chỉ cần ghi tên mà không theo dõi nợ, gõ tên trực tiếp vào ô **KHÁCH HÀNG** hoặc bấm **Khách lẻ**.",
        ],
      },
      {
        id: "faq-4",
        title: "Nhập nhầm giá xăng dầu?",
        steps: [
          "Vào **Đơn Giá**, thẻ cột bơm có nhãn *Đã chỉnh*: bấm lại vào số giá để sửa, hoặc bấm nút **Khôi phục giá gốc** để quay về giá do cột bơm ghi nhận.",
        ],
      },
      {
        id: "faq-5",
        title: "Nhập kho nhầm số lượng?",
        steps: [
          "Với xăng dầu: vào **Nhập Kho → Nhập gần đây** (máy tính), bấm **Sửa** hoặc **Xoá** phiếu; tồn kho tự tính lại.",
          "Với sản phẩm bán lẻ: hiện chưa sửa được phiếu từ giao diện, hãy nhập bù hoặc liên hệ quản trị viên để chỉnh.",
        ],
      },
      {
        id: "faq-6",
        title: "Một số ô hiện dấu — hoặc ghi 'số liệu mẫu'?",
        steps: [
          "Các thẻ như *Lợi nhuận gộp*, *Bán hôm nay* (tồn kho bán lẻ), *Nợ lâu nhất*, *Đã thu trong tháng* chưa được nối dữ liệu; đây không phải lỗi.",
        ],
      },
    ],
  },
]

// ── Helpers ───────────────────────────────────────────────────
function stripMarks(s: string): string {
  return s.replace(/\*\*/g, "").replace(/\*/g, "")
}

/** Render "**nhãn**" thành chip nhãn UI và "*chữ*" thành chữ nghiêng. */
function Rich({ text, color }: { text: string; color?: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).filter(Boolean)
  return (
    <>
      {parts.map((p, i) => {
        if (p.startsWith("**") && p.endsWith("**")) {
          return (
            <span
              key={i}
              style={{
                display: "inline-block",
                padding: "1px 7px",
                margin: "0 1px",
                borderRadius: 6,
                fontSize: "0.92em",
                fontWeight: 600,
                color: color || HX.accent,
                background: (color || HX.accent) + "1f",
                border: `1px solid ${(color || HX.accent)}40`,
                lineHeight: 1.5,
                verticalAlign: "baseline",
              }}
            >
              {p.slice(2, -2)}
            </span>
          )
        }
        if (p.startsWith("*") && p.endsWith("*") && p.length > 2) {
          return (
            <em key={i} style={{ color: HX.text, fontStyle: "italic", opacity: 0.9 }}>
              {p.slice(1, -1)}
            </em>
          )
        }
        return <React.Fragment key={i}>{p}</React.Fragment>
      })}
    </>
  )
}

const NOTE_STYLE: Record<NoteKind, { color: string; bg: string; label: string; icon: IconName }> = {
  info: { color: HX.do, bg: "rgba(94,177,255,0.10)", label: "Lưu ý", icon: "help" },
  warn: { color: HX.warn, bg: HX.warnSoft, label: "Chú ý", icon: "alert" },
  tip: { color: HX.accent, bg: HX.accentSoft, label: "Mẹo", icon: "book" },
}

function NoteBox({ note }: { note: Note }) {
  const s = NOTE_STYLE[note.kind]
  return (
    <div
      style={{
        display: "flex",
        gap: 10,
        padding: "10px 12px",
        borderRadius: 10,
        background: s.bg,
        border: `1px solid ${s.color}33`,
        fontSize: 13,
        lineHeight: 1.55,
        color: HX.text2,
      }}
    >
      <div style={{ flexShrink: 0, marginTop: 1 }}>
        <Icon name={s.icon} size={16} color={s.color} />
      </div>
      <div>
        <span style={{ fontWeight: 700, color: s.color, marginRight: 6 }}>{s.label}:</span>
        <Rich text={note.text} color={s.color} />
      </div>
    </div>
  )
}

function StepList({ steps, color, ordered = true }: { steps: string[]; color: string; ordered?: boolean }) {
  return (
    <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
      {steps.map((s, i) => (
        <li key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
          <span
            className="hx-num"
            style={{
              flexShrink: 0,
              width: 24,
              height: 24,
              borderRadius: 8,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
              fontWeight: 700,
              color: ordered ? color : HX.text3,
              background: ordered ? color + "1f" : HX.elevated,
              border: `1px solid ${ordered ? color + "44" : HX.hairline}`,
              marginTop: 1,
            }}
          >
            {ordered ? i + 1 : "•"}
          </span>
          <span style={{ fontSize: 14, lineHeight: 1.6, color: HX.text2 }}>
            <Rich text={s} color={color} />
          </span>
        </li>
      ))}
    </ol>
  )
}

function TaskCard({
  task,
  color,
  open,
  onToggle,
}: {
  task: Task
  color: string
  open: boolean
  onToggle: () => void
}) {
  return (
    <div
      id={`hd-${task.id}`}
      style={{
        background: HX.surface,
        border: `1px solid ${open ? color + "55" : HX.hairline}`,
        borderRadius: 14,
        overflow: "hidden",
        transition: "border-color .15s",
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        className="hxw-press"
        style={{
          width: "100%",
          textAlign: "left",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          padding: "14px 16px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          color: HX.text,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-0.01em" }}>{task.title}</div>
          {task.when && (
            <div style={{ fontSize: 12.5, color: HX.text3, marginTop: 3 }}>{task.when}</div>
          )}
        </div>
        <span
          className="hx-num"
          style={{
            fontSize: 11,
            color: HX.text3,
            fontWeight: 600,
            padding: "2px 8px",
            borderRadius: 6,
            background: HX.bg,
            border: `1px solid ${HX.hairline}`,
            whiteSpace: "nowrap",
          }}
        >
          {task.steps.length} bước
        </span>
        <span
          style={{
            display: "inline-flex",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform .18s",
            color: HX.text3,
          }}
        >
          <Icon name="chevronDown" size={18} />
        </span>
      </button>

      {open && (
        <div
          style={{
            padding: "4px 16px 18px",
            borderTop: `1px solid ${HX.hairline}`,
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          <div style={{ paddingTop: 14 }}>
            <StepList steps={task.steps} color={color} />
          </div>
          {task.notes && task.notes.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {task.notes.map((n, i) => (
                <NoteBox key={i} note={n} />
              ))}
            </div>
          )}
          {task.mobile && task.mobile.length > 0 && (
            <div
              style={{
                padding: "12px 14px",
                borderRadius: 10,
                background: HX.bg,
                border: `1px dashed ${HX.hairlineStrong}`,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: HX.text3,
                  marginBottom: 8,
                }}
              >
                Trên điện thoại
              </div>
              <StepList steps={task.mobile} color={color} ordered={false} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Trang chính ───────────────────────────────────────────────
// Bố cục "mục lục ↔ nội dung": bấm một mục ở mục lục thì khung bên
// cạnh chỉ hiển thị đúng mục đó (không cuộn một trang dài).
export function HuongDanContent({ onNavigate }: HuongDanContentProps) {
  const isMobile = useIsMobile()
  const [query, setQuery] = React.useState("")
  const [active, setActive] = React.useState<string>(GUIDES[0].id)
  const [openTasks, setOpenTasks] = React.useState<Record<string, boolean>>({})
  const panelRef = React.useRef<HTMLDivElement>(null)
  const layoutRef = React.useRef<HTMLDivElement>(null)

  const q = query.trim().toLowerCase()

  // Lọc theo từ khoá: khớp tiêu đề mục, tiêu đề thao tác hoặc nội dung bước.
  const filtered = React.useMemo(() => {
    if (!q) return GUIDES
    return GUIDES.map((g) => {
      const tasks = g.tasks.filter((t) => {
        const hay = [
          g.title,
          t.title,
          t.when || "",
          ...t.steps,
          ...(t.mobile || []),
          ...(t.notes || []).map((n) => n.text),
        ]
          .map(stripMarks)
          .join(" ")
          .toLowerCase()
        return hay.includes(q)
      })
      return { ...g, tasks }
    }).filter((g) => g.tasks.length > 0)
  }, [q])

  // Khi đang tìm mà mục đang chọn không còn khớp → tự nhảy sang mục khớp đầu tiên.
  React.useEffect(() => {
    if (filtered.length === 0) return
    if (!filtered.some((g) => g.id === active)) setActive(filtered[0].id)
  }, [filtered, active])

  const activeIndex = filtered.findIndex((g) => g.id === active)
  const current = activeIndex >= 0 ? filtered[activeIndex] : undefined
  const prevGuide = activeIndex > 0 ? filtered[activeIndex - 1] : undefined
  const nextGuide = activeIndex >= 0 && activeIndex < filtered.length - 1 ? filtered[activeIndex + 1] : undefined

  const toggleTask = (id: string) =>
    setOpenTasks((m) => ({ ...m, [id]: !m[id] }))

  // Chọn mục: đổi nội dung khung bên phải và đưa khung lên đầu vùng nhìn
  // (chỉ cuộn khi đầu khung đang nằm ngoài tầm nhìn).
  const select = React.useCallback((guideId: string) => {
    setActive(guideId)
    requestAnimationFrame(() => {
      const el = layoutRef.current
      if (!el) return
      const top = el.getBoundingClientRect().top
      if (top < 64 || top > window.innerHeight * 0.5) {
        el.scrollIntoView({ behavior: "smooth", block: "start" })
      }
    })
  }, [])

  const openAllIn = (g: Guide, open: boolean) =>
    setOpenTasks((m) => {
      const next = { ...m }
      g.tasks.forEach((t) => (next[t.id] = open))
      return next
    })

  // Mobile: chip của mục đang chọn tự cuộn vào giữa dải.
  React.useEffect(() => {
    if (!isMobile) return
    const el = document.getElementById(`hd-chip-${active}`)
    el?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" })
  }, [active, isMobile])

  const totalTasks = GUIDES.reduce((n, g) => n + g.tasks.length, 0)

  const navBtn = (label: string, g: Guide | undefined, dir: "prev" | "next") => (
    <button
      type="button"
      disabled={!g}
      onClick={() => g && select(g.id)}
      className={g ? "hxw-press" : undefined}
      style={{
        flex: 1,
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: dir === "prev" ? "flex-start" : "flex-end",
        gap: 4,
        padding: "12px 14px",
        borderRadius: 12,
        background: HX.surface,
        border: `1px solid ${HX.hairline}`,
        color: HX.text,
        cursor: g ? "pointer" : "default",
        opacity: g ? 1 : 0.4,
        textAlign: dir === "prev" ? "left" : "right",
      }}
    >
      <span style={{ fontSize: 11, color: HX.text3, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>
        {label}
      </span>
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          fontSize: 13.5,
          fontWeight: 600,
          color: g ? g.color : HX.text3,
          maxWidth: "100%",
        }}
      >
        {dir === "prev" && <Icon name="chevron" size={14} color={g?.color || HX.text3} style={{ transform: "rotate(180deg)" }} />}
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g ? g.title : "—"}</span>
        {dir === "next" && <Icon name="chevron" size={14} color={g?.color || HX.text3} />}
      </span>
    </button>
  )

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Hero */}
      <div
        style={{
          borderRadius: 18,
          padding: isMobile ? "20px 18px" : "22px 28px",
          background: `linear-gradient(135deg, rgba(6,214,160,0.16) 0%, rgba(255,90,31,0.10) 100%)`,
          border: `1px solid ${HX.hairlineStrong}`,
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          gap: 18,
          alignItems: isMobile ? "stretch" : "center",
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: HX.text3,
              marginBottom: 6,
            }}
          >
            Dành cho người mới dùng
          </div>
          <div style={{ fontSize: isMobile ? 20 : 24, fontWeight: 700, letterSpacing: "-0.02em", color: HX.text }}>
            Hướng dẫn sử dụng ứng dụng
          </div>
          <div style={{ fontSize: 13.5, color: HX.text2, marginTop: 6, lineHeight: 1.55 }}>
            {GUIDES.length} mục · {totalTasks} thao tác. Chọn một mục ở {isMobile ? "dải bên dưới" : "mục lục bên trái"} để xem hướng dẫn
            từng bước ngay bên cạnh. Chữ trong khung màu là tên nút hoặc nhãn bạn sẽ thấy trong ứng dụng.
          </div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            height: 42,
            width: isMobile ? "100%" : 300,
            padding: "0 14px",
            background: HX.surface,
            border: `1px solid ${HX.hairlineStrong}`,
            borderRadius: 10,
            flexShrink: 0,
          }}
        >
          <Icon name="search" size={16} color={HX.text3} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm hướng dẫn: cập nhật giá, nhập kho, thu nợ…"
            style={{
              flex: 1,
              minWidth: 0,
              background: "transparent",
              border: "none",
              outline: "none",
              color: HX.text,
              fontSize: 13,
            }}
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              style={{ background: "transparent", border: "none", color: HX.text3, cursor: "pointer", fontSize: 16, lineHeight: 1 }}
              aria-label="Xoá tìm kiếm"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Bắt đầu nhanh */}
      {!q && (
        <section>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 600, color: HX.text, letterSpacing: "-0.01em" }}>Bắt đầu nhanh</div>
              <div style={{ fontSize: 13, color: HX.text3, marginTop: 3 }}>Thứ tự nên làm trong ngày đầu tiên · bấm để mở ngay màn hình tương ứng</div>
            </div>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(6, minmax(0, 1fr))",
              gap: 10,
            }}
          >
            {QUICK_START.map((s, i) => (
              <div
                key={s.title}
                className="hxw-press"
                onClick={() => onNavigate?.(s.view)}
                style={{
                  background: HX.surface,
                  border: `1px solid ${HX.hairline}`,
                  borderRadius: 14,
                  padding: 14,
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 10,
                      background: s.color + "22",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Icon name={s.icon} size={18} color={s.color} />
                  </div>
                  <span className="hx-num" style={{ fontSize: 11, fontWeight: 700, color: HX.text3 }}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: HX.text }}>{s.title}</div>
                  <div style={{ fontSize: 11.5, color: HX.text3, marginTop: 2 }}>{s.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Mục lục ↔ nội dung */}
      <div
        ref={layoutRef}
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "248px minmax(0, 1fr)",
          gap: 22,
          alignItems: "start",
          scrollMarginTop: 80,
        }}
      >
        {/* Mục lục */}
        {isMobile ? (
          <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, marginBottom: -8 }}>
            {filtered.map((g) => {
              const isActive = active === g.id
              return (
                <button
                  key={g.id}
                  id={`hd-chip-${g.id}`}
                  type="button"
                  onClick={() => select(g.id)}
                  style={{
                    flexShrink: 0,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "7px 12px",
                    borderRadius: 999,
                    fontSize: 12.5,
                    fontWeight: 600,
                    cursor: "pointer",
                    color: isActive ? g.color : HX.text2,
                    background: isActive ? g.color + "22" : HX.surface,
                    border: `1px solid ${isActive ? g.color + "66" : HX.hairline}`,
                  }}
                >
                  <Icon name={g.icon} size={14} color={isActive ? g.color : HX.text3} />
                  {g.title}
                </button>
              )
            })}
          </div>
        ) : (
          <nav
            style={{
              position: "sticky",
              top: 80,
              background: HX.surface,
              border: `1px solid ${HX.hairline}`,
              borderRadius: 14,
              padding: 10,
              display: "flex",
              flexDirection: "column",
              gap: 2,
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: HX.text3,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                padding: "6px 10px 8px",
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <span>Mục lục</span>
              <span className="hx-num" style={{ letterSpacing: 0 }}>
                {activeIndex >= 0 ? `${activeIndex + 1}/${filtered.length}` : `${filtered.length}`}
              </span>
            </div>
            {filtered.map((g, i) => {
              const isActive = active === g.id
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => select(g.id)}
                  className="hxw-press"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 10px",
                    borderRadius: 9,
                    cursor: "pointer",
                    textAlign: "left",
                    border: `1px solid ${isActive ? g.color + "55" : "transparent"}`,
                    background: isActive ? g.color + "1a" : "transparent",
                    color: isActive ? g.color : HX.text2,
                    fontSize: 13.5,
                    fontWeight: isActive ? 600 : 500,
                    position: "relative",
                  }}
                >
                  <span
                    className="hx-num"
                    style={{ fontSize: 10.5, color: isActive ? g.color : HX.text3, width: 16, flexShrink: 0, opacity: 0.8 }}
                  >
                    {i + 1}
                  </span>
                  <Icon name={g.icon} size={16} color={isActive ? g.color : HX.text3} strokeWidth={isActive ? 2 : 1.7} />
                  <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {g.title}
                  </span>
                  <span className="hx-num" style={{ fontSize: 11, color: isActive ? g.color : HX.text3 }}>
                    {g.tasks.length}
                  </span>
                </button>
              )
            })}
            {filtered.length === 0 && (
              <div style={{ padding: "10px 10px 6px", fontSize: 12.5, color: HX.text3 }}>Không có mục nào khớp.</div>
            )}
          </nav>
        )}

        {/* Nội dung mục đang chọn */}
        <div ref={panelRef} style={{ minWidth: 0 }}>
          {!current && (
            <div
              style={{
                padding: 40,
                textAlign: "center",
                color: HX.text3,
                background: HX.surface,
                border: `1px dashed ${HX.hairlineStrong}`,
                borderRadius: 14,
                fontSize: 14,
              }}
            >
              Không tìm thấy hướng dẫn nào cho “{query}”. Thử từ khoá khác như <em>giá</em>, <em>nhập kho</em>, <em>khách</em>, <em>ca</em>.
            </div>
          )}

          {current && (() => {
            const g = current
            const allOpen = g.tasks.every((t) => openTasks[t.id] || q.length > 0)
            return (
              <section
                key={g.id}
                style={{
                  background: HX.bg,
                  border: `1px solid ${HX.hairline}`,
                  borderRadius: 16,
                  padding: isMobile ? 14 : 20,
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                }}
              >
                <header style={{ display: "flex", alignItems: "flex-start", gap: 14, flexWrap: "wrap" }}>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      background: g.color + "22",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Icon name={g.icon} size={22} color={g.color} />
                  </div>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ fontSize: 11, color: HX.text3, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                      Mục {activeIndex + 1} / {filtered.length}
                      {q ? ` · ${g.tasks.length} thao tác khớp “${query.trim()}”` : ""}
                    </div>
                    <div style={{ fontSize: 19, fontWeight: 700, color: HX.text, letterSpacing: "-0.015em", marginTop: 2 }}>
                      {g.title}
                    </div>
                    <div style={{ fontSize: 13, color: HX.text3, marginTop: 2 }}>{g.sub}</div>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                    <button
                      type="button"
                      onClick={() => openAllIn(g, !allOpen)}
                      className="hxw-press"
                      style={{
                        height: 34,
                        padding: "0 12px",
                        borderRadius: 9,
                        background: "transparent",
                        color: HX.text2,
                        border: `1px solid ${HX.hairlineStrong}`,
                        fontSize: 12.5,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      {allOpen ? "Thu gọn" : "Mở tất cả"}
                    </button>
                    {g.view && onNavigate && (
                      <button
                        type="button"
                        onClick={() => onNavigate(g.view!)}
                        className="hxw-press"
                        style={{
                          height: 34,
                          padding: "0 12px",
                          borderRadius: 9,
                          background: g.color + "22",
                          color: g.color,
                          border: `1px solid ${g.color}55`,
                          fontSize: 12.5,
                          fontWeight: 600,
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        Mở trang
                        <Icon name="chevron" size={14} color={g.color} />
                      </button>
                    )}
                  </div>
                </header>

                <p style={{ fontSize: 14, lineHeight: 1.65, color: HX.text2, margin: 0 }}>
                  <Rich text={g.intro} color={g.color} />
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {g.tasks.map((t) => (
                    <TaskCard
                      key={t.id}
                      task={t}
                      color={g.color}
                      open={!!openTasks[t.id] || q.length > 0}
                      onToggle={() => toggleTask(t.id)}
                    />
                  ))}
                </div>

                {/* Chuyển mục trước / sau */}
                <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                  {navBtn("Mục trước", prevGuide, "prev")}
                  {navBtn("Mục tiếp theo", nextGuide, "next")}
                </div>
              </section>
            )
          })()}
        </div>
      </div>
    </div>
  )
}
