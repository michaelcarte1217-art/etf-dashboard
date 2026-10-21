#!/usr/bin/env python3
"""校验持仓配置文件 src/data/holdings.json 的结构与取值合理性。

在提交前跑一遍，避免把错误数据带到线上：
    python scripts/validate_holdings.py

依赖：仅 Python 标准库。
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

HOLDINGS_FILE = Path(__file__).resolve().parent.parent / "src" / "data" / "holdings.json"

CODE_PATTERN = re.compile(r"^(sh|sz)\d{6}$")


def fail(message: str) -> None:
    print(f"[FAIL] {message}")


def main() -> int:
    if not HOLDINGS_FILE.exists():
        fail(f"找不到持仓文件：{HOLDINGS_FILE}")
        return 1

    try:
        payload = json.loads(HOLDINGS_FILE.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        fail(f"JSON 解析失败：{exc}")
        return 1

    errors: list[str] = []

    for key, expected in (("currency", str), ("updatedAt", str), ("isDemo", bool), ("positions", list)):
        if key not in payload:
            errors.append(f"缺少字段：{key}")
        elif not isinstance(payload[key], expected):
            errors.append(f"字段 {key} 类型应为 {expected.__name__}")

    positions = payload.get("positions") or []
    if not positions:
        errors.append("positions 为空，至少需要一条持仓")

    seen_codes: set[str] = set()
    for index, item in enumerate(positions):
        where = f"positions[{index}]"
        if not isinstance(item, dict):
            errors.append(f"{where} 不是对象")
            continue

        code = item.get("code", "")
        if not CODE_PATTERN.fullmatch(str(code)):
            errors.append(f"{where}.code 格式应为 sh/sz + 6 位数字，实际：{code!r}")
        elif code in seen_codes:
            errors.append(f"{where}.code 重复：{code}")
        else:
            seen_codes.add(code)

        if not str(item.get("name", "")).strip():
            errors.append(f"{where}.name 不能为空")

        for field in ("shares", "costPrice"):
            value = item.get(field)
            if not isinstance(value, (int, float)) or value <= 0:
                errors.append(f"{where}.{field} 应为正数，实际：{value!r}")

        tags = item.get("tags")
        if not isinstance(tags, list):
            errors.append(f"{where}.tags 应为数组")

    if errors:
        print(f"共 {len(errors)} 项问题：")
        for item in errors:
            fail(item)
        return 1

    total_cost = sum(float(p["costPrice"]) * float(p["shares"]) for p in positions)
    print(f"[OK] 持仓校验通过：{len(positions)} 只标的，总成本约 {total_cost:,.2f} 元")
    if payload.get("isDemo"):
        print("[提示] isDemo=true，页面会显示「演示数据」标记")
    return 0


if __name__ == "__main__":
    sys.exit(main())
