"""
Giám sát & dọn tiến trình browser trong container Python.

Bối cảnh: container chạy lâu ngày có thể cạn "slot" tiến trình (pids limit).
Khi đó Chromium chết ngay lúc khởi động với `signal=SIGTRAP` (không tạo được
thread) và Playwright báo "Target page, context or browser has been closed".

Module này đọc thẳng /proc (không phụ thuộc lệnh `ps` — image python-slim
không cài sẵn procps) nên chỉ hoạt động trên Linux; trên Windows/macOS mọi
hàm trả về rỗng một cách an toàn.
"""

import os
import signal
from collections import Counter

# Chỉ đụng tới browser do Playwright cài/khởi chạy, không đụng Chrome của người dùng
_BROWSER_MARKERS = ("ms-playwright", "playwright_chromiumdev_profile")
# Tiến trình node điều khiển browser của Playwright (python package)
_DRIVER_MARKERS = ("run-driver",)


def _clock_ticks():
    try:
        return os.sysconf("SC_CLK_TCK")
    except (ValueError, OSError, AttributeError):
        return 100


def _uptime_seconds():
    with open("/proc/uptime") as f:
        return float(f.read().split()[0])


def _list_processes():
    """Trả về list dict {pid, ppid, comm, state, threads, age, cmdline}."""
    procs = []
    if not os.path.isdir("/proc"):
        return procs
    try:
        uptime = _uptime_seconds()
    except (OSError, ValueError):
        return procs
    ticks = _clock_ticks()
    for entry in os.listdir("/proc"):
        if not entry.isdigit():
            continue
        try:
            with open(f"/proc/{entry}/stat") as f:
                stat = f.read()
            # comm có thể chứa dấu cách/ngoặc → tách theo ngoặc ngoài cùng
            comm = stat[stat.index("(") + 1:stat.rindex(")")]
            rest = stat[stat.rindex(")") + 2:].split()
            # rest[0]=state, [1]=ppid, [17]=num_threads, [19]=starttime
            try:
                with open(f"/proc/{entry}/cmdline", "rb") as f:
                    cmdline = f.read().replace(b"\0", b" ").decode("utf-8", "replace")
            except OSError:
                cmdline = ""
            procs.append({
                "pid": int(entry),
                "ppid": int(rest[1]),
                "comm": comm,
                "state": rest[0],
                "threads": int(rest[17]),
                "age": max(0.0, uptime - int(rest[19]) / ticks),
                "cmdline": cmdline,
            })
        except (OSError, ValueError, IndexError):
            continue  # tiến trình vừa thoát giữa chừng
    return procs


def reap_stale_browsers(max_age_seconds=5400, verbose=True):
    """
    Kill các tiến trình browser Playwright còn sót từ những lần chạy trước.

    - Browser mồ côi (cha đã chết → bị gán về PID 1): kill ngay, bất kể tuổi.
    - Browser / driver chạy lâu hơn max_age_seconds (mặc định 90 phút): kill,
      để không đụng một run khác đang chạy song song.

    Zombie (<defunct>) không kill được — chỉ PID 1 của container mới thu dọn
    được chúng (xem tini trong docker/python/Dockerfile).

    Returns: số tiến trình đã kill.
    """
    killed = 0
    me = os.getpid()
    for p in _list_processes():
        if p["state"] == "Z" or p["pid"] in (1, me):
            continue
        is_browser = any(m in p["cmdline"] for m in _BROWSER_MARKERS)
        is_driver = any(m in p["cmdline"] for m in _DRIVER_MARKERS) and "playwright" in p["cmdline"]
        if not (is_browser or is_driver):
            continue
        orphan_browser = is_browser and p["ppid"] == 1
        if not orphan_browser and p["age"] < max_age_seconds:
            continue
        try:
            os.kill(p["pid"], signal.SIGKILL)
            killed += 1
        except (ProcessLookupError, PermissionError):
            continue
    if killed and verbose:
        print(f"🧹 Đã dọn {killed} tiến trình browser còn sót từ lần chạy trước")
    return killed


def _read_first(paths):
    for path in paths:
        try:
            with open(path) as f:
                return f.read().strip()
        except OSError:
            continue
    return None


def _pids_cgroup_dirs():
    """Các thư mục cgroup có thể chứa pids.current/pids.max của tiến trình này."""
    dirs = []
    try:
        with open("/proc/self/cgroup") as f:
            for line in f:
                _, controllers, path = line.strip().split(":", 2)
                if controllers == "":            # cgroup v2
                    dirs.append("/sys/fs/cgroup" + path)
                elif "pids" in controllers.split(","):  # cgroup v1
                    dirs.append("/sys/fs/cgroup/pids" + path)
    except (OSError, ValueError):
        pass
    # Trong container, cgroup của chính nó thường được mount ngay tại gốc
    dirs += ["/sys/fs/cgroup", "/sys/fs/cgroup/pids"]
    return dirs


def process_pressure():
    """
    Số liệu tiến trình của container.

    Returns dict: pids_current, pids_max (None nếu không giới hạn hoặc không
    đọc được), pids_max_raw ("max" = không giới hạn, None = không đọc được),
    processes, threads, zombies, top (list (comm, threads)).
    """
    procs = _list_processes()
    by_comm = Counter()
    for p in procs:
        by_comm[p["comm"] + (" <zombie>" if p["state"] == "Z" else "")] += max(1, p["threads"])

    dirs = _pids_cgroup_dirs()
    current = _read_first([d + "/pids.current" for d in dirs])
    limit = _read_first([d + "/pids.max" for d in dirs])
    return {
        "pids_current": int(current) if current and current.isdigit() else None,
        "pids_max": int(limit) if limit and limit.isdigit() else None,
        "pids_max_raw": limit,
        "processes": len(procs),
        "threads": sum(max(1, p["threads"]) for p in procs),
        "zombies": sum(1 for p in procs if p["state"] == "Z"),
        "top": by_comm.most_common(5),
    }


def print_process_pressure(prefix="   "):
    """In chẩn đoán ngắn gọn để log của schedule tự nói lên nguyên nhân."""
    info = process_pressure()
    if not info["processes"]:
        return info  # không phải Linux / không đọc được /proc
    used = info["pids_current"] if info["pids_current"] is not None else info["threads"]
    limit = info["pids_max"]
    if limit:
        limit_txt = str(limit)
    elif info["pids_max_raw"] == "max":
        limit_txt = "không đặt ở container (có thể đặt ở cấp host)"
    else:
        limit_txt = "không đọc được"
    print(f"{prefix}📊 Tiến trình trong container: đang dùng {used} / giới hạn {limit_txt}"
          f" ({info['processes']} process, {info['zombies']} zombie)")
    if info["top"]:
        print(f"{prefix}   Nhiều nhất: " + ", ".join(f"{c}×{n}" for c, n in info["top"]))
    if limit and used >= limit * 0.9:
        print(f"{prefix}⚠️  Container gần/cạn giới hạn tiến trình → Chromium không tạo được thread.")
    if info["zombies"] >= 20:
        print(f"{prefix}⚠️  Có {info['zombies']} zombie không tự dọn được: restart container Python"
              f" để giải phóng (bản image có tini sẽ tự dọn từ lần deploy sau).")
    return info
