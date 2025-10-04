// Recorder.tsx
import { useEffect, useRef, useState } from "react";

type Props = {
  postUrl?: string;              // e.g., "/api/upload"
  uploadWithPresignedUrl?: (file: File) => Promise<void>; // if using S3 direct upload
  maxMs?: number;                // optional auto-stop
};

export default function Recorder({ postUrl, uploadWithPresignedUrl, maxMs }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [chunks, setChunks] = useState<BlobPart[]>([]);
  const [recording, setRecording] = useState(false);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      // cleanup
      stream?.getTracks().forEach(t => t.stop());
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [stream, blobUrl]);

  async function initCamera() {
    setErr(null);
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 },
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
      });
      setStream(s);
      if (videoRef.current) videoRef.current.srcObject = s;
    } catch (e: any) {
      setErr(e?.message ?? "Failed to access camera/mic");
    }
  }

  function start() {
    if (!stream) return;
    setErr(null);
    setChunks([]);
    const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
      ? "video/webm;codecs=vp9,opus"
      : MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")
      ? "video/webm;codecs=vp8,opus"
      : "video/webm";

    const mr = new MediaRecorder(stream, { mimeType: mime, bitsPerSecond: 2_000_000 });
    mediaRecorderRef.current = mr;

    mr.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) setChunks(prev => [...prev, e.data]);
    };
    mr.onstop = () => {
      const blob = new Blob(chunks, { type: mr.mimeType });
      const url = URL.createObjectURL(blob);
      setBlobUrl(url);
    };
    mr.start(1000); // collect chunks every second
    setRecording(true);

    if (maxMs && maxMs > 0) {
      setTimeout(() => {
        if (mediaRecorderRef.current?.state === "recording") stop();
      }, maxMs);
    }
  }

  function stop() {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  }

  async function upload() {
    if (!chunks.length) return;
    const type = mediaRecorderRef.current?.mimeType ?? "video/webm";
    const file = new File(chunks, `pitch_${Date.now()}.webm`, { type });

    if (uploadWithPresignedUrl) {
      await uploadWithPresignedUrl(file);
      return;
    }

    if (!postUrl) {
      setErr("No upload endpoint configured");
      return;
    }

    const form = new FormData();
    form.append("file", file);
    // include any metadata you want (userId, pitchId, etc.)
    // form.append("userId", userId);

    const res = await fetch(postUrl, { method: "POST", body: form });
    if (!res.ok) setErr(`Upload failed: ${res.status}`);
  }

  return (
    <div className="mx-auto space-y-4">
      <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
        <video ref={videoRef} playsInline autoPlay muted className="h-full w-full object-cover" />
      </div>

      <div className="flex gap-2">
        <button onClick={initCamera} className="rounded-md bg-gray-700 px-3 py-2 text-white">Enable Camera</button>
        {!recording ? (
          <button onClick={start} disabled={!stream} className="rounded-md bg-green-600 px-3 py-2 text-white disabled:opacity-50">Record</button>
        ) : (
          <button onClick={stop} className="rounded-md px-3 py-2 text-white">Stop</button>
        )}
        <button onClick={upload} disabled={!chunks.length} className="rounded-md bg-indigo-600 px-3 py-2 text-white disabled:opacity-50">Upload</button>
      </div>

      {blobUrl && (
        <div className="space-y-2">
          <p className="text-sm text-gray-500">Preview</p>
          <video src={blobUrl} controls className="w-full rounded-lg" />
        </div>
      )}
      {err && <p className="text-sm text-red-600">{err}</p>}
    </div>
  );
}
