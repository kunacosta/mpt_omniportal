'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export interface SalesmanProfile {
  id: string;
  name: string;
  totalRevenue: number;
  transactionCount: number;
  dailyRevenue: Record<string, number>; // Day name -> Revenue
  brands: Record<string, number>; // brand -> revenue
  monthlyData: Record<string, { // "YYYY-MM" -> data
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
  salesmen: Record<string, number>; // name -> total revenue (simple view)
  brands: Record<string, number>; // name -> revenue
  salesmanProfiles: Record<string, SalesmanProfile>; // Detailed profiles
}

interface DataContextType {
  outlets: OutletSummary[];
  isLoading: boolean;
  lastUpdated: string | null;
  systemStatus: string | null;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [outlets, setOutlets] = useState<OutletSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [systemStatus, setSystemStatus] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch from the Python backend
        // Note: In a real deployment, replace localhost with your VPS IP
        const response = await fetch('http://localhost:8000/api/summary');
        
        if (!response.ok) {
          throw new Error('Failed to fetch from Python backend');
        }
        
        const data = await response.json();
        
        setSystemStatus(data.message);
        setOutlets(data.outlets);
        setLastUpdated(new Date().toLocaleString());
        
        // Cache successful data
        try {
          localStorage.setItem('mpt_dashboard_cache', JSON.stringify(data.outlets));
          localStorage.setItem('mpt_last_updated', new Date().toLocaleString());
        } catch (e) {
          console.warn('Failed to cache data to localStorage', e);
        }
        
      } catch (error) {
        console.error('API Fetch Error:', error);
        setSystemStatus('Error: Backend Server Offline');
        
        // Fallback to local storage
        const storedData = localStorage.getItem('mpt_dashboard_cache');
        if (storedData) {
           setOutlets(JSON.parse(storedData));
           setSystemStatus('Error: Backend Offline (Using Cached Data)');
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <DataContext.Provider value={{ outlets, isLoading, lastUpdated, systemStatus }}>
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

