'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

// Added Leaderboard Item interface
export interface LeaderboardItem {
  id: string;
  revenue: number;
}

export interface SalesmanProfile {
  id: string;
  name: string;
  totalRevenue: number;
  transactionCount: number;
  dailyRevenue: Record<string, number>;
  brands: Record<string, number>;
  monthlyData: Record<string, {
    revenue: number;
    brands: Record<string, number>;
  }>;
}

export interface OutletSummary {
  code: string;
  name: string;
  totalRevenue: number;
  totalInvestment: number;
  transactionCount: number;
  salesmen: Record<string, number>;
  brands: Record<string, number>;
  salesmanProfiles: Record<string, SalesmanProfile>;
}

interface DataContextType {
  outlets: OutletSummary[];
  leaderboard: LeaderboardItem[]; // Added to context
  isLoading: boolean;
  lastUpdated: string | null;
  systemStatus: string | null;
  integrityStatus: string | null; // Added for Governance visibility
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [outlets, setOutlets] = useState<OutletSummary[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [systemStatus, setSystemStatus] = useState<string | null>(null);
  const [integrityStatus, setIntegrityStatus] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Pointing to Nginx Reverse Proxy (Port 80)
        const backendUrl = 'http://103.249.84.244';
        const response = await fetch(`${backendUrl}/api/summary`);
        
        const data = await response.json();

        // 1. CHECK FOR HASH INTEGRITY ERROR (403)
        if (!response.ok) {
          // This captures your "Data Integrity Violation" message from Python
          throw new Error(data.detail || 'Backend Security Block');
        }
        
        // 2. SUCCESSFUL DATA MAPPING
        setSystemStatus(data.message);
        setIntegrityStatus(data.integrity_status);
        setOutlets(data.outlets); // Must point to .outlets specifically now
        setLeaderboard(data.leaderboard || []); // Capture the top 3 salesmen
        setLastUpdated(new Date().toLocaleString());
        
        // Cache successful data
        try {
          localStorage.setItem('mpt_dashboard_cache', JSON.stringify(data.outlets));
          localStorage.setItem('mpt_leaderboard_cache', JSON.stringify(data.leaderboard));
          localStorage.setItem('mpt_last_updated', new Date().toLocaleString());
        } catch (e) {
          console.warn('LocalStorage error:', e);
        }
        
      } catch (error: any) {
        console.error('API Fetch Error:', error);
        
        // This message will now show "Data Integrity Violation" if the hash fails
        setSystemStatus(`Status: ${error.message}`);
        
        // Fallback to local storage so the UI doesn't crash
        const storedData = localStorage.getItem('mpt_dashboard_cache');
        const storedLeader = localStorage.getItem('mpt_leaderboard_cache');
        if (storedData) {
           setOutlets(JSON.parse(storedData));
           setLeaderboard(storedLeader ? JSON.parse(storedLeader) : []);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <DataContext.Provider value={{ 
      outlets, 
      leaderboard, 
      isLoading, 
      lastUpdated, 
      systemStatus, 
      integrityStatus 
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}