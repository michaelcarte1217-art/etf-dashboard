#!/usr/bin/env python3
"""从腾讯行情接口预抓日K与分时，写入 public/data/klines/ 作为静态兜底数据。

职责边界：这是**构建期的数据抓取与校验工具**，不是后端服务。
站点本身零服务端进程；该脚本只在需要刷新兜底数据时手动或定时运行。

用法：
    python scripts/fetch_klines.py

依赖：仅 Python 标准库（urllib / json / gzip），无需第三方包。
"""

from __future__ import annotations

import gzip
import json
import re
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime
from pathlib import Path

# 兜底数据覆盖的标的：持仓 + 大盘指数
CODES = ["sh000001", "sh515880", "sz159732"]

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36"

OUT_DIR = Path(__file__).resolve().parent.parent / "public" / "data" / "klines"

KLINE_URL = "https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?param={code},day,,,320,qfq"
MINUTE_URL = "https://web.ifzq.gtimg.cn/appstock/app/minute/query?code={code}"


def build_opener() -> urllib.request.OpenerDirector:
    """构造绕过系统代理的 opener。

    本机环境可能注入了 http_proxy / https_proxy（沙箱假代理），
    urllib 默认会读取它们导致请求被劫持，因此显式清空代理列表。
    """
    return urllib.request.build_opener(urllib.request.ProxyHandler({}))


OPENER = build_opener()


def fetch_json(url: str, retries: int = 3, backoff: float = 1.5) -> dict:
    """GET 一个 JSON 接口，带重试与 gzip 解压。"""
    last_error: Exception | None = None
    for attempt in range(1, retries + 1):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA, "Referer": "https://gu.qq.com/"})
            with OPENER.open(req, timeout=15) as resp:
                raw = resp.read()
                if resp.headers.get("Content-Encoding") == "gzip":
                    raw = gzip.decompress(raw)
                return json.loads(raw.decode("utf-8"))
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
            last_error = exc
            if attempt < retries:
                time.sleep(backoff * attempt)
    raise RuntimeError(f"请求失败：{url} → {last_error}")


def normalize_kline(code: str) -> list[dict]:
    """抓取并归一化日K。

    注意：前复权请求下，**指数返回键 day，ETF 返回键 qfqday**，必须兼容两者。
    原始行格式：[日期, 开, 收, 高, 低, 成交量(手)]
    """
    payload = fetch_json(KLINE_URL.format(code=code))
    node = (payload.get("data") or {}).get(code) or {}
    rows = node.get("qfqday") or node.get("day")
    if not rows:
        raise RuntimeError(f"{code} 日K数据为空")

    klines: list[dict] = []
    for row in rows:
        if not isinstance(row, list) or len(row) < 6:
            continue
        date, open_, close, high, low, volume = row[0], row[1], row[2], row[3], row[4], row[5]
        if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", str(date)):
            continue
        klines.append(
            {
                "date": str(date),
                "open": float(open_),
                "close": float(close),
                "high": float(high),
                "low": float(low),
                "volume": float(volume),
            }
        )

    validate_klines(code, klines)
    return klines


def validate_klines(code: str, klines: list[dict]) -> None:
    """校验日K：日期升序、无重复、价格关系合理。"""
    if not klines:
        raise RuntimeError(f"{code} 校验失败：数据为空")

    dates = [k["date"] for k in klines]
    if dates != sorted(dates):
        raise RuntimeError(f"{code} 校验失败：日期未按升序排列")
    if len(set(dates)) != len(dates):
        raise RuntimeError(f"{code} 校验失败：存在重复日期")

    for k in klines:
        if k["high"] < k["low"]:
            raise RuntimeError(f"{code} {k['date']} 校验失败：最高价低于最低价")
        if not (k["low"] <= k["open"] <= k["high"] and k["low"] <= k["close"] <= k["high"]):
            raise RuntimeError(f"{code} {k['date']} 校验失败：开收盘价超出高低区间")
        if k["close"] <= 0:
            raise RuntimeError(f"{code} {k['date']} 校验失败：收盘价非正")


def normalize_minute(code: str) -> dict:
    """抓取并归一化分时。原始格式："0930 0.516 434956 22443729.20" """
    payload = fetch_json(MINUTE_URL.format(code=code))
    node = ((payload.get("data") or {}).get(code) or {}).get("data") or {}
    rows = node.get("data") or []
    if not rows:
        raise RuntimeError(f"{code} 分时数据为空")

    points: list[dict] = []
    for line in rows:
        parts = str(line).split()
        if len(parts) < 3:
            continue
        try:
            price = float(parts[1])
        except ValueError:
            continue
        if price <= 0:
            continue
        points.append(
            {
                "time": parts[0],
                "price": price,
                "volume": float(parts[2]),
                "amount": float(parts[3]) if len(parts) > 3 else 0.0,
            }
        )

    if not points:
        raise RuntimeError(f"{code} 分时校验失败：解析结果为空")

    return {"date": node.get("date", ""), "points": points}


def main() -> int:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now().isoformat(timespec="seconds")
    failures: list[str] = []

    for code in CODES:
        try:
            klines = normalize_kline(code)
            kline_file = OUT_DIR / f"{code}.json"
            kline_file.write_text(
                json.dumps(
                    {"code": code, "fetchedAt": stamp, "source": KLINE_URL.format(code=code), "klines": klines},
                    ensure_ascii=False,
                    separators=(",", ":"),
                ),
                encoding="utf-8",
            )
            first, last = klines[0]["date"], klines[-1]["date"]
            print(f"[OK]   {code} 日K {len(klines)} 条（{first} ~ {last}） → {kline_file.name}")
        except Exception as exc:  # noqa: BLE001 - 逐标的容错，不因单只失败中断整体
            failures.append(f"{code} 日K：{exc}")
            print(f"[FAIL] {code} 日K：{exc}")

        try:
            minute = normalize_minute(code)
            minute_file = OUT_DIR / f"{code}-minute.json"
            minute_file.write_text(
                json.dumps(
                    {"code": code, "fetchedAt": stamp, "source": MINUTE_URL.format(code=code), **minute},
                    ensure_ascii=False,
                    separators=(",", ":"),
                ),
                encoding="utf-8",
            )
            print(f"[OK]   {code} 分时 {len(minute['points'])} 点（{minute['date']}） → {minute_file.name}")
        except Exception as exc:  # noqa: BLE001
            failures.append(f"{code} 分时：{exc}")
            print(f"[FAIL] {code} 分时：{exc}")

        # 串行请求之间留间隔，避免触发接口限流
        time.sleep(1.5)

    print()
    if failures:
        print(f"完成，但有 {len(failures)} 项失败：")
        for item in failures:
            print(f"  - {item}")
        return 1

    print(f"全部成功，输出目录：{OUT_DIR}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
