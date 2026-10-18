import React, { useState, useEffect } from 'react';
import {
  Package,
  ClipboardCheck,
  BookOpen,
  BarChart3,
  Building2,
  HeartHandshake,
  Clock,
  Receipt,
  Truck,
  Users,
  Settings,
  ShoppingBag,
  ArrowRight,
  Lock,
  LogOut,
  Sun,
  Moon,
  Monitor,
} from 'lucide-react';
import type { AppModule, AppSettings, Shift } from '../types';
import { useTheme } from '../context/ThemeContext';

interface LaunchpadHubProps {
  settings: AppSettings | null;
  activeShift: Shift | null;
  currentUser: any;
  hasModuleAccess: (mod: string) => boolean;
  onSelectModule: (mod: AppModule) => void;
  onEnterSystem: () => void;
  onOpenShiftModal: () => void;
  onLock: () => void;
  onLogout?: () => void;
}

interface HubCardItem {
  id: AppModule;
  title: string;
  icon: React.ReactNode;
  gradient: string;
  shadow: string;
  borderColor: string;
  visible: boolean;
}

export const LaunchpadHub: React.FC<LaunchpadHubProps> = ({
  settings,
  currentUser,
  hasModuleAccess,
  onSelectModule,
  onEnterSystem,
  onLock,
  onLogout,
}) => {
  const { isDark, toggleTheme } = useTheme();
  const [currentTime, setCurrentTime] = useState<string>(() =>
    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  const isProcurementEnabled = settings?.feature_procurement === 'true';

  const allCards: HubCardItem[] = [
    {
      id: 'inventory',
      title: 'Inventory',
      icon: <Package className="w-9 h-9 text-white" />,
      gradient: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 55%, #38bdf8 100%)',
      shadow: '0 14px 28px -6px rgba(37, 99, 235, 0.38)',
      borderColor: '#60a5fa',
      visible: hasModuleAccess('inventory'),
    },
    {
      id: 'grn',
      title: 'Add New Product',
      icon: <ClipboardCheck className="w-9 h-9 text-white" />,
      gradient: 'linear-gradient(135deg, #ea580c 0%, #f59e0b 55%, #fbbf24 100%)',
      shadow: '0 14px 28px -6px rgba(234, 88, 12, 0.38)',
      borderColor: '#fbbf24',
      visible: hasModuleAccess('grn'),
    },
    {
      id: 'catalog',
      title: 'Product Catalog',
      icon: <BookOpen className="w-9 h-9 text-white" />,
      gradient: 'linear-gradient(135deg, #0284c7 0%, #0ea5e9 55%, #38bdf8 100%)',
      shadow: '0 14px 28px -6px rgba(14, 165, 233, 0.38)',
      borderColor: '#38bdf8',
      // Hidden per user request (can re-enable anytime by setting visible: hasModuleAccess('catalog'))
      visible: false,
    },
    {
      id: 'reports',
      title: 'Reports & Analytics',
      icon: <BarChart3 className="w-9 h-9 text-white" />,
      gradient: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 55%, #818cf8 100%)',
      shadow: '0 14px 28px -6px rgba(79, 70, 229, 0.38)',
      borderColor: '#818cf8',
      visible: hasModuleAccess('reports'),
    },
    {
      id: 'wholesale',
      title: 'Wholesale POS',
      icon: <Building2 className="w-9 h-9 text-white" />,
      gradient: 'linear-gradient(135deg, #7c3aed 0%, #9333ea 55%, #c084fc 100%)',
      shadow: '0 14px 28px -6px rgba(147, 51, 234, 0.38)',
      borderColor: '#c084fc',
      visible: hasModuleAccess('wholesale'),
    },
    {
      id: 'customers',
      title: 'Customers & Loyalty',
      icon: <HeartHandshake className="w-9 h-9 text-white" />,
      gradient: 'linear-gradient(135deg, #0d9488 0%, #06b6d4 55%, #22d3ee 100%)',
      shadow: '0 14px 28px -6px rgba(6, 182, 212, 0.38)',
      borderColor: '#22d3ee',
      visible: hasModuleAccess('customers'),
    },
    {
      id: 'shifts',
      title: 'Shifts & Z-Report',
      icon: <Clock className="w-9 h-9 text-white" />,
      gradient: 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)',
      shadow: '0 14px 28px -6px rgba(245, 158, 11, 0.38)',
      borderColor: '#fbbf24',
      // Hidden per user request
      visible: false,
    },
    {
      id: 'expenses',
      title: 'Operating Expenses',
      icon: <Receipt className="w-9 h-9 text-white" />,
      gradient: 'linear-gradient(135deg, #e11d48 0%, #f43f5e 55%, #fb7185 100%)',
      shadow: '0 14px 28px -6px rgba(225, 29, 72, 0.38)',
      borderColor: '#fb7185',
      visible: hasModuleAccess('expenses'),
    },
    {
      id: 'procurement',
      title: 'Procurement & POs',
      icon: <Truck className="w-9 h-9 text-white" />,
      gradient: 'linear-gradient(135deg, #c2410c 0%, #ea580c 55%, #fb923c 100%)',
      shadow: '0 14px 28px -6px rgba(234, 88, 12, 0.38)',
      borderColor: '#fb923c',
      visible: isProcurementEnabled && hasModuleAccess('procurement'),
    },
    {
      id: 'staff',
      title: 'Staff & Roles',
      icon: <Users className="w-9 h-9 text-white" />,
      gradient: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
      shadow: '0 14px 28px -6px rgba(99, 102, 241, 0.38)',
      borderColor: '#818cf8',
      // Hidden from Hub per user request
      visible: false,
    },
    {
      id: 'settings',
      title: 'System Settings',
      icon: <Settings className="w-9 h-9 text-white" />,
      gradient: 'linear-gradient(135deg, #10b981 0%, #0d9488 100%)',
      shadow: '0 14px 28px -6px rgba(16, 185, 129, 0.38)',
      borderColor: '#34d399',
      // Hidden from Hub per user request
      visible: false,
    },
  ];

  const featureCards = allCards.filter((c) => c.visible);

  return (
    <div className="flex-1 h-full w-full overflow-y-auto bg-[#070b13] p-3 sm:p-5 lg:p-8 flex flex-col justify-between select-none custom-scrollbar">
      <div className="max-w-6xl w-full mx-auto">
        {/* Top Welcome Header Bar */}
        <div className="bg-[#0b101b] border border-[#162135] rounded-2xl sm:rounded-3xl p-3 sm:p-5 mb-4 sm:mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-emerald-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 shrink-0">
              <ShoppingBag className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-2xl font-black text-white tracking-tight truncate">
                {settings?.store_name || 'MotorParts & Tuning Studio'}
              </h1>
              <p className="text-[11px] sm:text-sm text-slate-400 truncate">
                Logged in as <strong className="text-emerald-400 font-bold">{currentUser?.username || 'owner'}</strong>
              </p>
            </div>
          </div>

          {/* Right Quick Controls */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-800/60">
            <div className="px-2.5 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-[11px] sm:text-xs font-mono font-bold text-slate-200 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              <span>{currentTime}</span>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={toggleTheme}
                className="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-teal-500 hover:bg-teal-600 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs active:scale-95"
                title="Switch Theme"
              >
                {isDark ? <Sun className="w-3.5 h-3.5 text-white" /> : <Moon className="w-3.5 h-3.5 text-white" />}
                <span className="hidden sm:inline">{isDark ? 'Light' : 'Dark'}</span>
              </button>

              <button
                type="button"
                onClick={onLock}
                className="px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs active:scale-95"
                title="Switch User / Lock (F9)"
              >
                <Lock className="w-3.5 h-3.5 text-white" />
                <span className="hidden xs:inline sm:inline">Lock</span>
              </button>

              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  className="p-1.5 sm:p-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white transition cursor-pointer shadow-xs active:scale-95"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4 text-white" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Top Giant Centered "POS SYSTEM" Box to Enter Main POS Terminal */}
        <div className="mb-4 sm:mb-6">
          <div
            onClick={onEnterSystem}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onEnterSystem();
              }
            }}
            style={{
              background: 'linear-gradient(135deg, #059669 0%, #10b981 55%, #34d399 100%)',
              boxShadow: '0 16px 36px -8px rgba(16, 185, 129, 0.4)',
              borderColor: '#6ee7b7',
            }}
            className="hub-color-card group relative overflow-hidden w-full rounded-2xl sm:rounded-3xl border-2 py-4 sm:py-9 lg:py-12 px-4 sm:px-8 flex items-center justify-between sm:justify-center gap-3 sm:gap-6 cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:brightness-105 active:scale-[0.98]"
          >
            {/* Clean glossy light highlights */}
            <div className="pointer-events-none absolute -left-10 -top-10 w-44 sm:w-56 h-44 sm:h-56 rounded-full bg-white/20 blur-2xl" />
            <div className="pointer-events-none absolute -right-10 -bottom-12 w-48 sm:w-64 h-48 sm:h-64 rounded-full bg-white/15 blur-2xl" />

            <div className="relative z-10 flex items-center gap-3 sm:gap-6">
              <div className="w-12 h-12 sm:w-20 sm:h-20 lg:w-24 lg:h-24 rounded-2xl sm:rounded-3xl bg-white/25 border-2 border-white/40 flex items-center justify-center text-white shrink-0 shadow-inner group-hover:scale-105 transition-transform">
                <Monitor className="w-6 h-6 sm:w-11 sm:h-11 lg:w-13 lg:h-13 text-white" />
              </div>
              <div className="text-left sm:text-center">
                <span className="keep-white block text-2xl sm:text-5xl md:text-6xl font-black text-white tracking-wide sm:tracking-wider uppercase drop-shadow-sm">
                  POS SYSTEM
                </span>
                <span className="keep-white block sm:hidden text-[10px] text-white/90 font-bold uppercase tracking-wider mt-0.5">
                  Touch to Start Billing →
                </span>
              </div>
            </div>

            <div className="relative z-10 w-10 h-10 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-xl sm:rounded-2xl bg-white/25 border border-white/40 flex items-center justify-center text-white shrink-0 group-hover:translate-x-2 group-hover:bg-white/35 transition-all">
              <ArrowRight className="w-5 h-5 sm:w-8 sm:h-8 lg:w-9 lg:h-9 text-white" />
            </div>
          </div>
        </div>

        {/* 2-Per-Row Large Colored Feature Boxes with Smooth Shading (Title Only) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 lg:gap-5 pb-6">
          {featureCards.map((card) => (
            <div
              key={card.id}
              onClick={() => onSelectModule(card.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectModule(card.id);
                }
              }}
              style={{
                background: card.gradient,
                boxShadow: card.shadow,
                borderColor: card.borderColor,
              }}
              className="hub-color-card group relative overflow-hidden rounded-2xl sm:rounded-3xl border-2 p-3.5 sm:p-6 lg:p-7 flex items-center justify-between gap-3 sm:gap-4 cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:brightness-105 active:scale-[0.98]"
            >
              {/* Clean glossy light glow */}
              <div className="pointer-events-none absolute -right-8 -top-8 w-32 sm:w-40 h-32 sm:h-40 rounded-full bg-white/20 blur-xl" />
              <div className="pointer-events-none absolute -left-8 -bottom-10 w-28 sm:w-32 h-28 sm:h-32 rounded-full bg-white/10 blur-xl" />

              <div className="relative z-10 flex items-center gap-3 sm:gap-5 min-w-0">
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-white/25 border border-white/35 backdrop-blur-xs flex items-center justify-center text-white shrink-0 shadow-inner group-hover:scale-105 transition-transform [&>svg]:w-6 [&>svg]:h-6 sm:[&>svg]:w-8 sm:[&>svg]:h-8 lg:[&>svg]:w-9 lg:[&>svg]:h-9">
                  {card.icon}
                </div>
                <h3 className="keep-white text-base sm:text-2xl lg:text-3xl font-black text-white tracking-tight drop-shadow-xs truncate">
                  {card.title}
                </h3>
              </div>

              <div className="relative z-10 w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-white/25 border border-white/35 flex items-center justify-center text-white shrink-0 group-hover:translate-x-1 group-hover:bg-white/35 transition-all">
                <ArrowRight className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
