import React, { useEffect, useState } from 'react';
import { 
  ShoppingCart, 
  Package, 
  Clock, 
  Truck, 
  BarChart3, 
  Settings, 
  Wifi, 
  WifiOff, 
  Lock,
  RefreshCw,
  Users,
  User,
  Shield,
  ShieldCheck,
  ShoppingBag,
  HeartHandshake,
  BookOpen,
  ClipboardCheck,
  Building2,
  Receipt,
  LogOut,
  ChevronLeft,
  ChevronRight,
  X,
  Sun,
  Moon,
  LayoutGrid,
} from 'lucide-react';
import type { AppSettings, Shift, AppModule } from '../types';
import { api } from '../services/api';
import { localDb } from '../services/offlineDb';
import { useTheme } from '../context/ThemeContext';

interface SidebarProps {
  activeTab: AppModule;
  setActiveTab: (tab: AppModule) => void;
  settings: AppSettings | null;
  activeShift: Shift | null;
  currentUser?: any;
  onOpenShiftModal: () => void;
  onOpenXReport: () => void;
  onLock: () => void;
  onLogout?: () => void;
  onOpenHub?: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  settings,
  activeShift,
  currentUser,
  onOpenShiftModal,
  onOpenXReport,
  onLock,
  onLogout,
  onOpenHub,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const { theme, toggleTheme, isDark } = useTheme();
  const [isCollapsed, setIsCollapsed] = useState<boolean>(true);

  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const toggleCollapsed = () => {
    setIsCollapsed(prev => !prev);
  };

  // Monitor network status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      triggerSync();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Periodic check for unsynced offline orders
    const interval = setInterval(async () => {
      try {
        const count = await localDb.offlineOrders.where('synced').equals(0).count();
        setPendingSyncCount(count);
        if (count > 0 && navigator.onLine) {
          triggerSync();
        }
      } catch {
        // ignore
      }
    }, 5000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const triggerSync = async () => {
    if (isSyncing) return;
    try {
      setIsSyncing(true);
      const synced = await api.syncOfflineOrders();
      if (synced > 0) {
        const count = await localDb.offlineOrders.where('synced').equals(0).count();
        setPendingSyncCount(count);
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const isProcurementEnabled = settings?.feature_procurement === 'true';
  const isTaxOrReportsEnabled = settings?.feature_tax === 'true';

  const userRole = currentUser?.role || 'cashier';
  const isAdmin = userRole === 'admin';
  const isSupervisor = userRole === 'supervisor';

  const hasModuleAccess = (mod: string) => {
    if (!currentUser) return false;

    let perms: string[] | null = null;
    if (currentUser.permissions !== undefined && currentUser.permissions !== null) {
      if (Array.isArray(currentUser.permissions)) {
        perms = currentUser.permissions;
      } else if (typeof currentUser.permissions === 'string') {
        try {
          const parsed = JSON.parse(currentUser.permissions);
          if (Array.isArray(parsed)) perms = parsed;
        } catch {}
      }
    }

    // If explicit permissions array exists on user profile, strictly honor it!
    if (perms !== null) {
      return perms.includes(mod);
    }

    // Fallbacks if permissions are missing entirely from user record
    if (currentUser.role === 'admin') return true;
    if (currentUser.role === 'supervisor') {
      return ['pos', 'wholesale', 'catalog', 'inventory', 'grn', 'customers', 'shifts', 'expenses', 'reports'].includes(mod);
    }
    return mod === 'pos' || mod === 'wholesale';
  };

  interface NavItem {
    id: AppModule;
    label: string;
    icon: React.ReactNode;
    activeColor: string;
    visible: boolean;
  }

  const navItems: NavItem[] = [
    {
      id: 'pos',
      label: 'POS Cashier',
      icon: <ShoppingCart className="w-4 h-4 shrink-0" />,
      activeColor: 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25 font-semibold',
      visible: hasModuleAccess('pos'),
    },
    {
      id: 'wholesale',
      label: 'Wholesale POS',
      icon: <Building2 className="w-4 h-4 shrink-0" />,
      activeColor: 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25 font-semibold',
      visible: hasModuleAccess('wholesale'),
    },
    {
      id: 'catalog',
      label: 'Product Catalog',
      icon: <BookOpen className="w-4 h-4 shrink-0" />,
      activeColor: 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25 font-semibold',
      visible: false,
    },
    {
      id: 'inventory',
      label: 'Inventory',
      icon: <Package className="w-4 h-4 shrink-0" />,
      activeColor: 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25 font-semibold',
      visible: hasModuleAccess('inventory'),
    },
    {
      id: 'grn',
      label: 'Add New Product',
      icon: <ClipboardCheck className="w-4 h-4 shrink-0" />,
      activeColor: 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25 font-semibold',
      visible: hasModuleAccess('grn'),
    },
    {
      id: 'customers',
      label: 'Customers',
      icon: <HeartHandshake className="w-4 h-4 shrink-0" />,
      activeColor: 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25 font-semibold',
      visible: hasModuleAccess('customers'),
    },
    {
      id: 'shifts',
      label: 'Shifts & Z-Report',
      icon: <Clock className="w-4 h-4 shrink-0" />,
      activeColor: 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25 font-semibold',
      visible: false,
    },
    {
      id: 'procurement',
      label: 'Procurement',
      icon: <Truck className="w-4 h-4 shrink-0" />,
      activeColor: 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25 font-semibold',
      visible: isProcurementEnabled && hasModuleAccess('procurement'),
    },
    {
      id: 'expenses',
      label: 'Expenses',
      icon: <Receipt className="w-4 h-4 shrink-0" />,
      activeColor: 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25 font-semibold',
      visible: hasModuleAccess('expenses'),
    },
    {
      id: 'reports',
      label: isTaxOrReportsEnabled ? 'Reports & Tax' : 'Reports',
      icon: <BarChart3 className="w-4 h-4 shrink-0" />,
      activeColor: 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25 font-semibold',
      visible: hasModuleAccess('reports'),
    },
    {
      id: 'staff',
      label: 'Staff & Roles',
      icon: <Users className="w-4 h-4 shrink-0" />,
      activeColor: 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25 font-semibold',
      visible: hasModuleAccess('staff'),
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: <Settings className="w-4 h-4 shrink-0" />,
      activeColor: 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25 font-semibold',
      visible: hasModuleAccess('settings'),
    },
  ];

  const handleSelectTab = (tab: AppModule) => {
    setActiveTab(tab);
    setIsCollapsed(true);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  const renderFooter = (collapsed: boolean) => (
    <div className="border-t border-slate-800 p-2.5 space-y-2 bg-slate-950/40 shrink-0">
      {/* Active User Card */}
      <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'} bg-slate-800/90 border border-slate-700/80 p-2 rounded-xl`}>
        <div className="flex items-center gap-2 min-w-0">
          {isAdmin ? (
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
          ) : isSupervisor ? (
            <Shield className="w-4 h-4 text-amber-500 shrink-0" />
          ) : (
            <User className="w-4 h-4 text-blue-500 shrink-0" />
          )}
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-200 truncate leading-tight">
                {currentUser?.username || 'owner'}
              </p>
              <span className={`text-[9px] px-1.5 py-0.5 rounded font-black uppercase tracking-wide inline-block mt-0.5 ${
                isAdmin
                  ? 'bg-emerald-500 text-white'
                  : isSupervisor
                  ? 'bg-amber-500 text-white'
                  : 'bg-blue-500 text-white'
              }`}>
                {userRole}
              </span>
            </div>
          )}
        </div>

        {!collapsed && (
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => {
                onLock();
                if (onCloseMobile) onCloseMobile();
              }}
              title="Switch user or enter PIN (F9)"
              className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-[10px] font-bold transition cursor-pointer shadow-xs"
            >
              Switch
            </button>
            {onLogout && (
              <button
                onClick={() => {
                  onLogout();
                  if (onCloseMobile) onCloseMobile();
                }}
                title="Sign out and lock terminal"
                className="p-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-lg transition cursor-pointer shadow-xs"
              >
                <LogOut className="w-3.5 h-3.5 text-white" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Theme Switcher Button */}
      <button
        onClick={toggleTheme}
        title={isDark ? 'Switch to Modern Clean Light Theme' : 'Switch to Dark Mode Theme'}
        className={`w-full py-1.5 rounded-xl border transition cursor-pointer flex items-center justify-center gap-2 text-xs font-bold ${
          isDark
            ? 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-slate-700'
            : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300'
        } ${collapsed ? 'px-0' : 'px-3'}`}
      >
        {isDark ? (
          <>
            <Sun className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            {!collapsed && <span>Light Theme</span>}
          </>
        ) : (
          <>
            <Moon className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
            {!collapsed && <span>Dark Theme</span>}
          </>
        )}
      </button>

      {/* Lock Terminal Button */}
      <button
        onClick={() => {
          onLock();
          if (onCloseMobile) onCloseMobile();
        }}
        title="Lock Register (F9)"
        className={`w-full py-1.5 rounded-xl bg-teal-500 hover:bg-teal-600 text-white text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer shadow-xs ${
          collapsed ? 'px-0' : 'px-3'
        }`}
      >
        <Lock className="w-3.5 h-3.5 text-white shrink-0" />
        {!collapsed && <span>F9 Lock</span>}
      </button>

      {/* Shift Card */}
      {activeShift ? (
        <div className={`flex items-center ${collapsed ? 'justify-center p-1.5' : 'justify-between p-2'} bg-slate-800/60 border border-slate-700/60 rounded-xl text-xs`}>
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
            {!collapsed && (
              <div className="truncate">
                <span className="text-[10px] text-slate-400 block leading-tight">Shift #{activeShift.id.slice(-4)}</span>
                <span className="font-semibold text-slate-200 text-xs truncate block">{activeShift.cashier_name}</span>
              </div>
            )}
          </div>
          <button
            onClick={() => {
              onOpenXReport();
              if (onCloseMobile) onCloseMobile();
            }}
            title="View Mid-Shift X-Report"
            className={`${collapsed ? 'text-[9px] px-1.5 py-1' : 'px-2.5 py-1 text-[10px]'} bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-mono font-bold shrink-0 transition cursor-pointer shadow-xs`}
          >
            {collapsed ? 'X' : 'X-REPORT'}
          </button>
        </div>
      ) : (
        <button
          onClick={() => {
            onOpenShiftModal();
            if (onCloseMobile) onCloseMobile();
          }}
          title="Open Cash Drawer / Start Shift"
          className={`w-full py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-xs ${
            collapsed ? 'px-0' : 'px-2 text-center'
          }`}
        >
          <Clock className="w-3.5 h-3.5 text-white shrink-0" />
          {!collapsed && <span className="truncate">Start Shift</span>}
        </button>
      )}

      {/* Network & Offline Sync Indicator */}
      <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'} px-2.5 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold`}>
        {isOnline ? (
          <div className="flex items-center gap-1.5 text-emerald-700">
            <Wifi className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            {!collapsed && <span>Online</span>}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-amber-700" title={`Offline Mode (${pendingSyncCount} saved)`}>
            <WifiOff className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            {!collapsed && <span className="truncate">Offline ({pendingSyncCount})</span>}
          </div>
        )}

        {pendingSyncCount > 0 && isOnline && (
          <button
            onClick={triggerSync}
            className="flex items-center gap-1 bg-amber-500 hover:bg-amber-600 text-white px-2 py-0.5 rounded font-bold shrink-0 text-[10px]"
            title="Click to push offline orders now"
          >
            <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
            {!collapsed && <span>Sync ({pendingSyncCount})</span>}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/75 backdrop-blur-xs z-50 md:hidden transition-opacity"
          onClick={onCloseMobile}
        />
      )}

      {/* Mobile Drawer Sidebar */}
      <aside 
        className={`fixed inset-y-0 left-0 w-72 z-50 bg-slate-900 border-r border-slate-800 text-slate-100 flex flex-col justify-between shadow-2xl transition-transform duration-300 md:hidden ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between p-3.5 border-b border-slate-800 shrink-0">
          <div 
            onClick={() => handleSelectTab('pos')}
            className="flex items-center gap-2.5 cursor-pointer font-bold text-emerald-400 min-w-0"
          >
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0 shadow-inner">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="truncate block text-base font-extrabold tracking-tight text-white leading-tight">
                {settings?.store_name || 'MotorParts POS'}
              </span>
              {settings?.sub_store_name && (
                <span className="truncate block text-xs font-normal text-slate-400 leading-tight mt-0.5">
                  {settings.sub_store_name}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onCloseMobile}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1.5 scrollbar-thin scrollbar-thumb-slate-800">
          {onOpenHub && (
            <button
              onClick={() => {
                onOpenHub();
                if (onCloseMobile) onCloseMobile();
              }}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-bold text-slate-300 hover:bg-slate-800/80 hover:text-white transition cursor-pointer mb-1 border border-emerald-500/30"
            >
              <LayoutGrid className="w-4 h-4 shrink-0" />
              <span className="truncate">Main Hub</span>
            </button>
          )}
          {navItems.filter(item => item.visible).map(item => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSelectTab(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition cursor-pointer ${
                  isActive
                    ? item.activeColor
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                {item.icon}
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {renderFooter(false)}
      </aside>

      {/* Desktop Persistent Sidebar */}
      <aside 
        className={`hidden md:flex bg-slate-900 border-r border-slate-800 text-slate-100 flex-col justify-between select-none shadow-xl z-30 transition-all duration-200 shrink-0 h-screen ${
          isCollapsed ? 'w-16' : 'w-60'
        }`}
      >
        {/* Top: Brand and Collapse Toggle */}
        <div className="flex flex-col border-b border-slate-800">
          <div className={`flex items-center ${isCollapsed ? 'justify-center flex-col gap-2 p-2' : 'justify-between p-3.5 gap-2'}`}>
            <div 
              onClick={() => {
                if (onOpenHub) onOpenHub();
                else if (hasModuleAccess('pos')) handleSelectTab('pos');
              }}
              title="Go to Main Hub"
              className="flex items-center gap-2.5 cursor-pointer font-bold text-emerald-700 tracking-tight hover:opacity-90 transition min-w-0"
            >
              <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center text-white shrink-0 shadow-sm">
                <ShoppingBag className="w-5 h-5 text-white" />
              </div>
              {!isCollapsed && (
                <div className="min-w-0">
                  <span className="truncate block text-sm font-extrabold tracking-tight text-white leading-tight">
                    {settings?.store_name || 'MotorParts POS'}
                  </span>
                  {settings?.sub_store_name && (
                    <span className="truncate block text-xs font-normal text-slate-400 leading-tight mt-0.5">
                      {settings.sub_store_name}
                    </span>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={toggleCollapsed}
              title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              className="p-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white transition cursor-pointer shrink-0 shadow-xs"
            >
              {isCollapsed ? <ChevronRight className="w-4 h-4 text-white" /> : <ChevronLeft className="w-4 h-4 text-white" />}
            </button>
          </div>
        </div>

        {/* Navigation Modules (Vertical Scrollable List) */}
        <nav className="flex-1 overflow-y-auto px-2.5 py-3 space-y-1 scrollbar-thin scrollbar-thumb-slate-800">
          {onOpenHub && (
            <button
              onClick={onOpenHub}
              title={isCollapsed ? 'Main Hub' : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-bold text-slate-300 hover:bg-slate-800/80 hover:text-white transition cursor-pointer mb-1.5 border border-emerald-500/30 ${
                isCollapsed ? 'justify-center px-0' : ''
              }`}
            >
              <LayoutGrid className="w-4 h-4 shrink-0" />
              {!isCollapsed && <span className="truncate">Main Hub</span>}
            </button>
          )}
          {navItems.filter(item => item.visible).map(item => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSelectTab(item.id)}
                title={isCollapsed ? item.label : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition cursor-pointer ${
                  isActive
                    ? item.activeColor
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                } ${isCollapsed ? 'justify-center px-0' : ''}`}
              >
                {item.icon}
                {!isCollapsed && (
                  <span className="truncate">{item.label}</span>
                )}
              </button>
            );
          })}
        </nav>

        {renderFooter(isCollapsed)}
      </aside>
    </>
  );
};
