"use client";

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, AlertTriangle, ExternalLink } from 'lucide-react';

interface Organization {
  id: number;
  name: string;
  owner_id?: number;
  github_installation_id?: number | null;
}

interface Repository {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  html_url: string;
}

export default function DashboardPage() {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [installUrl, setInstallUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const installationEffectRan = useRef(false);

  const token = localStorage.getItem('jwt_token');

  // Fetch repositories for the organization
  const fetchRepositories = useCallback(async (token: string) => {
    try {
      const res = await fetch('http://localhost:8000/api/v1/github/repositories', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch repositories.');
      const data = await res.json();
      setRepositories(data.repositories || []);
    } catch (err) {
      if (err instanceof Error) setError(err.message);
      else setError('Unknown error occurred while fetching repositories.');
    }
  }, []);

  // Initialize dashboard (fetch organization and install URL if needed)
  const initializeDashboard = useCallback(async (token: string) => {
    setIsLoading(true);
    try {
      const orgRes = await fetch('http://localhost:8000/api/v1/organizations/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!orgRes.ok) throw new Error('Failed to fetch organization.');
      const orgData: Organization[] = await orgRes.json();

      if (orgData.length > 0) {
        const currentOrg = orgData[0];
        setOrganization(currentOrg);

        if (currentOrg.github_installation_id) {
          await fetchRepositories(token);
        } else {
          const urlRes = await fetch('http://localhost:8000/api/v1/github/install-url', {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!urlRes.ok) throw new Error('Failed to fetch GitHub install URL.');
          const urlData = await urlRes.json();
          setInstallUrl(urlData.install_url);
        }
      }
    } catch (err) {
      if (err instanceof Error) setError(err.message);
      else setError('Unknown error occurred while initializing dashboard.');
    } finally {
      setIsLoading(false);
    }
  }, [fetchRepositories]);

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }

    const installationId = searchParams.get('installation_id');

    const processDashboardState = async () => {
      if (installationId && !installationEffectRan.current) {
        installationEffectRan.current = true;
        setIsLoading(true);

        try {
          const res = await fetch('http://localhost:8000/api/v1/github/installation-complete', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ installation_id: parseInt(installationId) }),
          });

          if (!res.ok) throw new Error('Installation failed.');
          const updatedOrg: Organization = await res.json();
          setOrganization(updatedOrg);
          await fetchRepositories(token);
        } catch (err) {
          if (err instanceof Error) setError(err.message);
          else setError('Unknown error occurred during installation.');
        } finally {
          router.replace('/dashboard', { scroll: false });
          setIsLoading(false);
        }
      } else {
        initializeDashboard(token);
      }
    };

    processDashboardState();
  }, [searchParams, router, initializeDashboard, fetchRepositories, token]);

  // Render different states: loading, error, connected, or connect GitHub
  const renderContent = () => {
    if (isLoading)
      return (
        <div className="flex flex-col items-center space-y-2 text-gray-300">
          <Loader2 className="h-10 w-10 animate-spin text-indigo-400" />
          <p>Loading Dashboard...</p>
        </div>
      );

    if (error)
      return (
        <div className="flex items-center text-red-400">
          <AlertTriangle className="mr-2" />
          {error}
        </div>
      );

    if (organization?.github_installation_id)
      return (
        <div className="space-y-4">
          <div className="flex items-center text-green-400 text-lg font-semibold">
            <CheckCircle2 className="mr-2" />
            GitHub App Connected
          </div>
          <p className="text-gray-400">Select a repository to begin analysis.</p>
          <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
            {repositories.length > 0 ? (
              repositories.map((repo) => (
                <div
                  key={repo.id}
                  className="p-4 bg-gray-800/50 backdrop-blur-sm rounded-xl flex justify-between items-center transition-transform hover:scale-105 hover:shadow-lg"
                >
                  <div>
                    <p className="font-semibold text-white">{repo.full_name}</p>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        repo.private ? 'bg-purple-500/20 text-purple-300' : 'bg-green-500/20 text-green-300'
                      }`}
                    >
                      {repo.private ? 'Private' : 'Public'}
                    </span>
                  </div>
                  <a href={repo.html_url} target="_blank" rel="noopener noreferrer">
                    <Button variant="ghost">
                      <ExternalLink className="text-white" />
                    </Button>
                  </a>
                </div>
              ))
            ) : (
              <p className="text-gray-500">No repositories found.</p>
            )}
          </div>
        </div>
      );

    // Not connected yet
    return (
      <div>
        <p className="text-gray-400 mb-4">Connect your GitHub account to start analysis.</p>
        <a href={installUrl}>
          <Button className="bg-indigo-500 hover:bg-indigo-600 text-white">Connect to GitHub</Button>
        </a>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-5xl mx-auto">
        <header className="mb-8 text-white">
          <h1 className="text-4xl font-extrabold mb-2 drop-shadow-md">
            {organization ? `Dashboard for ${organization.name}` : 'Dashboard'}
          </h1>
          <p className="text-gray-400">Manage your connected repositories and analysis.</p>
        </header>
        <main className="p-6 bg-gray-800/50 backdrop-blur-sm rounded-3xl border border-gray-700">
          <h2 className="text-2xl font-semibold text-white mb-4">GitHub Integration</h2>
          {renderContent()}
        </main>
      </div>
    </div>
  );
}
