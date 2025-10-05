import { useEffect, useState, useCallback } from "react";
import { signOut } from "aws-amplify/auth";
import { useNavigate } from "react-router-dom";
import apiClient from "../../services/api-client";
import Navbar from "../../components/Navbar/Navbar";
import { Globe } from "../../../frontend/src/components/ui/globe";
import { URLS } from "../../src/config/navigation";

export default function FirmHomePage() {
  const nav = useNavigate();

  const [checking, setChecking] = useState(true);
  const [exists, setExists] = useState<boolean | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const runExistsCheck = useCallback(async () => {
    setChecking(true);
    try {
      const res = await apiClient.get("/firm/exists");
      console.log(res)
      setExists(Boolean(res?.data?.exists));
    } catch (e: any) {
      // On error, treat as non-existent and proceed normally
      setExists(false);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    runExistsCheck();
  }, [runExistsCheck]);

  async function handleLogout() {
    setErr(null);
    setLoggingOut(true);
    try {
      await signOut();
      window.location.href = "/";
    } catch (e: any) {
      setErr(e?.message ?? "Logout failed");
      setLoggingOut(false);
    }
  }

  // Loading
  if (checking) {
    return (
      <>
        <Navbar />
        <div className="flex min-h-svh items-center justify-center">
          <div className="text-sm text-gray-600 dark:text-gray-300">Loading…</div>
        </div>
      </>
    );
  }

  // Exists
  if (exists === true) {
    return (
      <>
        <Navbar />
        <div className="mx-auto max-w-3xl p-6">
          <pre className="text-base text-gray-900 dark:text-white">Firm Exists</pre>
        </div>
      </>
    );
  }

  // Default (doesn’t exist)
  return (
    <>
      <Navbar />

      <div className="relative -top-16 h-[100vh] bg-white dark:bg-gray-900 overflow-hidden">
        <div className="mx-auto max-w-7xl py-24 sm:px-6 sm:py-24 lg:px-8">
          <div className="relative isolate overflow-hidden bg-gray-900 px-6 pt-16 shadow-2xl sm:rounded-3xl sm:px-16 md:pt-24 lg:flex lg:gap-x-20 lg:px-24 lg:pt-0 dark:bg-gray-800 dark:shadow-none dark:after:pointer-events-none dark:after:absolute dark:after:inset-0 dark:after:inset-ring dark:after:inset-ring-white/10 dark:after:sm:rounded-3xl">
            <svg
              viewBox="0 0 1024 1024"
              aria-hidden="true"
              className="absolute top-1/2 left-1/2 -z-10 size-256 -translate-y-1/2 mask-[radial-gradient(closest-side,white,transparent)] sm:left-full sm:-ml-80 lg:left-1/2 lg:ml-0 lg:-translate-x-1/2 lg:translate-y-0"
            >
              <circle r={512} cx={512} cy={512} fill="url(#759c1415-0410-454c-8f7c-9a820de03641)" fillOpacity="0.7" />
              <defs>
                <radialGradient id="759c1415-0410-454c-8f7c-9a820de03641">
                  <stop stopColor="#7775D6" />
                  <stop offset={1} stopColor="#E935C1" />
                </radialGradient>
              </defs>
            </svg>

            <div className="mx-auto max-w-md text-center lg:mx-0 lg:flex-auto lg:py-32 lg:text-left">
              <h2 className="text-3xl font-semibold tracking-tight text-balance text-white sm:text-4xl">
                A Great VC Investor is One Pitch Away.
              </h2>
              <p className="mt-6 text-lg/8 text-pretty text-gray-300">
                Complete your firm's pitch, and get matched to the right VCs for you - fast.
              </p>
              <div className="mt-10 flex items-center justify-center gap-x-6 lg:justify-start">
                <button
                  onClick={() => nav(URLS.record)}
                  className="rounded-md cursor-pointer bg-white px-3.5 py-2.5 text-sm font-semibold text-gray-900 shadow-xs hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white dark:bg-gray-700 dark:text-white dark:shadow-none dark:inset-ring dark:inset-ring-white/5 dark:hover:bg-gray-600 dark:focus-visible:outline-white"
                >
                  Start Pitch
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="text-sm/6 cursor-pointer font-semibold text-white hover:text-gray-100 disabled:opacity-60"
                >
                  {loggingOut ? "Logging out..." : "Log Out"}
                </button>
              </div>
              {err && (
                <div className="mt-4 text-sm text-amber-300">
                  {err}
                </div>
              )}
            </div>
          </div>
        </div>

        <Globe
          className="
            absolute z-10
            w-[170vh] top-30 left-150 aspect-square
          "
        />
      </div>
    </>
  );
}
