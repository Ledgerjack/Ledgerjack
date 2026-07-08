import { useState, useEffect } from 'react';
import { Image, X, Loader2, Lock, Eye } from 'lucide-react';
import { db, loadWithSplits, type TransactionWithSplits } from '../lib/db';
import { useApp } from '../contexts/AppContext';
import { useCrypto } from '../contexts/CryptoContext';
import { formatCurrency } from '../lib/currency';
import { useAttachment } from '../hooks/useAttachment';

type SortMode = 'date' | 'merchant' | 'category';

export default function FileCabinet() {
  const [transactions, setTransactions] = useState<TransactionWithSplits[]>([]);
  const [sortMode, setSortMode] = useState<SortMode>('date');
  const [decryptedPreviews, setDecryptedPreviews] = useState<Record<string, string>>({});
  const [decryptingId, setDecryptingId] = useState<string | null>(null);
  const [zoomedUrl, setZoomedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { region } = useApp();
  const { decryptBlob } = useCrypto();
  const { createTrackedUrl } = useAttachment();

  useEffect(() => { loadTransactions(); }, []);

  const loadTransactions = async () => {
    setLoading(true);
    const txns = await db.transactions.filter((tx) => !!tx.attachment_id).toArray();
    const withSplits = await loadWithSplits(txns);
    setTransactions(withSplits);
    setLoading(false);
  };

  const handleDecrypt = async (tx: DBTransaction) => {
    if (!tx.attachment_id || decryptedPreviews[tx.id]) return;
    setDecryptingId(tx.id);
    try {
      const att = await db.attachments.get(tx.attachment_id);
      if (!att) return;
      const decrypted = await decryptBlob(att.encrypted_iv, att.encrypted_data);
      const blob = new Blob([decrypted], { type: att.mime_type });
      const url = createTrackedUrl(blob);
      setDecryptedPreviews((prev) => ({ ...prev, [tx.id]: url }));
    } catch {
      // decryption failed — card stays sealed
    } finally {
      setDecryptingId(null);
    }
  };

  const sorted = [...transactions].sort((a, b) => {
    switch (sortMode) {
      case 'date': return b.date.localeCompare(a.date);
      case 'merchant': return a.description.localeCompare(b.description);
      case 'category': {
        const aDebit = a.splits.find((s) => s.amount > 0)?.account_id || '';
        const bDebit = b.splits.find((s) => s.amount > 0)?.account_id || '';
        return aDebit.localeCompare(bDebit);
      }
    }
  });

  return (
    <div className="space-y-4 pb-24">
      {/* Full-screen zoom modal */}
      {zoomedUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setZoomedUrl(null)}
        >
          <button className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
          <img src={zoomedUrl} alt="Receipt" className="max-w-full max-h-[88vh] rounded-xl shadow-2xl" />
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">File Cabinet</h2>
          <p className="text-xs text-slate-400 font-medium">Tap a card to unlock its receipt in memory</p>
        </div>
        <div className="flex bg-slate-100 rounded-lg p-0.5 border border-slate-200">
          {(['date', 'merchant', 'category'] as SortMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setSortMode(mode)}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                sortMode === mode ? 'bg-white shadow text-slate-900' : 'text-slate-500'
              }`}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
        </div>
      ) : sorted.length === 0 ? (
        <div className="bg-white rounded-xl border-2 border-slate-200 p-8 text-center">
          <Image className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-900 font-bold">No receipts yet</p>
          <p className="text-slate-400 text-sm mt-1">Attach receipt photos when creating transactions.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {sorted.map((tx) => {
            const debitSplit = tx.splits.find((s) => s.amount > 0);
            const previewUrl = decryptedPreviews[tx.id] ?? null;
            const isDecrypting = decryptingId === tx.id;
            const isUnlocked = !!previewUrl;

            return (
              <div
                key={tx.id}
                className="bg-white rounded-xl border-2 border-slate-200 p-3 flex flex-col gap-2 hover:border-brand-200 hover:shadow-md transition-all"
              >
                {/* Thumbnail */}
                <div className="w-full aspect-square bg-slate-50 border border-slate-100 rounded-lg overflow-hidden relative flex items-center justify-center">
                  {isUnlocked ? (
                    <>
                      <img
                        src={previewUrl}
                        alt="Receipt"
                        className="w-full h-full object-cover"
                      />
                      <button
                        onClick={() => setZoomedUrl(previewUrl)}
                        className="absolute bottom-1.5 right-1.5 w-7 h-7 bg-black/50 hover:bg-black/70 text-white rounded-lg flex items-center justify-center transition-colors"
                        title="View full size"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </>
                  ) : (
                    <div className="text-center px-2">
                      <Lock className="w-5 h-5 text-slate-300 mx-auto mb-1" />
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Sealed</span>
                      <span className="text-[9px] text-slate-300 font-mono block mt-0.5 truncate">
                        {tx.attachment_id?.slice(0, 8)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Metadata */}
                <div>
                  <p className="text-sm font-semibold text-slate-900 truncate">{tx.description}</p>
                  <p className="text-xs text-slate-400 mt-0.5 font-medium">{tx.date}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs font-bold text-slate-900">
                      {formatCurrency(debitSplit?.amount || 0, region)}
                    </span>
                    {tx.job_tag && (
                      <span className="text-[10px] bg-brand-50 text-brand-700 px-1.5 py-0.5 rounded-full truncate max-w-[64px] font-semibold border border-brand-200">
                        {tx.job_tag}
                      </span>
                    )}
                  </div>
                </div>

                {/* Action */}
                {isUnlocked ? (
                  <span className="block text-center text-[10px] font-bold text-brand-700 bg-brand-50 border border-brand-200 py-1 rounded-lg uppercase tracking-wider">
                    Active in Memory
                  </span>
                ) : (
                  <button
                    onClick={() => handleDecrypt(tx)}
                    disabled={isDecrypting}
                    className="w-full flex items-center justify-center gap-1.5 py-2 bg-slate-900 hover:bg-slate-700 disabled:opacity-60 text-white rounded-lg text-xs font-bold transition-colors"
                  >
                    {isDecrypting
                      ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Decrypting…</>
                      : <><Lock className="w-3.5 h-3.5" /> Unlock Receipt</>
                    }
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
