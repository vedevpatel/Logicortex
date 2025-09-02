"use client";

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Loader2, Github, CheckCircle2, AlertTriangle, ExternalLink } from 'lucide-react';

interface Organization {
    id: number;
    name: string;
    owner_id: number;
    github_installation_id: number | null;
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

    const fetchRepositories = useCallback(async (token: string) => {
        try {
            const repoResponse = await fetch('http://localhost:8000/api/v1/github/repositories', {
                headers: { 'Authorization': `Bearer ${token}` },
                cache: 'no-store',
            });
            if (!repoResponse.ok) throw new Error('Failed to fetch repositories.');
            const repoData = await repoResponse.json();
            setRepositories(repoData.repositories || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred while fetching repos.');
        }
    }, []);

    const initializeDashboard = useCallback(async (token: string) => {
        setIsLoading(true);
        try {
            const orgResponse = await fetch('http://localhost:8000/api/v1/organizations/me', {
                headers: { 'Authorization': `Bearer ${token}` },
                cache: 'no-store',
            });
            if (!orgResponse.ok) throw new Error('Failed to fetch organization data.');
            
            const orgData = await orgResponse.json();
            if (orgData.length > 0) {
                const currentOrg = orgData[0];
                setOrganization(currentOrg);

                if (currentOrg.github_installation_id) {
                    await fetchRepositories(token);
                } else {
                    const urlResponse = await fetch('http://localhost:8000/api/v1/github/install-url', {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (!urlResponse.ok) throw new Error('Failed to fetch install URL.');
                    const urlData = await urlResponse.json();
                    setInstallUrl(urlData.install_url);
                }
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
        }
    }, [fetchRepositories]);

    useEffect(() => {
        const token = localStorage.getItem('jwt_token');
        if (!token) {
            router.push('/login');
            return;
        }

        const installationId = searchParams.get('installation_id');

        const processDashboardState = async () => {
            if (installationId) {
                if (installationEffectRan.current === true) return;
                installationEffectRan.current = true;
                
                setIsLoading(true);
                try {
                    const response = await fetch('http://localhost:8000/api/v1/github/installation-complete', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ installation_id: parseInt(installationId) })
                    });
                    
                    if (!response.ok) throw new Error("Failed to complete installation on backend.");

                    // *** CRITICAL CHANGE HERE ***
                    // Get the updated organization directly from the POST response
                    const updatedOrg: Organization = await response.json();
                    
                    // Set the state with the fresh data
                    setOrganization(updatedOrg);
                    
                    // Fetch the repositories now that we know it's connected
                    await fetchRepositories(token);

                } catch (err) {
                   setError(err instanceof Error ? err.message : 'An unknown error occurred during installation.');
                } finally {
                    router.replace('/dashboard', { scroll: false });
                    setIsLoading(false);
                }
            } else {
                initializeDashboard(token);
            }
        };

        processDashboardState();
    }, [searchParams, router, initializeDashboard, fetchRepositories]);

    // ... The rest of your component (renderContent, return) is unchanged
    const renderContent = () => {
        if (isLoading) {
            return <div className="flex items-center text-gray-400"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading Dashboard...</div>;
        }
        if (error) {
            return <div className="flex items-center text-red-400"><AlertTriangle className="mr-2 h-4 w-4" />Error: {error}</div>;
        }
        if (organization?.github_installation_id) {
            return (
                <div>
                    <div className="flex items-center text-lg text-green-400 mb-4">
                        <CheckCircle2 className="mr-2 h-6 w-6" />
                        <h3 className="font-semibold">GitHub App Connected</h3>
                    </div>
                    <p className="text-gray-400 mb-4">Logicortex has access to the following repositories. Select one to begin analysis.</p>
                    <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                        {repositories.length > 0 ? repositories.map(repo => (
                            <div key={repo.id} className="bg-gray-700/50 p-4 rounded-lg flex justify-between items-center hover:bg-gray-700 transition-colors">
                                <div>
                                    <p className="font-semibold text-white">{repo.full_name}</p>
                                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${repo.private ? 'bg-purple-500/20 text-purple-300' : 'bg-green-500/20 text-green-300'}`}>
                                        {repo.private ? 'Private' : 'Public'}
                                    </span>
                                </div>
                                <a href={repo.html_url} target="_blank" rel="noopener noreferrer">
                                    <Button variant="ghost" size="sm">
                                        <ExternalLink className="h-4 w-4" />
                                    </Button>
                                </a>
                            </div>
                        )) : <p className="text-gray-500">No repositories found. You may need to grant access to more repositories in your GitHub App settings.</p>}
                    </div>
                </div>
            );
        }
        return (
            <div>
                <p className="text-gray-400 mb-4">Connect your GitHub account to allow Logicortex to analyze your repositories.</p>
                <a href={installUrl}>
                    <Button className="bg-white text-black hover:bg-gray-200 font-semibold">
                        <Github className="mr-2 h-5 w-5" /> Connect to GitHub
                    </Button>
                </a>
            </div>
        );
    };

    return (
        <div className="bg-gray-900 text-white min-h-screen p-4 sm:p-8">
            <div className="max-w-5xl mx-auto">
                <header className="mb-8">
                    <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
                        {organization ? `Dashboard for ${organization.name}` : 'Dashboard'}
                    </h1>
                    <p className="text-gray-400">Manage your connected codebases and security analysis.</p>
                </header>

                <main className="bg-gray-800/50 p-6 rounded-lg border border-gray-700">
                    <h2 className="text-xl sm:text-2xl font-semibold text-white mb-4">GitHub Integration</h2>
                    {renderContent()}
                </main>
            </div>
        </div>
    );
}