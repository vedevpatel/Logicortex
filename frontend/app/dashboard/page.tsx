"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

// Define a type for our organization data for type safety
interface Organization {
    id: number;
    name: string;
    owner_id: number;
}

export default function DashboardPage() {
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const router = useRouter();

    useEffect(() => {
        // This function will be called once when the page loads
        const fetchOrganizations = async () => {
            // 1. Get the JWT from the browser's local storage
            const token = localStorage.getItem('jwt_token');

            if (!token) {
                // If no token is found, the user is not logged in.
                // Redirect them to the login page.
                router.push('/login');
                return;
            }

            try {
                // 2. Make a secure API call to the backend
                const response = await fetch('http://localhost:8000/api/v1/organizations/me', {
                    method: 'GET',
                    headers: {
                        // 3. Include the token in the 'Authorization' header
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                });

                if (response.status === 401) {
                    // If the token is invalid or expired, redirect to login
                    setError('Session expired. Please log in again.');
                    router.push('/login');
                    return;
                }

                if (!response.ok) {
                    throw new Error('Failed to fetch organization data.');
                }

                const data: Organization[] = await response.json();
                setOrganizations(data);

            } catch (err) {
                setError(err instanceof Error ? err.message : 'An unknown error occurred.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchOrganizations();
    }, [router]); // Dependency array ensures this runs only once

    // 4. Render the UI based on the state
    if (isLoading) {
        return (
            <div className="bg-gray-900 text-white min-h-screen flex items-center justify-center">
                <p>Loading your dashboard...</p>
            </div>
        );
    }
    
    if (error) {
         return (
            <div className="bg-gray-900 text-white min-h-screen flex items-center justify-center">
                <p className="text-red-500">Error: {error}</p>
            </div>
        );
    }

    return (
        <div className="bg-gray-900 text-white min-h-screen flex flex-col items-center justify-center p-4">
            <div className="text-center space-y-4 max-w-4xl">
                {organizations.length > 0 ? (
                    <>
                        <h1 className="text-5xl font-bold text-blue-400">
                           Welcome to {organizations[0].name}
                        </h1>
                        <p className="text-lg text-gray-400">
                           This is your main dashboard.
                        </p>
                    </>
                ) : (
                    <h1 className="text-3xl font-bold text-yellow-400">
                        You are not part of any organization yet.
                    </h1>
                )}
            </div>
        </div>
    );
}