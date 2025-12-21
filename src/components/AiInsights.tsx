import React, { useState } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { generateSafetyReport } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';
import { 
  Sparkles, Brain, AlertTriangle, FileText, 
  Send, RefreshCw, ChevronRight, Zap,
  BarChart, Shield, Lock, BrainCircuit // <--- Added missing import
} from 'lucide-react';

const glassCard = "bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl";

const PresetPrompt: React.FC<{ 
  icon: React.ReactNode; 
  title: string; 
  prompt: string; 
  onClick: (p: string) => void; 
}> = ({ icon, title, prompt, onClick }) => (
  <button 
    onClick={() => onClick(prompt)}
    className="flex items-start gap-4 p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-cyan-500/30 transition-all group text-left w-full"
  >
    <div className="p-2 rounded-lg bg-black/20 text-cyan-400 group-hover:scale-110 transition-transform">
      {icon}
    </div>
    <div>
      <h4 className="font-bold text-slate-200 text-sm mb-1 group-hover:text-white">{title}</h4>
      <p className="text-xs text-slate-400 line-clamp-2">{prompt}</p>
    </div>
  </button>
);

export const AiInsights: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [report, setReport] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsLoading(true);
    setError(null);
    setReport('');
    try {
      const result = await generateSafetyReport(prompt);
      // Format the JSON result into Markdown for display
      const formattedReport = `
# 🤖 AI Safety Assessment

### **Risk Level:** ${result.riskLevel}

### **Root Cause Analysis**
${result.rootCause}

### **Executive Summary**
${result.description}

### **Recommended Actions**
${result.recommendation}
      `;
      setReport(formattedReport);
    } catch (e: any) {
      setError("AI Service unavailable. Please check your API Key in .env");
    } finally {
      setIsLoading(false);
    }
  };

  const prompts = [
    {
      title: "Risk Assessment Generator",
      icon: <Shield className="w-5 h-5" />,
      text: "Generate a comprehensive risk assessment for a high-rise scaffolding installation in high wind conditions, focusing on dropped objects and fall protection."
    },
    {
      title: "Incident Root Cause",
      icon: <AlertTriangle className="w-5 h-5" />,
      text: "Analyze this incident: A forklift operator collided with a racking unit in the warehouse. The floor was wet from rain, and the driver was working a double shift."
    },
    {
      title: "Toolbox Talk Creator",
      icon: <MegaphoneIcon className="w-5 h-5" />,
      text: "Create a 5-minute Toolbox Talk about 'Heat Stress Management' for a construction crew working in 45°C temperatures."
    },
    {
      title: "Policy Compliance Check",
      icon: <FileText className="w-5 h-5" />,
      text: "Review the safety requirements for 'Confined Space Entry' according to OSHA 1910.146 and list the mandatory permits and equipment."
    }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-6 relative overflow-hidden">
      
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-cyan-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">NeuroCommand AI</h1>
            <p className="text-slate-400">Advanced Safety Analytics & Generative Intelligence</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT: Input Console */}
          <div className="lg:col-span-4 space-y-6">
            <div className={`${glassCard} p-6`}>
              <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                Quick Prompts
              </h3>
              <div className="space-y-3">
                {prompts.map((p, i) => (
                  <PresetPrompt 
                    key={i} 
                    icon={p.icon} 
                    title={p.title} 
                    prompt={p.text} 
                    onClick={setPrompt} 
                  />
                ))}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/20">
              <div className="flex items-center gap-2 mb-2">
                <Lock className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-bold text-purple-300">ENTERPRISE GRADE SECURITY</span>
              </div>
              <p className="text-xs text-slate-400">
                Your data is processed securely. AI insights are generated based on global HSE standards (ISO 45001, OSHA).
              </p>
            </div>
          </div>

          {/* RIGHT: Chat & Results */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Input Area */}
            <div className={`${glassCard} p-1`}>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe a safety scenario, ask for a regulation check, or request a risk assessment..."
                className="w-full h-32 bg-transparent text-white p-4 resize-none focus:outline-none placeholder:text-slate-600"
              />
              <div className="flex justify-between items-center bg-black/20 p-2 rounded-xl">
                <div className="flex gap-2">
                   {/* Tool buttons placeholder */}
                   <button className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white"><FileText className="w-4 h-4"/></button>
                </div>
                <Button 
                  onClick={handleGenerate} 
                  disabled={isLoading || !prompt.trim()}
                  className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/20"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate Insight
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Results Display */}
            {report && (
              <div className={`${glassCard} p-8 animate-fade-in-up`}>
                <div className="flex items-center justify-between mb-6 pb-6 border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
                      <BotIcon className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">Analysis Complete</h3>
                      <p className="text-xs text-slate-400">Generated by Gemini 1.5 Flash</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                     <Button variant="secondary" size="sm">Copy</Button>
                     <Button variant="secondary" size="sm">Export PDF</Button>
                  </div>
                </div>
                
                <div className="prose prose-invert max-w-none">
                  <ReactMarkdown>{report}</ReactMarkdown>
                </div>
              </div>
            )}

            {error && (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 flex items-center gap-3">
                <AlertTriangle className="w-5 h-5" />
                {error}
              </div>
            )}

            {!report && !isLoading && !error && (
              <div className="flex flex-col items-center justify-center h-64 text-slate-600">
                <BrainCircuit className="w-16 h-16 mb-4 opacity-20" />
                <p>Ready to analyze safety data</p>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

// Icons helper
const MegaphoneIcon = (props: any) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>;
const BotIcon = (props: any) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" /></svg>;