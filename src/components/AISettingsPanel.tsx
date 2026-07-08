import { useState } from 'react';
import { Key, Zap, Cpu } from 'lucide-react';
import { useApp } from '../contexts/AppContext';

export default function AISettingsPanel() {
  const { apiKey, setApiKey, aiModel, setAiModel } = useApp();

  const [apiInput, setApiInput] = useState(apiKey);
  const [saved, setSaved]       = useState(false);

  const handleSaveApiKey = () => {
    setApiKey(apiInput.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleClearApiKey = () => {
    setApiInput('');
    setApiKey('');
  };

  return (
    <div className="bg-white rounded-xl border-2 border-slate-200 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Zap className="w-5 h-5 text-brand-600" />
        <h3 className="font-bold text-slate-900">AI (OpenRouter key)</h3>
      </div>

      <div className="space-y-2">
        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          OpenRouter API Key
        </label>
        <input
          type="password"
          placeholder="sk-or-v1-..."
          value={apiInput}
          onChange={(e) => setApiInput(e.target.value)}
          className="w-full px-3 py-2 border-2 border-slate-300 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:border-brand-500"
        />
        <div className="flex gap-2">
          <button
            onClick={handleSaveApiKey}
            disabled={!apiInput.trim()}
            className="flex-1 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white py-2 rounded-lg text-xs font-bold transition-colors"
          >
            {saved ? 'Saved' : 'Save Key'}
          </button>
          {apiKey && (
            <button
              onClick={handleClearApiKey}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold transition-colors"
            >
              Clear
            </button>
          )}
        </div>
        <p className="text-[10px] text-slate-400 leading-relaxed">
          One OpenRouter key powers all AI: OpenAI models for scanning and entries,
          Anthropic (Opus 4.8 / Fable 5) for insights. Your key is stored in your
          encrypted vault, never sent to any LedgerJack server. Your figures pass
          through OpenRouter to the model — set per-model data controls in your
          OpenRouter account. Get a key at openrouter.ai.
        </p>

        {/* Model selector */}
        <div className="pt-2 border-t border-slate-100 space-y-2">
          <div className="flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-slate-400" />
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Model Routing
            </p>
          </div>
          <div className="flex p-0.5 bg-slate-100 rounded-lg border border-slate-200">
            <button
              onClick={() => setAiModel('smart')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                aiModel === 'smart'
                  ? 'bg-white shadow-sm text-slate-900 border border-slate-200'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Smart Routing
            </button>
            <button
              onClick={() => setAiModel('economy')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                aiModel === 'economy'
                  ? 'bg-white shadow-sm text-slate-900 border border-slate-200'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Economy
            </button>
            <button
              onClick={() => setAiModel('quality')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                aiModel === 'quality'
                  ? 'bg-white shadow-sm text-slate-900 border border-slate-200'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Quality
            </button>
          </div>
          <p className="text-[10px] text-slate-400 leading-relaxed">
            {aiModel === 'smart'   && 'Auto: gpt-4o-mini for text, gpt-4o for images & complex receipts. Cuts costs ~80%.'}
            {aiModel === 'economy' && 'Always gpt-4o-mini. Lowest cost. Best for simple text entries.'}
            {aiModel === 'quality' && 'Always gpt-4o. Highest accuracy for handwritten or complex invoices.'}
          </p>
        </div>
      </div>
    </div>
  );
}
