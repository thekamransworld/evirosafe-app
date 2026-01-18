import React, { useState, useMemo, useRef } from 'react';
import { Button } from '../ui/Button';
import { 
  Users, AlertTriangle, FileCheck, Shield, CheckCircle, 
  XCircle, Calendar, AlertCircle, TrendingUp, FileText, 
  Download, Printer, Mail, BarChart3, X 
} from 'lucide-react';
import type { 
  Inspection, InspectionFinding, OpeningMeetingData, 
  ClosingMeetingData, User, ImmediateControl 
} from '../../types';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

// --- 1. OPENING MEETING ---
export const OpeningMeetingSection: React.FC<{
  inspectionId: string;
  teamMembers: User[];
  onComplete: (data: OpeningMeetingData) => void;
  isEditable: boolean;
  initialData?: OpeningMeetingData;
}> = ({ teamMembers, onComplete, isEditable, initialData }) => {
  const [data, setData] = useState<OpeningMeetingData>(initialData || {
    conducted_at: new Date().toISOString(),
    supervisor_present: '',
    hazards_discussed: '',
    emergency_procedures_confirmed: false,
    permits_verified: false,
    stop_work_authority_confirmed: false,
    attendees: teamMembers.map(m => m.id),
    notes: '',
  });

  return (
    <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-xl border border-blue-200 dark:border-blue-800 mb-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg"><Users className="w-6 h-6 text-blue-600" /></div>
        <h3 className="text-xl font-bold text-blue-900 dark:text-blue-200">Phase 1: Opening Meeting</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-bold mb-1 text-gray-700 dark:text-gray-300">Supervisor Present</label>
          <input value={data.supervisor_present} onChange={e => setData({...data, supervisor_present: e.target.value})} disabled={!isEditable} className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-700 dark:text-white" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-bold mb-1 text-gray-700 dark:text-gray-300">Hazards Discussed</label>
          <textarea value={data.hazards_discussed} onChange={e => setData({...data, hazards_discussed: e.target.value})} disabled={!isEditable} rows={3} className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-700 dark:text-white" />
        </div>
        <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {['emergency_procedures_confirmed', 'permits_verified', 'stop_work_authority_confirmed'].map(key => (
                <label key={key} className="flex items-center gap-2 p-3 bg-white dark:bg-gray-800 rounded border dark:border-gray-700">
                    <input type="checkbox" checked={(data as any)[key]} onChange={e => setData({...data, [key]: e.target.checked})} disabled={!isEditable} />
                    <span className="text-sm capitalize text-gray-700 dark:text-gray-300">{key.replace(/_/g, ' ')}</span>
                </label>
            ))}
        </div>
      </div>
      {isEditable && <div className="mt-4 flex justify-end"><Button onClick={() => onComplete(data)}>Start Inspection</Button></div>}
    </div>
  );
};

// --- 2. CLOSING MEETING ---
export const ClosingMeetingSection: React.FC<{
  inspection: Inspection;
  findings: InspectionFinding[];
  onComplete: (data: ClosingMeetingData) => void;
  onGenerateReport: () => void;
  isEditable: boolean;
}> = ({ findings, onComplete, onGenerateReport, isEditable }) => {
  const [data, setData] = useState<ClosingMeetingData>({
    conducted_at: new Date().toISOString(),
    key_findings_summary: '',
    immediate_actions_agreed: '',
    follow_up_required: false,
    next_inspection_date: '',
    supervisor_acknowledged: false,
    recommendations: '',
  });

  const stats = useMemo(() => ({
    critical: findings.filter(f => f.risk_level === 'Critical' || f.risk_level === 'High').length,
    total: findings.length
  }), [findings]);

  return (
    <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-xl border border-green-200 dark:border-green-800">
      <div className="flex items-center gap-4 mb-6">
        <CheckCircle className="w-8 h-8 text-green-600" />
        <div><h2 className="text-2xl font-bold text-green-900 dark:text-green-200">Closing Meeting</h2></div>
      </div>
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl text-center"><div className="text-3xl font-bold text-red-600">{stats.critical}</div><div className="text-sm">Critical Findings</div></div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl text-center"><div className="text-3xl font-bold text-blue-600">{stats.total}</div><div className="text-sm">Total Findings</div></div>
      </div>
      <div className="space-y-4">
        <textarea value={data.key_findings_summary} onChange={e => setData({...data, key_findings_summary: e.target.value})} disabled={!isEditable} rows={3} className="w-full p-3 border rounded dark:bg-gray-800 dark:text-white" placeholder="Key Findings Summary..." />
        <textarea value={data.immediate_actions_agreed} onChange={e => setData({...data, immediate_actions_agreed: e.target.value})} disabled={!isEditable} rows={2} className="w-full p-3 border rounded dark:bg-gray-800 dark:text-white" placeholder="Immediate Actions Agreed..." />
        <label className="flex items-center gap-2"><input type="checkbox" checked={data.supervisor_acknowledged} onChange={e => setData({...data, supervisor_acknowledged: e.target.checked})} disabled={!isEditable} /><span className="font-bold text-gray-900 dark:text-white">Supervisor Acknowledged</span></label>
      </div>
      <div className="pt-6 border-t border-green-200 dark:border-green-800 flex gap-3">
        <Button onClick={onGenerateReport} variant="secondary" leftIcon={<FileText className="w-4 h-4"/>}>Generate Report</Button>
        {isEditable && <Button onClick={() => onComplete(data)} disabled={!data.supervisor_acknowledged}>Complete & Close</Button>}
      </div>
    </div>
  );
};

// --- 3. ROOT CAUSE MODAL ---
export const RootCauseAnalysisModal: React.FC<{
  finding: any;
  onSave: (analysis: any) => void;
  onClose: () => void;
}> = ({ finding, onSave, onClose }) => {
  const [analysis, setAnalysis] = useState({ why1: '', why2: '', why3: '', why4: '', why5: '', systemic_issues: [] as string[] });
  const SYSTEMIC_ISSUES = ['Training', 'Procedures', 'Supervision', 'Communication', 'Equipment', 'Environment'];

  return (
    <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-2xl p-6">
        <div className="flex justify-between mb-4"><h2 className="text-xl font-bold text-gray-900 dark:text-white">5 Whys Analysis</h2><button onClick={onClose}><X className="w-6 h-6 text-gray-500"/></button></div>
        <div className="space-y-3 mb-6">
            {[1, 2, 3, 4, 5].map(i => (
                <input key={i} placeholder={`Why ${i}?`} value={(analysis as any)[`why${i}`]} onChange={e => setAnalysis({...analysis, [`why${i}`]: e.target.value})} className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-700 dark:text-white" />
            ))}
        </div>
        <div className="mb-6"><label className="block mb-2 font-bold text-gray-700 dark:text-gray-300">Systemic Issues</label><div className="flex flex-wrap gap-2">{SYSTEMIC_ISSUES.map(issue => (<button key={issue} onClick={() => setAnalysis(p => ({...p, systemic_issues: p.systemic_issues.includes(issue) ? p.systemic_issues.filter(x => x !== issue) : [...p.systemic_issues, issue]}))} className={`px-3 py-1 rounded-full text-sm border ${analysis.systemic_issues.includes(issue) ? 'bg-blue-100 border-blue-500 text-blue-700' : 'bg-gray-100 dark:bg-gray-800 dark:text-gray-300'}`}>{issue}</button>))}</div></div>
        <div className="flex justify-end gap-2"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={() => onSave(analysis)}>Save Analysis</Button></div>
      </div>
    </div>
  );
};

// --- 4. FOLLOW UP SECTION ---
export const FollowUpSection: React.FC<{
  findings: InspectionFinding[];
  onVerify: (id: string, verified: boolean) => void;
}> = ({ findings, onVerify }) => {
  const openFindings = findings.filter(f => f.status !== 'closed');
  return (
    <div className="space-y-4">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Pending Verification</h3>
        {openFindings.length === 0 && <p className="text-green-500">All findings verified!</p>}
        {openFindings.map(f => (
            <div key={f.id} className="p-4 border rounded-lg bg-white dark:bg-gray-800 flex justify-between items-center">
                <div><p className="font-bold text-gray-900 dark:text-white">{f.description}</p><p className="text-sm text-gray-500">{f.risk_level} Risk</p></div>
                <div className="flex gap-2"><Button size="sm" onClick={() => onVerify(f.id, true)} className="bg-green-600">Verify</Button><Button size="sm" variant="danger" onClick={() => onVerify(f.id, false)}>Reject</Button></div>
            </div>
        ))}
    </div>
  );
};

// --- 5. REPORT GENERATOR ---
export const InspectionReportGenerator: React.FC<{ inspection: Inspection }> = ({ inspection }) => {
    const handlePrint = () => window.print();
    return (
        <div className="p-8 bg-white text-black rounded-xl shadow-lg text-center">
            <h1 className="text-3xl font-bold mb-2">INSPECTION REPORT</h1>
            <p className="text-gray-600 mb-8">{inspection.title} - {new Date().toLocaleDateString()}</p>
            <div className="flex justify-center gap-4 print:hidden">
                <Button onClick={handlePrint} leftIcon={<Printer className="w-4 h-4"/>}>Print / Save PDF</Button>
            </div>
        </div>
    );
};