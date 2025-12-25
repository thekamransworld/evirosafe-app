import React, { useEffect, useMemo, useState } from 'react';
import { useAppContext } from '../contexts';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { certificationProfile as mockProfile } from '../data';
import { generateCertificationInsight } from '../services/geminiService';
import type { CertificationProfile } from '../types';

// ================================
// GLOBAL CERTIFICATION STANDARDS
// ================================
type EducationLevel =
  | 'Below Secondary'
  | 'Secondary' // (Intermediate)
  | 'Diploma'
  | 'Bachelor'
  | 'Master'
  | 'Doctorate';

type CertApplicationStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'suspended';

type CertificateLevel = 'Basic' | 'Professional' | 'Expert' | 'Master';

type CertificateApplication = {
  status: CertApplicationStatus;
  joinedEviroSafeDate: string;
  educationLevel: EducationLevel;
  educationInstitute: string;
  educationYear: string;
  educationField?: string;
  hseExperienceMonths: number;
  currentPosition: string;
  organizationType: string;
  idType: 'National ID'; 
  idNumber: string;
  idIssuingCountry: string;
  idExpiryDate?: string;
  docs: {
    idProof?: string;
    educationProof?: string;
    professionalPhoto?: string;
    employerLetter?: string;
  };
  competencies: {
    riskAssessment: boolean;
    incidentInvestigation: boolean;
    auditConduction: boolean;
    emergencyResponse: boolean;
    legalCompliance: boolean;
  };
  acceptedTerms: boolean;
  acceptedPrivacy: boolean;
  acceptedCodeOfConduct: boolean;
  acceptedContinuousEducation: boolean;
  confirmedTrueInfo: boolean;
  submittedAt?: string;
  reviewedAt?: string;
  approvedAt?: string;
  rejectedAt?: string;
  approvalNotes?: string;
  certificateId?: string;
  certificateLevel?: CertificateLevel;
  certificateIssuedAt?: string;
  certificateValidUntil?: string;
};

const GLOBAL_STANDARDS = {
  MIN_SERVICE_MONTHS: 6,
  MIN_EDUCATION: 'Secondary' as EducationLevel,
  MIN_HSE_EXPERIENCE_MONTHS: 6,
  REQUIRED_DOCS: ['ID Proof', 'Education Proof', 'Professional Photo', 'Employer Letter'],
  VALIDITY_YEARS: {
    Basic: 2,
    Professional: 3,
    Expert: 4,
    Master: 5,
  } as Record<CertificateLevel, number>,
};

const DEFAULT_APP: CertificateApplication = {
  status: 'draft',
  joinedEviroSafeDate: '',
  educationLevel: 'Secondary',
  educationInstitute: '',
  educationYear: '',
  educationField: '',
  hseExperienceMonths: 0,
  currentPosition: '',
  organizationType: 'Other',
  idType: 'National ID',
  idNumber: '',
  idIssuingCountry: '',
  docs: {},
  competencies: {
    riskAssessment: false,
    incidentInvestigation: false,
    auditConduction: false,
    emergencyResponse: false,
    legalCompliance: false,
  },
  acceptedTerms: false,
  acceptedPrivacy: false,
  acceptedCodeOfConduct: false,
  acceptedContinuousEducation: false,
  confirmedTrueInfo: false,
};

// ================================
// HELPERS
// ================================
function monthsBetween(startISO: string, endISO: string) {
  const start = new Date(startISO);
  const end = new Date(endISO);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
  const ms = end.getTime() - start.getTime();
  const approxMonths = Math.floor(ms / (1000 * 60 * 60 * 24 * 30));
  return Math.max(0, approxMonths);
}

function formatDateLong(dateStr: string) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
}

function calcCertificateLevel(profile: CertificationProfile, app: CertificateApplication): CertificateLevel {
  const score =
    profile.safe_working_hours / 1000 +
    profile.total_years_experience * 10 +
    (profile.qualifications?.length || 0) * 5 +
    (app.hseExperienceMonths / 12) * 15;

  if (score >= 110) return 'Master';
  if (score >= 80) return 'Expert';
  if (score >= 55) return 'Professional';
  return 'Basic';
}

function generateCertificateId(level: CertificateLevel, countryCode: string) {
  const prefix = 'EVS';
  const levelCode = level.charAt(0);
  const year = new Date().getFullYear();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  const cc = (countryCode || 'XX').toUpperCase().slice(0, 2);
  return `${prefix}-${levelCode}-${cc}-${year}-${random}`;
}

function statusColor(status: CertApplicationStatus): 'green' | 'blue' | 'yellow' | 'red' | 'gray' {
  switch (status) {
    case 'approved': return 'green';
    case 'submitted': return 'blue';
    case 'under_review': return 'yellow';
    case 'rejected':
    case 'suspended': return 'red';
    default: return 'gray';
  }
}

const ProgressBar: React.FC<{ current: number; target: number; label: string }> = ({ current, target, label }) => {
  const percentage = Math.min(100, Math.max(0, (current / target) * 100));
  return (
    <div className="w-full">
      <div className="flex justify-between text-xs mb-1 text-gray-500 dark:text-gray-400">
        <span>{label}</span>
        <span>{current} / {target}</span>
      </div>
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
        <div
          className="bg-emerald-500 h-2.5 rounded-full transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

// ================================
// CERTIFICATE VISUALS (Golden Seal, Watermarks)
// ================================

const SecurityPattern = () => (
  <div className="absolute inset-0 pointer-events-none opacity-[0.03]" 
    style={{
      backgroundImage: `repeating-linear-gradient(45deg, #000 0, #000 1px, transparent 0, transparent 50%)`,
      backgroundSize: '12px 12px'
    }}
  />
);

const WatermarkRepeater: React.FC = () => {
  return (
    <div className="absolute inset-0 pointer-events-none opacity-[0.04] z-0 overflow-hidden flex flex-wrap content-center justify-center gap-12 rotate-[-15deg]">
        {Array.from({ length: 40 }).map((_, i) => (
           <span key={i} className="text-xl font-black tracking-widest text-emerald-900 uppercase whitespace-nowrap">
              EviroSafe Certified
           </span>
        ))}
    </div>
  );
};

const Barcode: React.FC<{ value: string }> = ({ value }) => (
    <div className="flex flex-col items-center">
        <div className="h-10 flex items-stretch gap-[2px]">
            {value.split('').map((char, i) => (
                <div key={i} className={`w-[2px] ${i % 3 === 0 || i % 2 === 0 ? 'bg-black' : 'bg-transparent'}`} style={{ height: '100%' }}></div>
            ))}
            {/* Simulated decorative bars */}
            <div className="w-[3px] bg-black h-full"></div>
            <div className="w-[1px] bg-white h-full"></div>
            <div className="w-[4px] bg-black h-full"></div>
            <div className="w-[2px] bg-white h-full"></div>
            <div className="w-[1px] bg-black h-full"></div>
            <div className="w-[3px] bg-black h-full"></div>
            <div className="w-[5px] bg-black h-full"></div>
        </div>
        <div className="text-[8px] font-mono mt-1 tracking-widest">{value}</div>
    </div>
);

// --- NEW GOLDEN SEAL COMPONENT ---
const GoldenSeal: React.FC = () => {
  return (
    <div className="relative w-32 h-32 flex items-center justify-center drop-shadow-lg">
      <svg viewBox="0 0 200 200" className="w-full h-full">
        <defs>
          <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F1D87E" />
            <stop offset="25%" stopColor="#D4AF37" />
            <stop offset="50%" stopColor="#AA6C39" />
            <stop offset="75%" stopColor="#D4AF37" />
            <stop offset="100%" stopColor="#F1D87E" />
          </linearGradient>
        </defs>
        
        {/* Starburst Edge */}
        <polygon 
          points="100,10 115,35 140,30 145,55 170,60 160,85 185,100 160,115 170,140 145,145 140,170 115,165 100,190 85,165 60,170 55,145 30,140 40,115 15,100 40,85 30,60 55,55 60,30 85,35"
          fill="url(#goldGradient)"
          stroke="#AA6C39"
          strokeWidth="2"
        />

        {/* Inner Rings */}
        <circle cx="100" cy="100" r="70" fill="none" stroke="#AA6C39" strokeWidth="2" />
        <circle cx="100" cy="100" r="65" fill="none" stroke="#F1D87E" strokeWidth="1" />

        {/* Text Paths */}
        <path id="textCurveTop" d="M 50,100 A 50,50 0 1,1 150,100" fill="none" />
        <text fontSize="13" fontWeight="bold" fill="#5C3A1E" letterSpacing="1">
            <textPath xlinkHref="#textCurveTop" startOffset="50%" textAnchor="middle">
                 EVIROSAFE CERTIFIED
            </textPath>
        </text>

        <path id="textCurveBottom" d="M 45,100 A 55,55 0 0,0 155,100" fill="none" />
        <text fontSize="10" fontWeight="bold" fill="#5C3A1E" letterSpacing="1">
            <textPath xlinkHref="#textCurveBottom" startOffset="50%" textAnchor="middle">
                 OFFICIAL STANDARD
            </textPath>
        </text>

        {/* Center Icon */}
        <path 
            transform="translate(85, 80) scale(1.2)"
            d="M12 2L3 7v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z" 
            fill="none" 
            stroke="#5C3A1E" 
            strokeWidth="2"
        />
        <text x="100" y="108" textAnchor="middle" fontSize="16" fontWeight="900" fill="#5C3A1E">ES</text>
      </svg>
    </div>
  );
};


const InternationalCertificate: React.FC<{
  profile: CertificationProfile;
  user: any;
  app: CertificateApplication;
}> = ({ profile, user, app }) => {
  const level = app.certificateLevel || calcCertificateLevel(profile, app);
  const issueDate = app.certificateIssuedAt || new Date().toISOString().slice(0, 10);
  const validUntil = app.certificateValidUntil || new Date(new Date().setFullYear(new Date().getFullYear() + GLOBAL_STANDARDS.VALIDITY_YEARS[level])).toISOString().slice(0, 10);
  const certId = app.certificateId || 'EVS-XXXX-XX-0000-XXXXXX';

  return (
    <div
      id="printable-certificate"
      className="relative mx-auto overflow-hidden shadow-2xl print:shadow-none"
      style={{
        width: '297mm', // A4 Landscape
        height: '210mm',
        backgroundColor: '#fdfbf7', // Rich Cream Paper
        color: '#1a202c',
        printColorAdjust: 'exact',
        WebkitPrintColorAdjust: 'exact'
      }}
    >
      {/* --- FRAME & BORDERS --- */}
      <div className="absolute inset-0 border-[12px] border-emerald-900" />
      <div className="absolute inset-3 border-[2px] border-[#c5a059]" />
      <div className="absolute inset-5 border-[1px] border-emerald-900/30" />
      
      {/* Corner Ornaments */}
      <div className="absolute top-5 left-5 w-16 h-16 border-t-[4px] border-l-[4px] border-[#c5a059] rounded-tl-xl" />
      <div className="absolute top-5 right-5 w-16 h-16 border-t-[4px] border-r-[4px] border-[#c5a059] rounded-tr-xl" />
      <div className="absolute bottom-5 left-5 w-16 h-16 border-b-[4px] border-l-[4px] border-[#c5a059] rounded-bl-xl" />
      <div className="absolute bottom-5 right-5 w-16 h-16 border-b-[4px] border-r-[4px] border-[#c5a059] rounded-br-xl" />

      {/* --- BACKGROUND SECURITY LAYERS --- */}
      <WatermarkRepeater />
      <SecurityPattern />

      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.08]">
        <img src="/icons/evirosafe-512.png" alt="Crest" className="w-[500px] grayscale brightness-50" />
      </div>

      {/* --- CONTENT LAYER --- */}
      <div className="relative z-10 h-full px-20 py-16 flex flex-col justify-between font-serif">
        
        {/* HEADER */}
        <div className="text-center space-y-4">
            <div className="flex justify-center items-center gap-3 mb-2">
                 <img src="/icons/evirosafe-512.png" alt="Logo" className="h-16 w-16 drop-shadow-md" />
                 <div className="text-left">
                     <h2 className="text-2xl font-bold text-emerald-900 uppercase tracking-widest leading-none">EviroSafe</h2>
                     <p className="text-[10px] text-[#c5a059] font-bold uppercase tracking-[0.3em]">International Safety Standards</p>
                 </div>
            </div>
            
            <div className="border-b-2 border-[#c5a059] w-24 mx-auto mb-6"></div>
            
            <h1 className="text-5xl font-black text-emerald-950 uppercase tracking-wider font-serif" style={{ textShadow: '1px 1px 0px rgba(197, 160, 89, 0.5)' }}>
                Certificate of Competence
            </h1>
            <p className="text-lg text-emerald-800 italic font-medium">
                Health, Safety & Environment Proficiency
            </p>
        </div>

        {/* BODY */}
        <div className="text-center mt-4">
            <p className="text-sm text-slate-500 uppercase tracking-widest mb-4">This certifies that</p>
            
            <div className="relative inline-block px-12 py-2">
                <h2 className="text-4xl font-bold text-slate-900 font-serif border-b-2 border-slate-900/10 pb-2 mb-2">
                    {(user?.name || 'Recipient Name').toUpperCase()}
                </h2>
                <div className="w-full h-1 bg-gradient-to-r from-transparent via-[#c5a059] to-transparent opacity-50"></div>
            </div>

            <p className="mt-6 text-sm text-slate-700 max-w-3xl mx-auto leading-loose">
                Has successfully fulfilled the rigorous requirements set forth by the <strong>EviroSafe Global Certification Board</strong>. 
                The holder has demonstrated exceptional knowledge, practical experience, and commitment to maintaining the highest 
                standards of operational safety and risk management in accordance with 
                <strong> ISO 45001:2018</strong> frameworks.
            </p>

            <div className="mt-8 flex justify-center gap-8">
                <div className="px-6 py-2 border border-[#c5a059] rounded bg-[#fffdf5] shadow-sm">
                    <span className="block text-[10px] uppercase text-[#c5a059] font-bold tracking-wider">Certification Level</span>
                    <span className="block text-xl font-bold text-emerald-900">{level}</span>
                </div>
                <div className="px-6 py-2 border border-[#c5a059] rounded bg-[#fffdf5] shadow-sm">
                    <span className="block text-[10px] uppercase text-[#c5a059] font-bold tracking-wider">Specialization</span>
                    <span className="block text-xl font-bold text-emerald-900">{profile.role_title || 'General HSE'}</span>
                </div>
            </div>
        </div>

        {/* FOOTER AREA */}
        <div className="mt-auto pt-8 flex items-end justify-between border-t border-emerald-900/10">
            
            <div className="text-center">
                 <div className="w-48 border-b border-slate-400 mb-2">
                     <img src="https://upload.wikimedia.org/wikipedia/commons/e/e4/Signature_sample.svg" alt="Sig" className="h-10 mx-auto opacity-70" />
                 </div>
                 <p className="text-xs font-bold text-emerald-900 uppercase">Director of Certification</p>
                 <p className="text-xs text-slate-500">EviroSafe Global HQ</p>
            </div>

            <div className="flex flex-col items-center mb-1">
                 <GoldenSeal />
            </div>

            <div className="text-right flex flex-col items-end">
                <Barcode value={certId} />
                <div className="mt-2 text-[10px] text-slate-600 font-mono">
                    <p>Issue Date: <span className="font-bold">{formatDateLong(issueDate)}</span></p>
                    <p>Expiry Date: <span className="font-bold">{formatDateLong(validUntil)}</span></p>
                    <p className="mt-1 text-[#c5a059] font-bold">Verify at evirosafe.org/verify</p>
                </div>
            </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-3 bg-gradient-to-r from-emerald-900 via-[#c5a059] to-emerald-900"></div>
      </div>
    </div>
  );
};

// ================================
// MAIN COMPONENT
// ================================
export const CertifiedProfile: React.FC = () => {
  const { activeUser } = useAppContext();
  const [activeTab, setActiveTab] = useState<'overview' | 'requirements' | 'evidence' | 'certificate'>('overview');
  const [profile] = useState<CertificationProfile>(mockProfile);
  const [aiInsight, setAiInsight] = useState<{ nextLevelRecommendation: string; missingItems: string[] } | null>(null);
  const [loadingInsight, setLoadingInsight] = useState(false);

  const storageKey = useMemo(() => `evirosafe_cert_app_${activeUser?.id || 'anonymous'}`, [activeUser?.id]);
  const [app, setApp] = useState<CertificateApplication>(DEFAULT_APP);
  const [reviewNote, setReviewNote] = useState('');

  // Load / Save Application State
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setApp((prev) => ({ ...prev, ...JSON.parse(raw) }));
    } catch (e) { console.error(e); }
  }, [storageKey]);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(app));
    } catch (e) { console.error(e); }
  }, [app, storageKey]);

  useEffect(() => {
    const run = async () => {
      setLoadingInsight(true);
      const insight = await generateCertificationInsight(profile);
      setAiInsight(insight);
      setLoadingInsight(false);
    };
    run();
  }, [profile]);

  // Validation Logic
  const eligibility = useMemo(() => {
    const issues: string[] = [];
    const serviceMonths = app.joinedEviroSafeDate ? monthsBetween(app.joinedEviroSafeDate, new Date().toISOString()) : 0;

    const educationOk = ['Secondary', 'Diploma', 'Bachelor', 'Master', 'Doctorate'].includes(app.educationLevel);
    if (!educationOk) issues.push('Minimum education: Secondary (Intermediate) or higher.');

    const serviceOk = serviceMonths >= GLOBAL_STANDARDS.MIN_SERVICE_MONTHS;
    if (!serviceOk) issues.push(`Minimum EviroSafe engagement: ${GLOBAL_STANDARDS.MIN_SERVICE_MONTHS} months.`);

    const hseOk = app.hseExperienceMonths >= GLOBAL_STANDARDS.MIN_HSE_EXPERIENCE_MONTHS;
    if (!hseOk) issues.push(`Minimum HSE experience: ${GLOBAL_STANDARDS.MIN_HSE_EXPERIENCE_MONTHS} months.`);

    const docsOk = Boolean(app.docs.idProof && app.docs.educationProof && app.docs.professionalPhoto && app.docs.employerLetter);
    if (!docsOk) issues.push('Upload all required documents.');

    const competenciesOk = app.competencies.riskAssessment && app.competencies.incidentInvestigation;
    if (!competenciesOk) issues.push('Required competencies: Risk Assessment & Incident Investigation.');

    const termsOk = app.acceptedTerms && app.acceptedPrivacy && app.acceptedCodeOfConduct && app.acceptedContinuousEducation && app.confirmedTrueInfo;
    if (!termsOk) issues.push('Accept all declarations and terms.');

    const idOk = Boolean(app.idType === 'National ID' && app.idNumber && app.idIssuingCountry);
    if (!idOk) issues.push('Valid National ID details required.');

    return { serviceMonths, educationOk, serviceOk, hseOk, docsOk, competenciesOk, termsOk, idOk, issues, isEligible: educationOk && serviceOk && hseOk && docsOk && competenciesOk && termsOk && idOk };
  }, [app]);

  const canSubmit = app.status === 'draft' && eligibility.isEligible;

  // Handlers
  const handleSubmit = () => {
    if (!canSubmit) return;
    setApp(prev => ({ ...prev, status: 'submitted', submittedAt: new Date().toISOString() }));
    setActiveTab('overview');
  };

  const isAdmin = String(activeUser?.role || '').toUpperCase() === 'ADMIN';

  const handleApprove = () => {
    if (!isAdmin) return;
    const level = calcCertificateLevel(profile, app);
    const certId = generateCertificateId(level, app.idIssuingCountry || 'XX');
    const issuedAt = new Date().toISOString().slice(0, 10);
    const validYears = GLOBAL_STANDARDS.VALIDITY_YEARS[level];
    const validUntil = new Date(new Date().setFullYear(new Date().getFullYear() + validYears)).toISOString().slice(0, 10);

    setApp(prev => ({ ...prev, status: 'approved', approvedAt: new Date().toISOString(), approvalNotes: reviewNote, certificateLevel: level, certificateId: certId, certificateIssuedAt: issuedAt, certificateValidUntil: validUntil }));
    setActiveTab('certificate');
  };

  const handleReject = () => {
    if (!isAdmin) return;
    setApp(prev => ({ ...prev, status: 'rejected', rejectedAt: new Date().toISOString(), approvalNotes: reviewNote }));
    setActiveTab('overview');
  };

  const handlePrint = () => {
    const content = document.getElementById('printable-certificate');
    if (!content) return;
    const printWindow = window.open('', '', 'height=900,width=1200');
    if (!printWindow) return;

    printWindow.document.write('<html><head><title>EviroSafe Certificate</title>');
    printWindow.document.write('<script src="https://cdn.tailwindcss.com"></script>');
    printWindow.document.write('<style>@page{size:A4 landscape; margin:0;} body{margin:0; -webkit-print-color-adjust: exact; print-color-adjust: exact;} </style>');
    printWindow.document.write('</head><body>');
    printWindow.document.write(content.outerHTML);
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);
  };

  if (!activeUser) return <div className="p-8 text-center"><p className="text-gray-400">Please sign in.</p></div>;

  // -- HELPER FOR TERMS LIST --
  const termsList = [
    { key: 'acceptedTerms', label: 'I accept the EviroSafe Certification Terms & Conditions' },
    { key: 'acceptedPrivacy', label: 'I accept the Privacy Policy and consent to verification' },
    { key: 'acceptedCodeOfConduct', label: 'I agree to comply with the professional Code of Conduct' },
    { key: 'acceptedContinuousEducation', label: 'I agree to continuous education / renewal requirements' },
    { key: 'confirmedTrueInfo', label: 'I confirm all information provided is true and accurate' },
  ];

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">My Certification Profile</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">International-level rules • evidence • approval • controlled certificate</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setActiveTab('requirements')}>View Requirements</Button>
          <Button onClick={() => setActiveTab('certificate')} disabled={app.status !== 'approved'} title={app.status !== 'approved' ? 'Pending Approval' : ''}>View Certificate</Button>
        </div>
      </div>

      <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
        {[{ key: 'overview', label: 'Overview' }, { key: 'requirements', label: 'Requirements' }, { key: 'evidence', label: 'Apply & Evidence' }, { key: 'certificate', label: 'Certificate' }].map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key as any)} className={`px-4 py-3 font-semibold -mb-px border-b-2 ${activeTab === t.key ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}>{t.label}</button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card title="Certification Status" className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <img src={activeUser.avatar_url || 'https://i.pravatar.cc/150'} className="w-14 h-14 rounded-full border border-gray-200 dark:border-gray-700" alt="avatar" />
                <div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{activeUser.name}</div>
                  <div className="text-gray-500 dark:text-gray-400">{profile.role_title}</div>
                </div>
              </div>
              <div className="text-right">
                <Badge color={statusColor(app.status)}>{app.status.toUpperCase().replace('_', ' ')}</Badge>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">Engagement: <span className="font-bold text-gray-900 dark:text-gray-200">{eligibility.serviceMonths}</span> months</div>
              </div>
            </div>
            {!eligibility.serviceOk && (
              <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200 mb-4">
                <div className="font-bold mb-1">Not Eligible</div>
                <div className="text-sm">Minimum engagement required: {GLOBAL_STANDARDS.MIN_SERVICE_MONTHS} months.</div>
              </div>
            )}
            <div className="space-y-5">
              <ProgressBar current={profile.safe_working_hours} target={5000} label="Safe Working Hours" />
              <ProgressBar current={profile.qualifications?.length || 0} target={5} label="Qualifications" />
              <ProgressBar current={eligibility.serviceMonths} target={GLOBAL_STANDARDS.MIN_SERVICE_MONTHS} label="Engagement Months" />
            </div>
            {eligibility.issues.length > 0 && (
              <div className="mt-6 p-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
                <div className="font-bold mb-2">Pending Items</div>
                <ul className="text-sm space-y-1">
                  {eligibility.issues.map((x, i) => <li key={i}>• {x}</li>)}
                </ul>
                <div className="mt-3"><Button variant="outline" onClick={() => setActiveTab('evidence')}>Go to Application</Button></div>
              </div>
            )}
          </Card>

          <div className="space-y-6">
            <Card title="AI Recommendation" edgeColor="purple" variant="glass">
              {loadingInsight ? <p className="text-gray-500 dark:text-gray-400">Analyzing...</p> : aiInsight ? (
                <div className="space-y-3">
                  <p className="text-gray-700 dark:text-gray-200 italic">"{aiInsight.nextLevelRecommendation}"</p>
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    <div className="font-bold mb-1">Suggested Actions</div>
                    <ul className="space-y-1">{aiInsight.missingItems.map((m, i) => <li key={i}>• {m}</li>)}</ul>
                  </div>
                </div>
              ) : <p className="text-gray-500 dark:text-gray-400">No insight available.</p>}
            </Card>

            {isAdmin && (
              <Card title="Reviewer Panel" edgeColor="red" variant="glass">
                <div className="space-y-3">
                  <textarea value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} className="w-full rounded-xl bg-white dark:bg-black/30 border border-gray-300 dark:border-gray-700 p-3 text-gray-900 dark:text-gray-100 text-sm" placeholder="Reviewer notes" rows={3} />
                  <div className="flex gap-2">
                    <Button onClick={handleApprove} disabled={app.status === 'approved'}>Approve</Button>
                    <Button variant="danger" onClick={handleReject} disabled={app.status === 'draft'}>Reject</Button>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>
      )}

      {activeTab === 'requirements' && (
        <Card title="Global Certification Rules">
          <div className="space-y-6 text-gray-700 dark:text-gray-200">
            <p>1. Minimum {GLOBAL_STANDARDS.MIN_SERVICE_MONTHS} months engagement on EviroSafe platform.</p>
            <p>2. Valid National ID and Secondary Education (or higher) required.</p>
            <p>3. Proven competence in Risk Assessment and Incident Investigation.</p>
          </div>
        </Card>
      )}

      {activeTab === 'evidence' && (
        <Card title="Application Form" actions={<Badge color={statusColor(app.status)}>{app.status}</Badge>}>
            <div className="space-y-8">
                {/* SECTION A */}
                <div className="space-y-4">
                    <h3 className="font-bold text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700 pb-2">A) Eligibility & Education</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Joined Date</label>
                            <input type="date" value={app.joinedEviroSafeDate} onChange={e => setApp(p => ({...p, joinedEviroSafeDate: e.target.value, status: 'draft'}))} className="w-full bg-white dark:bg-black/20 border border-gray-300 dark:border-gray-700 rounded-lg p-2 text-gray-900 dark:text-white" />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Education Level</label>
                            <select value={app.educationLevel} onChange={e => setApp(p => ({...p, educationLevel: e.target.value as any, status: 'draft'}))} className="w-full bg-white dark:bg-black/20 border border-gray-300 dark:border-gray-700 rounded-lg p-2 text-gray-900 dark:text-white">
                                <option value="Secondary">Secondary</option>
                                <option value="Diploma">Diploma</option>
                                <option value="Bachelor">Bachelor</option>
                                <option value="Master">Master</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* SECTION B - ID RESTRICTED */}
                <div className="space-y-4">
                    <h3 className="font-bold text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700 pb-2">B) Identity (National ID Only)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">ID Type</label>
                            <input type="text" value="National ID" disabled className="w-full bg-gray-100 dark:bg-black/40 border border-gray-300 dark:border-gray-700 rounded-lg p-2 text-gray-500 cursor-not-allowed" />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">ID Number</label>
                            <input type="text" value={app.idNumber} onChange={e => setApp(p => ({...p, idNumber: e.target.value, status: 'draft'}))} className="w-full bg-white dark:bg-black/20 border border-gray-300 dark:border-gray-700 rounded-lg p-2 text-gray-900 dark:text-white" placeholder="ID Number" />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Issuing Country</label>
                            <input type="text" value={app.idIssuingCountry} onChange={e => setApp(p => ({...p, idIssuingCountry: e.target.value, status: 'draft'}))} className="w-full bg-white dark:bg-black/20 border border-gray-300 dark:border-gray-700 rounded-lg p-2 text-gray-900 dark:text-white" placeholder="Country Code" />
                        </div>
                    </div>
                </div>

                {/* SECTION F - TERMS */}
                <div className="space-y-4">
                    <h3 className="font-bold text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700 pb-2">F) Terms & Conditions</h3>
                    <div className="space-y-3 bg-gray-50 dark:bg-black/20 p-4 rounded-lg">
                        {termsList.map((t) => (
                            <label key={t.key} className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    checked={!!(app as any)[t.key]} 
                                    onChange={(e) => setApp(p => ({ ...p, status: 'draft', [t.key]: e.target.checked }))}
                                    className="mt-1 w-4 h-4 rounded bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-emerald-600 focus:ring-offset-white dark:focus:ring-offset-gray-900"
                                />
                                <span>{t.label}</span>
                            </label>
                        ))}
                    </div>
                </div>

                <div className="pt-4 flex gap-4">
                    <Button onClick={handleSubmit} disabled={!canSubmit}>Submit Application</Button>
                    <Button variant="outline" onClick={() => setApp(DEFAULT_APP)} disabled={app.status !== 'draft'}>Reset</Button>
                </div>
            </div>
        </Card>
      )}

      {activeTab === 'certificate' && (
        <div className="space-y-6">
            {app.status === 'approved' ? (
                <div className="overflow-auto py-4">
                    <div className="mb-4 flex justify-end gap-2">
                        <Button onClick={handlePrint}>Print Certificate</Button>
                    </div>
                    <InternationalCertificate profile={profile} user={activeUser} app={app} />
                </div>
            ) : (
                <Card>
                    <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Certificate Not Available</h3>
                        <p>Your application is currently <strong>{app.status.replace('_', ' ')}</strong>.</p>
                    </div>
                </Card>
            )}
        </div>
      )}
    </div>
  );
};