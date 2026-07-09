/**
 * QuickEntry — a fast one-line add box with optional voice input. Types like
 * "£20 fuel" become a pending transaction instantly (offline, no AI), with the
 * category filled by your rules. Voice uses the browser's speech recognition
 * where available.
 */

import { useEffect, useRef, useState } from "react";
import { Zap, Mic, MicOff } from "lucide-react";
import { useApp, useRegionConfig } from "../contexts/AppContext";
import { createTransaction, makeSimpleSplits } from "../lib/ledger";
import { parseLine } from "../lib/quickentry/parseLine";
import { loadRules, matchRule, type CategoryRule } from "../lib/rules/rules";

export default function QuickEntry() {
  const { region } = useApp();
  const cfg = useRegionConfig();
  const [text, setText] = useState("");
  const [rules, setRules] = useState<CategoryRule[]>([]);
  const [flash, setFlash] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const recRef = useRef<any>(null);

  useEffect(() => { loadRules().then(setRules); }, []);

  const speechSupported = typeof window !== "undefined" &&
    !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  function toggleVoice() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    if (listening) { recRef.current?.stop(); setListening(false); return; }
    const rec = new SR();
    rec.lang = "en-GB";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (e: any) => setText(e.results[0][0].transcript);
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    rec.start();
    setListening(true);
  }

  async function submit() {
    const parsed = parseLine(text);
    if (!parsed) { setFlash("Couldn't read an amount — try like \"£20 fuel\"."); return; }
    if (!parsed.description.trim()) {
      setFlash("Add a few words on what it was for (e.g. \"20 fuel\"), so it files correctly.");
      return;
    }

    const rule = matchRule(parsed.description, rules);
    const ruleAcc = rule?.accountId;
    const ruleIsIncome = ruleAcc ? /^income/i.test(ruleAcc) : parsed.isIncome;
    const income = ruleAcc ? ruleIsIncome : parsed.isIncome;

    const category = ruleAcc ?? (income ? cfg.grossIncomeAccount : cfg.allowableExpensesParent);
    const debit = income ? cfg.cashAccount : category;
    const credit = income ? category : cfg.cashAccount;

    await createTransaction(
      {
        date: new Date().toISOString().slice(0, 10),
        description: parsed.description,
        pending_review: true,
      },
      makeSimpleSplits(debit, credit, parsed.amountCents),
    );

    setFlash(`Added to review: ${parsed.description}`);
    setText("");
    setTimeout(() => setFlash(null), 2500);
  }

  return (
    <div className="bg-white rounded-xl border-2 border-slate-200 p-3 space-y-2">
      <div className="flex items-center gap-2">
        <Zap className="w-4 h-4 text-brand-600" />
        <span className="text-sm font-bold text-slate-900">Quick add</span>
      </div>
      <div className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
          placeholder='e.g. "£20 fuel" or "150 client deposit"'
          className="flex-1 border-2 border-slate-300 rounded-lg px-3 py-2 text-sm"
        />
        {speechSupported && (
          <button onClick={toggleVoice} aria-label="Voice" className={`px-3 rounded-lg border-2 ${listening ? "bg-red-50 border-red-300 text-red-600" : "border-slate-300 text-slate-500"}`}>
            {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>
        )}
        <button onClick={submit} disabled={!text.trim()} className="px-4 bg-brand-600 text-white rounded-lg text-sm font-bold disabled:opacity-50">Add</button>
      </div>
      {flash && <p className="text-[11px] text-slate-500">{flash}</p>}
      <p className="text-[10px] text-slate-400">Adds to your review queue. Category is filled by your rules; you can adjust it there.</p>
    </div>
  );
}
