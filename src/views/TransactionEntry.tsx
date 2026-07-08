import { useState, useRef, useEffect } from 'react';
import { Sparkles, Camera, Upload, Type, ChevronDown, X, Loader2, GitBranch, List, CheckCircle2, Pencil } from 'lucide-react';
import { useApp, useRegionConfig } from '../contexts/AppContext';
import { useCrypto } from '../contexts/CryptoContext';
import { createTransaction, makeSimpleSplits, LedgerError } from '../lib/ledger';
import { parseWithAI, aiParsedToPendingTransaction, type AIParsedTransaction } from '../lib/ai';
import { blobToUint8Array } from '../lib/image';
import { useAttachment } from '../hooks/useAttachment';
import { db } from '../lib/db';
import { parseCurrencyInput, formatCurrency } from '../lib/currency';
import { loadRules, matchRule, type CategoryRule } from '../lib/rules/rules';
import { loadTrades, type Trade } from '../lib/trades/trades';
import Disclaimer from '../components/Disclaimer';

type EntryMode = 'ai' | 'manual';

export default function TransactionEntry() {
  const [mode, setMode]               = useState<EntryMode>('ai');
  const [aiInput, setAiInput]         = useState('');
  const [aiLoading, setAiLoading]     = useState(false);
  const [aiError, setAiError]         = useState('');
  const [parsedResult, setParsedResult] = useState<AIParsedTransaction | null>(null);
  const [pendingConfirm, setPendingConfirm] = useState<AIParsedTransaction | null>(null);
  const [splitChoice, setSplitChoice] = useState<'combined' | 'split'>('combined');

  const { region, apiKey, aiModel } = useApp();
  const cfg = useRegionConfig();
  const { encryptBlob } = useCrypto();

  const [date, setDate]                   = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription]     = useState('');
  const [amount, setAmount]               = useState('');
  const [debitAccount, setDebitAccount]   = useState(cfg.allowableExpensesParent);
  const [creditAccount, setCreditAccount] = useState(cfg.cashAccount);
  const [jobTag, setJobTag]               = useState('');
  const [isIncome, setIsIncome]           = useState(false);
  const [receiptFile, setReceiptFile]     = useState<File | null>(null);
  const [receiptImageData, setReceiptImageData] = useState<string | null>(null);
  const [submitError, setSubmitError]     = useState('');
  const [success, setSuccess]             = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { compressToWebP } = useAttachment();

  const [accounts, setAccounts] = useState<{ id: string; name: string }[]>([]);
  const [rules, setRules] = useState<CategoryRule[]>([]);
  const [ruleHint, setRuleHint] = useState<string | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [selectedTrade, setSelectedTrade] = useState<string>('');

  useEffect(() => {
    db.accounts.toArray().then((accs) => {
      setAccounts(
        accs
          .filter((a) => !a.placeholder)
          .map((a) => ({ id: a.id, name: a.name }))
          .sort((a, b) => a.name.localeCompare(b.name)),
      );
    });
  }, []);

  useEffect(() => {
    if (isIncome) {
      setDebitAccount(cfg.cashAccount);
      setCreditAccount(cfg.grossIncomeAccount);
    } else {
      setDebitAccount(cfg.allowableExpensesParent);
      setCreditAccount(cfg.cashAccount);
    }
  }, [isIncome, cfg]);

  // Categorisation rules: auto-file by description (deterministic, no AI).
  useEffect(() => {
    loadRules().then(setRules);
  }, []);

  useEffect(() => {
    loadTrades().then(setTrades);
  }, []);

  useEffect(() => {
    if (mode !== 'manual') { setRuleHint(null); return; }
    const match = description.trim() ? matchRule(description, rules) : null;
    if (!match) { setRuleHint(null); return; }
    const acc = accounts.find((a) => a.id === match.accountId);
    const inc = /^income/i.test(match.accountId) || !!acc?.name?.startsWith('Income');
    // Flip the income/expense side first if needed; the effect re-runs after.
    if (inc && !isIncome) { setIsIncome(true); return; }
    if (!inc && isIncome) { setIsIncome(false); return; }
    if (inc) setCreditAccount(match.accountId); else setDebitAccount(match.accountId);
    setRuleHint(acc?.name ?? match.accountId);
  }, [description, rules, mode, isIncome, accounts]);

  const resolveUseHighQuality = (hasImage: boolean): boolean => {
    if (aiModel === 'quality') return true;
    if (aiModel === 'economy') return false;
    return hasImage; // smart: use high quality only for images
  };

  const handleAIParse = async () => {
    if (!aiInput.trim()) return;
    setAiLoading(true);
    setAiError('');
    setParsedResult(null);

    try {
      if (!apiKey) {
        setAiError('No API key configured. Add your OpenAI key in Settings to use AI parsing.');
        return;
      }

      const hasImage = !!receiptImageData;
      const parsed = await parseWithAI({
        text:               aiInput,
        apiKey,
        region,
        imageData:          receiptImageData || undefined,
        useHighQualityModel: resolveUseHighQuality(hasImage),
      });

      // If there's a split suggestion, show the split review UI before committing
      if (parsed.split_suggestion && parsed.split_suggestion.length > 1) {
        setParsedResult(parsed);
        setSplitChoice('split');
        return;
      }

      // Otherwise, ask the user to confirm the AI-read amount before saving.
      setPendingConfirm(parsed);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'AI parsing failed. Try manual entry.';
      setAiError(msg);
    } finally {
      setAiLoading(false);
    }
  };

  const handleConfirmScanned = async () => {
    if (!pendingConfirm) return;
    try {
      const txData = aiParsedToPendingTransaction(pendingConfirm, region);
      await createTransaction({ ...txData.txFields, trade: selectedTrade || undefined }, txData.splits);
      setPendingConfirm(null);
      setAiInput('');
      setReceiptFile(null);
      setReceiptImageData(null);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e: unknown) {
      setAiError(e instanceof Error ? e.message : 'Could not save. Please try again.');
    }
  };

  const handleEditScanned = () => {
    if (!pendingConfirm) return;
    const p = pendingConfirm;
    setDescription(p.description);
    setDate(p.date);
    setAmount((p.amount / 100).toFixed(2));
    setDebitAccount(p.debit_account);
    setCreditAccount(p.credit_account);
    setJobTag(p.job_tag || '');
    setPendingConfirm(null);
    setMode('manual');
  };

  const handleCommitSplitSuggestion = async () => {
    if (!parsedResult) return;
    try {
      if (splitChoice === 'split' && parsedResult.split_suggestion && parsedResult.split_suggestion.length > 1) {
        for (const s of parsedResult.split_suggestion) {
          const splits = makeSimpleSplits(s.debit_account, s.credit_account, s.amount);
          await createTransaction({
            date:           parsedResult.date,
            description:    s.description,
            pending_review: true,
            job_tag:        s.job_tag,
            attachment_id:  undefined,
          }, splits);
        }
      } else {
        const txData = aiParsedToPendingTransaction(parsedResult, region);
        await createTransaction(txData.txFields, txData.splits);
      }
      setParsedResult(null);
      setAiInput('');
      setReceiptFile(null);
      setReceiptImageData(null);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to save transaction.';
      setAiError(msg);
    }
  };

  const handleFileSelect = async (file: File) => {
    setReceiptFile(file);
    setAiInput((prev) => prev || 'Parse the attached receipt image');
    const reader = new FileReader();
    reader.onload = (e) => setReceiptImageData(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleManualSubmit = async () => {
    setSubmitError('');
    const amountVal = parseCurrencyInput(amount);
    if (!amountVal) { setSubmitError('Please enter a valid amount.'); return; }
    if (!description.trim()) { setSubmitError('Please enter a description.'); return; }

    try {
      let attachmentId: string | undefined;

      if (receiptFile) {
        const compressed = await compressToWebP(receiptFile);
        const bytes      = await blobToUint8Array(compressed);
        const encrypted  = await encryptBlob(bytes);
        attachmentId = crypto.randomUUID();
        await db.attachments.add({
          id:             attachmentId,
          transaction_id: '',
          encrypted_iv:   encrypted.iv,
          encrypted_data: encrypted.ciphertext,
          mime_type:      'image/webp',
          created_at:     Date.now(),
        });
      }

      const splits = makeSimpleSplits(debitAccount, creditAccount, amountVal);
      await createTransaction({
        date,
        description:    description.trim(),
        pending_review: true,
        job_tag:        jobTag.trim() || undefined,
        trade:          selectedTrade || undefined,
        attachment_id:  attachmentId,
      }, splits);

      setDescription('');
      setAmount('');
      setJobTag('');
      setReceiptFile(null);
      setReceiptImageData(null);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e: unknown) {
      if (e instanceof LedgerError) setSubmitError(e.message);
      else setSubmitError('Failed to save transaction.');
    }
  };

  const modelLabel =
    aiModel === 'quality' ? 'gpt-4o (quality)'
    : aiModel === 'economy' ? 'gpt-4o-mini (economy)'
    : 'Smart routing (auto)';

  return (
    <div className="space-y-4 pb-24">
      <Disclaimer />

      {success && (
        <div className="bg-brand-50 border-2 border-brand-300 rounded-xl p-3 text-brand-800 text-sm font-semibold">
          Transaction saved to Pending Review.
        </div>
      )}

      <div className="flex bg-slate-100 rounded-xl p-1 border border-slate-200">
        <button
          onClick={() => setMode('ai')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-bold transition-all ${
            mode === 'ai' ? 'bg-white shadow text-brand-600' : 'text-slate-500'
          }`}
        >
          <Sparkles className="w-4 h-4" /> AI Parse
        </button>
        <button
          onClick={() => setMode('manual')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-bold transition-all ${
            mode === 'manual' ? 'bg-white shadow text-brand-600' : 'text-slate-500'
          }`}
        >
          <Type className="w-4 h-4" /> Manual
        </button>
      </div>

      {mode === 'ai' ? (
        <div className="space-y-3">
          {/* Confirm the AI-scanned details before saving */}
          {pendingConfirm && (
            <div className="bg-white border-2 border-brand-300 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-brand-600" />
                <p className="text-sm font-bold text-slate-900">Check the scanned details</p>
              </div>
              <p className="text-xs text-slate-500">
                The AI read this from your entry. Please confirm the <span className="font-semibold">amount</span> is correct before saving.
              </p>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Amount</p>
                <p className="text-2xl font-bold text-slate-900">{formatCurrency(pendingConfirm.amount, region)}</p>
                <div className="pt-1 space-y-0.5">
                  <p className="text-sm text-slate-700 truncate"><span className="text-slate-400">Description:</span> {pendingConfirm.description}</p>
                  <p className="text-sm text-slate-700"><span className="text-slate-400">Date:</span> {pendingConfirm.date}</p>
                  <p className="text-sm text-slate-700 truncate"><span className="text-slate-400">Category:</span> {pendingConfirm.debit_account}</p>
                </div>
              </div>

              {trades.length > 0 && (
                <select
                  value={selectedTrade}
                  onChange={(e) => setSelectedTrade(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-slate-300 rounded-lg text-sm bg-white"
                >
                  <option value="">Trade: Unassigned</option>
                  {trades.map((t) => <option key={t.id} value={t.id}>Trade: {t.name}</option>)}
                </select>
              )}

              <div className="flex gap-2">
                <button
                  onClick={handleConfirmScanned}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white py-2.5 rounded-lg text-sm font-bold transition-colors"
                >
                  <CheckCircle2 className="w-4 h-4" /> Confirm &amp; save
                </button>
                <button
                  onClick={handleEditScanned}
                  className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-semibold transition-colors"
                >
                  <Pencil className="w-4 h-4" /> Edit
                </button>
                <button
                  onClick={() => setPendingConfirm(null)}
                  className="flex items-center justify-center px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-lg transition-colors"
                  aria-label="Discard"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[10px] text-slate-400">It'll be saved to your review queue, still marked for a final check.</p>
            </div>
          )}

          {/* Split suggestion review panel */}
          {parsedResult && parsedResult.split_suggestion && parsedResult.split_suggestion.length > 1 && (
            <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-amber-700" />
                <p className="text-sm font-bold text-amber-900">Mixed Receipt Detected</p>
              </div>
              <p className="text-xs text-amber-700 font-medium">
                This receipt contains multiple transaction types. How would you like to record it?
              </p>
              <div className="flex p-0.5 bg-amber-100 rounded-lg border border-amber-200">
                <button
                  onClick={() => setSplitChoice('split')}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                    splitChoice === 'split' ? 'bg-white shadow-sm text-amber-900 border border-amber-200' : 'text-amber-600'
                  }`}
                >
                  Split into {parsedResult.split_suggestion.length} entries
                </button>
                <button
                  onClick={() => setSplitChoice('combined')}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                    splitChoice === 'combined' ? 'bg-white shadow-sm text-amber-900 border border-amber-200' : 'text-amber-600'
                  }`}
                >
                  Single entry
                </button>
              </div>

              {splitChoice === 'split' && (
                <div className="space-y-1.5">
                  {parsedResult.split_suggestion.map((s, i) => (
                    <div key={i} className="flex items-center justify-between bg-white border border-amber-200 rounded-lg px-3 py-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-slate-900 truncate">{s.description}</p>
                        <p className="text-[10px] text-slate-500 truncate">{s.debit_account}</p>
                      </div>
                      <span className="text-xs font-bold text-slate-900 ml-2">
                        {formatCurrency(s.amount, region)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={handleCommitSplitSuggestion}
                  className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-bold py-2 rounded-lg text-sm transition-colors"
                >
                  Confirm & Save
                </button>
                <button
                  onClick={() => setParsedResult(null)}
                  className="px-3 py-2 bg-white border border-amber-300 text-amber-700 rounded-lg text-sm font-semibold"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Line items panel */}
          {parsedResult && parsedResult.line_items && parsedResult.line_items.length > 0 && !parsedResult.split_suggestion && (
            <div className="bg-slate-50 border-2 border-slate-200 rounded-xl p-3 space-y-2">
              <div className="flex items-center gap-2">
                <List className="w-4 h-4 text-slate-500" />
                <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">Line Items Extracted</p>
              </div>
              {parsedResult.line_items.map((item, i) => (
                <div key={i} className="flex items-center justify-between text-xs border-b border-slate-100 pb-1.5 last:border-0 last:pb-0">
                  <div className="min-w-0 flex-1">
                    <span className="font-semibold text-slate-800">{item.description}</span>
                    {item.quantity && <span className="text-slate-400 ml-1">× {item.quantity}</span>}
                    {item.account && <p className="text-[10px] text-slate-400 truncate">{item.account}</p>}
                  </div>
                  <span className="font-bold text-slate-900 ml-2">{formatCurrency(item.total, region)}</span>
                </div>
              ))}
            </div>
          )}

          <textarea
            value={aiInput}
            onChange={(e) => { setAiInput(e.target.value); setAiError(''); }}
            placeholder='e.g. "Paid £20 for parking at terminal" or paste a receipt, invoice, or handwritten note'
            rows={3}
            className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-slate-900 resize-none font-medium"
          />

          {receiptFile && (
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
              <Camera className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <span className="text-xs font-medium text-slate-600 truncate flex-1">{receiptFile.name}</span>
              <button
                onClick={() => { setReceiptFile(null); setReceiptImageData(null); }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-4 py-2.5 border-2 border-slate-300 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors text-sm font-semibold"
            >
              <Camera className="w-4 h-4" /> Photo
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => { if (e.target.files?.[0]) handleFileSelect(e.target.files[0]); }}
            />
            <button
              onClick={handleAIParse}
              disabled={aiLoading || !aiInput.trim()}
              className="flex-1 flex items-center justify-center gap-1.5 bg-brand-500 text-white font-bold py-2.5 rounded-xl hover:bg-brand-600 transition-colors disabled:opacity-50 shadow-sm"
            >
              {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {aiLoading ? 'Parsing...' : 'Parse & Save Draft'}
            </button>
          </div>

          {/* Status line — always shows model in use */}
          <p className="text-xs text-slate-400 font-medium">
            {apiKey
              ? `Using your API key · ${modelLabel}`
              : 'Add your OpenAI key in Settings to enable AI parsing.'}
          </p>

          {aiError && (
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-3 text-red-700 text-sm font-medium">
              {aiError}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex bg-slate-100 rounded-xl p-1 border border-slate-200">
            <button
              onClick={() => setIsIncome(false)}
              className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${
                !isIncome ? 'bg-white shadow text-red-600' : 'text-slate-500'
              }`}
            >
              Expense
            </button>
            <button
              onClick={() => setIsIncome(true)}
              className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${
                isIncome ? 'bg-white shadow text-emerald-600' : 'text-slate-500'
              }`}
            >
              Income
            </button>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-800 mb-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-2.5 border-2 border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-slate-900 font-medium"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-800 mb-1">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Parking at terminal"
              className="w-full px-4 py-2.5 border-2 border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-slate-900 font-medium"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-800 mb-1">
              Amount ({cfg.currencySymbol})
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full px-4 py-2.5 border-2 border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-slate-900 font-medium"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-800 mb-1">
              {isIncome ? 'Income Account' : 'Expense Account'}
            </label>
            <div className="relative">
              <select
                value={isIncome ? creditAccount : debitAccount}
                onChange={(e) => {
                  if (isIncome) setCreditAccount(e.target.value);
                  else setDebitAccount(e.target.value);
                }}
                className="w-full px-4 py-2.5 border-2 border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-slate-900 bg-white font-medium"
              >
                {accounts
                  .filter((a) => isIncome ? a.name.startsWith('Income') : a.name.startsWith('Expenses'))
                  .map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
            {ruleHint && (
              <p className="mt-1 text-xs text-brand-600 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Auto-filled from your rule — you can change it.
              </p>
            )}
          </div>

          {trades.length > 0 && (
            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-1">Trade (optional)</label>
              <select
                value={selectedTrade}
                onChange={(e) => setSelectedTrade(e.target.value)}
                className="w-full px-4 py-2.5 border-2 border-slate-300 rounded-xl bg-white font-medium text-slate-900 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
              >
                <option value="">Unassigned</option>
                {trades.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-slate-800 mb-1">Job/Project Tag (optional)</label>
            <input
              type="text"
              value={jobTag}
              onChange={(e) => setJobTag(e.target.value)}
              placeholder="e.g. Kitchen Reno - Smith"
              className="w-full px-4 py-2.5 border-2 border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-slate-900 font-medium"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-800 mb-1">Receipt Photo (optional)</label>
            <div className="flex gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-4 py-2.5 border-2 border-slate-300 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors text-sm font-semibold"
              >
                {receiptFile ? <X className="w-4 h-4" /> : <Upload className="w-4 h-4" />}
                {receiptFile ? receiptFile.name.slice(0, 20) : 'Upload Receipt'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => { if (e.target.files?.[0]) setReceiptFile(e.target.files[0]); }}
              />
            </div>
          </div>

          {submitError && (
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-3 text-red-700 text-sm font-medium">
              {submitError}
            </div>
          )}

          <button
            onClick={handleManualSubmit}
            className="w-full bg-brand-500 text-white font-bold py-3 rounded-xl hover:bg-brand-600 transition-colors shadow-sm"
          >
            Save to Pending Review
          </button>
        </div>
      )}
    </div>
  );
}
