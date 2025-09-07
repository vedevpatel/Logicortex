"use client";

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, AlertTriangle, FileCode, CheckCircle, XCircle, Shield, GitBranch } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { CodeSnippet } from '@/components/ui/CodeSnippet';

// --- FINALIZED INTERFACE TO MATCH THE CURRENT BACKEND ---
interface Finding {
  function_name: string | null;
  required_role: string | null;
  issue: string;
  notes: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  code_snippet: string;
}

interface FileAnalysis {
  file: string;
  risk_level: 'High' | 'Medium' | 'Low';
  analysis: Finding[];
}

interface ScanResults {
  summary: {
    scanned_files: number;
    analyzed_files: number;
    timestamp: number;
    high_risk_count: number;
    medium_risk_count: number;
    low_risk_count: number;
  };
  files: FileAnalysis[];
  symbolic_analysis: {
    consistent: boolean;
    violation: string | null;
  };
}

interface Scan {
  id: number;
  status: string;
  repository_name: string;
  created_at: string;
  results: ScanResults | { error?: string } | null;
}

const getRoleBadgeVariant = (role: string | null): "default" | "secondary" | "destructive" | "outline" => {
  if (!role) { return 'outline'; }
  const lowerRole = role.toLowerCase();
  if (lowerRole.includes('admin') || lowerRole.includes('owner')) return 'destructive';
  if (lowerRole.includes('member') || lowerRole.includes('user')) return 'secondary';
  return 'outline';
};

const getRiskBadgeVariant = (riskLevel: string): "destructive" | "secondary" | "outline" => {
    if (riskLevel === 'High') return 'destructive';
    if (riskLevel === 'Medium') return 'secondary';
    return 'outline';
};

// --- FINALIZED COMPONENT TO DISPLAY DESCRIPTIVE FINDINGS ---
const FileFindings = ({ file }: { file: FileAnalysis }) => {
  const groupedFindings = React.useMemo(() => {
    return file.analysis.reduce((acc, finding) => {
      const snippet = finding.code_snippet;
      if (!acc.has(snippet)) { acc.set(snippet, []); }
      acc.get(snippet)!.push(finding);
      return acc;
    }, new Map<string, Finding[]>());
  }, [file.analysis]);

  return (
    <AccordionContent className="px-1 pt-4 pb-2 bg-black/20">
      {Array.from(groupedFindings.entries()).map(([snippet, findings], groupIndex) => (
        <div key={groupIndex} className="mb-6 last:mb-2 rounded-lg bg-gray-900/30 p-4 border border-gray-700/50">
          <CodeSnippet language="typescript" code={snippet} />
          <div className="pl-2 pt-3">
            {findings.map((finding, findIndex) => (
              <div key={findIndex} className="mb-4 last:mb-0 border-l-2 border-yellow-400/30 pl-4">
                <h4 className="font-semibold text-lg text-yellow-300">{finding.issue}</h4>
                <div className="flex items-center flex-wrap gap-x-4 gap-y-2 my-2 text-sm text-gray-300">
                  {finding.function_name && <span>Function: <span className="font-mono bg-gray-700/50 px-2 py-1 rounded">{finding.function_name}</span></span>}
                  {finding.required_role && <span>Required Role: <Badge variant={getRoleBadgeVariant(finding.required_role)}>{finding.required_role}</Badge></span>}
                  {finding.severity && <span>Severity: <Badge variant="secondary">{finding.severity}</Badge></span>}
                </div>
                <p className="text-gray-400 mb-2 text-sm">{finding.notes}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </AccordionContent>
  );
};

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
        setIsLoading(true);
        const token = localStorage.getItem('jwt_token');
        if (!token) { setError("Authentication token not found."); setIsLoading(false); return; }
        try {
            const response = await fetch(`http://localhost:8888/api/v1/scans/${scanId}`, {
                headers: { 'Authorization': `Bearer ${token}` },
                cache: 'no-store',
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to fetch scan details.');
            }
            const data: Scan = await response.json();
            setScan(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
        }
    };
    fetchScanDetails();
  }, [isAuthenticated, scanId]);

  const renderContent = () => {
    if (isLoading) { return <div className="flex items-center text-gray-400"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading Scan Report...</div>; }
    if (error) { return <div className="flex items-center text-red-400"><AlertTriangle className="mr-2 h-4 w-4" />Error: {error}</div>; }
    if (!scan) return <div>Scan not found.</div>;
    if (scan.status === 'in_progress' || scan.status === 'pending') {
        return (
            <div className="flex flex-col items-center justify-center text-center p-8 bg-gray-800/50 rounded-lg border border-gray-700">
                <Loader2 className="mr-2 h-8 w-8 animate-spin text-blue-400 mb-4" />
                <h2 className="text-2xl font-semibold text-white">Scan in Progress</h2>
                <p className="text-gray-400 mt-2">The analysis for <span className="font-bold text-blue-300">{scan.repository_name}</span> is currently running.</p>
            </div>
        );
    }
    if (!scan.results || 'error' in scan.results) {
        const errorMessage = scan.results && 'error' in scan.results ? scan.results.error : 'No results available for this scan.';
        return (
            <div className="flex flex-col items-center justify-center text-center p-8 bg-red-900/20 rounded-lg border border-red-700">
                <AlertTriangle className="mr-2 h-8 w-8 text-red-400 mb-4" />
                <h2 className="text-2xl font-semibold text-white">{errorMessage ? 'Scan Failed' : 'No Results'}</h2>
                {errorMessage && (<pre className="mt-4 bg-black/50 p-4 rounded-md text-sm text-red-300 w-full max-w-2xl">{errorMessage}</pre>)}
            </div>
        );
    }

    const results = scan.results as ScanResults;
    const filesWithFindings = results.files.filter(f => f.analysis && f.analysis.length > 0);
    const totalFindings = filesWithFindings.reduce((acc, file) => acc + file.analysis.length, 0);

    return (
      <div className="space-y-8">
        <header>
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center">
            <GitBranch className="mr-3 h-8 w-8 text-gray-400" />
            Scan Report for <span className="text-blue-400 ml-2">{scan.repository_name}</span>
          </h1>
          <p className="text-gray-400">
            Scan ID: {scan.id} | Performed on: {new Date(scan.created_at).toLocaleString()}
          </p>
        </header>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-gray-800/50 border-gray-700"><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium text-gray-300">Total Findings</CardTitle><AlertTriangle className="h-4 w-4 text-yellow-400" /></CardHeader><CardContent><div className="text-2xl font-bold text-white">{totalFindings}</div><p className="text-xs text-gray-400">Potential vulnerabilities identified</p></CardContent></Card>
            <Card className="bg-gray-800/50 border-gray-700">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-gray-300">Files Analyzed</CardTitle>
                    <FileCode className="h-4 w-4 text-blue-400" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-white">{results.summary.analyzed_files} / {results.summary.scanned_files}</div>
                    <p className="text-xs text-gray-400">
                        <span className="text-red-400">{results.summary.high_risk_count} High Risk</span> | 
                        <span className="text-yellow-400"> {results.summary.medium_risk_count} Medium Risk</span>
                    </p>
                </CardContent>
            </Card>
            <Card className="bg-gray-800/50 border-gray-700">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-gray-300">Symbolic Consistency Check</CardTitle>
                    <Shield className="h-4 w-4 text-gray-400"/>
                </CardHeader>
                <CardContent>
                    {results.symbolic_analysis.consistent ? (
                        <div className="flex items-center text-green-400">
                            <CheckCircle className="h-6 w-6 mr-2" />
                            <span className="text-2xl font-bold">Passed</span>
                        </div>
                    ) : (
                        <div className="flex flex-col">
                           <div className="flex items-center text-red-400">
                                <XCircle className="h-6 w-6 mr-2" />
                                <span className="text-2xl font-bold">Violation</span>
                            </div>
                            {results.symbolic_analysis.violation && (
                                <p className="text-xs text-yellow-400/80 mt-2 ml-1">
                                    {results.symbolic_analysis.violation}
                                </p>
                            )}
                        </div>
                    )}
                     <p className="text-xs text-gray-400 mt-2">Z3 SMT solver consistency result</p>
                </CardContent>
            </Card>
        </div>
        <div>
          <h2 className="text-2xl font-semibold text-white mb-4">Detailed Findings</h2>
          {filesWithFindings.length > 0 ? (
            <Accordion type="single" collapsible className="w-full">
              {filesWithFindings.map((file, index) => (
                <AccordionItem key={index} value={`item-${index}`} className="border-gray-700">
                  <AccordionTrigger className="hover:bg-gray-800/60 px-4 py-3 rounded-md">
                    <div className="flex items-center gap-4 flex-wrap">
                      <FileCode className="h-5 w-5 text-blue-400 flex-shrink-0" />
                      <span className="font-mono text-white truncate min-w-0 flex-1">{file.file}</span>
                      <div className="flex gap-2 items-center">
                        <Badge variant={getRiskBadgeVariant(file.risk_level)}>{file.risk_level} Risk</Badge>
                        <Badge>{file.analysis.length} {file.analysis.length === 1 ? 'Finding' : 'Findings'}</Badge>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <FileFindings file={file} />
                </AccordionItem>
              ))}
            </Accordion>
          ) : (
            <div className="text-center py-12 bg-gray-800/50 rounded-lg border border-gray-700">
                <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
                <h3 className="mt-4 text-lg font-medium text-white">No Vulnerabilities Found</h3>
                <p className="mt-1 text-sm text-gray-400">Logicortex did not find any business logic issues in the analyzed files.</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return <div>{renderContent()}</div>;
}