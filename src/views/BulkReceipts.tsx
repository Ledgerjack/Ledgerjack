/**
 * BulkReceipts — upload several receipt photos at once. Each is scanned by the AI
 * and added to the review queue for a glance. Processed one at a time to be gentle
 * on rate limits.
 */

import { useState } from "react";
import { ArrowLeft, Images, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { useApp } from "../contexts/AppContext";
import { createTransaction } from "../lib/ledger";
import { parseWithAI, aiParsedToPendingTransaction } from "../lib/ai";

type Status = "queued" | "processing" | "done" | "error";
interface Item { name: string; status: Status; message?: string }

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(new Error("read failed"));
    r.readAsDataURL(file);
  });
}

export default function BulkReceipts({ onBack }: { onBack: () => void }) {
  const { region, apiKey } = useApp();
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState(false);

  async function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    if (!apiKey) { setItems([{ name: "—", status: "error", message: "Add your OpenRouter key in Settings first." }]); return; }

    setBusy(true);
    const queue: Item[] = files.map((f) => ({ name: f.name, status: "queued" }));
    setItems(queue);

    for (let i = 0; i < files.length; i++) {
      setItems((prev) => prev.map((it, idx) => idx === i ? { ...it, status: "processing" } : it));
      try {
        const dataUrl = await fileToDataUrl(files[i]);
        const parsed = await parseWithAI({ text: "", apiKey, region, imageData: dataUrl, useHighQualityModel: true });
        const tx = aiParsedToPendingTransaction(parsed, region);
        await createTransaction(tx.txFields, tx.splits);
        setItems((prev) => prev.map((it, idx) => idx === i ? { ...it, status: "done" } : it));
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Couldn't read this one";
        setItems((prev) => prev.map((it, idx) => idx === i ? { ...it, status: "error", message: msg } : it));
      }
    }
    setBusy(false);
  }

  const done = items.filter((i) => i.status === "done").length;

  return (
    <div className="space-y-4 pb-24">
      <div className="flex items-center gap-2">
        <button onClick={onBack} className="p-1 -ml-1 text-slate-500"><ArrowLeft className="w-5 h-5" /></button>
        <Images className="w-5 h-5 text-brand-600" />
        <h2 className="text-lg font-bold text-slate-900">Bulk receipts</h2>
      </div>

      <p className="text-sm text-slate-500">
        Upload several receipt photos at once. Each is scanned and added to your review queue to check
        before it counts.
      </p>

      <label className="bg-white rounded-xl border-2 border-dashed border-brand-300 p-6 flex flex-col items-center gap-2 cursor-pointer">
        <Images className="w-8 h-8 text-brand-400" />
        <span className="text-sm font-semibold text-brand-600">Choose photos</span>
        <span className="text-[11px] text-slate-400">JPG or PNG · multiple allowed</span>
        <input type="file" accept="image/*" multiple onChange={onFiles} disabled={busy} className="hidden" />
      </label>

      {items.length > 0 && (
        <>
          {done > 0 && <p className="text-sm text-emerald-600 font-semibold">{done} added to your review queue.</p>}
          <div className="space-y-1.5">
            {items.map((it, i) => (
              <div key={i} className="bg-white rounded-lg border-2 border-slate-200 p-2.5 flex items-center gap-2">
                <span className="min-w-0 flex-1 text-xs text-slate-600 truncate">{it.name}</span>
                {it.status === "queued" && <span className="text-[11px] text-slate-400">Queued</span>}
                {it.status === "processing" && <Loader2 className="w-4 h-4 text-brand-500 animate-spin" />}
                {it.status === "done" && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                {it.status === "error" && <span className="flex items-center gap-1 text-[11px] text-red-500"><AlertCircle className="w-3.5 h-3.5" /> {it.message}</span>}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
