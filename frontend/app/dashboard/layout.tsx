"use client";

import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  BrainCircuit,
  Home,
  LogOut,
  Loader2,
  LayoutDashboard,
  Users,
} from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading, logout, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="bg-gray-900 text-white min-h-screen flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-blue-400" />
      </div>
    );
  }

  if (isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex">
        {/* Sidebar Navigation */}
        <nav className="w-25 bg-gray-950/50 border-r border-gray-800 p-4 flex flex-col">
          <div className="flex items-center mb-8">
            <BrainCircuit className="h-8 w-8 text-blue-400 mr-2" />
            <span className="font-bold text-xl">Logicortex</span>
          </div>
          <ul className="space-y-2">
            <li>
              <Link href="/dashboard" passHref>
                <Button variant="ghost" className="w-full justify-start">
                  <LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard
                </Button>
              </Link>
            </li>
            <li>
              <Link href="/dashboard/team" passHref>
                  <Button variant="ghost" className="w-full justify-start text-gray-300 hover:bg-gray-700 hover:text-white">
                      <Users className="mr-2 h-4 w-4" /> Team
                  </Button>
              </Link>
            </li>
            <li>
              <Link href="/" passHref>
                <Button variant="ghost" className="w-full justify-start">
                  <Home className="mr-2 h-4 w-4" /> Main Site
                </Button>
              </Link>
            </li>
          </ul>
          <div className="mt-auto">
            <div className="border-t border-gray-800 pt-4">
              <p className="text-sm text-gray-400 truncate">{user?.email}</p>
              <Button
                variant="ghost"
                className="w-full justify-start text-red-400 hover:text-red-300"
                onClick={logout}
              >
                <LogOut className="mr-2 h-4 w-4" /> Logout
              </Button>
            </div>
          </div>
        </nav>
        <main className="flex-1 p-8 overflow-auto">{children}</main>
      </div>
    );
  }

  return null; // Fallback if not authenticated
}
