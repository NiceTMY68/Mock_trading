import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, EnvelopeIcon, LockClosedIcon, UserIcon } from '@heroicons/react/24/outline';
import { useAuthStore } from '../../store/auth';
import { login, register, LoginRequest, RegisterRequest } from '../../api/auth';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialMode?: 'login' | 'register';
}

const LoginModal = ({ isOpen, onClose, onSuccess, initialMode = 'login' }: LoginModalProps) => {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    displayName: ''
  });
  const [error, setError] = useState<string | null>(null);
  const { setAuth } = useAuthStore();

  const loginMutation = useMutation({
    mutationFn: (data: LoginRequest) => login(data),
    onSuccess: (data) => {
      setAuth(data.user, data.token, data.refreshToken);
      setError(null);
      onSuccess?.();
      onClose();
    },
    onError: (err: any) => {
      setError(err?.response?.data?.message || 'Login failed. Please try again.');
    }
  });

  const registerMutation = useMutation({
    mutationFn: (data: RegisterRequest) => register(data),
    onSuccess: (data) => {
      setAuth(data.user, data.token, data.refreshToken);
      setError(null);
      onSuccess?.();
      onClose();
    },
    onError: (err: any) => {
      setError(err?.response?.data?.message || 'Registration failed. Please try again.');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (mode === 'login') {
      loginMutation.mutate({
        email: formData.email,
        password: formData.password
      });
    } else {
      registerMutation.mutate({
        email: formData.email,
        password: formData.password,
        displayName: formData.displayName || undefined
      });
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <Transition.Child
        enter="ease-out duration-300"
        enterFrom="opacity-0"
        enterTo="opacity-100"
        leave="ease-in duration-200"
        leaveFrom="opacity-100"
        leaveTo="opacity-0"
      >
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" aria-hidden="true" />
      </Transition.Child>

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Transition.Child
          enter="ease-out duration-300"
          enterFrom="opacity-0 scale-95"
          enterTo="opacity-100 scale-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100 scale-100"
          leaveTo="opacity-0 scale-95"
        >
          <Dialog.Panel className="relative w-full max-w-md rounded-2xl border border-white/10 bg-slate-900/95 backdrop-blur-xl shadow-2xl">
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition focus:outline-none focus:ring-2 focus:ring-emerald-400"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>

            <div className="p-6">
          {/* Header with Tabs */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white mb-4">
              Welcome to CoinLab
            </h2>
            
            {/* Tabs */}
            <div className="flex gap-2 p-1 bg-slate-800/50 rounded-lg mb-4">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError(null);
                }}
                className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-md transition-all ${
                  mode === 'login'
                    ? 'bg-emerald-400 text-slate-900 shadow-lg shadow-emerald-400/30'
                    : 'text-slate-400 hover:text-slate-300'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setError(null);
                }}
                className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-md transition-all ${
                  mode === 'register'
                    ? 'bg-emerald-400 text-slate-900 shadow-lg shadow-emerald-400/30'
                    : 'text-slate-400 hover:text-slate-300'
                }`}
              >
                Sign Up
              </button>
            </div>
            
            <p className="text-sm text-slate-400">
              {mode === 'login'
                ? 'Access your crypto research dashboard'
                : 'Start tracking crypto markets for free'}
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-rose-400/10 border border-rose-400/30 text-rose-400 text-sm">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Display Name</label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    type="text"
                    value={formData.displayName}
                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                    placeholder="Enter your display name"
                    className="w-full rounded-lg border border-white/10 bg-white/5 pl-10 pr-4 py-2 text-white placeholder-slate-500 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/20"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Email Address</label>
              <div className="relative">
                <EnvelopeIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="your@email.com"
                  required
                  className="w-full rounded-lg border border-white/10 bg-white/5 pl-10 pr-4 py-2 text-white placeholder-slate-500 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/20"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
              <div className="relative">
                <LockClosedIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                  required
                  minLength={8}
                  className="w-full rounded-lg border border-white/10 bg-white/5 pl-10 pr-4 py-2 text-white placeholder-slate-500 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/20"
                />
              </div>
              {mode === 'register' && (
                <p className="mt-1 text-xs text-slate-500">Minimum 8 characters</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loginMutation.isPending || registerMutation.isPending}
              className="w-full rounded-lg bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-900 shadow-lg shadow-emerald-400/30 hover:bg-emerald-300 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loginMutation.isPending || registerMutation.isPending
                ? (mode === 'login' ? 'Signing in...' : 'Creating account...')
                : mode === 'login'
                ? 'Sign In'
                : 'Create Account'}
            </button>
          </form>

          {/* Help text */}
          <div className="mt-6 text-center">
            <p className="text-xs text-slate-500">
              By continuing, you agree to CoinLab's Terms of Service and Privacy Policy
            </p>
          </div>
            </div>
          </Dialog.Panel>
        </Transition.Child>
      </div>
    </Dialog>
  );
};

export default LoginModal;

