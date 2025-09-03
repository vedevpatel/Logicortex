"use client";

import { useParams } from 'next/navigation';

export default function ScanResultPage() {
    const params = useParams();
    const scanId = params.scanId;

    return (
        <div>
            <header className="mb-8">
                <h1 className="text-4xl font-bold text-white mb-2">
                    Scan Report: #{scanId}
                </h1>
                <p className="text-gray-400">
                    Detailed analysis and findings for your repository scan.
                </p>
            </header>
            <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700">
                <h2 className="text-2xl font-semibold mb-4">Analysis Complete</h2>
                <p className="text-gray-400">
                    This is the placeholder page for scan results. The full neuro-symbolic analysis report will be displayed here.
                </p>
            </div>
        </div>
    );
}
