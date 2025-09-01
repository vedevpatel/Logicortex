import { ShieldCheck, Code, BrainCircuit } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="bg-gray-900 text-white min-h-screen flex flex-col items-center justify-center p-4">
      <div className="text-center space-y-4 max-w-4xl">
        <div className="inline-flex items-center justify-center bg-blue-600/10 text-blue-400 rounded-full p-2 mb-4">
            <BrainCircuit className="h-8 w-8" />
        </div>
        <h1 className="text-5xl md:text-7xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
          Logicortex
        </h1>
        <p className="text-lg md:text-xl text-gray-400">
          An autonomous application security platform acting as an intelligent partner in your development lifecycle.
        </p>
        <div className="flex justify-center gap-4 pt-6">
          <div className="p-6 bg-gray-800/50 rounded-lg border border-gray-700 w-72 text-left">
            <ShieldCheck className="h-8 w-8 text-green-400 mb-2" />
            <h2 className="text-xl font-semibold mb-1">Find Flaws</h2>
            <p className="text-gray-400">Identify complex business logic vulnerabilities that other scanners miss.</p>
          </div>
          <div className="p-6 bg-gray-800/50 rounded-lg border border-gray-700 w-72 text-left">
            <Code className="h-8 w-8 text-yellow-400 mb-2" />
            <h2 className="text-xl font-semibold mb-1">Fix Code</h2>
            <p className="text-gray-400">Automatically generate, test, and submit patches for review.</p>
          </div>
        </div>
      </div>
    </div>
  );
}