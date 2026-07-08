import {
  LayoutDashboard,
  FileText,
  FolderOpen,
  Car,
  Settings,
  BarChart3,
  Lock,
} from 'lucide-react';
import { useSession } from '../contexts/SessionContext';

export type View =
  | 'dashboard'
  | 'new-transaction'
  | 'pending'
  | 'file-cabinet'
  | 'reports'
  | 'mileage'
  | 'settings'
  | 'mtd'
  | 'support'
  | 'insights'
  | 'statements'
  | 'rules'
  | 'recurring'
  | 'budgets'
  | 'trades'
  | 'cis'
  | 'invoices'
  | 'clients'
  | 'invoices-recurring'
  | 'vat'
  | 'bank'
  | 'bulk-receipts'
  | 'cloud-backup'
  | 'accountant'
  | 'trust';

interface NavProps {
  currentView: View;
  onNavigate: (view: View) => void;
}

const NAV_ITEMS: { view: View; icon: typeof LayoutDashboard; label: string }[] = [
  { view: 'dashboard', icon: LayoutDashboard, label: 'Home' },
  { view: 'new-transaction', icon: FileText, label: 'New' },
  { view: 'pending', icon: FolderOpen, label: 'Review' },
  { view: 'reports', icon: BarChart3, label: 'P&L' },
  { view: 'mileage', icon: Car, label: 'Miles' },
  { view: 'settings', icon: Settings, label: 'Settings' },
];

export default function Navigation({ currentView, onNavigate }: NavProps) {
  const { lockSession } = useSession();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-slate-200 z-50 safe-area-bottom shadow-[0_-2px_8px_rgba(0,0,0,0.06)]">
      <div className="max-w-lg mx-auto flex items-center justify-around py-1.5">
        {NAV_ITEMS.map(({ view, icon: Icon, label }) => {
          const active = currentView === view;
          return (
            <button
              key={view}
              onClick={() => onNavigate(view)}
              className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-colors ${
                active
                  ? 'text-brand-600'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Icon className={`w-5 h-5 ${active ? 'stroke-[2.5]' : ''}`} />
              <span className={`text-[10px] ${active ? 'font-bold' : 'font-medium'}`}>{label}</span>
            </button>
          );
        })}
        <button
          onClick={lockSession}
          className="flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg text-slate-400 hover:text-red-500 transition-colors"
        >
          <Lock className="w-5 h-5" />
          <span className="text-[10px] font-medium">Lock</span>
        </button>
      </div>
    </nav>
  );
}
