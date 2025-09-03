"use client";

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, AlertTriangle, UserPlus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface Member {
    id: number;
    email: string;
    role: 'owner' | 'admin' | 'member';
}

// This is the new, functional Invite Member component
function InviteMemberDialog({ onInviteSuccess }: { onInviteSuccess: () => void }) {
    const [email, setEmail] = useState('');
    const [role, setRole] = useState<'admin' | 'member'>('member');
    const [error, setError] = useState('');
    const [isInviting, setIsInviting] = useState(false);
    const [open, setOpen] = useState(false);

    const handleInvite = async () => {
        const token = localStorage.getItem('jwt_token');
        if (!token) return;
        setIsInviting(true);
        setError('');

        try {
            const response = await fetch('http://localhost:8888/api/v1/organizations/me/members', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, role }),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to invite member.');
            }
            onInviteSuccess(); // Callback to refresh the member list
            setOpen(false);     // Close the dialog on success
            setEmail('');       // Reset form
            setRole('member');  // Reset form
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsInviting(false);
        }
    };
    
    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700">
                    <UserPlus className="mr-2 h-4 w-4" /> Invite Member
                </Button>
            </DialogTrigger>
            <DialogContent className="bg-gray-800 border-gray-700 text-white">
                <DialogHeader>
                    <DialogTitle>Invite a New Team Member</DialogTitle>
                    <DialogDescription>
                        Enter the email of the user you want to invite. They must already have a Logicortex account.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="email" className="text-right">Email</Label>
                        <Input id="email" value={email} onChange={(e) => setEmail(e.target.value)} className="col-span-3 bg-gray-700 border-gray-600" placeholder="user@example.com"/>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                         <Label htmlFor="role" className="text-right">Role</Label>
                         <Select onValueChange={(value: 'admin' | 'member') => setRole(value)} defaultValue={role}>
                            <SelectTrigger className="col-span-3 bg-gray-700 border-gray-600">
                                <SelectValue placeholder="Select a role" />
                            </SelectTrigger>
                            <SelectContent className="bg-gray-800 border-gray-700 text-white">
                                <SelectItem value="member">Member</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                <DialogFooter>
                    <Button onClick={() => setOpen(false)} variant="ghost">Cancel</Button>
                    <Button onClick={handleInvite} disabled={isInviting} className="bg-blue-600 hover:bg-blue-700">
                        {isInviting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Send Invite
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// The main page component
export default function TeamPage() {
    const { isAuthenticated } = useAuth();
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
            if (!response.ok) throw new Error('Failed to fetch team members.');
            setMembers(await response.json());
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

    return (
        <div className="max-w-5xl">
            <header className="mb-8">
                <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">Team Management</h1>
                <p className="text-gray-400">Manage members and their roles within your organization.</p>
            </header>

            <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700">
                <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-700">
                    <h2 className="text-xl font-semibold">Team Members ({members.length})</h2>
                    <InviteMemberDialog onInviteSuccess={fetchMembers} />
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