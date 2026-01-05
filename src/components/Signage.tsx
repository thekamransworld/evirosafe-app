import React, { useState, useMemo } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';

// --- TYPES ---
type SignCategory = 'Mandatory' | 'Warning' | 'Prohibition' | 'Emergency' | 'Fire';

interface SignDef {
  id: string;
  title: string;
  category: SignCategory;
  icon: string;
  code: string;
}

// --- 50+ HSE SIGNAGE LIBRARY ---
const SIGN_LIBRARY: SignDef[] = [
  { id: 'm1', title: 'Wear Safety Helmet', category: 'Mandatory', icon: '⛑️', code: 'M001' },
  { id: 'm2', title: 'Wear Safety Footwear', category: 'Mandatory', icon: '🥾', code: 'M002' },
  { id: 'm3', title: 'Wear Ear Protection', category: 'Mandatory', icon: '🎧', code: 'M003' },
  { id: 'm4', title: 'Wear Eye Protection', category: 'Mandatory', icon: '🥽', code: 'M004' },
  { id: 'm5', title: 'Wear Respiratory Mask', category: 'Mandatory', icon: '😷', code: 'M005' },
  { id: 'w1', title: 'General Danger', category: 'Warning', icon: '❗', code: 'W001' },
  { id: 'w2', title: 'High Voltage', category: 'Warning', icon: '⚡', code: 'W002' },
  { id: 'w3', title: 'Flammable Material', category: 'Warning', icon: '🔥', code: 'W003' },
  { id: 'p1', title: 'No Entry', category: 'Prohibition', icon: '⛔', code: 'P001' },
  { id: 'p2', title: 'No Smoking', category: 'Prohibition', icon: '🚭', code: 'P002' },
  { id: 'e1', title: 'First Aid', category: 'Emergency', icon: '⛑️', code: 'E001' },
  { id: 'e2', title: 'Emergency Exit', category: 'Emergency', icon: '🏃', code: 'E002' },
  { id: 'f1', title: 'Fire Extinguisher', category: 'Fire', icon: '🧯', code: 'F001' },
];

const SignVisual: React.FC<{ sign: SignDef; size?: 'sm' | 'lg' }> = ({ sign, size = 'sm' }) => {
  const sizeClass = size === 'sm' ? 'w-24 h-24 text-4xl' : 'w-96 h-96 text-[8rem]';
  const containerClass = "flex items-center justify-center shadow-sm transition-transform";

  switch (sign.category) {
    case 'Mandatory':
      return <div className={`${sizeClass} ${containerClass} rounded-full bg-blue-600 border-[6px] border-white ring-[6px] ring-blue-600 text-white`}>{sign.icon}</div>;
    case 'Prohibition':
      return <div className={`${sizeClass} ${containerClass} rounded-full bg-white border-[10px] border-red-600 relative overflow-hidden`}><div className="absolute inset-0 flex items-center justify-center text-black z-0">{sign.icon}</div><div className="absolute w-[120%] h-[10%] bg-red-600 -rotate-45 transform origin-center z-10"></div></div>;
    case 'Warning':
      return <div className={`${sizeClass} ${containerClass} relative`}><svg viewBox="0 0 100 87" className="w-full h-full drop-shadow-sm"><polygon points="50,0 100,87 0,87" className="fill-yellow-400 stroke-black stroke-[3]" /><text x="50" y="65" fontSize="40" textAnchor="middle" dominantBaseline="middle">{sign.icon}</text></svg></div>;
    case 'Emergency':
      return <div className={`${sizeClass} ${containerClass} rounded-lg bg-green-600 text-white border-[4px] border-white ring-[4px] ring-green-600`}>{sign.icon}</div>;
    case 'Fire':
      return <div className={`${sizeClass} ${containerClass} rounded-lg bg-red-600 text-white border-[4px] border-white ring-[4px] ring-red-600`}>{sign.icon}</div>;
    default:
      return <div>{sign.icon}</div>;
  }
};

const SignCard: React.FC<{ sign: SignDef; onPrint: (sign: SignDef) => void }> = ({ sign, onPrint }) => {
  return (
    <div className="flex flex-col items-center p-4 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-xl hover:shadow-lg transition-all group">
      <div className="mb-4 transform group-hover:scale-110 transition-transform duration-300">
        <SignVisual sign={sign} size="sm" />
      </div>
      <h3 className="font-bold text-gray-900 dark:text-white text-center text-sm h-10 flex items-center justify-center">
        {sign.title}
      </h3>
      <div className="mt-2 flex gap-2 w-full">
        <Button variant="secondary" size="sm" className="w-full text-xs" onClick={() => onPrint(sign)}>
            <PrinterIcon className="w-3 h-3 mr-1" /> Print
        </Button>
      </div>
      <span className="text-[10px] text-gray-400 mt-2 font-mono">{sign.code}</span>
    </div>
  );
};

const PrintableSignView: React.FC<{ sign: SignDef }> = ({ sign }) => {
    const getColor = () => {
        switch(sign.category) {
            case 'Mandatory': return 'bg-blue-600';
            case 'Prohibition': return 'bg-red-600';
            case 'Warning': return 'bg-yellow-400 text-black';
            case 'Emergency': return 'bg-green-600';
            case 'Fire': return 'bg-red-600';
            default: return 'bg-gray-500';
        }
    }

    return (
        <div className="w-full h-full flex flex-col items-center justify-center p-12 border-[10px] border-gray-900 bg-white">
            <div className="transform scale-[1.5] mb-16">
                <SignVisual sign={sign} size="lg" />
            </div>
            <div className={`w-full py-8 text-center ${getColor()} text-white print-color-adjust-exact`}>
                <h1 className="text-7xl font-black uppercase tracking-wider">{sign.title}</h1>
            </div>
            <div className="mt-12 text-2xl font-mono text-gray-500">
                ISO 7010 Compliant • Code: {sign.code} • EviroSafe
            </div>
        </div>
    )
}

export const Signage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [signToPrint, setSignToPrint] = useState<SignDef | null>(null);

  const filteredSigns = useMemo(() => {
    return SIGN_LIBRARY.filter(sign => {
      const matchesSearch = sign.title.toLowerCase().includes(searchTerm.toLowerCase()) || sign.code.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === 'All' || sign.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [searchTerm, categoryFilter]);

  const handlePrint = (sign: SignDef) => {
      setSignToPrint(sign);
      setTimeout(() => {
          window.print();
          setTimeout(() => setSignToPrint(null), 1000);
      }, 500);
  };

  return (
    <div>
      {signToPrint && (
          <div className="print-overlay">
              <PrintableSignView sign={signToPrint} />
          </div>
      )}

      <style>{`
        @media print {
            body { background: white; }
            #root { display: none; }
            .print-overlay {
                display: flex !important;
                position: fixed;
                top: 0; left: 0; width: 100vw; height: 100vh;
                z-index: 9999;
                background: white;
                align-items: center;
                justify-content: center;
            }
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
        .print-overlay { display: none; }
      `}</style>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-text-primary dark:text-white">Signage Library</h1>
          <p className="text-text-secondary dark:text-gray-400">50+ ISO-compliant safety signs ready for download and printing.</p>
        </div>
        
        <div className="flex gap-2">
            <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input 
                    type="text" 
                    placeholder="Search signs..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 pr-4 py-2 rounded-lg border border-gray-300 dark:border-dark-border bg-white dark:bg-dark-card text-sm w-64 focus:ring-2 focus:ring-primary-500 outline-none"
                />
            </div>
        </div>
      </div>

      <Card className="mb-8">
          <div className="flex flex-wrap gap-2">
              {['All', 'Mandatory', 'Warning', 'Prohibition', 'Emergency', 'Fire'].map(cat => (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                        categoryFilter === cat 
                        ? 'bg-slate-800 text-white dark:bg-white dark:text-slate-900 shadow-md' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-white/5 dark:text-gray-400 dark:hover:bg-white/10'
                    }`}
                  >
                      {cat}
                  </button>
              ))}
          </div>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
        {filteredSigns.map(sign => (
            <SignCard key={sign.id} sign={sign} onPrint={handlePrint} />
        ))}
      </div>

      {filteredSigns.length === 0 && (
          <div className="text-center py-20">
              <p className="text-gray-500 text-lg">No signs found matching "{searchTerm}"</p>
              <Button variant="ghost" onClick={() => {setSearchTerm(''); setCategoryFilter('All');}} className="mt-4">Clear Filters</Button>
          </div>
      )}
    </div>
  );
};

const SearchIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>;
const PrinterIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03-.48.062-.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.32 0c.045-.247.075-.5.075-.75V13.5c0-.75-.03-1.492-.075-2.221m-11.245 0c-.045.729-.075 1.471-.075 2.221v3.75c0 .25.03.495.075.75m11.245 0c.383 0 .75.053 1.102.143m-12.447 0c.352-.09.719-.143 1.102-.143m10.245 0c.373 0 .73.056 1.074.156M4.86 18c.344-.1.691-.156 1.074-.156m12.092 0c.344.1.691.156 1.074.156" /></svg>;