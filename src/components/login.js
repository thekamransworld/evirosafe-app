import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, Lock, Mail, AlertCircle } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSigningUp, setIsSigningUp] = useState(false); // Toggle between Login and Sign Up
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login, signup } = useAuth();

  async function handleSubmit(e) {
    e.preventDefault();
    
    // Basic validation
    if(password.length < 6) {
        return setError("Password must be at least 6 characters");
    }

    try {
      setError('');
      setLoading(true);
      if (isSigningUp) {
        await signup(email, password);
      } else {
        await login(email, password);
      }
    } catch (err) {
      setError('Failed to ' + (isSigningUp ? 'create account' : 'log in') + ': ' + err.message);
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-slate-800 p-8 rounded-xl shadow-2xl w-full max-w-md border border-slate-700">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="bg-blue-600/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-blue-500" />
          </div>
          <h2 className="text-2xl font-bold text-white">Safety System</h2>
          <p className="text-slate-400">
            {isSigningUp ? "Create a secure account" : "Sign in to access dashboard"}
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded-lg mb-4 flex items-center gap-2 text-sm">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-slate-400 text-sm mb-1">Email</label>
            <div className="relative">
              <Mail className="w-5 h-5 text-slate-500 absolute left-3 top-2.5" />
              <input 
                type="email" 
                required
                className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 pl-10 pr-4 text-white focus:outline-none focus:border-blue-500"
                placeholder="safety@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-400 text-sm mb-1">Password</label>
            <div className="relative">
              <Lock className="w-5 h-5 text-slate-500 absolute left-3 top-2.5" />
              <input 
                type="password" 
                required
                className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 pl-10 pr-4 text-white focus:outline-none focus:border-blue-500"
                placeholder="••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button 
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? 'Processing...' : (isSigningUp ? 'Sign Up' : 'Log In')}
          </button>
        </form>

        {/* Toggle */}
        <div className="mt-6 text-center text-sm text-slate-400">
          {isSigningUp ? "Already have an account? " : "Need an account? "}
          <button 
            onClick={() => setIsSigningUp(!isSigningUp)}
            className="text-blue-400 hover:text-blue-300 font-medium"
          >
            {isSigningUp ? "Log In" : "Sign Up"}
          </button>
        </div>

      </div>
    </div>
  );
}