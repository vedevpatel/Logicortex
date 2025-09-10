"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle, GitBranch, Terminal, Settings, RefreshCw } from 'lucide-react'; // Added RefreshCw
import { Badge } from '@/components/ui/badge';

interface Repository {
  full_name: string;
  private: boolean;
}

export default function DashboardPage() {
  const { authFetch } = useAuth();
  const [repos, setRepos] = useState<Repository[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false); // New state for refresh button
  const [error, setError] = useState('');
  const [managementUrl, setManagementUrl] = useState('');

  // --- THIS FUNCTION FETCHES THE REPOSITORIES ---
  const fetchRepos = async () => {
    try {
      const response = await authFetch('http://localhost:8888/api/v1/github/repositories');
      if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || 'Failed to fetch repositories.');
      }
      const data = await response.json();
      setRepos(data.repositories || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    }
  };

  const handleRefresh = async () => {
      setIsRefreshing(true);
      setError('');
      await fetchRepos();
      setIsRefreshing(false);
  };

  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoading(true);
      await fetchRepos(); // Fetch repos on initial load

      // Also fetch the management URL
      try {
        const urlResponse = await authFetch('http://localhost:8888/api/v1/github/installation-management-url');
        if (urlResponse.ok) {
            const urlData = await urlResponse.json();
            setManagementUrl(urlData.management_url); // Use the correct key from API

        }
      } catch (err) {
          console.error("Could not fetch management URL", err);
      }
      setIsLoading(false);
    };

    fetchInitialData();
  }, [authFetch]); // Dependency array is simplified

  const renderRepoList = () => {
    if (isLoading) {
      return <div className="flex items-center justify-center text-gray-400 py-8"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Loading Repositories...</div>;
    }
    if (error) {
      return <div className="flex items-center justify-center text-red-400 py-8"><AlertTriangle className="mr-2 h-5 w-5" />Error: {error}</div>;
    }
    if (repos.length === 0) {
      return (
        <div className="text-center text-gray-400 py-12">
            <GitBranch className="mx-auto h-12 w-12 text-gray-600" />
            <h3 className="mt-4 text-lg font-medium text-white">No Repositories Found</h3>
            <p className="mt-1 text-sm text-gray-500">Please install and configure the Logicortex GitHub App.</p>
        </div>
      );
    }
    return (
      <ul className="space-y-3">
        {repos.map((repo) => (
          <li key={repo.full_name} className="flex items-center justify-between p-4 bg-gray-800/50 hover:bg-gray-800 transition-colors rounded-lg border border-gray-700">
            <div className="flex items-center min-w-0">
              <GitBranch className="h-5 w-5 mr-4 text-gray-400 flex-shrink-0" />
              <div className="min-w-0">
                <p className="font-semibold text-white truncate">{repo.full_name}</p>
                <Badge variant="outline" className="mt-1">{repo.private ? 'Private' : 'Public'}</Badge>
              </div>
            </div>
            <Button asChild className="bg-blue-600 hover:bg-blue-500 text-white">
              <Link href={`/ide/${repo.full_name}`}>
                <Terminal className="mr-2 h-4 w-4" /> Open IDE
              </Link>
            </Button>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-4xl font-bold text-white mb-2">Dashboard</h1>
        <p className="text-gray-400">Select a repository to begin your session.</p>
      </header>
      <div className="bg-gray-900/50 p-6 rounded-lg border border-gray-800">
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-800">
            <h2 className="text-2xl font-semibold text-white">Connected Repositories</h2>
            <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing || isLoading}>
                    {isRefreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <RefreshCw className="mr-2 h-4 w-4" />}
                    Refresh
                </Button>
                {managementUrl && (
                    <Button variant="outline" size="sm" asChild className='px-2'>
                        <a href={managementUrl} target="_blank" rel="noopener noreferrer">
                            <Settings className="mr-2 h-4 w-4" /> Manage Repositories
                        </a>
                    </Button>
                )}
            </div>
        </div>
        {renderRepoList()}
      </div>
    </div>
  );
}
