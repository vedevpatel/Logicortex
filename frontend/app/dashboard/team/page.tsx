"use client";

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle, UserPlus } from 'lucide-react';

interface Member {
    id: number;
    email: string;
    role: 'owner' | 'admin' | 'member';
}

export default function TeamPage() {
    const { isAuthenticated, user } = useAuth();
    const [members, setMembers] = useState<Member[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchMembers = useCallback(async () => {
        const token = localStorage.getItem('jwt_token');
        if (!token) return;

        try {
            setIsLoading(true);
            const response = await fetch('http://localhost:8888/api/v1/organizations/me/members', {
                headers: { 'Authorization': `Bearer ${token}` },
                cache: 'no-store',
            });
            if (!response.ok) {
                throw new Error('Failed to fetch team members.');
            }
            const data = await response.json();
            setMembers(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isAuthenticated) {
            fetchMembers();
        }
    }, [isAuthenticated, fetchMembers]);

    // Placeholder for invite modal
    const handleInvite = () => {
        alert("Invite member functionality to be implemented.");
    };

    return (
        <div className="max-w-5xl">
            <header className="mb-8">
                <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">Team Management</h1>
                <p className="text-gray-400">Manage members and their roles within your organization.</p>
            </header>

            <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700">
                <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-700">
                    <h2 className="text-xl font-semibold">Team Members ({members.length})</h2>
                    <Button onClick={handleInvite} className="bg-blue-600 hover:bg-blue-700">
                        <UserPlus className="mr-2 h-4 w-4" /> Invite Member
                    </Button>
                </div>
                {isLoading ? (
                    <div className="flex items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
                ) : error ? (
                    <div className="flex items-center text-red-400"><AlertTriangle className="mr-2 h-4 w-4" />{error}</div>
                ) : (
                    <ul className="space-y-3">
                        {members.map((member) => (
                            <li key={member.id} className="bg-gray-700/50 p-4 rounded-lg flex justify-between items-center">
                                <span className="font-medium">{member.email}</span>
                                <span className="text-sm uppercase font-bold text-gray-400 bg-gray-600/50 px-3 py-1 rounded-full">{member.role}</span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}