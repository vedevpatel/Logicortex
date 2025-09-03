"use client";

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, AlertTriangle } from 'lucide-react';

interface Scan {
    id: number;
    status: string;
    repository_name: string;
    created_at: string;
    results: any; // Can be any JSON object
}

export default function ScanResultPage() {
    const params = useParams();
    const scanId = params.scanId;
    const { isAuthenticated } = useAuth();

    const [scan, setScan] = useState<Scan | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!isAuthenticated || !scanId) return;

        const fetchScanDetails = async () => {
            const token = localStorage.getItem('jwt_token');
            if (!token) return;
            
            try {
                const response = await fetch(`http://localhost:8888/api/v1/scans/${scanId}`, {
                    headers: { 'Authorization': `Bearer ${token}` },
                    cache: 'no-store',
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch scan details.');
                }
                const data = await response.json();
                setScan(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An unknown error occurred.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchScanDetails();
    }, [isAuthenticated, scanId]);

    if (isLoading) {
        return <div className="flex items-center text-gray-400"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading Scan Report...</div>;
    }

    if (error) {
        return <div className="flex items-center text-red-400"><AlertTriangle className="mr-2 h-4 w-4" />Error: {error}</div>;
    }

    if (!scan) {
        return <div>Scan not found.</div>;
    }

    return (
        <div>
            <header className="mb-8">
                <h1 className="text-4xl font-bold text-white mb-2">
                    Scan Report for <span className="text-blue-400">{scan.repository_name}</span>
                </h1>
                <p className="text-gray-400">
                    Scan ID: {scan.id} | Performed on: {new Date(scan.created_at).toLocaleString()}
                </p>
            </header>
            <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700">
                <h2 className="text-2xl font-semibold mb-4">Analysis Results</h2>
                <p className="text-gray-400 mb-4">
                    This is the raw JSON output from the analysis engine.
                </p>
                <pre className="bg-black/50 p-4 rounded-md text-sm text-gray-300 overflow-x-auto">
                    {JSON.stringify(scan.results, null, 2)}
                </pre>
            </div>
        </div>
    );
}