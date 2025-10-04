// pages/RecorderPage.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

import Navbar from "../../components/Navbar";

export default function RecorderPage() {

  // Recorder state
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  // Per-recording chunk buffer
  const chunksRef = useRef<Blob[]>([]);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [recording, setRecording] = useState(false);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // Preview modal
  const [showPreview, setShowPreview] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);

  const MAX_MS = 4 * 60_000; // 4:00

  useEffect(() => {
    return () => {
      stream?.getTracks().forEach((t) => t.stop());
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
    setUploaded(false);
    setShowPreview(false);
    chunksRef.current = [];

    if (blobUrl) {
      URL.revokeObjectURL(blobUrl);
      setBlobUrl(null);
    }

    const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
      ? "video/webm;codecs=vp9,opus"
      : MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")
      ? "video/webm;codecs=vp8,opus"
      : "video/webm";

    const mr = new MediaRecorder(stream, { mimeType: mime, bitsPerSecond: 2_000_000 });
    mediaRecorderRef.current = mr;

    mr.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
    };

    mr.onstop = () => {
      try {
        const blob = new Blob(chunksRef.current, { type: mr.mimeType });
        const url = URL.createObjectURL(blob);
        setBlobUrl(url);
        setShowPreview(true);
      } catch (e: any) {
        setErr(e?.message ?? "Failed to create preview");
      }
    };

    mr.start(1000);
    setRecording(true);

    if (MAX_MS > 0) {
      setTimeout(() => {
        if (mediaRecorderRef.current?.state === "recording") stop();
      }, MAX_MS);
    }
  }

  function stop() {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
  }

  async function submitToBackend() {
    if (!chunksRef.current.length) return;
    setUploading(true);
    setErr(null);
    try {
      const type = mediaRecorderRef.current?.mimeType ?? "video/webm";
      const file = new File(chunksRef.current, `pitch_${Date.now()}.webm`, { type });
      const postUrl = `/firm/create-profile`;

      const form = new FormData();
      form.append("file", file);

      const res = await fetch(postUrl, { method: "POST", body: form });
      if (!res.ok) throw new Error(`Upload failed: ${res.status}`);

      setUploaded(true);
    } catch (e: any) {
      setErr(e?.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen w-full bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-100">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-13">
            {/* LEFT: put title, session id, max length here (1/4) */}
            <aside className="lg:col-span-4">


                
                                <h1 className="text-3xl mb-5 font-bold tracking-tight sm:text-4xl">
                  Record Your Pitch
                </h1>   


              <section className="sticky top-6 rounded-2xl border border-gray-200 bg-gray-50 p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900/60">


                <dl className="text-sm">
                  <div className="flex items-start justify-between gap-3">

                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-gray-600 dark:text-gray-400">Max length</dt>
                    <dd className="font-medium text-gray-900 dark:text-gray-100">4:00</dd>
                  </div>
                </dl>

                <p className="mt-6 text-sm text-gray-700 dark:text-gray-300">
                  Enable the camera, record, then review and submit from the preview popup.
                </p>
              </section>
            </aside>

            {/* RIGHT: live video + controls (3/4) */}
            <main className="lg:col-span-9">
              <div className="relative overflow-hidden rounded-3xl border border-gray-200 bg-gradient-to-b from-gray-50 to-white shadow-xl dark:border-gray-800 dark:from-gray-900 dark:to-gray-950">
                <div className="p-3 sm:p-4 lg:p-6">
                  <div className="relative mx-auto w-full">
                    <div className="relative aspect-video w-full rounded-2xl bg-black ring-1 ring-inset ring-gray-900/10 dark:ring-white/10 overflow-hidden">
                      <video ref={videoRef} playsInline autoPlay muted className="h-full w-full object-cover" />
                    </div>

<div className="mt-4 flex flex-wrap gap-2">
  {/* Enable Camera — neutral / secondary */}
  <button
    onClick={initCamera}
    type="button"
    className="rounded-md cursor-pointer bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs inset-ring inset-ring-gray-300 hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 dark:bg-white/10 dark:text-white dark:shadow-none dark:inset-ring-white/5 dark:hover:bg-white/20"
  >
    Enable Camera
  </button>

  {/* Record / Stop — primary / danger */}
  {!recording ? (
    <button
      onClick={start}
      type="button"
      disabled={!stream}
      className={`rounded-md cursor-pointer px-3 py-2 text-sm font-semibold text-white shadow-xs focus-visible:outline-2 focus-visible:outline-offset-2 dark:shadow-none
        ${!stream
          ? "bg-indigo-600/60 cursor-not-allowed"
          : "bg-indigo-600 hover:bg-indigo-500 focus-visible:outline-indigo-600 dark:bg-indigo-500 dark:hover:bg-indigo-400 dark:focus-visible:outline-indigo-500"}`}
    >
      Record
    </button>
  ) : (
    <button
      onClick={stop}
      type="button"
      className="rounded-md cursor-pointer bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-red-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 dark:bg-red-500 dark:shadow-none dark:hover:bg-red-400 dark:focus-visible:outline-red-500"
    >
      Stop
    </button>
  )}

  {/* Open Preview — subtle / tertiary */}
  <button
    onClick={() => blobUrl && setShowPreview(true)}
    type="button"
    disabled={!blobUrl}
    className={`cursor-pointer rounded-md px-3 py-2 text-sm font-semibold shadow-xs focus-visible:outline-2 focus-visible:outline-offset-2
      ${!blobUrl
        ? "bg-indigo-500/60 text-indigo-50/60 cursor-not-allowed"
        : "bg-indigo-50 text-indigo-600 hover:bg-indigo-100 focus-visible:outline-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400 dark:hover:bg-indigo-500/30 dark:shadow-none"}`}
  >
    Open Preview
  </button>
</div>

                    {err && <p className="mt-3 text-sm text-red-600">{err}</p>}
                  </div>
                </div>
              </div>
            </main>
          </div>
        </div>

        {/* Preview Modal */}
        {showPreview && (
          <div
            className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4"
            role="dialog"
            aria-modal="true"
            aria-label="Recording preview"
            onKeyDown={(e) => e.key === "Escape" && setShowPreview(false)}
          >
            <div className="w-full max-w-3xl rounded-2xl border border-gray-200 bg-white p-4 shadow-2xl dark:border-gray-800 dark:bg-gray-900">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-lg font-semibold">Preview your pitch</h3>
                <button
                  onClick={() => setShowPreview(false)}
                  className="rounded-md cursor-pointer p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                  aria-label="Close preview"
                  title="Close"
                >
                  ✕
                </button>
              </div>

              <div className="overflow-hidden rounded-lg">
                {blobUrl ? (
                  <video src={blobUrl} controls className="h-auto w-full" />
                ) : (
                  <div className="flex h-60 items-center justify-center text-sm text-gray-500">
                    No preview available
                  </div>
                )}
              </div>

              <div className="mt-4 flex items-center justify-between">
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowPreview(false)}
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700"
                  >
                    Re-record
                  </button>
                  <button
                    onClick={submitToBackend}
                    disabled={uploading || uploaded || !chunksRef.current.length}
                    className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                  >
                    {uploaded ? "Submitted" : uploading ? "Submitting..." : "Submit"}
                  </button>
                </div>
              </div>

              {err && <p className="mt-3 text-sm text-red-600">{err}</p>}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
