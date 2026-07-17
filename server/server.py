import io
import json
import logging
import os
import time

from dotenv import load_dotenv
from flask import Flask, Response, jsonify, request, stream_with_context
from flask_cors import CORS
from google import genai
from google.genai import types
from werkzeug.middleware.proxy_fix import ProxyFix

from prompts import CHAT_SYSTEM_INSTRUCTION, SUMMARIZE_INSTRUCTION, TRANSCRIBE_INSTRUCTION
from ratelimit import rate_limited

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

# ローカルでは .env から読み込む（Render では環境変数が直接セットされるため無視される）
load_dotenv()

app = Flask(__name__)
app.json.ensure_ascii = False
# Render はリバースプロキシ配下のため、実クライアントIPを request.remote_addr に反映させる
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1)

# 未設定時は空リスト＝どのオリジンにもCORSヘッダを許可しない（フェイルクローズ）
ALLOWED_ORIGINS = [o.strip() for o in os.environ.get("ALLOWED_ORIGINS", "").split(",") if o.strip()]
CORS(app, origins=ALLOWED_ORIGINS)

# 会議録音（最大90分想定）を受けられるようボディ上限を確保しつつ、上限を明示してGemini無料枠を守る
app.config["MAX_CONTENT_LENGTH"] = 65 * 1024 * 1024  # 65MB

GENAI_API_KEY = os.environ.get("GENAI_API_KEY")
if not GENAI_API_KEY:
    raise RuntimeError("GENAI_API_KEY を .env に設定してください")

# gemini-3.1-flash-lite は無料枠RPDが500。このアプリ専用の新規GCPプロジェクト/キーで運用する想定
GEN_MODEL = os.environ.get("GEN_MODEL", "gemini-3.1-flash-lite")
INLINE_LIMIT_BYTES = 15 * 1024 * 1024  # これ以下はinline dataで直接送る、超えたらFiles API

client = genai.Client(api_key=GENAI_API_KEY)

MAX_TRANSCRIPT_CHARS = 30000  # 90分の会議でも十分な余裕を持たせた上限（不正リクエスト対策）

# フラットな構造に留める（深いネストはMAX_TOKENS暴走の原因になりうるため避ける）
SUMMARY_SCHEMA = types.Schema(
    type=types.Type.OBJECT,
    properties={
        "summary": types.Schema(type=types.Type.STRING),
        "key_points": types.Schema(type=types.Type.ARRAY, items=types.Schema(type=types.Type.STRING)),
        "action_items": types.Schema(
            type=types.Type.ARRAY,
            items=types.Schema(
                type=types.Type.OBJECT,
                properties={
                    "task": types.Schema(type=types.Type.STRING),
                    "assignee": types.Schema(type=types.Type.STRING),
                    "due": types.Schema(type=types.Type.STRING),
                },
                required=["task"],
            ),
        ),
    },
    required=["summary", "key_points", "action_items"],
)


def sse(obj) -> str:
    """Server-Sent Events の1メッセージにエンコードする。"""
    return "data: " + json.dumps(obj, ensure_ascii=False) + "\n\n"


@app.route("/warmup", methods=["GET"])
def warmup():
    return jsonify({"status": "ok"})


def _wait_for_active(uploaded: types.File, timeout_sec: float = 60) -> types.File:
    file = uploaded
    start = time.time()
    while file.state == types.FileState.PROCESSING:
        if time.time() - start > timeout_sec:
            raise TimeoutError("音声ファイルの処理がタイムアウトしました")
        time.sleep(1.5)
        file = client.files.get(name=file.name)
    if file.state == types.FileState.FAILED:
        raise RuntimeError("音声ファイルの処理に失敗しました")
    return file


@app.route("/api/transcribe", methods=["POST"])
@rate_limited("transcribe")
def transcribe():
    if "audio" not in request.files:
        return jsonify({"error": "audio ファイルが必要です"}), 400
    audio_file = request.files["audio"]
    audio_bytes = audio_file.read()
    if not audio_bytes:
        return jsonify({"error": "空のファイルです"}), 400

    mime_type = audio_file.mimetype or "audio/webm"

    def generate():
        uploaded_name = None
        try:
            if len(audio_bytes) <= INLINE_LIMIT_BYTES:
                audio_part = types.Part.from_bytes(data=audio_bytes, mime_type=mime_type)
            else:
                uploaded = client.files.upload(
                    file=io.BytesIO(audio_bytes),
                    config={"mime_type": mime_type},
                )
                uploaded_name = uploaded.name
                audio_part = _wait_for_active(uploaded)

            full_text_parts = []
            for chunk in client.models.generate_content_stream(
                model=GEN_MODEL,
                contents=[audio_part, TRANSCRIBE_INSTRUCTION],
            ):
                if chunk.text:
                    full_text_parts.append(chunk.text)
                    yield sse({"type": "delta", "text": chunk.text})

            yield sse({"type": "done", "text": "".join(full_text_parts)})

        except Exception as e:
            logging.error("文字起こしエラー: %s", e, exc_info=True)
            yield sse({"type": "error", "message": "文字起こしに失敗しました。しばらく待ってから再度お試しください"})
        finally:
            if uploaded_name:
                try:
                    client.files.delete(name=uploaded_name)
                except Exception:
                    logging.warning("アップロード済みファイルの削除に失敗しました: %s", uploaded_name)

    headers = {
        "Cache-Control": "no-cache",
        "X-Accel-Buffering": "no",
        "Connection": "keep-alive",
    }
    return Response(stream_with_context(generate()), mimetype="text/event-stream", headers=headers)


@app.route("/api/summarize", methods=["POST"])
@rate_limited("summarize")
def summarize():
    data = request.get_json(silent=True) or {}
    transcript = (data.get("transcript") or "").strip()
    if not transcript:
        return jsonify({"error": "transcript が必要です"}), 400
    if len(transcript) > MAX_TRANSCRIPT_CHARS:
        return jsonify({"error": "文字起こしが長すぎます"}), 400

    try:
        resp = client.models.generate_content(
            model=GEN_MODEL,
            contents=[SUMMARIZE_INSTRUCTION, transcript],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=SUMMARY_SCHEMA,
            ),
        )
        result = json.loads(resp.text)
    except Exception as e:
        logging.error("要約エラー: %s", e, exc_info=True)
        return jsonify({"error": "要約に失敗しました。しばらく待ってから再度お試しください"}), 500

    return jsonify(result)


@app.route("/api/chat", methods=["POST"])
@rate_limited("chat")
def chat():
    data = request.get_json(silent=True) or {}
    transcript = (data.get("transcript") or "").strip()
    question = (data.get("question") or "").strip()
    history = data.get("history") or []

    if not transcript:
        return jsonify({"error": "transcript が必要です"}), 400
    if not question:
        return jsonify({"error": "question が必要です"}), 400
    if len(transcript) > MAX_TRANSCRIPT_CHARS:
        return jsonify({"error": "文字起こしが長すぎます"}), 400
    if len(question) > 1000:
        return jsonify({"error": "質問は1000文字以内で入力してください"}), 400

    system_instruction = f"{CHAT_SYSTEM_INSTRUCTION}\n\n--- 会議の文字起こし ---\n{transcript}"

    contents = []
    for turn in history[-20:]:  # 直近分のみ使用（無制限のコンテキスト膨張を防ぐ）
        role = "user" if turn.get("role") == "user" else "model"
        text = (turn.get("text") or "").strip()
        if text:
            contents.append(types.Content(role=role, parts=[types.Part(text=text)]))
    contents.append(types.Content(role="user", parts=[types.Part(text=question)]))

    def generate():
        try:
            full_text_parts = []
            for chunk in client.models.generate_content_stream(
                model=GEN_MODEL,
                contents=contents,
                config=types.GenerateContentConfig(system_instruction=system_instruction),
            ):
                if chunk.text:
                    full_text_parts.append(chunk.text)
                    yield sse({"type": "delta", "text": chunk.text})
            yield sse({"type": "done", "text": "".join(full_text_parts)})
        except Exception as e:
            logging.error("チャットエラー: %s", e, exc_info=True)
            yield sse({"type": "error", "message": "回答の生成に失敗しました。しばらく待ってから再度お試しください"})

    headers = {
        "Cache-Control": "no-cache",
        "X-Accel-Buffering": "no",
        "Connection": "keep-alive",
    }
    return Response(stream_with_context(generate()), mimetype="text/event-stream", headers=headers)


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5951))
    app.run(host="0.0.0.0", port=port, debug=True)
