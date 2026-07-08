/**
 * HmrcCallback — finishes the HMRC OAuth connection.
 *
 * LedgerJack has no router and the vault key lives in memory, so the OAuth
 * redirect (a full page reload) lands back at the app ROOT and clears the
 * unlocked key. App.tsx therefore:
 *   1) on load, stashes ?code & ?state into sessionStorage and cleans the URL
 *   2) shows the LockScreen if needed
 *   3) once unlocked, renders THIS component to complete the token exchange
 *
 * It reads the stashed code/state, verifies state, exchanges the code for
 * tokens via the relay, stores them ENCRYPTED in the vault, then calls onDone().
 */

import { useEffect, useState } from "react";
import { exchangeCode } from "../../lib/mtd/oauth";
import { saveTokens } from "../../lib/mtd/mtdVault";

const VERIFIER_KEY = "mtd_pkce_verifier";
const STATE_KEY = "mtd_oauth_state";
const CB_CODE = "mtd_cb_code";
const CB_STATE = "mtd_cb_state";
const CB_ERROR = "mtd_cb_error";

function clearAll() {
  [VERIFIER_KEY, STATE_KEY, CB_CODE, CB_STATE, CB_ERROR].forEach((k) =>
    sessionStorage.removeItem(k)
  );
}

export default function HmrcCallback({ onDone }: { onDone: () => void }) {
  const [status, setStatus] = useState<"working" | "error">("working");
  const [message, setMessage] = useState("Finishing HMRC connection…");

  useEffect(() => {
    (async () => {
      try {
        const err = sessionStorage.getItem(CB_ERROR);
        if (err) throw new Error(`hmrc_returned_${err}`);

        const code = sessionStorage.getItem(CB_CODE);
        const returnedState = sessionStorage.getItem(CB_STATE);
        const expectedState = sessionStorage.getItem(STATE_KEY);
        const verifier = sessionStorage.getItem(VERIFIER_KEY);

        if (!code) throw new Error("missing_code");
        if (!expectedState || returnedState !== expectedState) {
          throw new Error("state_mismatch");
        }
        if (!verifier) throw new Error("missing_verifier");

        const t = await exchangeCode(code, verifier);
        await saveTokens({
          access_token: t.access_token,
          refresh_token: t.refresh_token,
          expires_at: Date.now() + t.expires_in * 1000,
          scope: t.scope,
        });

        clearAll();
        onDone();
      } catch (_e) {
        clearAll();
        setStatus("error");
        setMessage("Couldn't complete the HMRC connection. Please try again.");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex min-h-[50vh] items-center justify-center p-6 text-center">
      <div>
        <p className={status === "error" ? "text-red-600" : "text-slate-600"}>
          {message}
        </p>
        {status === "error" && (
          <button
            onClick={onDone}
            className="mt-3 inline-block text-brand-600 underline"
          >
            Back to settings
          </button>
        )}
      </div>
    </div>
  );
}
