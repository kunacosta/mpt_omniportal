'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, TrendingUp, Package, ChevronRight, Download, Users, Award, DollarSign, Medal, Calendar, X, Trophy, Zap, Info, LogOut, User } from 'lucide-react';
import { useData } from './data-context';

export default function DashboardPage() {
  const { outlets, isLoading, lastUpdated, systemStatus } = useData();
  const [selectedOutletCode, setSelectedOutletCode] = useState<string | null>(null);
  const [selectedSalesmanId, setSelectedSalesmanId] = useState<string | null>(null);
  const [user, setUser] = useState<{ username: string } | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Check for logged in user
    const storedUser = localStorage.getItem('user');
    const isLoggedIn = localStorage.getItem('isLoggedIn');

    if (!isLoggedIn || !storedUser) {
      router.push('/');
      return;
    }

    try {
      setUser(JSON.parse(storedUser));
    } catch (e) {
      console.error('Failed to parse user data', e);
      router.push('/');
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('isLoggedIn');
    router.push('/');
  };

  const selectedOutlet = useMemo(() => 
    outlets.find(o => o.code === selectedOutletCode) || null, 
  [outlets, selectedOutletCode]);

  const selectedSalesman = useMemo(() => {
    if (!selectedOutlet || !selectedSalesmanId) return null;
    return selectedOutlet.salesmanProfiles[selectedSalesmanId] || null;
  }, [selectedOutlet, selectedSalesmanId]);

  // Helper for currency formatting
  const formatCurrencyFull = (value: number) => {
    return `RM ${value.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatCurrencyCompact = (value: number) => {
    if (value >= 1000000) {
      return `RM ${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `RM ${(value / 1000).toFixed(0)}k`;
    }
    return `RM ${value.toLocaleString('en-MY')}`;
  };

  // Calculate high-level metrics
  const totalNetworkRevenue = outlets.reduce((acc, curr) => acc + curr.totalRevenue, 0);
  const totalNetworkInvestment = outlets.reduce((acc, curr) => acc + curr.totalInvestment, 0);
  const totalNetworkTransactions = outlets.reduce((acc, curr) => acc + (curr.transactionCount || 0), 0);
  const networkATV = totalNetworkTransactions > 0 ? totalNetworkRevenue / totalNetworkTransactions : 0;

  // Detail View Metrics
  const salesmanLeaderboard = useMemo(() => {
    if (!selectedOutlet) return [];
    return Object.entries(selectedOutlet.salesmen)
      .map(([name, sales]) => ({ name, sales }))
      .sort((a, b) => b.sales - a.sales);
  }, [selectedOutlet]);

  const brandSuccess = useMemo(() => {
    if (!selectedOutlet) return { top: [], bottom: [] };
    const sortedBrands = Object.entries(selectedOutlet.brands)
      .map(([name, sales]) => ({ name, sales }))
      .sort((a, b) => b.sales - a.sales);
    
    return {
      top: sortedBrands.slice(0, 3),
      bottom: sortedBrands.slice(-3).reverse(),
      all: sortedBrands
    };
  }, [selectedOutlet]);

  const outletATV = selectedOutlet && selectedOutlet.transactionCount > 0 
    ? selectedOutlet.totalRevenue / selectedOutlet.transactionCount 
    : 0;

  // Salesman Detail Metrics
  const salesmanMetrics = useMemo(() => {
    if (!selectedSalesman) return null;

    // Top Brands
    const topBrands = Object.entries(selectedSalesman.brands)
      .map(([name, sales]) => ({ name, sales }))
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 10); // Show top 10 for overall ranking

    // Monthly Breakdown
    const monthlyData = Object.entries(selectedSalesman.monthlyData)
      .sort((a, b) => a[0].localeCompare(b[0])) // Sort by YYYY-MM
      .map(([month, data]) => {
        // Find top brand for this month
        const topBrandEntry = Object.entries(data.brands).sort((a, b) => b[1] - a[1])[0];
        
        // Convert YYYY-MM to Month Name
        const date = new Date(`${month}-01`);
        const monthName = date.toLocaleString('default', { month: 'short', year: 'numeric' });

        return {
          month,
          monthName,
          revenue: data.revenue,
          topBrand: topBrandEntry ? topBrandEntry[0] : 'None',
          topBrandRevenue: topBrandEntry ? topBrandEntry[1] : 0
        };
      });

    // Rank in Outlet
    const rank = salesmanLeaderboard.findIndex(s => s.name === selectedSalesman.name) + 1;
    const isTop1 = rank === 1;

    // Best Day
    let bestDay = 'N/A';
    let maxDayRevenue = 0;
    if (selectedSalesman.dailyRevenue) {
      Object.entries(selectedSalesman.dailyRevenue).forEach(([day, revenue]) => {
        if (revenue > maxDayRevenue) {
          maxDayRevenue = revenue;
          bestDay = day;
        }
      });
    }

    return { topBrands, monthlyData, rank, isTop1, bestDay };
  }, [selectedSalesman, salesmanLeaderboard]);


  const handleDownloadReport = () => {
    if (!selectedOutlet) return;
    
    let reportContent = '';
    let filename = '';

    if (selectedSalesman && salesmanMetrics) {
      filename = `${selectedOutlet.code}_${selectedSalesman.name.replace(/\s+/g, '_')}_Report.txt`;
      reportContent = `Salesman Performance Report - ${selectedSalesman.name}
Outlet: ${selectedOutlet.code}
Generated: ${new Date().toLocaleString()}

Summary
-------
Total Revenue: ${formatCurrencyFull(selectedSalesman.totalRevenue)}
Outlet Rank: #${salesmanMetrics.rank}
Best Day: ${salesmanMetrics.bestDay}

Overall Brand Ranking
---------------------
${salesmanMetrics.topBrands.map((b, i) => `${i + 1}. ${b.name}: ${formatCurrencyFull(b.sales)}`).join('\n')}

12-Month Performance List
-------------------------
${salesmanMetrics.monthlyData.map(m => `${m.monthName}: ${formatCurrencyFull(m.revenue)} | Top Brand: ${m.topBrand}`).join('\n')}
`;
    } else {
      filename = `${selectedOutlet.code}_Report.txt`;
      reportContent = `Daily Report - ${selectedOutlet.code}
Generated: ${new Date().toLocaleString()}

Financial Overview
------------------
Total Revenue: ${formatCurrencyFull(selectedOutlet.totalRevenue)}
Total Investment: ${formatCurrencyFull(selectedOutlet.totalInvestment)}
ATV: ${formatCurrencyFull(outletATV)}

Salesman Leaderboard
--------------------
${salesmanLeaderboard.map((s, i) => `${i + 1}. ${s.name}: ${formatCurrencyFull(s.sales)}`).join('\n')}

Brand Performance (Top 3)
-------------------------
${brandSuccess.top.map((b, i) => `${i + 1}. ${b.name}: ${formatCurrencyFull(b.sales)}`).join('\n')}

Brand Performance (Bottom 3)
----------------------------
${brandSuccess.bottom.map((b, i) => `${i + 1}. ${b.name}: ${formatCurrencyFull(b.sales)}`).join('\n')}
`;
    }

    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  if (outlets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
        <div className="bg-slate-100 p-6 rounded-full mb-4">
          <Package size={48} className="text-slate-400" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">No Data Available</h2>
        <p className="text-slate-500 max-w-md mb-8">
          {systemStatus?.includes('Error') 
            ? 'Unable to connect to the backend server. Please check your connection or try again later.'
            : 'Connecting to the backend system...'}
        </p>
        <button 
          onClick={handleLogout}
          className="flex items-center gap-2 px-6 py-3 bg-[#0f172a] text-white rounded-[24px] hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/20 font-medium"
        >
          <LogOut size={18} />
          Back to Login
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-7xl mx-auto relative pb-12">
        {/* Top Bar with System Status and User Profile */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            {systemStatus && (
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider border ${
                systemStatus.includes('Error') || systemStatus.includes('Offline') 
                  ? 'bg-red-50 border-red-100 text-red-700' 
                  : 'bg-emerald-50 border-emerald-100 text-emerald-700'
              }`}>
                <div className={`w-2 h-2 rounded-full animate-pulse ${
                  systemStatus.includes('Error') || systemStatus.includes('Offline') ? 'bg-red-500' : 'bg-emerald-500'
                }`}></div>
                {systemStatus}
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 px-4 py-2 bg-white rounded-full border border-slate-100 shadow-sm">
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                <User size={16} />
              </div>
              <div className="text-sm">
                <p className="font-bold text-slate-900 leading-none">{user?.username || 'User'}</p>
                <p className="text-xs text-slate-500">Administrator</p>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
              title="Logout"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>

        <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 flex items-center gap-3 tracking-tight">
              {selectedOutlet ? selectedOutlet.code : 'Global Overview'}
            </h1>
            <p className="text-slate-500 font-medium mt-1">
              {selectedOutlet 
                  ? 'Branch Performance & Analytics' 
                  : `Network Performance • Updated ${lastUpdated || 'Just now'}`}
            </p>
          </div>
          
          <div className="flex gap-3">
            {selectedOutlet && (
              <>
                <button 
                  onClick={handleDownloadReport}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#0f172a] text-white rounded-[18px] hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/20 font-medium cursor-pointer active:scale-95"
                >
                  <Download size={18} />
                  Export Report
                </button>
                <button 
                  onClick={() => setSelectedOutletCode(null)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 rounded-[18px] text-slate-600 hover:bg-slate-50 transition-colors shadow-sm font-medium cursor-pointer active:scale-95"
                >
                  <ArrowLeft size={18} />
                  Back
                </button>
              </>
            )}
          </div>
        </header>

        <AnimatePresence mode="wait">
          {!selectedOutlet ? (
            <motion.div 
              key="global"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              {/* Network Revenue Hero Card */}
              <div className="bg-gradient-to-br from-[#0f172a] to-[#1e293b] p-8 md:p-10 rounded-[32px] shadow-2xl shadow-slate-900/20 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5 transform translate-x-1/4 -translate-y-1/4">
                  <DollarSign size={300} />
                </div>
                <div className="relative z-10">
                  <h3 className="text-sm font-bold text-slate-300 mb-2 uppercase tracking-widest">Total Network Revenue</h3>
                  <div className="flex items-baseline gap-4">
                    <p className="text-5xl md:text-7xl font-bold tracking-tight">{formatCurrencyFull(totalNetworkRevenue)}</p>
                  </div>
                  <div className="mt-8 flex flex-wrap gap-8 md:gap-16">
                     <div>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Network ATV</p>
                        <p className="text-2xl font-bold">{formatCurrencyFull(networkATV)}</p>
                     </div>
                     <div>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Total Investment</p>
                        <p className="text-2xl font-bold">{formatCurrencyCompact(totalNetworkInvestment)}</p>
                     </div>
                     <div>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Active Outlets</p>
                        <p className="text-2xl font-bold">{outlets.length}</p>
                     </div>
                  </div>
                </div>
              </div>

              {/* Outlet Grid */}
              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                  <Package className="text-slate-400" />
                  Branch Performance
                </h2>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {outlets.map((outlet) => {
                    return (
                      <div 
                        key={outlet.code}
                        onClick={() => setSelectedOutletCode(outlet.code)}
                        className="bg-white p-6 rounded-[24px] shadow-sm border border-slate-100 hover:border-slate-300 transition-all cursor-pointer group relative overflow-hidden hover:shadow-xl hover:-translate-y-1 flex flex-col h-full"
                      >
                        <div className="flex justify-between items-start mb-4">
                           <h3 className="font-bold text-slate-900 truncate text-2xl tracking-tight">{outlet.code}</h3>
                           <div className="p-2 bg-slate-50 rounded-full group-hover:bg-[#0f172a] group-hover:text-white transition-colors duration-300">
                              <ChevronRight size={20} />
                           </div>
                        </div>
                        
                        <div className="mb-6">
                          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Revenue</p>
                          <p className="text-3xl font-bold text-slate-900 tracking-tight">
                            {formatCurrencyCompact(outlet.totalRevenue)}
                          </p>
                        </div>

                        <div className="mt-auto pt-4 border-t border-slate-50">
                          <div className="flex items-baseline justify-between text-slate-500 mb-2">
                            <span className="text-xs font-bold uppercase tracking-wider">Investment</span>
                            <span className="text-sm font-semibold text-slate-700">{formatCurrencyCompact(outlet.totalInvestment)}</span>
                          </div>
                          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full rounded-full bg-slate-800" 
                              style={{ width: `${Math.min((outlet.totalInvestment / outlet.totalRevenue) * 100, 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="detail"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid gap-8 lg:grid-cols-3"
            >
              {/* Main Content - Salesman Leaderboard */}
              <div className="lg:col-span-2 space-y-6">
                {/* Hero Header for Detail View */}
                <div className="bg-[#0f172a] p-8 rounded-[32px] shadow-lg text-white flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
                  <div className="absolute -right-10 -bottom-10 opacity-10">
                    <TrendingUp size={200} />
                  </div>
                  <div className="relative z-10">
                    <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mb-1">Total Revenue</p>
                    <h2 className="text-5xl font-bold tracking-tight">{formatCurrencyFull(selectedOutlet.totalRevenue)}</h2>
                  </div>
                  <div className="text-left md:text-right relative z-10">
                    <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mb-1">Outlet Code</p>
                    <h2 className="text-4xl font-bold text-slate-200">{selectedOutlet.code}</h2>
                  </div>
                </div>

                <div className="bg-white p-6 md:p-8 rounded-[32px] shadow-sm border border-slate-100">
                  <div className="flex items-center justify-between mb-8">
                    <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                      <Users className="text-slate-400" size={24} />
                      Salesman Leaderboard
                    </h2>
                    <div className="text-xs font-medium px-3 py-1 bg-slate-100 text-slate-500 rounded-full">
                      Click row for details
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-slate-100">
                          <th className="pb-4 font-bold text-slate-400 text-xs uppercase tracking-wider w-16">Rank</th>
                          <th className="pb-4 font-bold text-slate-400 text-xs uppercase tracking-wider">Salesman ID</th>
                          <th className="pb-4 font-bold text-slate-400 text-xs uppercase tracking-wider text-right">Total Revenue</th>
                          <th className="pb-4 font-bold text-slate-400 text-xs uppercase tracking-wider w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {salesmanLeaderboard.map((salesman, i) => (
                          <tr 
                            key={i} 
                            onClick={() => setSelectedSalesmanId(salesman.name)}
                            className="group hover:bg-slate-50 transition-colors cursor-pointer"
                          >
                            <td className="py-5 font-bold text-slate-400">#{i + 1}</td>
                            <td className="py-5 font-bold text-slate-900 flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                                i === 0 ? 'bg-amber-100 text-amber-700' : 
                                i === 1 ? 'bg-slate-200 text-slate-600' :
                                i === 2 ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-500'
                              }`}>
                                {salesman.name.substring(0, 2).toUpperCase()}
                              </div>
                              {salesman.name}
                              {i < 3 && <Medal size={16} className={
                                i === 0 ? 'text-amber-500' : 
                                i === 1 ? 'text-slate-400' : 'text-orange-500'
                              } />}
                            </td>
                            <td className="py-5 text-slate-900 font-bold text-right text-lg">
                              {formatCurrencyFull(salesman.sales)}
                            </td>
                            <td className="py-5 text-slate-400 text-right">
                              <ChevronRight size={20} className="opacity-0 group-hover:opacity-100 transition-opacity ml-auto" />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Sidebar - Stats & Brand Success */}
              <div className="space-y-6">
                {/* Outlet ATV Card */}
                <div className="bg-white p-6 md:p-8 rounded-[32px] shadow-sm border border-slate-100">
                   <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                     <Zap className="text-amber-500" size={24} />
                     Efficiency (ATV)
                   </h2>
                   <p className="text-4xl font-bold text-slate-900 mb-2 tracking-tight">{formatCurrencyFull(outletATV)}</p>
                   <p className="text-sm text-slate-500 font-medium">Average Transaction Value</p>
                   <div className="mt-6 pt-6 border-t border-slate-50 flex justify-between items-center text-xs">
                      <span className="text-slate-500 font-medium">Network Avg: {formatCurrencyCompact(networkATV)}</span>
                      <span className={`font-bold px-2 py-1 rounded-md ${outletATV >= networkATV ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                        {outletATV >= networkATV ? '+Above Avg' : '-Below Avg'}
                      </span>
                   </div>
                </div>

                {/* Brand Success Card */}
                <div className="bg-white p-6 md:p-8 rounded-[32px] shadow-sm border border-slate-100">
                  <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                    <Award className="text-slate-400" size={24} />
                    Brand Success
                  </h2>
                  
                  <div className="space-y-8">
                    <div>
                      <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-4">Top 3 Brands</p>
                      <div className="space-y-5">
                        {brandSuccess.top.map((brand, i) => {
                          const percentage = (brand.sales / selectedOutlet.totalRevenue) * 100;
                          return (
                            <div key={i}>
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-bold text-slate-900 truncate max-w-[120px]">{brand.name}</span>
                                <span className="text-sm font-bold text-slate-900">{formatCurrencyFull(brand.sales)}</span>
                              </div>
                              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div 
                                  className="h-full rounded-full bg-emerald-500" 
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="pt-6 border-t border-slate-50">
                      <p className="text-xs font-bold text-amber-600 uppercase tracking-widest mb-4">Bottom 3 Brands</p>
                      <div className="space-y-3">
                        {brandSuccess.bottom.map((brand, i) => (
                          <div key={i} className="flex justify-between items-center p-2 hover:bg-slate-50 rounded-lg transition-colors">
                            <span className="text-sm font-medium text-slate-500 truncate max-w-[120px]">{brand.name}</span>
                            <span className="text-sm font-bold text-slate-500">{formatCurrencyFull(brand.sales)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Spending Power / Investment Summary */}
                <div className="bg-white p-6 md:p-8 rounded-[32px] shadow-sm border border-slate-100">
                  <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                    <TrendingUp className="text-slate-400" size={24} />
                    Spending Power
                  </h2>
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <p className="text-sm text-slate-500 font-medium">Total Stock Investment</p>
                      <div className="group relative">
                        <Info size={14} className="text-slate-400 cursor-help" />
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-800 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                          Total current asset value in stock
                        </div>
                      </div>
                    </div>
                    <p className="text-3xl font-bold text-slate-900 mb-4 tracking-tight">{formatCurrencyFull(selectedOutlet.totalInvestment)}</p>
                    
                    <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full bg-[#0f172a]" 
                        style={{ width: '100%' }}
                      />
                    </div>
                    <p className="text-xs text-slate-400 mt-3 text-right font-medium">100% Utilized (Cost Basis)</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Salesman Slide-Over Panel */}
        <AnimatePresence>
          {selectedSalesman && salesmanMetrics && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedSalesmanId(null)}
                className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40"
              />
              
              {/* Slide-Over Panel */}
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                className="fixed inset-y-0 right-0 w-full max-w-lg bg-white shadow-2xl z-50 overflow-y-auto border-l border-slate-100"
              >
                <div className="p-8">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-10">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h2 className="text-3xl font-bold text-slate-900">
                          {selectedSalesman.name}
                        </h2>
                        {salesmanMetrics.isTop1 && (
                          <div className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                            <Trophy size={12} />
                            Top Performer
                          </div>
                        )}
                      </div>
                      <p className="text-slate-500 font-medium">Salesman Performance Drill-Down</p>
                    </div>
                    <button 
                      onClick={() => setSelectedSalesmanId(null)}
                      className="p-2 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
                    >
                      <X size={24} className="text-slate-400" />
                    </button>
                  </div>

                  {/* Key Metrics Grid */}
                  <div className="grid grid-cols-2 gap-4 mb-10">
                    <div className="p-6 bg-slate-50 rounded-[24px] border border-slate-100">
                      <p className="text-xs text-slate-500 mb-2 font-bold uppercase tracking-wider">Total Revenue</p>
                      <p className="text-2xl font-bold text-slate-900 tracking-tight">{formatCurrencyFull(selectedSalesman.totalRevenue)}</p>
                    </div>
                    <div className="p-6 bg-slate-50 rounded-[24px] border border-slate-100">
                      <p className="text-xs text-slate-500 mb-2 font-bold uppercase tracking-wider">Best Day</p>
                      <p className="text-2xl font-bold text-slate-900 tracking-tight">{salesmanMetrics.bestDay}</p>
                    </div>
                  </div>

                  {/* 12-Month Performance List */}
                  <div className="mb-10">
                    <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2 text-lg">
                      <Calendar size={20} className="text-slate-400" />
                      12-Month Performance
                    </h3>
                    <div className="space-y-3">
                      {salesmanMetrics.monthlyData.map((data, i) => (
                        <div key={i} className="flex items-center justify-between p-4 hover:bg-slate-50 rounded-[20px] transition-colors border border-transparent hover:border-slate-100 group">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 group-hover:bg-white group-hover:shadow-sm transition-all">
                              {data.month.split('-')[1]}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 text-sm">{data.monthName}</p>
                              <p className="text-xs text-slate-500 truncate max-w-[120px]">Top: {data.topBrand}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-slate-900 text-sm">{formatCurrencyFull(data.revenue)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Overall Brand Ranking */}
                  <div>
                    <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2 text-lg">
                      <Award size={20} className="text-slate-400" />
                      Overall Brand Ranking
                    </h3>
                    <div className="space-y-4">
                      {salesmanMetrics.topBrands.map((brand, i) => (
                        <div key={i} className="flex items-center justify-between p-2">
                          <div className="flex items-center gap-4">
                            <span className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                              i < 3 ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'
                            }`}>
                              {i + 1}
                            </span>
                            <span className="text-sm font-bold text-slate-900">{brand.name}</span>
                          </div>
                          <span className="text-sm font-bold text-slate-900">{formatCurrencyFull(brand.sales)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
