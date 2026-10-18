import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  DollarSign, 
  CreditCard, 
  ShoppingBag, 
  AlertTriangle, 
  Receipt,
  Download,
  RefreshCw,
  Clock,
  ArrowUpRight,
  Tag,
  Package,
  ClipboardCheck,
  Banknote,
  FileCheck,
  CheckCircle2,
  Printer,
  Archive,
  PieChart,
  Activity
} from 'lucide-react';
import type { AppSettings, OrderReceipt, Product, GoodsReceivedNote } from '../types';
import { api } from '../services/api';
import { RecentBillsModal } from '../components/RecentBillsModal';
import { ThermalReceipt } from '../components/ThermalReceipt';
import { CategoryPieChart } from '../components/CategoryPieChart';

interface ReportsPageProps {
  settings: AppSettings | null;
  currentUser?: any;
}

type AnalyticsPeriod = 'daily' | 'weekly' | 'monthly' | 'all';
type MainReportSection = 'sales_profit' | 'payments' | 'fast_moving' | 'stock_valuation' | 'grn_credit';
type ProductTableTab = 'volume' | 'profitable' | 'dead_stock';
type PaymentFilter = 'ALL' | 'CASH' | 'CARD' | 'CHEQUE';
type StockFilter = 'low_out' | 'out_only' | 'all';
type GrnFilter = 'all' | 'credit_due' | 'paid';

interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

// Reusable SVG Donut Chart Component for crisp visual graphs
const VisualDonutGraph: React.FC<{
  segments: DonutSegment[];
  centerTitle: string;
  centerValue: string;
  centerSub?: string;
  currency?: string;
}> = ({ segments, centerTitle, centerValue, centerSub, currency = '' }) => {
  const total = segments.reduce((acc, s) => acc + Math.max(0, s.value), 0);
  const radius = 68;
  const circumference = 2 * Math.PI * radius;
  let accumulatedPercent = 0;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-6 py-2">
      {/* SVG Donut Ring */}
      <div className="relative w-44 h-44 flex items-center justify-center shrink-0">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 180 180">
          {/* Background Track */}
          <circle
            cx="90"
            cy="90"
            r={radius}
            fill="transparent"
            stroke="#e2e8f0"
            strokeWidth="22"
            className="opacity-30"
          />
          {total > 0 ? (
            segments.map((seg, i) => {
              const val = Math.max(0, seg.value);
              const pct = val / total;
              const strokeDasharray = `${pct * circumference} ${circumference}`;
              const strokeDashoffset = -accumulatedPercent * circumference;
              accumulatedPercent += pct;
              return (
                <circle
                  key={i}
                  cx="90"
                  cy="90"
                  r={radius}
                  fill="transparent"
                  stroke={seg.color}
                  strokeWidth="22"
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="butt"
                  className="transition-all duration-500"
                />
              );
            })
          ) : (
            <circle
              cx="90"
              cy="90"
              r={radius}
              fill="transparent"
              stroke="#10b981"
              strokeWidth="22"
              strokeDasharray={`${circumference * 0.25} ${circumference}`}
              className="opacity-40"
            />
          )}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-3">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
            {centerTitle}
          </span>
          <span className="text-sm sm:text-base font-black text-white font-mono mt-0.5 leading-tight">
            {centerValue}
          </span>
          {centerSub && (
            <span className="text-[10px] text-emerald-400 font-bold mt-0.5">
              {centerSub}
            </span>
          )}
        </div>
      </div>

      {/* Legend & Breakdown Bars */}
      <div className="flex-1 w-full space-y-3">
        {segments.map((seg, idx) => {
          const pct = total > 0 ? Math.round((Math.max(0, seg.value) / total) * 100) : 0;
          return (
            <div key={idx} className="space-y-1">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="flex items-center gap-2 text-white">
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: seg.color }}
                  />
                  <span>{seg.label}</span>
                </span>
                <span className="font-mono font-black text-white">
                  {currency}{seg.value.toLocaleString(undefined, { maximumFractionDigits: 2 })} ({pct}%)
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(4, pct)}%`, backgroundColor: seg.color }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const ReportsPage: React.FC<ReportsPageProps> = ({ settings, currentUser }) => {
  const [period, setPeriod] = useState<AnalyticsPeriod>('daily');
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [activeReport, setActiveReport] = useState<MainReportSection>('sales_profit');

  // Data States for the 5 Common Reports
  const [analytics, setAnalytics] = useState<any>(null);
  const [ordersList, setOrdersList] = useState<any[]>([]);
  const [productsList, setProductsList] = useState<Product[]>([]);
  const [inventorySummary, setInventorySummary] = useState<any>(null);
  const [grnList, setGrnList] = useState<GoodsReceivedNote[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Sub-filters within reports
  const [productTab, setProductTab] = useState<ProductTableTab>('volume');
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('ALL');
  const [stockFilter, setStockFilter] = useState<StockFilter>('low_out');
  const [grnFilter, setGrnFilter] = useState<GrnFilter>('all');

  // Modals
  const [isBillsModalOpen, setIsBillsModalOpen] = useState<boolean>(false);
  const [reprintReceipt, setReprintReceipt] = useState<OrderReceipt | null>(null);

  const currency = settings?.currency_symbol || 'LKR ';

  useEffect(() => {
    loadReports();
  }, [period, selectedDate, settings]);

  const loadReports = async () => {
    try {
      setLoading(true);
      const [
        analyticsData,
        recentOrdersData,
        allProductsData,
        invSummaryData,
        grnsData,
      ] = await Promise.all([
        api.getAnalytics(period, period === 'daily' ? selectedDate : undefined).catch(() => null),
        api.getOrders({ limit: 100 }).catch(() => []),
        api.getProducts().catch(() => []),
        api.getInventorySummary().catch(() => null),
        api.getGRNs({ limit: '100' }).catch(() => ({ grns: [], total: 0 })),
      ]);

      setAnalytics(analyticsData);
      setOrdersList(Array.isArray(recentOrdersData) ? recentOrdersData : []);
      setProductsList(Array.isArray(allProductsData) ? allProductsData : []);
      setInventorySummary(invSummaryData);
      setGrnList(Array.isArray(grnsData?.grns) ? grnsData.grns : []);
    } catch (err) {
      console.error('Failed to load analytics reports:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReprintOrder = async (orderId: string) => {
    try {
      const data = await api.getOrderReceipt(orderId);
      if (data?.order) {
        setReprintReceipt(data.order);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to load order receipt');
    }
  };

  // ============================================================================
  // COMPUTED METRICS ACROSS THE 5 MOST COMMON REPORTS
  // ============================================================================

  // Report 1: Sales & Profit Summary
  const summary = analytics?.summary || {};
  const grossRev = Number(summary.gross_revenue || 0);
  const cogsVal = Number(summary.cogs || 0);
  const grossProfitVal = Number(summary.gross_profit || 0);
  const expensesVal = Number(summary.total_expenses || 0);
  const netProfitVal = Number(summary.net_profit !== undefined ? summary.net_profit : grossProfitVal);
  const categories = analytics?.categories || [];
  const timelineTrend = analytics?.timeline_trend || [];
  const hourlyTraffic = analytics?.hourly_traffic || [];
  const maxTrendRevenue = Math.max(1, ...timelineTrend.map((t: any) => Number(t.revenue || 0)));
  const maxHourlyRevenue = Math.max(1, ...hourlyTraffic.map((h: any) => Number(h.revenue || 0)));
  const maxFinanceBar = Math.max(1, grossRev, cogsVal, Math.abs(grossProfitVal), expensesVal, Math.abs(netProfitVal));

  // Report 2: Payment Method Breakdown & Retail vs Wholesale
  const cashRev = Number(summary.cash_revenue || 0);
  const cardRev = Number(summary.card_revenue || 0);
  const chequeRev = Number(summary.cheque_revenue || 0);
  const totalCollected = cashRev + cardRev + chequeRev;
  const totalTender = totalCollected || 1;
  const cashPercent = totalCollected > 0 ? Math.round((cashRev / totalTender) * 100) : 0;
  const cardPercent = totalCollected > 0 ? Math.round((cardRev / totalTender) * 100) : 0;
  const chequePercent = totalCollected > 0 ? Math.max(0, 100 - cashPercent - cardPercent) : 0;

  const validOrders = ordersList.filter((o: any) => o.status !== 'VOIDED');
  const retailOrders = validOrders.filter((o: any) => (o.order_type || 'RETAIL') === 'RETAIL');
  const wholesaleOrders = validOrders.filter((o: any) => o.order_type === 'WHOLESALE');
  const retailTotalAmt = retailOrders.reduce((acc, o) => acc + Number(o.total_amount || 0), 0);
  const wholesaleTotalAmt = wholesaleOrders.reduce((acc, o) => acc + Number(o.total_amount || 0), 0);

  const filteredOrders = validOrders.filter((o: any) => {
    if (paymentFilter === 'ALL') return true;
    return String(o.payment_method || '').toUpperCase() === paymentFilter;
  });

  // Report 3: Fast-Moving, Profitable & Dead Stock Items
  const mostProfitable = analytics?.most_profitable || [];
  const fastMoving = analytics?.fast_moving || [];
  const maxFastUnits = Math.max(1, ...fastMoving.slice(0, 8).map((p: any) => Number(p.units_sold || 0)));
  const maxProfitableAmt = Math.max(1, ...mostProfitable.slice(0, 8).map((p: any) => Number(p.total_profit || 0)));

  const soldBarcodes = new Set(
    [...mostProfitable, ...fastMoving].map((p: any) => String(p.barcode || '').trim())
  );
  const deadStockItems = productsList
    .filter((p) => (p.is_in_inventory === undefined || p.is_in_inventory === 1) && Number(p.stock_quantity || 0) > 0 && !soldBarcodes.has(String(p.barcode || '').trim()))
    .sort((a, b) => (Number(b.stock_quantity || 0) * Number(b.cost_price || 0)) - (Number(a.stock_quantity || 0) * Number(a.cost_price || 0)));
  const maxDeadStockCost = Math.max(1, ...deadStockItems.slice(0, 6).map((p) => Number(p.stock_quantity || 0) * Number(p.cost_price || 0)));

  // Report 4: Low Stock & Stock Valuation
  const inventoryProducts = productsList.filter((p) => p.is_in_inventory === undefined || p.is_in_inventory === 1);
  const totalInventoryItems = inventorySummary?.total_items ?? inventoryProducts.length;
  const totalInventoryUnits = inventorySummary?.total_units ?? inventoryProducts.reduce((acc, p) => acc + Math.max(0, Number(p.stock_quantity || 0)), 0);
  const totalCostValuation = inventorySummary?.cost_valuation ?? inventoryProducts.reduce((acc, p) => acc + Math.max(0, Number(p.stock_quantity || 0)) * Number(p.cost_price || 0), 0);
  const totalRetailValuation = inventorySummary?.retail_valuation ?? inventoryProducts.reduce((acc, p) => acc + Math.max(0, Number(p.stock_quantity || 0)) * Number(p.selling_price || 0), 0);
  const expectedStockProfit = Math.max(0, totalRetailValuation - totalCostValuation);
  const maxValuationBar = Math.max(1, totalRetailValuation, totalCostValuation, expectedStockProfit);

  const outOfStockItems = inventoryProducts.filter((p) => Number(p.stock_quantity || 0) <= 0);
  const lowStockOnlyItems = inventoryProducts.filter((p) => {
    const qty = Number(p.stock_quantity || 0);
    const minLevel = Number(p.min_stock_level ?? 5);
    return qty > 0 && qty <= minLevel;
  });
  const lowAndOutStockItems = [...outOfStockItems, ...lowStockOnlyItems];
  const healthyStockItemsCount = Math.max(0, inventoryProducts.length - lowAndOutStockItems.length);

  // Category-wise Stock Valuation for Graph 3 in Report 04
  const categoryStockMap = new Map<string, { name: string; costVal: number; retailVal: number; units: number }>();
  inventoryProducts.forEach((p) => {
    const cat = p.category_name || 'General';
    const qty = Math.max(0, Number(p.stock_quantity || 0));
    const cVal = qty * Number(p.cost_price || 0);
    const rVal = qty * Number(p.selling_price || 0);
    const prev = categoryStockMap.get(cat) || { name: cat, costVal: 0, retailVal: 0, units: 0 };
    prev.costVal += cVal;
    prev.retailVal += rVal;
    prev.units += qty;
    categoryStockMap.set(cat, prev);
  });
  const categoryStockList = Array.from(categoryStockMap.values()).sort((a, b) => b.retailVal - a.retailVal).slice(0, 6);
  const maxCategoryRetailVal = Math.max(1, ...categoryStockList.map((c) => c.retailVal));

  const displayedStockItems = (
    stockFilter === 'low_out'
      ? lowAndOutStockItems
      : stockFilter === 'out_only'
      ? outOfStockItems
      : inventoryProducts
  ).sort((a, b) => Number(a.stock_quantity || 0) - Number(b.stock_quantity || 0));

  // Report 5: Product Add (GRN) & Supplier Purchase / Credit Report
  const activeGrns = grnList.filter((g) => g.status !== 'CANCELLED');
  const totalGrnPurchases = activeGrns.reduce((acc, g) => acc + Number(g.total_cost || 0), 0);
  const totalGrnPaid = activeGrns.reduce((acc, g) => acc + Number(g.paid_amount ?? (g.payment_status === 'PAID' ? g.total_cost : 0)), 0);
  const totalGrnCreditDue = activeGrns.reduce((acc, g) => {
    const cost = Number(g.total_cost || 0);
    const paid = Number(g.paid_amount ?? (g.payment_status === 'PAID' ? cost : 0));
    return acc + Math.max(0, cost - paid);
  }, 0);
  const unpaidGrnCount = activeGrns.filter((g) => g.payment_status === 'UNPAID' || g.payment_status === 'PARTIAL').length;

  // Group GRNs by supplier for visual Supplier Bar Chart
  const supplierSummaryMap = new Map<string, { name: string; total: number; paid: number; due: number; count: number }>();
  activeGrns.forEach((g) => {
    const name = g.supplier_name || 'General Supplier';
    const cost = Number(g.total_cost || 0);
    const paid = Number(g.paid_amount ?? (g.payment_status === 'PAID' ? cost : 0));
    const due = Math.max(0, cost - paid);
    const prev = supplierSummaryMap.get(name) || { name, total: 0, paid: 0, due: 0, count: 0 };
    prev.total += cost;
    prev.paid += paid;
    prev.due += due;
    prev.count += 1;
    supplierSummaryMap.set(name, prev);
  });
  const supplierChartList = Array.from(supplierSummaryMap.values()).sort((a, b) => b.total - a.total).slice(0, 6);
  const maxSupplierTotal = Math.max(1, ...supplierChartList.map((s) => s.total));

  // Group GRNs by Date for GRN Trend Column Graph
  const grnDateMap = new Map<string, { date: string; total: number; count: number }>();
  activeGrns.forEach((g) => {
    const d = (g.received_date || '').slice(0, 10) || 'Recent';
    const prev = grnDateMap.get(d) || { date: d, total: 0, count: 0 };
    prev.total += Number(g.total_cost || 0);
    prev.count += 1;
    grnDateMap.set(d, prev);
  });
  const grnDateTrend = Array.from(grnDateMap.values()).slice(0, 8).reverse();
  const maxGrnDateTotal = Math.max(1, ...grnDateTrend.map((d) => d.total));

  const displayedGrns = activeGrns.filter((g) => {
    const cost = Number(g.total_cost || 0);
    const paid = Number(g.paid_amount ?? (g.payment_status === 'PAID' ? cost : 0));
    const due = Math.max(0, cost - paid);
    if (grnFilter === 'credit_due') return due > 0 || g.payment_status === 'UNPAID' || g.payment_status === 'PARTIAL';
    if (grnFilter === 'paid') return due <= 0 && g.payment_status === 'PAID';
    return true;
  });

  // ============================================================================
  // CSV EXPORT HANDLER
  // ============================================================================
  const exportCurrentReportCsv = () => {
    let csv = `POS REPORT EXPORT (${activeReport.toUpperCase()})\n`;
    csv += `Generated On,${new Date().toLocaleString()}\n\n`;

    if (activeReport === 'sales_profit') {
      csv += `Metric,Amount\n`;
      csv += `Total Sales,${grossRev.toFixed(2)}\n`;
      csv += `Item Cost (COGS),${cogsVal.toFixed(2)}\n`;
      csv += `Gross Profit,${grossProfitVal.toFixed(2)}\n`;
      csv += `Operating Expenses,${expensesVal.toFixed(2)}\n`;
      csv += `Net Profit,${netProfitVal.toFixed(2)}\n`;
    } else if (activeReport === 'payments') {
      csv += `Method,Amount,Share %\n`;
      csv += `Cash,${cashRev.toFixed(2)},${cashPercent}%\n`;
      csv += `Card,${cardRev.toFixed(2)},${cardPercent}%\n`;
      csv += `Cheque,${chequeRev.toFixed(2)},${chequePercent}%\n`;
    } else if (activeReport === 'fast_moving') {
      csv += `Item Name,Barcode,Category,Units Sold,Revenue,Profit\n`;
      mostProfitable.forEach((p: any) => {
        csv += `"${p.product_name}",${p.barcode},"${p.category_name}",${p.units_sold},${p.total_revenue},${p.total_profit}\n`;
      });
    } else if (activeReport === 'stock_valuation') {
      csv += `Item Name,Barcode,Category,Current Stock,Min Level,Cost Price,Selling Price\n`;
      displayedStockItems.forEach((p) => {
        csv += `"${p.name}",${p.barcode},"${p.category_name || 'General'}",${p.stock_quantity},${p.min_stock_level ?? 5},${p.cost_price},${p.selling_price}\n`;
      });
    } else if (activeReport === 'grn_credit') {
      csv += `GRN #,Date,Supplier,Invoice #,Total Cost,Paid Amount,Balance Due,Status\n`;
      displayedGrns.forEach((g) => {
        const cost = Number(g.total_cost || 0);
        const paid = Number(g.paid_amount ?? (g.payment_status === 'PAID' ? cost : 0));
        const due = Math.max(0, cost - paid);
        csv += `${g.grn_number},${g.received_date},"${g.supplier_name}","${g.invoice_number || ''}",${cost.toFixed(2)},${paid.toFixed(2)},${due.toFixed(2)},${g.payment_status}\n`;
      });
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pos_report_${activeReport}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 p-3 sm:p-5 overflow-y-auto">
      <div className="max-w-7xl mx-auto w-full space-y-5 pb-14">

        {/* ========================================================================= */}
        {/* TOP HEADER & TIME PERIOD BAR                                              */}
        {/* ========================================================================= */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 shadow-md">
          <div>
            <h1 className="text-lg sm:text-xl font-extrabold text-white flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center text-white shadow-xs">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <span>Reports & Visual Analytics (ප්‍රස්තාර සහ වාර්තා)</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              පහත තියෙන ප්‍රධාන Reports 5න් ඔයාට බලන්න ඕන Report එක තෝරන්න — හැම Report එකකම පැහැදිලි Graphs ඇතුළත් කර ඇත
            </p>
          </div>

          {/* Time Period Selector & Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-between lg:justify-end">
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
              {(['daily', 'weekly', 'monthly', 'all'] as AnalyticsPeriod[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    period === p
                      ? 'bg-emerald-500 text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {p === 'daily' && 'අද (Daily)'}
                  {p === 'weekly' && 'සතිය (7 Days)'}
                  {p === 'monthly' && 'මාසය (30 Days)'}
                  {p === 'all' && 'මුළු කාලයම (All)'}
                </button>
              ))}
            </div>

            {period === 'daily' && (
              <div className="flex items-center gap-1.5">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-slate-950 border border-slate-750 text-slate-200 text-xs px-2.5 py-1.5 rounded-xl font-mono outline-hidden"
                />
              </div>
            )}

            <div className="flex items-center gap-2">
              <button
                onClick={exportCurrentReportCsv}
                className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
              >
                <Download className="w-3.5 h-3.5 text-white" />
                <span>CSV Download</span>
              </button>
              <button
                onClick={() => window.print()}
                className="px-3 py-1.5 bg-teal-500 hover:bg-teal-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
              >
                <Printer className="w-3.5 h-3.5 text-white" />
                <span>Print</span>
              </button>
              <button
                onClick={loadReports}
                disabled={loading}
                title="Refresh"
                className="p-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl transition cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 text-white ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 5 CLEAR REPORT TABS (SELECT ONE REPORT AT A TIME FOR CLARITY)             */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <button
            onClick={() => setActiveReport('sales_profit')}
            className={`p-3.5 rounded-2xl border-2 text-left transition cursor-pointer flex items-center gap-3 ${
              activeReport === 'sales_profit'
                ? 'bg-emerald-500 text-white border-emerald-600 shadow-lg scale-[1.01]'
                : 'bg-slate-900 border-slate-800 text-slate-200 hover:border-emerald-500'
            }`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              activeReport === 'sales_profit' ? 'bg-white/20 text-white' : 'bg-emerald-500 text-white'
            }`}>
              <DollarSign className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-extrabold uppercase tracking-wider opacity-80">Report 01</div>
              <div className="text-sm font-black truncate">Sales & Profit</div>
              <div className="text-[11px] opacity-85 truncate">විකුණුම් සහ ලාභය (4 Graphs)</div>
            </div>
          </button>

          <button
            onClick={() => setActiveReport('payments')}
            className={`p-3.5 rounded-2xl border-2 text-left transition cursor-pointer flex items-center gap-3 ${
              activeReport === 'payments'
                ? 'bg-emerald-500 text-white border-emerald-600 shadow-lg scale-[1.01]'
                : 'bg-slate-900 border-slate-800 text-slate-200 hover:border-emerald-500'
            }`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              activeReport === 'payments' ? 'bg-white/20 text-white' : 'bg-blue-500 text-white'
            }`}>
              <CreditCard className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-extrabold uppercase tracking-wider opacity-80">Report 02</div>
              <div className="text-sm font-black truncate">Cash / Card / Cheque</div>
              <div className="text-[11px] opacity-85 truncate">මුදල් ලැබීම් (3 Graphs)</div>
            </div>
          </button>

          <button
            onClick={() => setActiveReport('fast_moving')}
            className={`p-3.5 rounded-2xl border-2 text-left transition cursor-pointer flex items-center gap-3 ${
              activeReport === 'fast_moving'
                ? 'bg-emerald-500 text-white border-emerald-600 shadow-lg scale-[1.01]'
                : 'bg-slate-900 border-slate-800 text-slate-200 hover:border-emerald-500'
            }`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              activeReport === 'fast_moving' ? 'bg-white/20 text-white' : 'bg-amber-500 text-white'
            }`}>
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-extrabold uppercase tracking-wider opacity-80">Report 03</div>
              <div className="text-sm font-black truncate">Fast & Dead Stock</div>
              <div className="text-[11px] opacity-85 truncate">වැඩියෙන්ම විකිණෙන බඩු (3 Graphs)</div>
            </div>
          </button>

          <button
            onClick={() => setActiveReport('stock_valuation')}
            className={`p-3.5 rounded-2xl border-2 text-left transition cursor-pointer flex items-center gap-3 ${
              activeReport === 'stock_valuation'
                ? 'bg-emerald-500 text-white border-emerald-600 shadow-lg scale-[1.01]'
                : 'bg-slate-900 border-slate-800 text-slate-200 hover:border-emerald-500'
            }`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              activeReport === 'stock_valuation' ? 'bg-white/20 text-white' : 'bg-purple-500 text-white'
            }`}>
              <Package className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-extrabold uppercase tracking-wider opacity-80">Report 04</div>
              <div className="text-sm font-black truncate">Low Stock & Value</div>
              <div className="text-[11px] opacity-85 truncate">Stock වටිනාකම (3 Graphs)</div>
            </div>
          </button>

          <button
            onClick={() => setActiveReport('grn_credit')}
            className={`p-3.5 rounded-2xl border-2 text-left transition cursor-pointer flex items-center gap-3 ${
              activeReport === 'grn_credit'
                ? 'bg-emerald-500 text-white border-emerald-600 shadow-lg scale-[1.01]'
                : 'bg-slate-900 border-slate-800 text-slate-200 hover:border-emerald-500'
            }`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              activeReport === 'grn_credit' ? 'bg-white/20 text-white' : 'bg-rose-500 text-white'
            }`}>
              <ClipboardCheck className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-extrabold uppercase tracking-wider opacity-80">Report 05</div>
              <div className="text-sm font-black truncate">GRN & Supplier Credit</div>
              <div className="text-[11px] opacity-85 truncate">බඩු ගැනුම් සහ ණය (3 Graphs)</div>
            </div>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* REPORT 01: SALES, EXPENSES & PROFIT SUMMARY (4 VISUAL GRAPHS!)            */}
        {/* ========================================================================= */}
        {activeReport === 'sales_profit' && (
          <div className="space-y-5 animate-in fade-in">
            {/* 4 Big Clear Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-md">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-extrabold uppercase text-slate-400 block">1. මුළු විකුණුම් (Total Sales)</span>
                    <span className="text-[11px] text-slate-400">{summary.total_orders || 0} Bills • {summary.total_units_sold || 0} Items</span>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-white" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-emerald-400 mt-3 font-mono">
                  {currency}{grossRev.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-md">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-extrabold uppercase text-slate-400 block">2. බඩුවල ගැනුම් මිල (COGS)</span>
                    <span className="text-[11px] text-slate-400">විකුණපු බඩුවල Cost එක</span>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-blue-500 text-white flex items-center justify-center">
                    <Tag className="w-5 h-5 text-white" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-blue-400 mt-3 font-mono">
                  {currency}{cogsVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-md">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-extrabold uppercase text-slate-400 block">3. කඩේ වියදම් (Expenses)</span>
                    <span className="text-[11px] text-slate-400">{summary.expense_count || 0} Expense Bills</span>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-rose-500 text-white flex items-center justify-center">
                    <TrendingDown className="w-5 h-5 text-white" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-rose-400 mt-3 font-mono">
                  {currency}{expensesVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>

              <div className="bg-slate-900 border-2 border-emerald-500 rounded-2xl p-5 shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-extrabold uppercase text-emerald-400 block">4. ශුද්ධ ලාභය (Net Profit)</span>
                    <span className="text-[11px] text-slate-400">වියදම් අඩු කළ පසු අතට ලාභය</span>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center">
                    <ArrowUpRight className="w-5 h-5 text-white" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-emerald-400 mt-3 font-mono">
                  {currency}{netProfitVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>

            {/* ROW 1 OF GRAPHS: GRAPH 1 = VERTICAL COLUMN CHART, GRAPH 2 = DONUT BREAKDOWN */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Graph 1: Vertical 5-Column Financial Chart */}
              <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
                <div className="border-b border-slate-800 pb-3 mb-4 flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center">
                    <BarChart3 className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-white">Graph 1: ආදායම්, වියදම් සහ ලාභ සිරස් ප්‍රස්තාරය (Vertical Column Graph)</h3>
                    <span className="text-xs text-slate-400">Sales vs Cost vs Gross Profit vs Expenses vs Net Profit</span>
                  </div>
                </div>

                {/* Vertical Columns */}
                <div className="h-52 flex items-end justify-around gap-3 pt-8 pb-2 px-2 border-b border-slate-800">
                  {[
                    { label: 'මුළු විකුණුම් (Sales)', val: grossRev, color: 'linear-gradient(180deg, #10b981 0%, #059669 100%)' },
                    { label: 'බඩු මිල (COGS)', val: cogsVal, color: 'linear-gradient(180deg, #3b82f6 0%, #2563eb 100%)' },
                    { label: 'දළ ලාභය (Gross)', val: Math.max(0, grossProfitVal), color: 'linear-gradient(180deg, #14b8a6 0%, #0d9488 100%)' },
                    { label: 'වියදම් (Expenses)', val: expensesVal, color: 'linear-gradient(180deg, #f43f5e 0%, #e11d48 100%)' },
                    { label: 'ශුද්ධ ලාභය (Net)', val: Math.max(0, netProfitVal), color: 'linear-gradient(180deg, #8b5cf6 0%, #6d28d9 100%)' },
                  ].map((col, i) => {
                    const hPct = Math.max(12, Math.round((col.val / maxFinanceBar) * 100));
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
                        <span className="text-[10px] font-mono font-black text-white mb-1.5 text-center">
                          {currency}{Math.round(col.val).toLocaleString()}
                        </span>
                        <div
                          style={{ height: `${hPct}%`, background: col.color }}
                          className="w-full max-w-[54px] rounded-t-xl shadow-md transition-all duration-500"
                        />
                      </div>
                    );
                  })}
                </div>
                <div className="grid grid-cols-5 gap-1 pt-2 text-center text-[10px] font-bold text-slate-400">
                  <span>1. Sales</span>
                  <span>2. COGS</span>
                  <span>3. Gross</span>
                  <span>4. Expenses</span>
                  <span>5. Net Profit</span>
                </div>
              </div>

              {/* Graph 2: Revenue Split Donut Ring (COGS vs Expenses vs Net Profit) */}
              <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
                <div className="border-b border-slate-800 pb-3 mb-2 flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-500 text-white flex items-center justify-center">
                    <PieChart className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-white">Graph 2: ආදායම බෙදී ගිය ආකාරය (Revenue Split Donut Graph)</h3>
                    <span className="text-xs text-slate-400">බඩු වියදම, කඩේ වියදම් සහ ශුද්ධ ලාභය රවුම් ප්‍රස්තාරයෙන්</span>
                  </div>
                </div>

                <VisualDonutGraph
                  currency={currency}
                  centerTitle="Total Sales"
                  centerValue={`${currency}${Math.round(grossRev).toLocaleString()}`}
                  centerSub={`${summary.profit_margin || 0}% Margin`}
                  segments={[
                    { label: 'ශුද්ධ ලාභය (Net Profit)', value: Math.max(0, netProfitVal), color: '#10b981' },
                    { label: 'බඩුවල ගැනුම් මිල (COGS)', value: Math.max(0, cogsVal), color: '#3b82f6' },
                    { label: 'කඩේ වියදම් (Expenses)', value: Math.max(0, expensesVal), color: '#f43f5e' },
                  ]}
                />
              </div>
            </div>

            {/* ROW 2 OF GRAPHS: GRAPH 3 = HOURLY/DAILY TREND, GRAPH 4 = CATEGORY PIE CHART */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* Graph 3: Hourly / Daily Sales Trend Graph */}
              <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between min-h-[360px]">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center">
                      <Activity className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold text-white">
                        Graph 3: {period === 'daily' ? 'පැයෙන් පැය විකුණුම් ප්‍රස්තාරය (Hourly Trend)' : 'දිනපතා විකුණුම් ප්‍රස්තාරය (Daily Sales Trend)'}
                      </h3>
                      <span className="text-xs text-slate-400">කාලය අනුව විකුණුම් වෙනස් වූ ආකාරය</span>
                    </div>
                  </div>
                </div>

                <div className="flex-1 flex flex-col justify-end pt-8 pb-2">
                  <div className="h-48 flex items-end gap-2 px-2 border-b border-slate-800">
                    {(timelineTrend.length > 0
                      ? timelineTrend
                      : [
                          { time_label: '08:00', revenue: 0 },
                          { time_label: '10:00', revenue: 0 },
                          { time_label: '12:00', revenue: 0 },
                          { time_label: '14:00', revenue: 0 },
                          { time_label: '16:00', revenue: 0 },
                          { time_label: '18:00', revenue: 0 },
                          { time_label: '20:00', revenue: 0 },
                        ]
                    ).map((point: any, idx: number) => {
                      const rev = Number(point.revenue || 0);
                      const heightPercent = rev > 0 ? Math.max(12, Math.round((rev / maxTrendRevenue) * 100)) : 8;
                      return (
                        <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full">
                          <span className="text-[9px] font-mono font-bold text-slate-400 mb-1 truncate max-w-full">
                            {rev > 0 ? Math.round(rev).toLocaleString() : '0'}
                          </span>
                          <div
                            style={{
                              height: `${heightPercent}%`,
                              background: rev > 0 ? 'linear-gradient(180deg, #10b981 0%, #059669 100%)' : '#cbd5e1',
                            }}
                            className="w-full max-w-[40px] rounded-t-lg transition-all duration-300 shadow-xs"
                          />
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono font-bold pt-2 px-1">
                    {(timelineTrend.length > 0
                      ? timelineTrend
                      : [
                          { time_label: '08:00' },
                          { time_label: '10:00' },
                          { time_label: '12:00' },
                          { time_label: '14:00' },
                          { time_label: '16:00' },
                          { time_label: '18:00' },
                          { time_label: '20:00' },
                        ]
                    ).map((pt: any, i: number) => (
                      <span key={i} className="truncate text-center flex-1">{pt.time_label}</span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Graph 4: Category Pie Chart */}
              <div className="lg:col-span-6">
                <CategoryPieChart
                  categories={categories}
                  currency={currency}
                  title={`Graph 4: කාණ්ඩ අනුව විකුණුම් ප්‍රස්තාරය - Category Sales (${period.toUpperCase()})`}
                />
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* REPORT 02: PAYMENT METHOD BREAKDOWN (3 VISUAL GRAPHS!)                    */}
        {/* ========================================================================= */}
        {activeReport === 'payments' && (
          <div className="space-y-5 animate-in fade-in">
            {/* 3 Graphs Row */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Graph 1: Cash vs Card vs Cheque Donut Chart */}
              <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
                <div className="border-b border-slate-800 pb-3 mb-3 flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center">
                    <PieChart className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-white">Graph 1: Cash / Card / Cheque රවුම් ප්‍රස්තාරය (Donut Graph)</h3>
                    <span className="text-xs text-slate-400">මුදල් ලැබුණු ආකාරය ප්‍රතිශතයක් ලෙස</span>
                  </div>
                </div>

                <VisualDonutGraph
                  currency={currency}
                  centerTitle="Total Collected"
                  centerValue={`${currency}${Math.round(totalCollected).toLocaleString()}`}
                  centerSub={`${summary.total_orders || 0} Bills`}
                  segments={[
                    { label: '1. අතට ලැබුණු මුදල් (Cash)', value: cashRev, color: '#10b981' },
                    { label: '2. කාඩ්පත් ගෙවීම් (Card)', value: cardRev, color: '#3b82f6' },
                    { label: '3. චෙක්පත් ගෙවීම් (Cheque)', value: chequeRev, color: '#8b5cf6' },
                  ]}
                />
              </div>

              {/* Graph 2: Vertical Column Comparison + Retail vs Wholesale Graph */}
              <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
                <div className="border-b border-slate-800 pb-3 mb-3 flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-500 text-white flex items-center justify-center">
                    <BarChart3 className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-white">Graph 2: ගෙවීම් ක්‍රම සහ Retail vs Wholesale ප්‍රස්තාරය</h3>
                    <span className="text-xs text-slate-400">Cash, Card, Cheque, Retail සහ Wholesale සංසන්දනය</span>
                  </div>
                </div>

                <div className="h-48 flex items-end justify-around gap-3 pt-6 pb-2 px-2 border-b border-slate-800">
                  {[
                    { label: 'Cash', val: cashRev, color: '#10b981' },
                    { label: 'Card', val: cardRev, color: '#3b82f6' },
                    { label: 'Cheque', val: chequeRev, color: '#8b5cf6' },
                    { label: 'Retail POS', val: retailTotalAmt, color: '#14b8a6' },
                    { label: 'Wholesale', val: wholesaleTotalAmt, color: '#f59e0b' },
                  ].map((bar, idx) => {
                    const maxP = Math.max(1, cashRev, cardRev, chequeRev, retailTotalAmt, wholesaleTotalAmt);
                    const hPct = bar.val > 0 ? Math.max(14, Math.round((bar.val / maxP) * 100)) : 8;
                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full">
                        <span className="text-[10px] font-mono font-black text-white mb-1">
                          {currency}{Math.round(bar.val).toLocaleString()}
                        </span>
                        <div
                          style={{ height: `${hPct}%`, backgroundColor: bar.color }}
                          className="w-full max-w-[48px] rounded-t-xl shadow-md transition-all duration-500"
                        />
                      </div>
                    );
                  })}
                </div>
                <div className="grid grid-cols-5 gap-1 pt-2 text-center text-[10px] font-bold text-slate-400">
                  <span>💵 Cash</span>
                  <span>💳 Card</span>
                  <span>🏦 Cheque</span>
                  <span>🛒 Retail</span>
                  <span>🏢 Wholesale</span>
                </div>
              </div>
            </div>

            {/* Filterable Bills Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
              <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2 bg-slate-850">
                <div className="flex items-center gap-2 flex-wrap">
                  {(['ALL', 'CASH', 'CARD', 'CHEQUE'] as PaymentFilter[]).map((f) => (
                    <button
                      key={f}
                      onClick={() => setPaymentFilter(f)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                        paymentFilter === f ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {f === 'ALL' && 'සියලුම බිල් (All Bills)'}
                      {f === 'CASH' && '💵 Cash බිල් පමණක්'}
                      {f === 'CARD' && '💳 Card බිල් පමණක්'}
                      {f === 'CHEQUE' && '🏦 Cheque බිල් පමණක්'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="overflow-x-auto max-h-80">
                <table className="w-full min-w-[650px] text-left text-xs text-slate-300 border-collapse">
                  <thead className="bg-slate-850 border-b border-slate-800 uppercase font-bold text-[11px] sticky top-0">
                    <tr>
                      <th className="py-3 px-4">Invoice #</th>
                      <th className="py-3 px-4">Date & Time</th>
                      <th className="py-3 px-4">Method</th>
                      <th className="py-3 px-4">Ref / Cheque #</th>
                      <th className="py-3 px-4 text-right">Amount</th>
                      <th className="py-3 px-4 text-center">Print</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                    {filteredOrders.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-500 font-sans">
                          මෙම ගෙවීම් ක්‍රමය යටතේ බිල් හමු නොවීය.
                        </td>
                      </tr>
                    ) : (
                      filteredOrders.slice(0, 25).map((ord: any) => (
                        <tr key={ord.id} className="hover:bg-slate-800/40 transition">
                          <td className="py-2.5 px-4 font-bold text-white">{ord.order_number}</td>
                          <td className="py-2.5 px-4 text-slate-400">{new Date(ord.created_at).toLocaleString()}</td>
                          <td className="py-2.5 px-4 font-sans">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-700">
                              {ord.payment_method}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-slate-400">
                            {ord.cheque_number ? `CHQ: ${ord.cheque_number}` : ord.card_reference ? `REF: ${ord.card_reference}` : '—'}
                          </td>
                          <td className="py-2.5 px-4 text-right font-bold text-emerald-400 text-xs">
                            {currency}{Number(ord.total_amount || 0).toFixed(2)}
                          </td>
                          <td className="py-2.5 px-4 text-center font-sans">
                            <button
                              onClick={() => handleReprintOrder(ord.id)}
                              className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-[10px] font-bold transition cursor-pointer"
                            >
                              Receipt
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* REPORT 03: FAST-MOVING, PROFITABLE & DEAD STOCK (3 VISUAL GRAPHS!)        */}
        {/* ========================================================================= */}
        {activeReport === 'fast_moving' && (
          <div className="space-y-5 animate-in fade-in">
            {/* 3 Visual Graphs Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Graph 1: Fast-Moving by Units Sold */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
                <div className="border-b border-slate-800 pb-3 mb-4 flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0">
                    <TrendingUp className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-white">Graph 1: වැඩියෙන්ම විකිණෙන බඩු</h3>
                    <span className="text-[11px] text-slate-400">විකිණුනු ඒකක ගණන (Units Sold)</span>
                  </div>
                </div>

                {fastMoving.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-500">තවම විකුණුම් වාර්තා වී නැත</div>
                ) : (
                  <div className="space-y-3">
                    {fastMoving.slice(0, 6).map((p: any, idx: number) => {
                      const qty = Number(p.units_sold || 0);
                      const pct = Math.max(10, Math.round((qty / maxFastUnits) * 100));
                      return (
                        <div key={idx}>
                          <div className="flex justify-between text-xs font-bold mb-1">
                            <span className="text-white truncate pr-2">#{idx + 1} {p.product_name}</span>
                            <span className="font-mono text-emerald-400 font-black shrink-0">{qty} sold</span>
                          </div>
                          <div className="w-full h-3.5 bg-slate-950 rounded-xl overflow-hidden border border-slate-800 p-0.5">
                            <div
                              style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #10b981, #059669)' }}
                              className="h-full rounded-lg"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Graph 2: Most Profitable Items */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
                <div className="border-b border-slate-800 pb-3 mb-4 flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-500 text-white flex items-center justify-center shrink-0">
                    <DollarSign className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-white">Graph 2: වැඩිම ලාභ ගෙනා බඩු</h3>
                    <span className="text-[11px] text-slate-400">ලැබුණු මුළු ලාභය (Total Profit)</span>
                  </div>
                </div>

                {mostProfitable.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-500">තවම විකුණුම් වාර්තා වී නැත</div>
                ) : (
                  <div className="space-y-3">
                    {mostProfitable.slice(0, 6).map((p: any, idx: number) => {
                      const prof = Math.max(0, Number(p.total_profit || 0));
                      const pct = Math.max(10, Math.round((prof / maxProfitableAmt) * 100));
                      return (
                        <div key={idx}>
                          <div className="flex justify-between text-xs font-bold mb-1">
                            <span className="text-white truncate pr-2">#{idx + 1} {p.product_name}</span>
                            <span className="font-mono text-blue-400 font-black shrink-0">+{currency}{prof.toFixed(0)}</span>
                          </div>
                          <div className="w-full h-3.5 bg-slate-950 rounded-xl overflow-hidden border border-slate-800 p-0.5">
                            <div
                              style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #3b82f6, #2563eb)' }}
                              className="h-full rounded-lg"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Graph 3: Dead Stock Capital Tied Up */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
                <div className="border-b border-slate-800 pb-3 mb-4 flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
                    <Archive className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-white">Graph 3: නොවිකිණෙන බඩු (Dead Stock)</h3>
                    <span className="text-[11px] text-slate-400">හිරවී ඇති මුදල් වටිනාකම (Tied-up Cost)</span>
                  </div>
                </div>

                {deadStockItems.length === 0 ? (
                  <div className="py-8 text-center text-xs text-emerald-400">සියලුම භාණ්ඩ අලෙවි වී ඇත!</div>
                ) : (
                  <div className="space-y-3">
                    {deadStockItems.slice(0, 6).map((item, idx) => {
                      const tied = Number(item.stock_quantity || 0) * Number(item.cost_price || 0);
                      const pct = Math.max(10, Math.round((tied / maxDeadStockCost) * 100));
                      return (
                        <div key={item.id}>
                          <div className="flex justify-between text-xs font-bold mb-1">
                            <span className="text-white truncate pr-2">#{idx + 1} {item.name}</span>
                            <span className="font-mono text-amber-400 font-black shrink-0">{currency}{tied.toFixed(0)}</span>
                          </div>
                          <div className="w-full h-3.5 bg-slate-950 rounded-xl overflow-hidden border border-slate-800 p-0.5">
                            <div
                              style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #f59e0b, #d97706)' }}
                              className="h-full rounded-lg"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Sub-Tabs & Detailed Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
              <div className="px-5 py-3.5 border-b border-slate-800 flex items-center gap-2 flex-wrap bg-slate-850">
                <button
                  onClick={() => setProductTab('volume')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    productTab === 'volume' ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  🔥 වැඩියෙන්ම විකිණෙන බඩු ({fastMoving.length})
                </button>
                <button
                  onClick={() => setProductTab('profitable')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    productTab === 'profitable' ? 'bg-blue-500 text-white' : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  💎 වැඩිම ලාභ ගෙනා බඩු ({mostProfitable.length})
                </button>
                <button
                  onClick={() => setProductTab('dead_stock')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    productTab === 'dead_stock' ? 'bg-amber-500 text-white' : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  💤 නොවිකිණෙන බඩු / Dead Stock ({deadStockItems.length})
                </button>
              </div>

              {productTab === 'volume' && (
                <div className="overflow-x-auto max-h-80">
                  <table className="w-full min-w-[600px] text-left text-xs text-slate-300 border-collapse">
                    <thead className="bg-slate-850 border-b border-slate-800 uppercase font-bold text-[11px] sticky top-0">
                      <tr>
                        <th className="py-3 px-4">#</th>
                        <th className="py-3 px-4">Item Name</th>
                        <th className="py-3 px-4">Category</th>
                        <th className="py-3 px-4 text-center">Units Sold</th>
                        <th className="py-3 px-4 text-right">Total Sales</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                      {fastMoving.map((p: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-800/40">
                          <td className="py-2.5 px-4 font-bold">{idx + 1}</td>
                          <td className="py-2.5 px-4 font-sans font-bold text-white">{p.product_name}</td>
                          <td className="py-2.5 px-4 font-sans">{p.category_name}</td>
                          <td className="py-2.5 px-4 text-center font-black text-white text-sm">{p.units_sold}</td>
                          <td className="py-2.5 px-4 text-right font-bold text-emerald-400">{currency}{Number(p.total_revenue || 0).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {productTab === 'profitable' && (
                <div className="overflow-x-auto max-h-80">
                  <table className="w-full min-w-[650px] text-left text-xs text-slate-300 border-collapse">
                    <thead className="bg-slate-850 border-b border-slate-800 uppercase font-bold text-[11px] sticky top-0">
                      <tr>
                        <th className="py-3 px-4">Item Name</th>
                        <th className="py-3 px-4 text-center">Sold</th>
                        <th className="py-3 px-4 text-right">Selling Price</th>
                        <th className="py-3 px-4 text-right">Cost Price</th>
                        <th className="py-3 px-4 text-right">Total Profit</th>
                        <th className="py-3 px-4 text-center">Margin %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                      {mostProfitable.map((p: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-800/40">
                          <td className="py-2.5 px-4 font-sans font-bold text-white">{p.product_name}</td>
                          <td className="py-2.5 px-4 text-center font-bold">{p.units_sold}</td>
                          <td className="py-2.5 px-4 text-right">{currency}{Number(p.avg_selling_price || 0).toFixed(2)}</td>
                          <td className="py-2.5 px-4 text-right">{currency}{Number(p.cost_price || 0).toFixed(2)}</td>
                          <td className="py-2.5 px-4 text-right font-bold text-emerald-400">+{currency}{Number(p.total_profit || 0).toFixed(2)}</td>
                          <td className="py-2.5 px-4 text-center font-bold text-blue-400">{p.margin_percentage}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {productTab === 'dead_stock' && (
                <div className="overflow-x-auto max-h-80">
                  <table className="w-full min-w-[650px] text-left text-xs text-slate-300 border-collapse">
                    <thead className="bg-slate-850 border-b border-slate-800 uppercase font-bold text-[11px] sticky top-0">
                      <tr>
                        <th className="py-3 px-4">Item Name</th>
                        <th className="py-3 px-4">Barcode</th>
                        <th className="py-3 px-4 text-center">Stock on Hand</th>
                        <th className="py-3 px-4 text-right">Unit Cost</th>
                        <th className="py-3 px-4 text-right">Tied-Up Cost Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                      {deadStockItems.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-800/40">
                          <td className="py-2.5 px-4 font-sans font-bold text-white">{item.name}</td>
                          <td className="py-2.5 px-4 text-slate-400">{item.barcode}</td>
                          <td className="py-2.5 px-4 text-center font-bold text-amber-400">{item.stock_quantity} {item.unit || 'pcs'}</td>
                          <td className="py-2.5 px-4 text-right">{currency}{Number(item.cost_price || 0).toFixed(2)}</td>
                          <td className="py-2.5 px-4 text-right font-bold text-amber-400">
                            {currency}{(Number(item.stock_quantity || 0) * Number(item.cost_price || 0)).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* REPORT 04: LOW STOCK & INVENTORY VALUATION (3 VISUAL GRAPHS!)             */}
        {/* ========================================================================= */}
        {activeReport === 'stock_valuation' && (
          <div className="space-y-5 animate-in fade-in">
            {/* Row 1 of Graphs: Graph 1 = Donut Chart of Stock Health, Graph 2 = Cost vs Retail vs Profit Column Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Graph 1: Stock Health Donut Graph */}
              <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
                <div className="border-b border-slate-800 pb-3 mb-2 flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center">
                    <PieChart className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-white">Graph 1: තොග තත්ත්ව රවුම් ප්‍රස්තාරය (Stock Health Donut Graph)</h3>
                    <span className="text-xs text-slate-400">ප්‍රමාණවත් තොග, අඩු තොග සහ ඉවර වුණු බඩු</span>
                  </div>
                </div>

                <VisualDonutGraph
                  centerTitle="Total Items"
                  centerValue={`${totalInventoryItems}`}
                  centerSub={`${totalInventoryUnits} Units`}
                  segments={[
                    { label: '✅ ප්‍රමාණවත් තොග (Healthy Stock)', value: healthyStockItemsCount, color: '#10b981' },
                    { label: '⚠️ ඉවර වෙන්න ලඟ (Low Stock)', value: lowStockOnlyItems.length, color: '#f59e0b' },
                    { label: '🚫 ඉවර වුණු බඩු (Out of Stock - 0)', value: outOfStockItems.length, color: '#ef4444' },
                  ]}
                />
              </div>

              {/* Graph 2: Cost vs Retail vs Profit Vertical Column Chart */}
              <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
                <div className="border-b border-slate-800 pb-3 mb-3 flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-500 text-white flex items-center justify-center">
                    <BarChart3 className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-white">Graph 2: මුළු Stock වටිනාකම සහ ලාභ සිරස් ප්‍රස්තාරය</h3>
                    <span className="text-xs text-slate-400">Cost Value vs Retail Value vs Expected Profit</span>
                  </div>
                </div>

                <div className="h-44 flex items-end justify-around gap-6 pt-6 pb-2 px-4 border-b border-slate-800">
                  {[
                    { label: 'ගැනුම් වටිනාකම (Cost)', val: totalCostValuation, color: '#3b82f6' },
                    { label: 'විකුණුම් වටිනාකම (Retail)', val: totalRetailValuation, color: '#10b981' },
                    { label: 'අපේක්ෂිත ලාභය (Profit)', val: expectedStockProfit, color: '#8b5cf6' },
                  ].map((col, idx) => {
                    const hPct = col.val > 0 ? Math.max(15, Math.round((col.val / maxValuationBar) * 100)) : 10;
                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full">
                        <span className="text-xs font-mono font-black text-white mb-1.5">
                          {currency}{Math.round(col.val).toLocaleString()}
                        </span>
                        <div
                          style={{ height: `${hPct}%`, backgroundColor: col.color }}
                          className="w-full max-w-[70px] rounded-t-xl shadow-md transition-all duration-500"
                        />
                      </div>
                    );
                  })}
                </div>
                <div className="grid grid-cols-3 gap-2 pt-2 text-center text-xs font-bold text-slate-400">
                  <span>1. Cost Value</span>
                  <span>2. Retail Value</span>
                  <span>3. Expected Profit</span>
                </div>
              </div>
            </div>

            {/* Graph 3: Category-wise Stock Valuation Horizontal Bar Graph */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
              <div className="border-b border-slate-800 pb-3 mb-4 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-500 text-white flex items-center justify-center">
                  <Package className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-white">Graph 3: කාණ්ඩ අනුව Stock වටිනාකම ප්‍රස්තාරය (Category Stock Valuation Graph)</h3>
                  <span className="text-xs text-slate-400">වැඩිම මුදලක් ආයෝජනය වී ඇති භාණ්ඩ කාණ්ඩ</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {categoryStockList.map((cat, idx) => {
                  const pct = Math.max(10, Math.round((cat.retailVal / maxCategoryRetailVal) * 100));
                  return (
                    <div key={idx} className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                      <div className="flex justify-between text-xs font-bold mb-1.5">
                        <span className="text-white">{cat.name} ({cat.units} units)</span>
                        <span className="font-mono font-black text-emerald-400">
                          {currency}{Math.round(cat.retailVal).toLocaleString()}
                        </span>
                      </div>
                      <div className="w-full h-3.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                        <div
                          style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #10b981, #3b82f6)' }}
                          className="h-full rounded-full"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Low Stock Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
              <div className="px-5 py-3.5 border-b border-slate-800 flex items-center gap-2 flex-wrap bg-slate-850">
                <button
                  onClick={() => setStockFilter('low_out')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    stockFilter === 'low_out' ? 'bg-amber-500 text-white' : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  ⚠️ ඉවර වෙන්න ලඟ සහ ඉවර වුණු බඩු ({lowAndOutStockItems.length})
                </button>
                <button
                  onClick={() => setStockFilter('out_only')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    stockFilter === 'out_only' ? 'bg-rose-500 text-white' : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  🚫 ඉවර වුණු බඩු පමණක් ({outOfStockItems.length})
                </button>
                <button
                  onClick={() => setStockFilter('all')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    stockFilter === 'all' ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  📦 සියලුම භාණ්ඩ ({inventoryProducts.length})
                </button>
              </div>

              <div className="overflow-x-auto max-h-80">
                <table className="w-full min-w-[650px] text-left text-xs text-slate-300 border-collapse">
                  <thead className="bg-slate-850 border-b border-slate-800 uppercase font-bold text-[11px] sticky top-0">
                    <tr>
                      <th className="py-3 px-4">Item Name</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4 text-center">Current Stock</th>
                      <th className="py-3 px-4 text-right">Cost Price</th>
                      <th className="py-3 px-4 text-right">Selling Price</th>
                      <th className="py-3 px-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                    {displayedStockItems.slice(0, 40).map((item) => {
                      const qty = Number(item.stock_quantity || 0);
                      const isOut = qty <= 0;
                      const isLow = !isOut && qty <= Number(item.min_stock_level ?? 5);
                      return (
                        <tr key={item.id} className="hover:bg-slate-800/40">
                          <td className="py-2.5 px-4 font-sans font-bold text-white">{item.name}</td>
                          <td className="py-2.5 px-4 font-sans">{item.category_name || 'General'}</td>
                          <td className={`py-2.5 px-4 text-center font-black text-sm ${isOut ? 'text-rose-400' : isLow ? 'text-amber-400' : 'text-emerald-400'}`}>
                            {qty} {item.unit || 'pcs'}
                          </td>
                          <td className="py-2.5 px-4 text-right">{currency}{Number(item.cost_price || 0).toFixed(2)}</td>
                          <td className="py-2.5 px-4 text-right font-bold text-emerald-400">{currency}{Number(item.selling_price || 0).toFixed(2)}</td>
                          <td className="py-2.5 px-4 text-center font-sans">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isOut ? 'bg-rose-950 text-rose-400 border border-rose-700' : isLow ? 'bg-amber-950 text-amber-400 border border-amber-700' : 'bg-emerald-950 text-emerald-400 border border-emerald-700'
                            }`}>
                              {isOut ? 'OUT OF STOCK' : isLow ? 'LOW STOCK' : 'IN STOCK'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* REPORT 05: GRN PURCHASES & SUPPLIER CREDIT (3 VISUAL GRAPHS!)             */}
        {/* ========================================================================= */}
        {activeReport === 'grn_credit' && (
          <div className="space-y-5 animate-in fade-in">
            {/* Row 1 of Graphs: Graph 1 = Paid vs Credit Donut Chart, Graph 2 = Supplier Bar Graph */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Graph 1: Paid vs Credit Due Donut Chart */}
              <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
                <div className="border-b border-slate-800 pb-3 mb-2 flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center">
                    <PieChart className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-white">Graph 1: GRN ගෙවීම් සහ Supplier ණය රවුම් ප්‍රස්තාරය (Donut Graph)</h3>
                    <span className="text-xs text-slate-400">මුළු GRN බිල් {activeGrns.length} ක ගෙවූ මුදල සහ ඉතිරි ණය</span>
                  </div>
                </div>

                <VisualDonutGraph
                  currency={currency}
                  centerTitle="Total Purchases"
                  centerValue={`${currency}${Math.round(totalGrnPurchases).toLocaleString()}`}
                  centerSub={`${unpaidGrnCount} Credit Bills`}
                  segments={[
                    { label: '✅ Suppliers ලට ගෙවූ මුදල (Paid)', value: totalGrnPaid, color: '#10b981' },
                    { label: '⚠️ තව ගෙවීමට ඇති ණය (Credit Due)', value: totalGrnCreditDue, color: '#ef4444' },
                  ]}
                />
              </div>

              {/* Graph 2: Top Suppliers Bar Graph */}
              <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
                <div className="border-b border-slate-800 pb-3 mb-4 flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-500 text-white flex items-center justify-center">
                    <BarChart3 className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-white">Graph 2: Suppliers අනුව බඩු ගැනුම් සහ ණය (Supplier Bar Graph)</h3>
                    <span className="text-xs text-slate-400">කොළ = ගෙවූ මුදල • රතු = ගෙවීමට ඇති ණය</span>
                  </div>
                </div>

                {supplierChartList.length === 0 ? (
                  <div className="py-10 text-center text-xs text-slate-500">තවම GRN බිල් ඇතුළත් කර නැත</div>
                ) : (
                  <div className="space-y-3">
                    {supplierChartList.map((sup, idx) => {
                      const totalPct = Math.max(12, Math.round((sup.total / maxSupplierTotal) * 100));
                      const paidShare = sup.total > 0 ? Math.round((sup.paid / sup.total) * 100) : 100;
                      const dueShare = Math.max(0, 100 - paidShare);
                      return (
                        <div key={idx}>
                          <div className="flex justify-between text-xs font-bold mb-1">
                            <span className="text-white truncate pr-2">{sup.name} ({sup.count} bills)</span>
                            <span className="font-mono shrink-0">
                              <strong className="text-emerald-400">{currency}{sup.total.toLocaleString()}</strong>
                              {sup.due > 0 && (
                                <span className="text-rose-400 ml-2">(ණය: {currency}{sup.due.toLocaleString()})</span>
                              )}
                            </span>
                          </div>
                          <div style={{ width: `${totalPct}%` }} className="h-4 bg-slate-950 rounded-xl overflow-hidden flex border border-slate-800 p-0.5 gap-0.5">
                            {paidShare > 0 && (
                              <div style={{ width: `${paidShare}%`, background: '#10b981' }} className="h-full rounded-l-md" />
                            )}
                            {dueShare > 0 && (
                              <div style={{ width: `${dueShare}%`, background: '#ef4444' }} className="h-full rounded-r-md" />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Graph 3: Date-wise GRN Inward Purchases Column Graph */}
            {grnDateTrend.length > 0 && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
                <div className="border-b border-slate-800 pb-3 mb-4 flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-white">Graph 3: දින අනුව බඩු ගැනුම් ප්‍රස්තාරය (GRN Purchase Timeline Graph)</h3>
                    <span className="text-xs text-slate-400">කඩේට බඩු දාපු දිනයන් සහ වටිනාකම</span>
                  </div>
                </div>

                <div className="h-40 flex items-end justify-around gap-3 pt-6 pb-2 px-2 border-b border-slate-800">
                  {grnDateTrend.map((pt, idx) => {
                    const hPct = Math.max(14, Math.round((pt.total / maxGrnDateTotal) * 100));
                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full">
                        <span className="text-[10px] font-mono font-bold text-white mb-1">
                          {currency}{Math.round(pt.total).toLocaleString()}
                        </span>
                        <div
                          style={{ height: `${hPct}%`, background: 'linear-gradient(180deg, #3b82f6 0%, #1d4ed8 100%)' }}
                          className="w-full max-w-[54px] rounded-t-xl shadow-sm"
                        />
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center justify-around pt-2 text-[10px] font-mono font-bold text-slate-400">
                  {grnDateTrend.map((pt, idx) => (
                    <span key={idx} className="truncate text-center flex-1">{pt.date}</span>
                  ))}
                </div>
              </div>
            )}

            {/* GRN Bills Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
              <div className="px-5 py-3.5 border-b border-slate-800 flex items-center gap-2 flex-wrap bg-slate-850">
                <button
                  onClick={() => setGrnFilter('all')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    grnFilter === 'all' ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  සියලුම GRN බිල් ({activeGrns.length})
                </button>
                <button
                  onClick={() => setGrnFilter('credit_due')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    grnFilter === 'credit_due' ? 'bg-rose-500 text-white' : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  ⚠️ ණය ගෙවීමට ඇති බිල් ({unpaidGrnCount})
                </button>
                <button
                  onClick={() => setGrnFilter('paid')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    grnFilter === 'paid' ? 'bg-blue-500 text-white' : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  ✅ ගෙවා අවසන් බිල් ({activeGrns.length - unpaidGrnCount})
                </button>
              </div>

              <div className="overflow-x-auto max-h-80">
                <table className="w-full min-w-[700px] text-left text-xs text-slate-300 border-collapse">
                  <thead className="bg-slate-850 border-b border-slate-800 uppercase font-bold text-[11px] sticky top-0">
                    <tr>
                      <th className="py-3 px-4">GRN #</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Supplier Name</th>
                      <th className="py-3 px-4 text-right">Total Cost</th>
                      <th className="py-3 px-4 text-right">Paid Amount</th>
                      <th className="py-3 px-4 text-right">Balance Due (ණය)</th>
                      <th className="py-3 px-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                    {displayedGrns.map((grn) => {
                      const cost = Number(grn.total_cost || 0);
                      const paid = Number(grn.paid_amount ?? (grn.payment_status === 'PAID' ? cost : 0));
                      const due = Math.max(0, cost - paid);
                      return (
                        <tr key={grn.id} className="hover:bg-slate-800/40">
                          <td className="py-2.5 px-4 font-bold text-white">{grn.grn_number}</td>
                          <td className="py-2.5 px-4 text-slate-400">{grn.received_date}</td>
                          <td className="py-2.5 px-4 font-sans font-bold text-white">{grn.supplier_name}</td>
                          <td className="py-2.5 px-4 text-right font-bold">{currency}{cost.toFixed(2)}</td>
                          <td className="py-2.5 px-4 text-right text-emerald-400 font-bold">{currency}{paid.toFixed(2)}</td>
                          <td className={`py-2.5 px-4 text-right font-black ${due > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                            {currency}{due.toFixed(2)}
                          </td>
                          <td className="py-2.5 px-4 text-center font-sans">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              due <= 0 ? 'bg-emerald-950 text-emerald-400 border border-emerald-700' : 'bg-rose-950 text-rose-400 border border-rose-700'
                            }`}>
                              {due <= 0 ? 'PAID' : grn.payment_status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Recent Bills & Void Modal */}
      <RecentBillsModal
        isOpen={isBillsModalOpen}
        settings={settings}
        currentUser={currentUser}
        onClose={() => {
          setIsBillsModalOpen(false);
          loadReports();
        }}
        onReprintReceipt={(receipt) => {
          setReprintReceipt(receipt);
        }}
      />

      {/* Thermal Receipt Print Preview */}
      <ThermalReceipt
        receipt={reprintReceipt}
        settings={settings}
        onClose={() => setReprintReceipt(null)}
      />
    </div>
  );
};
