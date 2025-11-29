import { useEffect, useState } from 'react';
import apiClient from '../../api/client';

/**
 * Component to check backend availability and display status
 */
const BackendStatus = () => {
  const [isBackendAvailable, setIsBackendAvailable] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkBackend = async () => {
      try {
        // Use fetch directly to avoid axios baseURL issues
        // Add timeout to avoid hanging
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        
        const response = await fetch('http://localhost:3000/health', {
          signal: controller.signal,
          method: 'GET',
          headers: {
            'Accept': 'application/json'
          }
        });
        
        clearTimeout(timeoutId);
        // Accept both 200 (ok) and 503 (degraded but running)
        // This allows the app to work even if Redis is not available
        const isResponsive = response.status === 200 || response.status === 503;
        setIsBackendAvailable(isResponsive);
      } catch (error) {
        setIsBackendAvailable(false);
      } finally {
        setIsChecking(false);
      }
    };

    checkBackend();
    // Check every 30 seconds - less spam, backend rarely goes down during development
    const interval = setInterval(checkBackend, 30000);
    return () => clearInterval(interval);
  }, []);

  if (isChecking || isBackendAvailable) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 rounded-lg bg-rose-500/90 border border-rose-400 px-4 py-3 shadow-lg max-w-sm">
      <div className="flex items-start gap-3">
        <div className="text-rose-100 text-lg">⚠️</div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-white">Backend Not Available</p>
          <p className="text-xs text-rose-100 mt-1">
            Please ensure the backend server is running on port 3000.
          </p>
        </div>
        <button
          onClick={() => setIsBackendAvailable(null)}
          className="text-rose-200 hover:text-white text-lg leading-none"
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
    </div>
  );
};

export default BackendStatus;

