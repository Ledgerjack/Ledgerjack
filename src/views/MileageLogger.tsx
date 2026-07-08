import { useState, useEffect, useRef } from 'react';
import { Car, Plus, Trash2, Navigation, Square } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { db, type DBMileageLog } from '../lib/db';
import { useApp, useRegionConfig } from '../contexts/AppContext';
import { createTransaction, makeSimpleSplits } from '../lib/ledger';
import { formatCurrency } from '../lib/currency';
import Disclaimer from '../components/Disclaimer';

export default function MileageLogger() {
  const [logs, setLogs] = useState<DBMileageLog[]>([]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [distance, setDistance] = useState('');
  const { region } = useApp();
  const cfg = useRegionConfig();
  const [error, setError] = useState('');

  // Foreground GPS trip tracking (keep the app open while driving).
  const [tracking, setTracking] = useState(false);
  const watchIdRef = useRef<number | null>(null);
  const lastPosRef = useRef<{ lat: number; lon: number } | null>(null);
  const metresRef = useRef(0);

  const gpsSupported = typeof navigator !== 'undefined' && 'geolocation' in navigator;

  function haversineMetres(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
    const R = 6371000;
    const dLat = (b.lat - a.lat) * Math.PI / 180;
    const dLon = (b.lon - a.lon) * Math.PI / 180;
    const s = Math.sin(dLat / 2) ** 2 +
      Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(s));
  }

  function startTrip() {
    if (!gpsSupported) return;
    metresRef.current = 0;
    lastPosRef.current = null;
    setTracking(true);
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const cur = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        if (lastPosRef.current) {
          const step = haversineMetres(lastPosRef.current, cur);
          // Ignore tiny GPS jitter (<5 m) and implausible jumps.
          if (step >= 5 && step < 2000) metresRef.current += step;
        }
        lastPosRef.current = cur;
        const unitVal = cfg.mileageUnit === 'miles' ? metresRef.current / 1609.344 : metresRef.current / 1000;
        setDistance(unitVal.toFixed(2));
      },
      () => { setError('Could not get GPS location. Check location permission.'); stopTrip(); },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 },
    );
  }
  function stopTrip() {
    if (watchIdRef.current !== null) { navigator.geolocation.clearWatch(watchIdRef.current); watchIdRef.current = null; }
    setTracking(false);
  }
  useEffect(() => () => { if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current); }, []);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    const allLogs = await db.mileage_logs.toArray();
    allLogs.sort((a, b) => b.date.localeCompare(a.date));
    setLogs(allLogs);
  };

  const handleSave = async () => {
    setError('');
    const dist = parseFloat(distance);
    if (!dist || dist <= 0) {
      setError('Please enter a valid distance.');
      return;
    }
    if (!description.trim()) {
      setError('Please enter a description.');
      return;
    }

    const deductionAmount = Math.round(dist * cfg.mileageRate * 100);

    try {
      const tx = await createTransaction({
        date,
        description: `Mileage: ${description.trim()}`,
        pending_review: false,
        job_tag: undefined,
        attachment_id: undefined,
      }, makeSimpleSplits(cfg.travelExpenseAccount, cfg.ownersEquityAccount, deductionAmount));

      const log: DBMileageLog = {
        id: uuidv4(),
        date,
        description: description.trim(),
        distance: dist,
        rate_applied: cfg.mileageRate,
        calculated_deduction: deductionAmount,
        transaction_id: tx.id,
        last_modified: Date.now(),
      };

      await db.mileage_logs.add(log);
      setDescription('');
      setDistance('');
      await loadLogs();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleDelete = async (id: string) => {
    const log = logs.find((l) => l.id === id);
    if (log) {
      try {
        await db.transactions.delete(log.transaction_id);
      } catch {}
    }
    await db.mileage_logs.delete(id);
    await loadLogs();
  };

  const totalDeduction = logs.reduce((sum, l) => sum + l.calculated_deduction, 0);

  return (
    <div className="space-y-4 pb-24">
      <Disclaimer />

      <h2 className="text-lg font-bold text-slate-900">Mileage Logger</h2>

      <div className="bg-white rounded-xl border-2 border-slate-200 p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-semibold text-slate-800 mb-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 border-2 border-slate-300 rounded-lg text-sm text-slate-900 font-medium"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-800 mb-1">Distance ({cfg.mileageUnit})</label>
            <input
              type="number"
              step="0.1"
              min="0"
              value={distance}
              onChange={(e) => setDistance(e.target.value)}
              placeholder="0.0"
              className="w-full px-3 py-2 border-2 border-slate-300 rounded-lg text-sm text-slate-900 font-medium"
            />
            {gpsSupported && (
              <div className="mt-2">
                {!tracking ? (
                  <button type="button" onClick={startTrip} className="w-full flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-lg text-sm font-semibold">
                    <Navigation className="w-4 h-4" /> Track a trip with GPS
                  </button>
                ) : (
                  <button type="button" onClick={stopTrip} className="w-full flex items-center justify-center gap-1.5 bg-red-50 border-2 border-red-200 text-red-600 py-2 rounded-lg text-sm font-semibold animate-pulse">
                    <Square className="w-4 h-4" /> Stop trip · {distance || '0.00'} {cfg.mileageUnit}
                  </button>
                )}
                <p className="text-[10px] text-slate-400 mt-1">Keep the app open and your screen on while driving — background tracking isn't reliable on phones. Distance is an estimate; check it before saving.</p>
              </div>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-800 mb-1">Description</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Site visit - Baker Street"
            className="w-full px-3 py-2 border-2 border-slate-300 rounded-lg text-sm text-slate-900 font-medium"
          />
        </div>

        <div className="bg-brand-50 border border-brand-200 rounded-lg p-3">
          <p className="text-sm text-brand-800 font-medium">
            Rate: {cfg.currencySymbol}{cfg.mileageRate}/{cfg.mileageUnit} &middot;
            Deduction: <strong>{formatCurrency(
              Math.round((parseFloat(distance) || 0) * cfg.mileageRate * 100),
              region,
            )}</strong>
          </p>
        </div>

        {error && <p className="text-red-600 text-sm font-medium">{error}</p>}

        <button
          onClick={handleSave}
          className="w-full bg-brand-500 text-white font-bold py-2.5 rounded-lg hover:bg-brand-600 transition-colors flex items-center justify-center gap-1.5 shadow-sm"
        >
          <Plus className="w-4 h-4" /> Log Mileage
        </button>
      </div>

      {logs.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">History</h3>
            <span className="text-sm font-bold text-slate-900">
              Total: {formatCurrency(totalDeduction, region)}
            </span>
          </div>
          <div className="space-y-2">
            {logs.map((log) => (
              <div key={log.id} className="bg-white rounded-xl border-2 border-slate-200 p-3 flex items-center gap-3">
                <div className="w-9 h-9 bg-brand-50 border border-brand-200 rounded-lg flex items-center justify-center text-brand-600">
                  <Car className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{log.description}</p>
                  <p className="text-xs text-slate-400 font-medium">
                    {log.date} &middot; {log.distance} {cfg.mileageUnit} @ {cfg.currencySymbol}{log.rate_applied}/{cfg.mileageUnit}
                  </p>
                </div>
                <span className="text-sm font-bold text-slate-900">
                  {formatCurrency(log.calculated_deduction, region)}
                </span>
                <button
                  onClick={() => handleDelete(log.id)}
                  className="text-slate-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
