import threading
from collections import defaultdict
from datetime import datetime, timezone
from functools import wraps

from flask import jsonify, request

# Gemini無料枠（gemini-3.1-flash-lite の RPD 500）を守るための日次カウンタ。
# インメモリ実装のためサーバー再起動でリセットされるが、日次制限の趣旨上むしろ許容できる。

_lock = threading.Lock()
_global_counts: dict[str, int] = defaultdict(int)  # {date_str: count}  -- 全バケット合算
_ip_counts: dict[tuple[str, str, str], int] = defaultdict(int)  # {(bucket, ip, date_str): count}

GLOBAL_DAILY_LIMIT = 450  # RPD500に対して安全マージンを残す

IP_DAILY_LIMITS = {
    "transcribe": 5,
    "summarize": 10,
    "chat": 30,
}

BUCKET_LABELS = {
    "transcribe": "文字起こし",
    "summarize": "要約",
    "chat": "チャット",
}


def _today() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def _check_and_increment(bucket: str, ip: str) -> tuple[bool, str]:
    today = _today()
    ip_limit = IP_DAILY_LIMITS.get(bucket, 9999)
    label = BUCKET_LABELS.get(bucket, bucket)
    with _lock:
        if _global_counts[today] >= GLOBAL_DAILY_LIMIT:
            return False, "本日はアプリ全体の利用上限に達しました。明日また利用してください。"
        ip_key = (bucket, ip, today)
        if _ip_counts[ip_key] >= ip_limit:
            return False, f"本日の{label}のご利用回数の上限に達しました。明日また利用してください。"
        _global_counts[today] += 1
        _ip_counts[ip_key] += 1
        return True, ""


def rate_limited(bucket: str):
    """このバケットのグローバル日次上限とIP別日次上限を両方チェックするデコレータ。"""

    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            ip = request.remote_addr or "unknown"
            allowed, message = _check_and_increment(bucket, ip)
            if not allowed:
                return jsonify({"error": message}), 429
            return fn(*args, **kwargs)

        return wrapper

    return decorator
