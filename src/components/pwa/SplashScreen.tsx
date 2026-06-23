export function SplashScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white">
      <img src="/npp-logo.jpg" alt="New Paradigm Projects" className="h-16 w-auto mb-6" />
      <p className="text-sm text-gray-500 mt-2">Intelligent Field Service Platform</p>
      <div className="mt-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    </div>
  );
}
