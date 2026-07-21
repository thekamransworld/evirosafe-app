import React, { useState } from 'react';
import { useDataContext } from '../contexts';
import { generateHseInsights } from '../services/geminiService';
import { Sparkles, Loader2, TrendingUp, AlertTriangle, CheckCircle, RefreshCw, Shield, Brain } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useToast } from './ui/Toast';

const INSIGHT_TYPES = [
  { id: 'weekly_summary',    label: 'Weekly Summary',       icon: TrendingUp,    color: '#3b82f6', prompt: 'Generate a professional weekly HSE performance summary' },
  { id: 'risk_analysis',     label: 'Risk Analysis',        icon: AlertTriangle, color: '#ef4444', prompt: 'Analyse the current risk profile and identify the top 3 risk areas' },
  { id: 'recommendations',   label: 'Recommendations',      icon: CheckCircle,   color: '#10b981', prompt: 'Provide 5 actionable HSE improvement recommendations' },
  { id: 'leading_indicators',label: 'Leading Indicators',   icon: Shield,        color: '#8b5cf6', prompt: 'Analyse leading indicators and predict potential incidents' },
];

export const AiInsights: React.FC = () => {
  const { info } = useToast();
  const { reportList, ptwList, inspectionList } = useDataContext();
  const [selected, setSelected] = useState(INSIGHT_TYPES[0].id);
  const [loading, setLoading]   = useState(false);
  const [insight, setInsight]   = useState('');
  const [error, setError]       = useState('');

  const selectedType = INSIGHT_TYPES.find(t => t.id === selected)!;

  const generate = async () => {
    setLoading(true);
    setError('');
    setInsight('');
    try {
      const context = JSON.stringify({
        reports:     reportList.slice(0, 20),
        ptws:        ptwList.slice(0, 10),
        inspections: inspectionList.slice(0, 10),
      });
      const result = await generateHseInsights(selectedType.prompt, context);
      setInsight(result);
    } catch (e: any) {
      setError(e.message || 'Failed to generate insight. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="giq-page-title">AI Insights</h1>
          <p className="giq-page-subtitle mt-1">Gemini-powered HSE analysis and recommendations</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold"
          style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)' }}>
          <Brain className="w-3.5 h-3.5" />Coming Soon
        </div>
      </div>

      {/* Type selector */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {INSIGHT_TYPES.map(type => (
          <button key={type.id} onClick={() => setSelected(type.id)}
            className="giq-card p-4 text-left transition-all hover:-translate-y-0.5"
            style={selected === type.id ? { border: `2px solid ${type.color}`, background: `${type.color}08` } : {}}>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-3"
              style={{ background: `${type.color}15` }}>
              <type.icon className="w-4 h-4" style={{ color: type.color }} />
            </div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{type.label}</p>
          </button>
        ))}
      </div>

      {/* Context stats */}
      <div className="giq-card p-4">
        <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-muted)' }}>Data Context</p>
        <div className="flex gap-6 text-sm">
          {[
            { label: 'Reports',     value: reportList.length },
            { label: 'Permits',     value: ptwList.length },
            { label: 'Inspections', value: inspectionList.length },
          ].map(s => (
            <div key={s.label} className="flex items-center gap-2">
              <span className="font-bold" style={{ color: '#10b981' }}>{s.value}</span>
              <span style={{ color: 'var(--text-muted)' }}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Generate button */}
      <button onClick={() => info('AI features are coming soon.')}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold"
        style={{ background: '#10b981', color: 'white' }}>
        <Sparkles className="w-4 h-4" />Generate {selectedType.label} <span className="ml-1 text-[10px] font-bold uppercase bg-amber-500 px-1.5 py-0.5 rounded-full tracking-wide">Soon</span>
      </button>

      {/* Output */}
      {error && (
        <div className="giq-card p-4 text-sm" style={{ border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }}>
          {error}
        </div>
      )}

      {insight && !loading && (
        <div className="giq-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" style={{ color: '#10b981' }} />
              <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{selectedType.label}</span>
            </div>
            <button onClick={() => info('AI features are coming soon.')}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg"
              style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
              <RefreshCw className="w-3 h-3" />Regenerate
            </button>
          </div>
          <div className="prose prose-sm max-w-none dark:prose-invert"
            style={{ color: 'var(--text-secondary)', lineHeight: '1.7' }}>
            <ReactMarkdown>{insight}</ReactMarkdown>
          </div>
        </div>
      )}

      {!insight && !loading && !error && (
        <div className="giq-card py-16 text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'rgba(16,185,129,0.1)' }}>
            <Sparkles className="w-8 h-8" style={{ color: '#10b981', opacity: 0.6 }} />
          </div>
          <p className="font-semibold" style={{ color: 'var(--text-secondary)' }}>Select an insight type and click Generate</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>AI will analyse your HSE data and provide actionable insights</p>
        </div>
      )}
    </div>
  );
};