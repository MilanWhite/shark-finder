// InvestorProfileForm.tsx
import { useState, useEffect, useMemo, useCallback } from "react";
import { useAuthenticator } from "@aws-amplify/ui-react";
import { ChevronDownIcon } from "@heroicons/react/16/solid";
import apiClient, { abortAllRequests } from "../../services/api-client";
import Navbar from "../../components/Navbar/Navbar";

type InvestorFormPayload = {
  name: string;
  email: string;
  risk_tolerance: "Low" | "Medium" | "High" | null;
  industry: string | null;
  years_active: number | null;
  num_investments: number | null;
  board_seat: boolean | null;
  location: string | null;
  investment_size: number | null;
  investment_stage: "Pre-seed" | "Seed" | "Series A" | "Series B+" | "Public" | null;
  follow_on_rate: boolean | null;
  rate_of_return: string | null;
  success_rate: string | null;
  reserved_capital: string | null;
  meeting_frequency: "Weekly" | "Monthly" | "Quarterly" | null;
};

const POST_URL = "/investor/create-profile";
const EXISTS_URL = "/investor/exists";

function toIntOrNull(v: FormDataEntryValue | null): number | null {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}
function toStrOrNull(v: FormDataEntryValue | null): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}
function toBoolOrNull(v: FormDataEntryValue | null): boolean | null {
  if (v == null) return null;
  const s = String(v).trim().toLowerCase();
  if (s === "true") return true;
  if (s === "false") return false;
  return null;
}

export default function InvestorHomePage() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  // existence check state
  const [checking, setChecking] = useState(true);
  const [exists, setExists] = useState<boolean | null>(null);

  const { user } = useAuthenticator((ctx) => [ctx.user]);

  const emailFromAuth = useMemo<string | null>(() => {
    // @ts-expect-error: Amplify user shape varies
    const attrEmail = user?.attributes?.email ?? user?.signInDetails?.loginId ?? user?.username;
    return typeof attrEmail === "string" && attrEmail.includes("@") ? attrEmail : null;
  }, [user]);

  const runExistsCheck = useCallback(async () => {
    setError(null);
    setChecking(true);
    setExists(null);
    try {
      const res = await apiClient.get(EXISTS_URL);
      setExists(Boolean(res?.data?.exists));
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        err?.message ||
        "Failed to check investor existence.";
      setError(typeof msg === "string" ? msg : JSON.stringify(msg));
      // Fallback: keep exists as null; user can retry.
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    runExistsCheck();
    return () => abortAllRequests();
  }, [runExistsCheck]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setOk(false);

    if (!emailFromAuth) {
      setError("No authenticated email found. Sign in again.");
      return;
    }

    const form = e.currentTarget; // capture before await
    const fd = new FormData(form);

    const name = toStrOrNull(fd.get("name"));
    if (!name) {
      setError("Name is required.");
      return;
    }

    setSubmitting(true);

    const payload: InvestorFormPayload = {
      name,
      email: emailFromAuth,
      risk_tolerance: (toStrOrNull(fd.get("risk_tolerance")) as InvestorFormPayload["risk_tolerance"]) ?? null,
      industry: toStrOrNull(fd.get("industry")),
      years_active: toIntOrNull(fd.get("years_active")),
      num_investments: toIntOrNull(fd.get("num_investments")),
      board_seat: toBoolOrNull(fd.get("board_seat")),
      location: toStrOrNull(fd.get("location")),
      investment_size: toIntOrNull(fd.get("investment_size")),
      investment_stage: (toStrOrNull(fd.get("investment_stage")) as InvestorFormPayload["investment_stage"]) ?? null,
      follow_on_rate: toBoolOrNull(fd.get("follow_on_rate")),
      rate_of_return: toStrOrNull(fd.get("rate_of_return")),
      success_rate: toStrOrNull(fd.get("success_rate")),
      reserved_capital: toStrOrNull(fd.get("reserved_capital")),
      meeting_frequency: (toStrOrNull(fd.get("meeting_frequency")) as InvestorFormPayload["meeting_frequency"]) ?? null,
    };

    try {
      await apiClient.post(POST_URL, payload);
      setOk(true);
      form.reset();
      // Optionally re-check existence after successful creation
      await runExistsCheck();
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        err?.message ||
        "Failed to submit investor profile.";
      setError(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setSubmitting(false);
    }
  }

  // Loading page
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

  // If exists === true → plaintext page
  if (exists === true) {
    return (
      <>
        <Navbar />
        <div className="mx-auto max-w-3xl p-6">
          <pre className="text-base text-gray-900 dark:text-white">User exists</pre>
        </div>
      </>
    );
  }

  // If exists === false OR unknown because the exists check errored out, show form + any error banner
  return (
    <>
      <Navbar />
      <div className="mx-auto max-w-3xl p-6">
        <h1 className="mb-6 text-3xl font-semibold tracking-tight dark:text-white">Investor Profile</h1>

        {error && (
          <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200">
            {error}
            <div className="mt-2">
              <button
                type="button"
                onClick={runExistsCheck}
                className="rounded-md bg-gray-900 px-3 py-1 text-xs font-medium text-white hover:opacity-90 dark:bg-gray-700"
              >
                Retry check
              </button>
            </div>
          </div>
        )}

        {ok && (
          <div className="mb-4 rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200">
            Saved
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name + Email (email readonly from Amplify) */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="name" className="block text-sm/6 font-medium text-gray-900 dark:text-white">
                Name
              </label>
              <div className="mt-2">
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  placeholder="Your full name"
                  className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:placeholder:text-gray-500 dark:focus:outline-indigo-500"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm/6 font-medium text-gray-900 dark:text-white">
                Email (from account)
              </label>
              <div className="mt-2">
                <input
                  id="email"
                  type="email"
                  value={emailFromAuth ?? ""}
                  readOnly
                  placeholder="Sign in to populate"
                  className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:placeholder:text-gray-500 dark:focus:outline-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Risk Tolerance / Investment Stage / Meeting Frequency */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="risk_tolerance" className="block text-sm/6 font-medium text-gray-900 dark:text-white">
                Risk Tolerance
              </label>
              <div className="mt-2 grid grid-cols-1">
                <select
                  id="risk_tolerance"
                  name="risk_tolerance"
                  defaultValue=""
                  className="col-start-1 row-start-1 w-full appearance-none rounded-md bg-white py-1.5 pr-8 pl-3 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-indigo-600 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:*:bg-gray-800 dark:focus-visible:outline-indigo-500"
                >
                  <option value="">—</option>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
                <ChevronDownIcon
                  aria-hidden="true"
                  className="pointer-events-none col-start-1 row-start-1 mr-2 size-5 self-center justify-self-end text-gray-500 sm:size-4 dark:text-gray-400"
                />
              </div>
            </div>

            <div>
              <label htmlFor="investment_stage" className="block text-sm/6 font-medium text-gray-900 dark:text-white">
                Investment Stage
              </label>
              <div className="mt-2 grid grid-cols-1">
                <select
                  id="investment_stage"
                  name="investment_stage"
                  defaultValue=""
                  className="col-start-1 row-start-1 w-full appearance-none rounded-md bg-white py-1.5 pr-8 pl-3 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-indigo-600 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:*:bg-gray-800 dark:focus-visible:outline-indigo-500"
                >
                  <option value="">—</option>
                  <option value="Pre-seed">Pre-seed</option>
                  <option value="Seed">Seed</option>
                  <option value="Series A">Series A</option>
                  <option value="Series B+">Series B+</option>
                  <option value="Public">Public</option>
                </select>
                <ChevronDownIcon
                  aria-hidden="true"
                  className="pointer-events-none col-start-1 row-start-1 mr-2 size-5 self-center justify-self-end text-gray-500 sm:size-4 dark:text-gray-400"
                />
              </div>
            </div>

            <div>
              <label htmlFor="meeting_frequency" className="block text-sm/6 font-medium text-gray-900 dark:text-white">
                Meeting Frequency
              </label>
              <div className="mt-2 grid grid-cols-1">
                <select
                  id="meeting_frequency"
                  name="meeting_frequency"
                  defaultValue=""
                  className="col-start-1 row-start-1 w-full appearance-none rounded-md bg-white py-1.5 pr-8 pl-3 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-indigo-600 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:*:bg-gray-800 dark:focus-visible:outline-indigo-500"
                >
                  <option value="">—</option>
                  <option value="Weekly">Weekly</option>
                  <option value="Monthly">Monthly</option>
                  <option value="Quarterly">Quarterly</option>
                </select>
                <ChevronDownIcon
                  aria-hidden="true"
                  className="pointer-events-none col-start-1 row-start-1 mr-2 size-5 self-center justify-self-end text-gray-500 sm:size-4 dark:text-gray-400"
                />
              </div>
            </div>
          </div>

          {/* Industry / Location */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="industry" className="block text-sm/6 font-medium text-gray-900 dark:text-white">
                Industry
              </label>
              <div className="mt-2">
                <input
                  id="industry"
                  name="industry"
                  type="text"
                  placeholder="e.g., FinTech, HealthTech"
                  className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:placeholder:text-gray-500 dark:focus:outline-indigo-500"
                />
              </div>
            </div>

            <div>
              <label htmlFor="location" className="block text-sm/6 font-medium text-gray-900 dark:text-white">
                Location
              </label>
              <div className="mt-2">
                <input
                  id="location"
                  name="location"
                  type="text"
                  placeholder="City, Country"
                  className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:placeholder:text-gray-500 dark:focus:outline-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Numeric fields */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="years_active" className="block text-sm/6 font-medium text-gray-900 dark:text-white">
                Years Active
              </label>
              <div className="mt-2">
                <input
                  id="years_active"
                  name="years_active"
                  type="number"
                  min={0}
                  placeholder="e.g., 5"
                  className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:placeholder:text-gray-500 dark:focus:outline-indigo-500"
                />
              </div>
            </div>

            <div>
              <label htmlFor="num_investments" className="block text-sm/6 font-medium text-gray-900 dark:text-white">
                # Investments
              </label>
              <div className="mt-2">
                <input
                  id="num_investments"
                  name="num_investments"
                  type="number"
                  min={0}
                  placeholder="e.g., 20"
                  className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:placeholder:text-gray-500 dark:focus:outline-indigo-500"
                />
              </div>
            </div>

            <div>
              <label htmlFor="investment_size" className="block text-sm/6 font-medium text-gray-900 dark:text-white">
                Investment Size (USD)
              </label>
              <div className="mt-2">
                <input
                  id="investment_size"
                  name="investment_size"
                  type="number"
                  min={0}
                  placeholder="e.g., 250000"
                  className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:placeholder:text-gray-500 dark:focus:outline-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Booleans */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="board_seat" className="block text-sm/6 font-medium text-gray-900 dark:text-white">
                Board Seat
              </label>
              <div className="mt-2 grid grid-cols-1">
                <select
                  id="board_seat"
                  name="board_seat"
                  defaultValue=""
                  className="col-start-1 row-start-1 w-full appearance-none rounded-md bg-white py-1.5 pr-8 pl-3 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-indigo-600 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:*:bg-gray-800 dark:focus-visible:outline-indigo-500"
                >
                  <option value="">—</option>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
                <ChevronDownIcon
                  aria-hidden="true"
                  className="pointer-events-none col-start-1 row-start-1 mr-2 size-5 self-center justify-self-end text-gray-500 sm:size-4 dark:text-gray-400"
                />
              </div>
            </div>

            <div>
              <label htmlFor="follow_on_rate" className="block text-sm/6 font-medium text-gray-900 dark:text-white">
                Follow-On Participation
              </label>
              <div className="mt-2 grid grid-cols-1">
                <select
                  id="follow_on_rate"
                  name="follow_on_rate"
                  defaultValue=""
                  className="col-start-1 row-start-1 w-full appearance-none rounded-md bg-white py-1.5 pr-8 pl-3 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-indigo-600 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:*:bg-gray-800 dark:focus-visible:outline-indigo-500"
                >
                  <option value="">—</option>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
                <ChevronDownIcon
                  aria-hidden="true"
                  className="pointer-events-none col-start-1 row-start-1 mr-2 size-5 self-center justify-self-end text-gray-500 sm:size-4 dark:text-gray-400"
                />
              </div>
            </div>
          </div>

          {/* Free-form rate fields */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="rate_of_return" className="block text-sm/6 font-medium text-gray-900 dark:text-white">
                Rate of Return
              </label>
              <div className="mt-2">
                <input
                  id="rate_of_return"
                  name="rate_of_return"
                  type="text"
                  placeholder="e.g., 18% IRR"
                  className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:placeholder:text-gray-500 dark:focus:outline-indigo-500"
                />
              </div>
            </div>

            <div>
              <label htmlFor="success_rate" className="block text-sm/6 font-medium text-gray-900 dark:text-white">
                Success Rate
              </label>
              <div className="mt-2">
                <input
                  id="success_rate"
                  name="success_rate"
                  type="text"
                  placeholder="e.g., 30% exits"
                  className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:placeholder:text-gray-500 dark:focus:outline-indigo-500"
                />
              </div>
            </div>

            <div>
              <label htmlFor="reserved_capital" className="block text sm/6 font-medium text-gray-900 dark:text-white">
                Reserved Capital
              </label>
              <div className="mt-2">
                <input
                  id="reserved_capital"
                  name="reserved_capital"
                  type="text"
                  placeholder="e.g., 40% fund reserved"
                  className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:placeholder:text-gray-500 dark:focus:outline-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-indigo-500 dark:shadow-none dark:hover:bg-indigo-400 dark:focus-visible:outline-indigo-500"
            >
              {submitting ? "Submitting…" : "Submit"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
