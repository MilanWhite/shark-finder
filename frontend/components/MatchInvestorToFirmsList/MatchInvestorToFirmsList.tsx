// InvestorMatchingFirmsList.tsx
import { useEffect, useState } from "react";
import { useAuthenticator } from "@aws-amplify/ui-react";
import apiClient from "../../services/api-client";

type MatchApiItem = {
  firm: {
    name: string | null;
    email: string | null;
    industry: string | null;
    location: string | null;
    image?: string | null;
  };
  match_score: number;
};

type Row = {
  name: string;
  email: string;
  industry: string | null;
  location: string | null;
  score: number;
  image?: string | null;
};

function toRow(item: MatchApiItem): Row {
  const f = item?.firm ?? {};
  return {
    name: (f.name ?? "").trim() || "Unknown",
    email: (f.email ?? "").trim() || "unknown@example.com",
    industry: f.industry ?? null,
    location: f.location ?? null,
    score: typeof item?.match_score === "number" ? item.match_score : 0,
    image: f.image ?? null,
  };
}

function initialAvatarUrl(email: string | null | undefined, size = 128) {
  const ch =
    (email?.trim()?.[0] ?? "U").toUpperCase().replace(/[^A-Z0-9]/g, "U") || "U";
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(
    ch
  )}&size=${size}&background=4f39f6&color=ffffff&bold=true`;
}

export default function InvestorMatchingFirmsList() {
  const { user, authStatus } = useAuthenticator((ctx) => [ctx.user, ctx.authStatus]);
  // Amplify v6: user.userId === Cognito sub
  const investorId = user?.userId || null;

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (authStatus === "configuring") return;

    if (!investorId) {
      setRows([]);
      setLoading(false);
      setErr("You must be signed in to load matches.");
      return;
    }

    const ac = new AbortController();
    setLoading(true);
    setErr(null);

    apiClient
      .get<MatchApiItem[]>(`/investors/${investorId}/matching-firms`, {
        signal: ac.signal as any,
      })
      .then((res) => {
        const data = Array.isArray(res?.data) ? res.data : [];
        setRows(data.map(toRow));
      })
      .catch((e: any) => {
        if (e?.name !== "CanceledError" && e?.code !== "ERR_CANCELED") {
          setErr(e?.response?.data?.detail ?? e?.message ?? "Request failed");
        }
      })
      .finally(() => setLoading(false));

    return () => ac.abort();
  }, [investorId, authStatus]);

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-3xl mb-5 font-bold tracking-tight sm:text-4xl">
            Your Startup Matches
          </h1>
        </div>
      </div>

      {err && (
        <div className="mb-4 rounded-md border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
          {err}
        </div>
      )}

      <div className="flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <table className="relative min-w-full divide-y divide-gray-300 dark:divide-white/15">
              <thead>
                <tr>
                  <th className="py-3.5 pr-3 pl-4 text-left text-sm font-semibold text-gray-900 sm:pl-0 dark:text-white">
                    Name
                  </th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">
                    Industry
                  </th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">
                    Match Score
                  </th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">
                    Location
                  </th>
                  <th className="py-3.5 pr-4 pl-3 sm:pr-0">
                    <span className="sr-only">Contact</span>
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200 bg-white dark:divide-white/10 dark:bg-gray-900">
                {loading ? (
                  <tr>
                    <td className="py-5 pr-3 pl-4 text-sm sm:pl-0" colSpan={5}>
                      <div className="flex items-center gap-3">
                        <div className="size-5 animate-spin rounded-full border-2 border-gray-300 border-t-transparent dark:border-white/20 dark:border-t-transparent" />
                        <span className="text-gray-500 dark:text-gray-400">Loading matches…</span>
                      </div>
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td className="py-5 pr-3 pl-4 text-sm sm:pl-0 text-gray-500 dark:text-gray-400" colSpan={5}>
                      No matches found.
                    </td>
                  </tr>
                ) : (
                  rows.map((firm) => {
                    const avatar = initialAvatarUrl(firm.email, 128);
                    return (
                      <tr key={firm.email}>
                        <td className="py-5 pr-3 pl-4 text-sm whitespace-nowrap sm:pl-0">
                          <div className="flex items-center">
                            <div className="size-11 shrink-0">
                              <a
                                href={avatar}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-block"
                                title={`Open avatar for ${firm.email}`}
                              >
                                <img
                                  alt={`${firm.name} avatar`}
                                  src={avatar}
                                  className="size-11 rounded-full object-cover dark:outline dark:outline-white/10"
                                />
                              </a>
                            </div>
                            <div className="ml-4">
                              <div className="font-medium text-gray-900 dark:text-white">{firm.name}</div>
                              <div className="mt-1 text-gray-500 dark:text-gray-400">{firm.email}</div>
                            </div>
                          </div>
                        </td>

                        <td className="px-3 py-5 text-sm whitespace-nowrap text-gray-500 dark:text-gray-400">
                          <div className="text-gray-900 dark:text-white">{firm.industry ?? "—"}</div>
                          <div className="mt-1 text-gray-500 dark:text-gray-400">Focus</div>
                        </td>

                        <td className="px-3 py-5 text-sm whitespace-nowrap text-gray-500 dark:text-gray-400">
                          <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20 dark:bg-green-900/30 dark:text-green-400 dark:ring-green-500/50">
                            {Math.round(firm.score)}
                          </span>
                        </td>

                        <td className="px-3 py-5 text-sm whitespace-nowrap text-gray-500 dark:text-gray-400">
                          {firm.location ?? "—"}
                        </td>

                        <td className="py-5 pr-4 pl-3 text-right text-sm font-medium whitespace-nowrap sm:pr-0">
                          <a
                            href={`mailto:${firm.email}`}
                            className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                          >
                            Contact<span className="sr-only">, {firm.name}</span>
                          </a>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
