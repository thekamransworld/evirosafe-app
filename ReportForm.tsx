import React, { useState } from 'react';
import { db, auth } from './firebase';
import { collection, addDoc } from 'firebase/firestore'; 

export default function ReportForm() {
  const [title, setTitle] = useState('');
  const [severity, setSeverity] = useState('Low');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // THIS SAVES DATA TO FIRESTORE
      await addDoc(collection(db, "incidents"), {
        title: title,
        severity: severity,
        description: description,
        reporter: auth.currentUser?.email,
        date: new Date().toISOString()
      });
      
      alert("Report Submitted Successfully!");
      setTitle('');
      setDescription('');
    } catch (error) {
      console.error("Error adding document: ", error);
      alert("Error submitting report");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white/5 border border-white/10 p-6 rounded-xl backdrop-blur-sm">
      <h3 className="text-xl font-bold text-white mb-4">Report Safety Incident</h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-gray-400 text-sm mb-1">Incident Title</label>
          <input 
            type="text" 
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-black/30 border border-white/10 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
            placeholder="e.g. Chemical Spill in Sector 4"
          />
        </div>

        <div>
          <label className="block text-gray-400 text-sm mb-1">Severity Level</label>
          <select 
            value={severity}
            onChange={(e) => setSeverity(e.target.value)}
            className="w-full bg-black/30 border border-white/10 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
          >
            <option value="Low">🟢 Low Risk</option>
            <option value="Medium">🟡 Medium Risk</option>
            <option value="High">🔴 High Risk</option>
            <option value="Critical">🔥 Critical</option>
          </select>
        </div>

        <div>
          <label className="block text-gray-400 text-sm mb-1">Description</label>
          <textarea 
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-black/30 border border-white/10 rounded px-3 py-2 text-white h-24 focus:outline-none focus:border-blue-500"
            placeholder="Describe what happened..."
          />
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded transition-colors disabled:opacity-50"
        >
          {loading ? 'Sending...' : 'Submit Report'}
        </button>
      </form>
    </div>
  );
}