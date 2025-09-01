export default function DashboardPage() {
    return (
        <div className="bg-gray-900 text-white min-h-screen flex flex-col items-center justify-center p-4">
            <div className="text-center space-y-4 max-w-4xl">
                 <h1 className="text-5xl font-bold text-blue-400">
                    Welcome to your Dashboard
                </h1>
                <p className="text-lg text-gray-400">
                    You have successfully logged in.
                </p>
            </div>
        </div>
    );
}