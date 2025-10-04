// InvestorProfileForm.tsx
import { useState, useEffect, useMemo } from "react";
import { useAuthenticator } from "@aws-amplify/ui-react";
import apiClient, { abortAllRequests } from "../../services/api-client";

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
  investment_stage:
    | "Pre-seed"
    | "Seed"
    | "Series A"
    | "Series B+"
    | "Public"
    | null;
  follow_on_rate: boolean | null;
  rate_of_return: string | null;
  success_rate: string | null;
  reserved_capital: string | null;
  meeting_frequency: "Weekly" | "Monthly" | "Quarterly" | null;
};

const POST_URL = "/investor/create-profile";

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

  // Get the signed-in user (Amplify v6)
  const { user } = useAuthenticator((ctx) => [ctx.user]);

  // Derive email from Amplify user object
  const emailFromAuth = useMemo<string | null>(() => {
    // Prefer explicit email attribute if present
    const attrEmail =
      // @ts-expect-error Amplify User may expose attributes in some setups
      user?.attributes?.email ?? user?.signInDetails?.loginId ?? user?.username;
    return typeof attrEmail === "string" && attrEmail.includes("@")
      ? attrEmail
      : null;
  }, [user]);

  useEffect(() => {
    return () => abortAllRequests();
  }, []);

async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
  e.preventDefault();
  setError(null);
  setOk(false);

  const form = e.currentTarget; // capture now
  const fd = new FormData(form);

  setSubmitting(true);

  const payload: InvestorFormPayload = {
    name: toStrOrNull(fd.get("name")) ?? "",
    email: emailFromAuth!, // you already derived this
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
    form.reset(); // safe: we stored it
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

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="mb-6 text-3xl font-semibold tracking-tight">Investor Profile</h1>

      {error && (
        <div className="mb-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}
      {ok && (
        <div className="mb-4 rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900">
          Saved
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Row: Name + Email (email is read-only from Amplify) */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col">
            <label htmlFor="name" className="mb-1 text-sm font-medium">
              Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              className="rounded-lg border p-2 outline-none focus:ring-2"
              placeholder="Your full name"
            />
          </div>

          <div className="flex flex-col">
            <label htmlFor="email" className="mb-1 text-sm font-medium">
              Email (from account)
            </label>
            <input
              id="email"
              type="email"
              value={emailFromAuth ?? ""}
              readOnly
              className="rounded-lg border bg-gray-50 p-2 text-gray-700 outline-none"
              placeholder="Sign in to populate"
            />
          </div>
        </div>

        {/* Row: risk_tolerance, investment_stage, meeting_frequency */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="flex flex-col">
            <label htmlFor="risk_tolerance" className="mb-1 text-sm font-medium">
              Risk Tolerance
            </label>
            <select
              id="risk_tolerance"
              name="risk_tolerance"
              className="rounded-lg border bg-white p-2 outline-none focus:ring-2"
              defaultValue=""
            >
              <option value="">—</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
          </div>

          <div className="flex flex-col">
            <label htmlFor="investment_stage" className="mb-1 text-sm font-medium">
              Investment Stage
            </label>
            <select
              id="investment_stage"
              name="investment_stage"
              className="rounded-lg border bg-white p-2 outline-none focus:ring-2"
              defaultValue=""
            >
              <option value="">—</option>
              <option value="Pre-seed">Pre-seed</option>
              <option value="Seed">Seed</option>
              <option value="Series A">Series A</option>
              <option value="Series B+">Series B+</option>
              <option value="Public">Public</option>
            </select>
          </div>

          <div className="flex flex-col">
            <label htmlFor="meeting_frequency" className="mb-1 text-sm font-medium">
              Meeting Frequency
            </label>
            <select
              id="meeting_frequency"
              name="meeting_frequency"
              className="rounded-lg border bg-white p-2 outline-none focus:ring-2"
              defaultValue=""
            >
              <option value="">—</option>
              <option value="Weekly">Weekly</option>
              <option value="Monthly">Monthly</option>
              <option value="Quarterly">Quarterly</option>
            </select>
          </div>
        </div>

        {/* Row: industry, location */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col">
            <label htmlFor="industry" className="mb-1 text-sm font-medium">
              Industry
            </label>
            <input
              id="industry"
              name="industry"
              type="text"
              className="rounded-lg border p-2 outline-none focus:ring-2"
              placeholder="e.g., FinTech, HealthTech"
            />
          </div>

          <div className="flex flex-col">
            <label htmlFor="location" className="mb-1 text-sm font-medium">
              Location
            </label>
            <input
              id="location"
              name="location"
              type="text"
              className="rounded-lg border p-2 outline-none focus:ring-2"
              placeholder="City, Country"
            />
          </div>
        </div>

        {/* Row: numeric fields */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="flex flex-col">
            <label htmlFor="years_active" className="mb-1 text-sm font-medium">
              Years Active
            </label>
            <input
              id="years_active"
              name="years_active"
              type="number"
              min={0}
              className="rounded-lg border p-2 outline-none focus:ring-2"
              placeholder="e.g., 5"
            />
          </div>

          <div className="flex flex-col">
            <label htmlFor="num_investments" className="mb-1 text-sm font-medium">
              # Investments
            </label>
            <input
              id="num_investments"
              name="num_investments"
              type="number"
              min={0}
              className="rounded-lg border p-2 outline-none focus:ring-2"
              placeholder="e.g., 20"
            />
          </div>

          <div className="flex flex-col">
            <label htmlFor="investment_size" className="mb-1 text-sm font-medium">
              Investment Size (USD)
            </label>
            <input
              id="investment_size"
              name="investment_size"
              type="number"
              min={0}
              className="rounded-lg border p-2 outline-none focus:ring-2"
              placeholder="e.g., 250000"
            />
          </div>
        </div>

        {/* Row: booleans */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col">
            <label htmlFor="board_seat" className="mb-1 text-sm font-medium">
              Board Seat
            </label>
            <select
              id="board_seat"
              name="board_seat"
              className="rounded-lg border bg-white p-2 outline-none focus:ring-2"
              defaultValue=""
            >
              <option value="">—</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </div>

          <div className="flex flex-col">
            <label htmlFor="follow_on_rate" className="mb-1 text-sm font-medium">
              Follow-On Participation
            </label>
            <select
              id="follow_on_rate"
              name="follow_on_rate"
              className="rounded-lg border bg-white p-2 outline-none focus:ring-2"
              defaultValue=""
            >
              <option value="">—</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </div>
        </div>

        {/* Row: free-form rate fields */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="flex flex-col">
            <label htmlFor="rate_of_return" className="mb-1 text-sm font-medium">
              Rate of Return
            </label>
            <input
              id="rate_of_return"
              name="rate_of_return"
              type="text"
              className="rounded-lg border p-2 outline-none focus:ring-2"
              placeholder="e.g., 18% IRR"
            />
          </div>

          <div className="flex flex-col">
            <label htmlFor="success_rate" className="mb-1 text-sm font-medium">
              Success Rate
            </label>
            <input
              id="success_rate"
              name="success_rate"
              type="text"
              className="rounded-lg border p-2 outline-none focus:ring-2"
              placeholder="e.g., 30% exits"
            />
          </div>

          <div className="flex flex-col">
            <label htmlFor="reserved_capital" className="mb-1 text-sm font-medium">
              Reserved Capital
            </label>
            <input
              id="reserved_capital"
              name="reserved_capital"
              type="text"
              className="rounded-lg border p-2 outline-none focus:ring-2"
              placeholder="e.g., 40% fund reserved"
            />
          </div>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex w-full items-center justify-center rounded-xl bg-black px-5 py-3 text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-black"
          >
            {submitting ? "Submitting…" : "Submit"}
          </button>
        </div>
      </form>
    </div>
  );
}
