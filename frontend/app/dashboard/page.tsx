"use client";

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Loader2, Github, CheckCircle2, AlertTriangle, ExternalLink, Settings, PlayCircle, Clock, Check, FileText } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';

// Interface Definitions
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

interface Scan {
    id: number;
    status: 'pending' | 'in_progress' | 'completed' | 'failed';
    repository_name: string;
    created_at: string;
}

const ScanStatus = ({ status }: { status: Scan['status'] }) => {
    const statusConfig = {
        pending: { icon: Clock, color: 'text-yellow-400', iconClassName: '', label: 'Pending' },
        in_progress: { icon: Loader2, color: 'text-blue-400', iconClassName: 'animate-spin', label: 'In Progress' },
        completed: { icon: Check, color: 'text-green-400', iconClassName: '', label: 'Completed' },
        failed: { icon: AlertTriangle, color: 'text-red-400', iconClassName: '', label: 'Failed' },
    };
    
    const { icon: Icon, color, iconClassName, label } = statusConfig[status];

    return (
        <div className={`flex items-center text-sm font-medium ${color}`}>
            <Icon className={`mr-2 h-4 w-4 ${iconClassName}`} />
            <span>{label}</span>
        </div>
    );
};

export default function DashboardPage() {
    const { isAuthenticated } = useAuth();
    const [organization, setOrganization] = useState<Organization | null>(null);
    const [repositories, setRepositories] = useState<Repository[]>([]);
    const [scans, setScans] = useState<Scan[]>([]);
    const [installUrl, setInstallUrl] = useState('');
    const [managementUrl, setManagementUrl] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const router = useRouter();
    const searchParams = useSearchParams();

    const fetchScans = useCallback(async (token: string) => {
        try {
            const scansResponse = await fetch('http://localhost:8000/api/v1/scans', {
                headers: { 'Authorization': `Bearer ${token}` },
                cache: 'no-store',
            });
            if (scansResponse.ok) setScans(await scansResponse.json());
        } catch (err) {
            console.error("Failed to fetch scans", err);
        }
    }, []);

    const initializeDashboard = useCallback(async (token: string) => {
        setIsLoading(true);
        setError('');
        try {
            const orgResponse = await fetch('http://localhost:8000/api/v1/organizations/me', { headers: { 'Authorization': `Bearer ${token}` }, cache: 'no-store' });
            if (!orgResponse.ok) throw new Error('Failed to fetch organization data.');
            const orgData = await orgResponse.json();

            if (orgData.length > 0) {
                const currentOrg = orgData[0];
                setOrganization(currentOrg);
                await fetchScans(token);

                if (currentOrg.github_installation_id) {
                    const repoResponse = await fetch('http://localhost:8000/api/v1/github/repositories', { headers: { 'Authorization': `Bearer ${token}` }, cache: 'no-store' });
                    if (!repoResponse.ok) throw new Error('Failed to fetch repositories.');
                    setRepositories((await repoResponse.json()).repositories || []);

                    const mgmtUrlResponse = await fetch('http://localhost:8000/api/v1/github/installation-management-url', { headers: { 'Authorization': `Bearer ${token}` } });
                    if (!mgmtUrlResponse.ok) throw new Error('Failed to fetch management URL.');
                    setManagementUrl((await mgmtUrlResponse.json()).management_url);
                } else {
                    const urlResponse = await fetch('http://localhost:8000/api/v1/github/install-url', { headers: { 'Authorization': `Bearer ${token}` } });
                    if (!urlResponse.ok) throw new Error('Failed to fetch install URL.');
                    setInstallUrl((await urlResponse.json()).install_url);
                }
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
        }
    }, [fetchScans]);

    useEffect(() => {
        const token = localStorage.getItem('jwt_token');
        if (!token) return;
        const intervalId = setInterval(() => fetchScans(token), 5000);
        return () => clearInterval(intervalId);
    }, [isAuthenticated, fetchScans]);

    useEffect(() => {
        const token = localStorage.getItem('jwt_token');
        if (!token) return;
        const installationId = searchParams.get('installation_id');

        if (installationId) {
            (async () => {
                await fetch('http://localhost:8000/api/v1/github/installation-complete', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ installation_id: parseInt(installationId) }),
                });
                router.replace('/dashboard', { scroll: false });
                await initializeDashboard(token);
            })();
        } else {
            initializeDashboard(token);
        }
    }, [searchParams, router, initializeDashboard]);

    const handleStartScan = async (repoName: string) => {
        const token = localStorage.getItem('jwt_token');
        if (!token) return;
        try {
            const response = await fetch('http://localhost:8000/api/v1/scans', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ repository_name: repoName }),
            });
            if (!response.ok) throw new Error('Failed to start scan.');
            await fetchScans(token);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        }
    };

    return (
        <div className="max-w-7xl">
            <header className="mb-8">
                <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">{organization ? `Dashboard for ${organization.name}` : 'Dashboard'}</h1>
                <p className="text-gray-400">Manage your connected codebases and security analysis.</p>
            </header>

            {isLoading && <div className="flex items-center text-gray-400"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading...</div>}
            {error && <div className="flex items-center text-red-400"><AlertTriangle className="mr-2 h-4 w-4" />Error: {error}</div>}

            {!isLoading && !error && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2">
                        <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700">
                            <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-700">
                                <div className="flex items-center text-lg text-white">
                                    <Github className="mr-3 h-6 w-6" />
                                    <h3 className="font-semibold">Connected Repositories</h3>
                                </div>
                                {organization?.github_installation_id && managementUrl && (
                                    <a href={managementUrl} target="_blank" rel="noopener noreferrer">
                                        <Button variant="outline" className="border-gray-600 hover:bg-gray-700 hover:text-white"><Settings className="mr-2 h-4 w-4" /> Manage</Button>
                                    </a>
                                )}
                            </div>
                            {organization?.github_installation_id ? (
                                <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                                    {repositories.map(repo => (
                                        <div key={repo.id} className="bg-gray-700/50 p-4 rounded-lg flex justify-between items-center">
                                            <div>
                                                <p className="font-semibold text-white">{repo.full_name}</p>
                                                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${repo.private ? 'bg-purple-500/20 text-purple-300' : 'bg-green-500/20 text-green-300'}`}>{repo.private ? 'Private' : 'Public'}</span>
                                            </div>
                                            <Button size="sm" onClick={() => handleStartScan(repo.full_name)}><PlayCircle className="mr-2 h-4 w-4" /> Scan Now</Button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div>
                                    <p className="text-gray-400 mb-4">Connect your GitHub account to allow Logicortex to analyze your repositories.</p>
                                    <a href={installUrl}><Button className="bg-white text-black hover:bg-gray-200 font-semibold"><Github className="mr-2 h-5 w-5" /> Connect to GitHub</Button></a>
                                </div>
                            )}
                        </div>
                    </div>
                    <div>
                        <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700">
                             <h2 className="text-xl font-semibold text-white mb-4 pb-4 border-b border-gray-700">Scan History</h2>
                             <div className="space-y-4 max-h-[28rem] overflow-y-auto pr-2">
                                {scans.length > 0 ? scans.map(scan => (
                                    <div key={scan.id} className="bg-gray-700/50 p-3 rounded-lg">
                                        <div className="flex justify-between items-center">
                                            <p className="font-medium text-white truncate">{scan.repository_name}</p>
                                            <ScanStatus status={scan.status} />
                                        </div>
                                        <div className="text-xs text-gray-400 mt-1 flex justify-between items-center">
                                            <span>{new Date(scan.created_at).toLocaleString()}</span>
                                            {scan.status === 'completed' && (
                                                <Link href={`/dashboard/scans/${scan.id}`} passHref>
                                                    <Button variant="link" size="sm" className="h-auto p-0 text-blue-400">View Report</Button>
                                                </Link>
                                            )}
                                        </div>
                                    </div>
                                )) : <p className="text-gray-500 text-center py-4">No scans have been run yet.</p>}
                             </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
