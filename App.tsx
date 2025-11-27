import React, { useState, useEffect } from 'react';
import Auth from './Auth';
import ReportForm from './ReportForm';
import IncidentList from './IncidentList';
import { auth } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';

function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) return <div className="min-h-screen bg-[#0f172a] flex items-center justify-center text-white">Loading...</div>;

  if (!user) {
    return <Auth onLogin={setUser} />;
  }

  return (
    <div className="min-h-screen bg-[#0f172a] text-white">
      <nav className="border-b border-white/10 p-4 flex justify-between items-center bg-[#1e293b]">
        <div className="font-bold text-xl">EviroSafe <span className="text-blue-500">Command Center</span></div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-gray-400">{user.email}</span>
          <button onClick={() => signOut(auth)} className="bg-red-500/20 text-red-200 px-3 py-1 rounded border border-red-500/50 hover:bg-red-500 hover:text-white transition">
            Sign Out
          </button>
        </div>
      </nav>

      <div className="p-8 max-w-7xl mx-auto">
        
        {/* STATS ROW */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white/5 border border-white/10 p-6 rounded-xl backdrop-blur-sm">
            <h3 className="text-gray-400 text-sm font-medium">Safety Score</h3>
            <p className="text-3xl font-bold text-emerald-400 mt-2">98%</p>
          </div>
          <div className="bg-white/5 border border-white/10 p-6 rounded-xl backdrop-blur-sm">
            <h3 className="text-gray-400 text-sm font-medium">Active Workers</h3>
            <p className="text-3xl font-bold text-blue-400 mt-2">142</p>
          </div>
          <div className="bg-white/5 border border-white/10 p-6 rounded-xl backdrop-blur-sm">
            <h3 className="text-gray-400 text-sm font-medium">Reported Incidents</h3>
            <p className="text-3xl font-bold text-amber-400 mt-2">0</p>
          </div>
        </div>
        
        {/* MAIN ROW */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
                <ReportForm /> 
            </div>
            <div className="bg-white/5 border border-white/10 p-6 rounded-xl backdrop-blur-sm min-h-[300px]">
                <h3 className="text-gray-400 text-sm font-medium mb-4 uppercase tracking-wider">Live Incident Feed</h3>
                <IncidentList />
            </div>
        </div>

      </div>
    </div>
  );
}

export default App;