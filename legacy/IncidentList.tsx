import React, { useEffect, useState } from 'react';
import { db } from './firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';

export default function IncidentList() {
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen for updates in real-time
    const q = query(collection(db, "incidents"), orderBy("date", "desc"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setIncidents(list);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) return <div className="text-gray-400 text-center p-4">Loading feed...</div>;

  return (
    <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
      {incidents.length === 0 ? (
        <p className="text-gray-500 text-center py-10">No incidents reported yet.</p>
      ) : (
        incidents.map((item) => (
          <div key={item.id} className="bg-white/5 border border-white/10 p-4 rounded-lg hover:bg-white/10 transition-colors">
            <div className="flex justify-between items-start mb-2">
              <h4 className="font-bold text-white text-lg">{item.title}</h4>
              <span className={`px-2 py-1 rounded text-xs font-bold ${
                item.severity === 'Critical' ? 'bg-red-500 text-white animate-pulse' :
                item.severity === 'High' ? 'bg-orange-500 text-white' :
                item.severity === 'Medium' ? 'bg-yellow-500 text-black' :
                'bg-green-500 text-white'
              }`}>
                {item.severity}
              </span>
            </div>
            <p className="text-gray-300 text-sm mb-3">{item.description}</p>
            <div className="flex justify-between items-center text-xs text-gray-500 border-t border-white/5 pt-2">
              <span>Reported by: {item.reporter}</span>
              <span>{new Date(item.date).toLocaleDateString()}</span>
            </div>
          </div>
        ))
      )}
    </div>
  );
}