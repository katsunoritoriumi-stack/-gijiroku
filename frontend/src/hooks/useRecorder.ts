import { useCallback, useRef, useState } from "react";
import fixWebmDuration from "fix-webm-duration";
import db from "../db";
import { useWakeLock } from "./useWakeLock";

export type RecorderState = "idle" | "requesting" | "recording" | "paused" | "error";

const MIME_CANDIDATES = ["audio/webm;codecs=opus", "audio/mp4", "audio/aac", "audio/wav"];

function pickMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "";
  return MIME_CANDIDATES.find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
}

export interface FinishedRecording {
  recordingId: string;
  blob: Blob;
  mimeType: string;
  durationSec: number;
}

export function isRecordingSupported(): boolean {
  return (
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia &&
    pickMimeType() !== ""
  );
}

export function useRecorder() {
  const [state, setState] = useState<RecorderState>("idle");
  const [elapsedSec, setElapsedSec] = useState(0);
  const [level, setLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const levelTimerRef = useRef<number | null>(null);
  const elapsedTimerRef = useRef<number | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const seqRef = useRef(0);
  const recordingIdRef = useRef<string>("");
  const mimeTypeRef = useRef<string>("");
  const startedAtRef = useRef(0);
  const pausedAccumRef = useRef(0);
  const pauseStartedAtRef = useRef(0);
  const wakeLock = useWakeLock();

  const stopLevelSampling = useCallback(() => {
    if (levelTimerRef.current !== null) {
      window.clearInterval(levelTimerRef.current);
      levelTimerRef.current = null;
    }
    setLevel(0);
  }, []);

  const startLevelSampling = useCallback((stream: MediaStream) => {
    const audioCtx = new AudioContext();
    audioCtxRef.current = audioCtx;
    const source = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);
    levelTimerRef.current = window.setInterval(() => {
      analyser.getByteFrequencyData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) sum += data[i];
      setLevel(sum / data.length / 255);
    }, 100);
  }, []);

  const startElapsedTicker = useCallback(() => {
    elapsedTimerRef.current = window.setInterval(() => {
      const now = performance.now();
      setElapsedSec((now - startedAtRef.current - pausedAccumRef.current) / 1000);
    }, 250);
  }, []);

  const stopElapsedTicker = useCallback(() => {
    if (elapsedTimerRef.current !== null) {
      window.clearInterval(elapsedTimerRef.current);
      elapsedTimerRef.current = null;
    }
  }, []);

  const start = useCallback(async () => {
    setError(null);
    setState("requesting");
    const mimeType = pickMimeType();
    if (!mimeType) {
      setError("このブラウザは録音に対応していません。音声ファイルのアップロードをご利用ください。");
      setState("error");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
      });
      streamRef.current = stream;
      mimeTypeRef.current = mimeType;
      recordingIdRef.current = crypto.randomUUID();
      chunksRef.current = [];
      seqRef.current = 0;

      const recorder = new MediaRecorder(stream, { mimeType, audioBitsPerSecond: 32000 });
      recorder.ondataavailable = (e) => {
        if (e.data.size === 0) return;
        chunksRef.current.push(e.data);
        const seq = seqRef.current++;
        db.audioChunks
          .add({
            id: `${recordingIdRef.current}-${seq}`,
            recordingId: recordingIdRef.current,
            seq,
            blob: e.data,
            mimeType: mimeTypeRef.current,
          })
          .catch((err) => console.error("チャンク保存に失敗しました", err));
      };
      recorderRef.current = recorder;

      recorder.start(10000);
      startedAtRef.current = performance.now();
      pausedAccumRef.current = 0;
      setElapsedSec(0);
      startElapsedTicker();
      startLevelSampling(stream);
      void wakeLock.request();
      setState("recording");
    } catch (err) {
      console.error(err);
      setError("マイクへのアクセスが許可されませんでした。ブラウザの設定をご確認ください。");
      setState("error");
    }
  }, [startElapsedTicker, startLevelSampling, wakeLock]);

  const pause = useCallback(() => {
    if (recorderRef.current?.state !== "recording") return;
    recorderRef.current.pause();
    pauseStartedAtRef.current = performance.now();
    stopElapsedTicker();
    stopLevelSampling();
    setState("paused");
  }, [stopElapsedTicker, stopLevelSampling]);

  const resume = useCallback(() => {
    if (recorderRef.current?.state !== "paused") return;
    recorderRef.current.resume();
    pausedAccumRef.current += performance.now() - pauseStartedAtRef.current;
    startElapsedTicker();
    if (streamRef.current) startLevelSampling(streamRef.current);
    setState("recording");
  }, [startElapsedTicker, startLevelSampling]);

  const stop = useCallback(async (): Promise<FinishedRecording | null> => {
    const recorder = recorderRef.current;
    if (!recorder || (recorder.state !== "recording" && recorder.state !== "paused")) return null;

    const finalDurationSec = (performance.now() - startedAtRef.current - pausedAccumRef.current) / 1000;

    let blob = await new Promise<Blob>((resolve) => {
      recorder.addEventListener(
        "stop",
        () => resolve(new Blob(chunksRef.current, { type: mimeTypeRef.current })),
        { once: true }
      );
      recorder.stop();
    });

    // MediaRecorderが生成するwebmはduration情報を含まないため、
    // そのままだとシークバーが機能しない（Chrome系の既知の挙動）。ここでメタデータを補正する。
    if (mimeTypeRef.current.includes("webm")) {
      try {
        blob = await fixWebmDuration(blob, finalDurationSec * 1000, { logger: false });
      } catch (err) {
        console.error("webmのduration補正に失敗しました", err);
      }
    }

    stopElapsedTicker();
    stopLevelSampling();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    if (audioCtxRef.current) {
      await audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    void wakeLock.release();

    const recordingId = recordingIdRef.current;
    db.audioChunks
      .where("recordingId")
      .equals(recordingId)
      .delete()
      .catch((err) => console.error("一時チャンクの削除に失敗しました", err));

    setState("idle");
    return { recordingId, blob, mimeType: mimeTypeRef.current, durationSec: finalDurationSec };
  }, [stopElapsedTicker, stopLevelSampling, wakeLock]);

  return { state, elapsedSec, level, error, start, pause, resume, stop };
}
