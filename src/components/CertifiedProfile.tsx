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

  // Eligibility (EviroSafe engagement)
  joinedEviroSafeDate: string;

  // Education
  educationLevel: EducationLevel;
  educationInstitute: string;
  educationYear: string;
  educationField?: string;

  // Professional
  hseExperienceMonths: number;
  currentPosition: string;
  organizationType: string;

  // Identity (KYC) - RESTRICTED TO NATIONAL ID ONLY
  idType: 'National ID'; 
  idNumber: string;
  idIssuingCountry: string;
  idExpiryDate?: string;

  // Required documents
  docs: {
    idProof?: string;
    educationProof?: string;
    professionalPhoto?: string;
    employerLetter?: string;
    trainingEvidence?: string[];
    experienceCertificate?: string;
    references?: string[];
  };

  // Competency declaration
  competencies: {
    riskAssessment: boolean;
    incidentInvestigation: boolean;
    auditConduction: boolean;
    emergencyResponse: boolean;
    legalCompliance: boolean;
  };

  // Terms & conditions
  acceptedTerms: boolean;
  acceptedPrivacy: boolean;
  acceptedCodeOfConduct: boolean;
  acceptedContinuousEducation: boolean;
  confirmedTrueInfo: boolean;

  // Review meta
  submittedAt?: string;
  reviewedAt?: string;
  approvedAt?: string;
  rejectedAt?: string;
  approvalNotes?: string;

  // Certificate details
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
      <div className="flex justify-between text-xs mb-1 text-gray-400">
        <span>{label}</span>
        <span>{current} / {target}</span>
      </div>
      <div className="w-full bg-gray-700 rounded-full h-2.5">
        <div
          className="bg-neon-green h-2.5 rounded-full transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

// --- CERTIFICATE DESIGN COMPONENTS ---

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
            {/* Simulated bars */}
            <div className="w-[3px] bg-black h-full"></div>
            <div className="w-[1px] bg-white h-full"></div>
            <div className="w-[4px] bg-black h-full"></div>
            <div className="w-[2px] bg-white h-full"></div>
            <div className="w-[1px] bg-black h-full"></div>
            <div className="w-[3px] bg-black h-full"></div>
            <div className="w-[2px] bg-white h-full"></div>
            <div className="w-[5px] bg-black h-full"></div>
        </div>
        <div className="text-[8px] font-mono mt-1 tracking-widest">{value}</div>
    </div>
);

// --- NEW GOLDEN SEAL COMPONENT ---
const GoldenSeal: React.FC = () => {
  return (
    <div className="relative w-36 h-36 flex items-center justify-center drop-shadow-xl">
      <svg viewBox="0 0 200 200" className="w-full h-full">
        <defs>
          <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F1D87E" />
            <stop offset="25%" stopColor="#D4AF37" />
            <stop offset="50%" stopColor="#AA6C39" />
            <stop offset="75%" stopColor="#D4AF37" />
            <stop offset="100%" stopColor="#F1D87E" />
          </linearGradient>
          <filter id="emboss">
            <feGaussianBlur in="SourceAlpha" stdDeviation="2" result="blur" />
            <feSpecularLighting in="blur" surfaceScale="5" specularConstant=".75" specularExponent="20" lightingColor="#F1D87E" result="specOut">
                <fePointLight x="-5000" y="-10000" z="20000"/>
            </feSpecularLighting>
            <feComposite in="specOut" in2="SourceAlpha" operator="in" result="specOut" />
            <feComposite in="SourceGraphic" in2="specOut" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" result="litPaint" />
          </filter>
        </defs>

        {/* Jagged Edge (Starburst) */}
        <path
          d="M100,10 L110,35 L135,30 L135,55 L160,60 L150,85 L175,100 L150,115 L160,140 L135,145 L135,170 L110,165 L100,190 L90,165 L65,170 L65,145 L40,140 L50,115 L25,100 L50,85 L40,60 L65,55 L65,30 L90,35 Z"
          fill="url(#goldGradient)"
          stroke="#AA6C39"
          strokeWidth="2"
          filter="url(#emboss)"
        />
        
        {/* Inner Circle */}
        <circle cx="100" cy="100" r="70" fill="none" stroke="#AA6C39" strokeWidth="2" />
        <circle cx="100" cy="100" r="65" fill="none" stroke="#F1D87E" strokeWidth="1" />

        {/* Text Path */}
        <path id="textCurve" d="M 50,100 A 50,50 0 1,1 150,100" fill="none" />
        <text width="200" fontSize="14" fontWeight="bold" fill="#5C3A1E" textAnchor="middle" letterSpacing="2">
            <textPath xlinkHref="#textCurve" startOffset="50%" textAnchor="middle">
                 EVIROSAFE
            </textPath>
        </text>

        <path id="textCurveBottom" d="M 45,100 A 55,55 0 0,0 155,100" fill="none" />
        <text width="200" fontSize="10" fontWeight="bold" fill="#5C3A1E" textAnchor="middle" letterSpacing="1">
            <textPath xlinkHref="#textCurveBottom" startOffset="50%" textAnchor="middle">
                 OFFICIAL CERTIFICATION
            </textPath>
        </text>

        {/* Center Shield Icon */}
        <path 
            transform="translate(82, 75) scale(1.5)"
            d="M12 2L3 7v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z" 
            fill="url(#goldGradient)" 
            stroke="#5C3A1E" 
            strokeWidth="1"
        />
        <text x="100" y="105" textAnchor="middle" fontSize="16" fontWeight="900" fill="#5C3A1E">ES</text>
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
      {/* Outer Gold/Emerald Border */}
      <div className="absolute inset-0 border-[12px] border-emerald-900" />
      <div className="absolute inset-3 border-[2px] border-[#c5a059]" /> {/* Gold Line */}
      <div className="absolute inset-5 border-[1px] border-emerald-900/30" />
      
      {/* Corner Ornaments */}
      <div className="absolute top-5 left-5 w-16 h-16 border-t-[4px] border-l-[4px] border-[#c5a059] rounded-tl-xl" />
      <div className="absolute top-5 right-5 w-16 h-16 border-t-[4px] border-r-[4px] border-[#c5a059] rounded-tr-xl" />
      <div className="absolute bottom-5 left-5 w-16 h-16 border-b-[4px] border-l-[4px] border-[#c5a059] rounded-bl-xl" />
      <div className="absolute bottom-5 right-5 w-16 h-16 border-b-[4px] border-r-[4px] border-[#c5a059] rounded-br-xl" />

      {/* --- BACKGROUND SECURITY LAYERS --- */}
      <WatermarkRepeater />
      <SecurityPattern />

      {/* Central Crest Watermark */}
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
                {/* Decorative flourish under name */}
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
            
            {/* Signature Area */}
            <div className="text-center">
                 <div className="w-48 border-b border-slate-400 mb-2">
                     <img src="https://upload.wikimedia.org/wikipedia/commons/e/e4/Signature_sample.svg" alt="Sig" className="h-10 mx-auto opacity-70" />
                 </div>
                 <p className="text-xs font-bold text-emerald-900 uppercase">Director of Certification</p>
                 <p className="text-[10px] text-slate-500">EviroSafe Global HQ</p>
            </div>

            {/* NEW GOLDEN SEAL */}
            <div className="flex flex-col items-center mb-2">
                 <GoldenSeal />
            </div>

            {/* Verification Area */}
            <div className="text-right flex flex-col items-end">
                <Barcode value={certId} />
                <div className="mt-2 text-[10px] text-slate-600 font-mono">
                    <p>Issue Date: <span className="font-bold">{formatDateLong(issueDate)}</span></p>
                    <p>Expiry Date: <span className="font-bold">{formatDateLong(validUntil)}</span></p>
                    <p className="mt-1 text-[#c5a059] font-bold">Verify at evirosafe.org/verify</p>
                </div>
            </div>
        </div>

        {/* ID STRIP BOTTOM */}
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

  // Load saved application
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setApp((prev) => ({ ...prev, ...JSON.parse(raw) }));
    } catch (e) {
      console.error('Failed to load saved certification application', e);
    }
  }, [storageKey]);

  // Save on changes (always)
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(app));
    } catch (e) {
      console.error('Failed to save certification application', e);
    }
  }, [app, storageKey]);

  // AI Insight (optional)
  useEffect(() => {
    const run = async () => {
      setLoadingInsight(true);
      const insight = await generateCertificationInsight(profile);
      setAiInsight(insight);
      setLoadingInsight(false);
    };
    run();
  }, [profile]);

  const eligibility = useMemo(() => {
    const issues: string[] = [];

    const serviceMonths = app.joinedEviroSafeDate ? monthsBetween(app.joinedEviroSafeDate, new Date().toISOString()) : 0;

    const educationOk = ['Secondary', 'Diploma', 'Bachelor', 'Master', 'Doctorate'].includes(app.educationLevel);
    if (!educationOk) issues.push('Minimum education required: Intermediate / Secondary or higher.');

    const serviceOk = serviceMonths >= GLOBAL_STANDARDS.MIN_SERVICE_MONTHS;
    if (!serviceOk) issues.push(`Minimum EviroSafe engagement required: ${GLOBAL_STANDARDS.MIN_SERVICE_MONTHS} months.`);

    const hseOk = app.hseExperienceMonths >= GLOBAL_STANDARDS.MIN_HSE_EXPERIENCE_MONTHS;
    if (!hseOk) issues.push(`Minimum HSE experience required: ${GLOBAL_STANDARDS.MIN_HSE_EXPERIENCE_MONTHS} months.`);

    const docsOk = Boolean(app.docs.idProof && app.docs.educationProof && app.docs.professionalPhoto && app.docs.employerLetter);
    if (!docsOk) issues.push('Upload required documents: ID, Education, Photo, Employer Letter.');

    const competenciesOk = app.competencies.riskAssessment && app.competencies.incidentInvestigation;
    if (!competenciesOk) issues.push('Competency required: Risk Assessment + Incident Investigation.');

    const termsOk =
      app.acceptedTerms &&
      app.acceptedPrivacy &&
      app.acceptedCodeOfConduct &&
      app.acceptedContinuousEducation &&
      app.confirmedTrueInfo;
    if (!termsOk) issues.push('Accept all required Terms & Conditions and declarations.');

    const idOk = Boolean(app.idType && app.idNumber && app.idIssuingCountry);
    if (!idOk) issues.push('Complete identity verification fields (ID number, issuing country).');

    return {
      serviceMonths,
      educationOk,
      serviceOk,
      hseOk,
      docsOk,
      competenciesOk,
      termsOk,
      idOk,
      issues,
      isEligible: educationOk && serviceOk && hseOk && docsOk && competenciesOk && termsOk && idOk,
    };
  }, [app]);

  const canSubmit = app.status === 'draft' && eligibility.isEligible;

  const handleSubmit = () => {
    if (!canSubmit) return;
    setApp((prev) => ({
      ...prev,
      status: 'submitted',
      submittedAt: new Date().toISOString(),
    }));
    setActiveTab('overview');
  };

  const isAdmin = String(activeUser?.role || '').toUpperCase() === 'ADMIN';

  const handleMoveToReview = () => {
    if (!isAdmin) return;
    setApp((prev) => ({
      ...prev,
      status: 'under_review',
      reviewedAt: new Date().toISOString(),
      approvalNotes: reviewNote || prev.approvalNotes,
    }));
  };

  const handleApprove = () => {
    if (!isAdmin) return;

    const level = calcCertificateLevel(profile, app);
    const certId = generateCertificateId(level, app.idIssuingCountry || 'XX');

    const issuedAt = new Date().toISOString().slice(0, 10);
    const validYears = GLOBAL_STANDARDS.VALIDITY_YEARS[level];
    const validUntil = new Date(new Date().setFullYear(new Date().getFullYear() + validYears)).toISOString().slice(0, 10);

    setApp((prev) => ({
      ...prev,
      status: 'approved',
      approvedAt: new Date().toISOString(),
      approvalNotes: reviewNote || prev.approvalNotes,
      certificateLevel: level,
      certificateId: certId,
      certificateIssuedAt: issuedAt,
      certificateValidUntil: validUntil,
    }));
    setActiveTab('certificate');
  };

  const handleReject = () => {
    if (!isAdmin) return;
    setApp((prev) => ({
      ...prev,
      status: 'rejected',
      rejectedAt: new Date().toISOString(),
      approvalNotes: reviewNote || prev.approvalNotes || 'Rejected by reviewer.',
    }));
    setActiveTab('overview');
  };

  const handlePrint = () => {
    const content = document.getElementById('printable-certificate');
    if (!content) return;

    const printWindow = window.open('', '', 'height=900,width=1200');
    if (!printWindow) return;

    // Tailwind CDN for print styling (simple and consistent)
    printWindow.document.write('<html><head><title>EviroSafe Certificate</title>');
    printWindow.document.write('<meta charset="utf-8" />');
    printWindow.document.write('<script src="https://cdn.tailwindcss.com"></script>');
    // Force background colors to print
    printWindow.document.write('<style>@page{size:A4 landscape; margin:0;} body{margin:0; -webkit-print-color-adjust: exact; print-color-adjust: exact;} </style>');
    printWindow.document.write('</head><body>');
    printWindow.document.write(content.outerHTML);
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);
  };

  if (!activeUser) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold text-gray-200 mb-2">EviroSafe Certification</h1>
        <p className="text-gray-400">Please sign in to access the certification portal.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-100">My Certification Profile</h1>
          <p className="text-gray-400 mt-1">International-level rules • evidence • approval • controlled certificate</p>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setActiveTab('requirements')}>
            View Requirements
          </Button>
          <Button
            onClick={() => setActiveTab('certificate')}
            disabled={app.status !== 'approved'}
            title={app.status !== 'approved' ? 'Certificate available only after approval' : 'View certificate'}
          >
            View Certificate
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-700 mb-6">
        {[
          { key: 'overview', label: 'Overview' },
          { key: 'requirements', label: 'Requirements' },
          { key: 'evidence', label: 'Apply & Evidence' },
          { key: 'certificate', label: 'Certificate' },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key as any)}
            className={`px-4 py-3 font-semibold -mb-px border-b-2 ${
              activeTab === t.key ? 'border-neon-green text-neon-green' : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card title="Certification Status" className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <img
                  src={activeUser.avatar_url || 'https://i.pravatar.cc/150?u=evirosafe'}
                  className="w-14 h-14 rounded-full border border-gray-700"
                  alt="avatar"
                />
                <div>
                  <div className="text-2xl font-bold text-gray-100">{activeUser.name}</div>
                  <div className="text-gray-400">{profile.role_title}</div>
                </div>
              </div>

              <div className="text-right">
                <Badge color={statusColor(app.status)}>{app.status.toUpperCase().replace('_', ' ')}</Badge>
                <div className="text-xs text-gray-400 mt-2">
                  Engagement: <span className="font-bold text-gray-200">{eligibility.serviceMonths}</span> months
                </div>
              </div>
            </div>

            {/* Eligibility warning */}
            {!eligibility.serviceOk && (
              <div className="p-4 rounded-xl border border-red-400/40 bg-red-500/10 text-red-200 mb-4">
                <div className="font-bold mb-1">Certificate cannot be issued</div>
                <div className="text-sm">Minimum EviroSafe engagement is {GLOBAL_STANDARDS.MIN_SERVICE_MONTHS} months.</div>
              </div>
            )}

            {/* Progress */}
            <div className="space-y-5">
              <ProgressBar current={profile.safe_working_hours} target={5000} label="Safe Working Hours (Target: 5,000)" />
              <ProgressBar current={profile.qualifications?.length || 0} target={5} label="Required Qualifications (Target: 5)" />
              <ProgressBar current={eligibility.serviceMonths} target={GLOBAL_STANDARDS.MIN_SERVICE_MONTHS} label="EviroSafe Engagement (Months)" />
            </div>

            {/* Missing issues */}
            {eligibility.issues.length > 0 && (
              <div className="mt-6 p-4 rounded-xl border border-amber-400/30 bg-amber-500/10">
                <div className="font-bold text-amber-200 mb-2">Missing Requirements</div>
                <ul className="text-sm text-amber-100 space-y-1">
                  {eligibility.issues.map((x, i) => (
                    <li key={i} className="flex gap-2">
                      <span>•</span>
                      <span>{x}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-3">
                  <Button variant="outline" onClick={() => setActiveTab('evidence')}>
                    Go to Application
                  </Button>
                </div>
              </div>
            )}
          </Card>

          <div className="space-y-6">
            <Card title="AI Recommendation" edgeColor="purple" variant="glass">
              {loadingInsight ? (
                <p className="text-gray-400">Generating insight...</p>
              ) : aiInsight ? (
                <div className="space-y-3">
                  <p className="text-gray-200 italic">"{aiInsight.nextLevelRecommendation}"</p>
                  <div className="text-sm text-gray-300">
                    <div className="font-bold mb-1">Suggested Actions</div>
                    <ul className="space-y-1">
                      {aiInsight.missingItems.map((m, i) => (
                        <li key={i} className="flex gap-2">
                          <span>•</span>
                          <span>{m}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <p className="text-gray-400">No insight available.</p>
              )}
            </Card>

            <Card title="Quick Actions">
              <div className="space-y-3">
                <Button className="w-full" onClick={() => setActiveTab('evidence')}>
                  Apply / Upload Evidence
                </Button>
                <Button className="w-full" variant="outline" onClick={() => setActiveTab('requirements')}>
                  Read Global Rules
                </Button>
              </div>
            </Card>

            {isAdmin && (
              <Card title="Reviewer Panel (Admin Only)" edgeColor="red" variant="glass">
                <p className="text-xs text-gray-400 mb-3">
                  Demo-only controls. Later we’ll replace with Firestore approvals + audit trail.
                </p>

                <div className="space-y-3">
                  <textarea
                    value={reviewNote}
                    onChange={(e) => setReviewNote(e.target.value)}
                    className="w-full rounded-xl bg-black/30 border border-gray-700 p-3 text-gray-100 text-sm"
                    placeholder="Reviewer notes (optional)"
                    rows={3}
                  />
                  <div className="flex gap-2 flex-wrap">
                    <Button variant="outline" onClick={handleMoveToReview} disabled={app.status === 'approved'}>
                      Move to Review
                    </Button>
                    <Button onClick={handleApprove} disabled={app.status === 'approved' || app.status === 'draft'}>
                      Approve
                    </Button>
                    <Button variant="danger" onClick={handleReject} disabled={app.status === 'draft'}>
                      Reject
                    </Button>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>
      )}

      {activeTab === 'requirements' && (
        <Card title="Global Certification Rules (EviroSafe International)">
          <div className="space-y-8 text-gray-200">
            <section>
              <h3 className="text-lg font-bold">1) Eligibility</h3>
              <ul className="mt-3 space-y-2 text-sm text-gray-300">
                <li>• Minimum EviroSafe engagement: <b>{GLOBAL_STANDARDS.MIN_SERVICE_MONTHS} months</b></li>
                <li>• Minimum education: <b>Intermediate / Secondary</b> (Diploma+ preferred)</li>
                <li>• Minimum HSE experience: <b>{GLOBAL_STANDARDS.MIN_HSE_EXPERIENCE_MONTHS} months</b></li>
                <li>• Must be an active EviroSafe user and accept Code of Conduct + Continuous Education requirements</li>
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-bold">2) Required Documents</h3>
              <ul className="mt-3 space-y-2 text-sm text-gray-300">
                <li>• Government photo ID (Passport / National ID / Iqama)</li>
                <li>• Education certificate / transcript (minimum Intermediate)</li>
                <li>• Professional photo (passport-style)</li>
                <li>• Employer letter confirming role and responsibilities</li>
              </ul>
              <p className="mt-3 text-xs text-gray-400">
                (Phase-1 stores file names only. Next upgrade will store files in Firebase Storage with verification steps.)
              </p>
            </section>

            <section>
              <h3 className="text-lg font-bold">3) Terms & Conditions</h3>
              <ul className="mt-3 space-y-2 text-sm text-gray-300">
                <li>• EviroSafe may verify documents and contact references.</li>
                <li>• Certificate may be suspended for falsification or misconduct.</li>
                <li>• Renewal requires continuous education and ongoing engagement.</li>
                <li>• Data privacy: verification is performed under consent and compliance requirements.</li>
              </ul>
            </section>
          </div>
        </Card>
      )}

      {activeTab === 'evidence' && (
        <div className="space-y-6">
          <Card
            title="International Certification Application"
            actions={
              <div className="flex gap-2">
                <Badge color={statusColor(app.status)}>{app.status.toUpperCase().replace('_', ' ')}</Badge>
              </div>
            }
          >
            <div className="space-y-10">
              {/* Eligibility block */}
              <section>
                <h3 className="text-lg font-bold text-gray-100 mb-3">A) Eligibility (EviroSafe engagement + education)</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Joined EviroSafe Date *</label>
                    <input
                      type="date"
                      value={app.joinedEviroSafeDate}
                      onChange={(e) => setApp((p) => ({ ...p, joinedEviroSafeDate: e.target.value, status: 'draft' }))}
                      className="w-full rounded-xl bg-black/20 border border-gray-700 p-3 text-gray-100"
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      Engagement months: <b className="text-gray-200">{eligibility.serviceMonths}</b>
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Education Level *</label>
                    <select
                      value={app.educationLevel}
                      onChange={(e) =>
                        setApp((p) => ({ ...p, educationLevel: e.target.value as EducationLevel, status: 'draft' }))
                      }
                      className="w-full rounded-xl bg-black/20 border border-gray-700 p-3 text-gray-100"
                    >
                      <option value="Below Secondary">Below Secondary</option>
                      <option value="Secondary">Secondary (Intermediate)</option>
                      <option value="Diploma">Diploma</option>
                      <option value="Bachelor">Bachelor</option>
                      <option value="Master">Master</option>
                      <option value="Doctorate">Doctorate</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Institute *</label>
                    <input
                      type="text"
                      value={app.educationInstitute}
                      onChange={(e) => setApp((p) => ({ ...p, educationInstitute: e.target.value, status: 'draft' }))}
                      placeholder="School / College / University"
                      className="w-full rounded-xl bg-black/20 border border-gray-700 p-3 text-gray-100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Year of Completion *</label>
                    <input
                      type="text"
                      value={app.educationYear}
                      onChange={(e) => setApp((p) => ({ ...p, educationYear: e.target.value, status: 'draft' }))}
                      placeholder="YYYY"
                      className="w-full rounded-xl bg-black/20 border border-gray-700 p-3 text-gray-100"
                    />
                  </div>
                </div>
              </section>

              {/* Identity */}
              <section>
                <h3 className="text-lg font-bold text-gray-100 mb-3">B) Identity Verification (KYC)</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">ID Type *</label>
                    <select
                      value={app.idType}
                      disabled
                      className="w-full rounded-xl bg-black/40 border border-gray-700 p-3 text-gray-400 cursor-not-allowed"
                    >
                      <option value="National ID">National ID (Required)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-300 mb-1">ID Number *</label>
                    <input
                      value={app.idNumber}
                      onChange={(e) => setApp((p) => ({ ...p, idNumber: e.target.value, status: 'draft' }))}
                      className="w-full rounded-xl bg-black/20 border border-gray-700 p-3 text-gray-100"
                      placeholder="Enter ID number"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Issuing Country *</label>
                    <input
                      value={app.idIssuingCountry}
                      onChange={(e) => setApp((p) => ({ ...p, idIssuingCountry: e.target.value, status: 'draft' }))}
                      className="w-full rounded-xl bg-black/20 border border-gray-700 p-3 text-gray-100"
                      placeholder="e.g. SA / AE / UK"
                    />
                  </div>
                </div>
              </section>

              {/* Professional */}
              <section>
                <h3 className="text-lg font-bold text-gray-100 mb-3">C) Professional Experience</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">HSE Experience (Months) *</label>
                    <input
                      type="number"
                      min={0}
                      value={app.hseExperienceMonths}
                      onChange={(e) =>
                        setApp((p) => ({ ...p, hseExperienceMonths: parseInt(e.target.value || '0', 10), status: 'draft' }))
                      }
                      className="w-full rounded-xl bg-black/20 border border-gray-700 p-3 text-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Current Position *</label>
                    <input
                      value={app.currentPosition}
                      onChange={(e) => setApp((p) => ({ ...p, currentPosition: e.target.value, status: 'draft' }))}
                      className="w-full rounded-xl bg-black/20 border border-gray-700 p-3 text-gray-100"
                      placeholder="HSE Officer / Manager / Supervisor"
                    />
                  </div>
                </div>
              </section>

              {/* Documents */}
              <section>
                <h3 className="text-lg font-bold text-gray-100 mb-3">D) Required Documents (Upload)</h3>
                <p className="text-xs text-gray-400 mb-4">
                  Phase-1: stored as file names only. Next: Firebase Storage + verification.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { key: 'idProof', label: 'ID Proof (PDF/JPG/PNG) *' },
                    { key: 'educationProof', label: 'Education Proof *' },
                    { key: 'professionalPhoto', label: 'Professional Photo *' },
                    { key: 'employerLetter', label: 'Employer Letter *' },
                  ].map((d) => (
                    <div key={d.key} className="rounded-xl border border-gray-700 bg-black/10 p-4">
                      <label className="block text-sm text-gray-300 mb-2">{d.label}</label>
                      <input
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg"
                        onChange={(e) =>
                          setApp((p) => ({
                            ...p,
                            status: 'draft',
                            docs: { ...p.docs, [d.key]: e.target.files?.[0]?.name || '' },
                          }))
                        }
                        className="text-sm text-gray-300"
                      />
                      <div className="text-xs text-gray-500 mt-2">
                        Saved: <b className="text-gray-200">{(app.docs as any)[d.key] || '—'}</b>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Competencies */}
              <section>
                <h3 className="text-lg font-bold text-gray-100 mb-3">E) Competency Declaration</h3>
                <div className="space-y-3">
                  {Object.entries(app.competencies).map(([key, value]) => (
                    <label key={key} className="flex items-center gap-3 text-sm text-gray-300">
                      <input
                        type="checkbox"
                        checked={value}
                        onChange={(e) =>
                          setApp((p) => ({
                            ...p,
                            status: 'draft',
                            competencies: { ...p.competencies, [key]: e.target.checked },
                          }))
                        }
                        className="w-5 h-5"
                      />
                      <span className="capitalize">
                        I have practical experience in {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                      </span>
                    </label>
                  ))}
                </div>
              </section>

              {/* Terms */}
              <section>
                <h3 className="text-lg font-bold text-gray-100 mb-3">F) Terms & Conditions (Required)</h3>
                <div className="rounded-xl border border-gray-700 bg-black/10 p-5 space-y-3">
                  {[
                    { key: 'acceptedTerms', label: 'I accept the EviroSafe Certification Terms & Conditions' },
                    { key: 'acceptedPrivacy', label: 'I accept the Privacy Policy and consent to verification' },
                    { key: 'acceptedCodeOfConduct', label: 'I agree to comply with the professional Code of Conduct' },
                    { key: 'acceptedContinuousEducation', label: 'I agree to continuous education / renewal requirements' },
                    { key: 'confirmedTrueInfo', label: 'I confirm all information provided is true and accurate' },
                  ].map((t) => (
                    <label key={t.key} className="flex items-start gap-3 text-sm text-gray-300">
                      <input
                        type="checkbox"
                        checked={Boolean((app as any)[t.key])}
                        onChange={(e) => setApp((p) => ({ ...p, status: 'draft', [t.key]: e.target.checked } as any))}
                        className="w-5 h-5 mt-1"
                      />
                      <span>{t.label}</span>
                    </label>
                  ))}
                </div>
              </section>

              {/* Issues */}
              {eligibility.issues.length > 0 && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">
                  <div className="font-bold text-red-200 mb-2">Please fix the following before submitting</div>
                  <ul className="text-sm text-red-100 space-y-1">
                    {eligibility.issues.map((x, i) => (
                      <li key={i} className="flex gap-2">
                        <span>•</span>
                        <span>{x}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Submit */}
              <div className="pt-4 border-t border-gray-700 flex items-center gap-3 flex-wrap">
                <Button onClick={handleSubmit} disabled={!canSubmit}>
                  Submit Application
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setApp(DEFAULT_APP)}
                  disabled={app.status !== 'draft'}
                  title={app.status !== 'draft' ? 'Reset allowed only in Draft' : 'Reset draft'}
                >
                  Reset Draft
                </Button>
                <div className="text-xs text-gray-400">
                  Status: <b className="text-gray-200">{app.status}</b>
                  {app.submittedAt ? ` • Submitted: ${formatDateLong(app.submittedAt)}` : ''}
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'certificate' && (
        <div className="space-y-6">
          {app.status !== 'approved' ? (
            <Card title="Certificate Not Available Yet">
              <div className="text-center py-10">
                <div className="text-6xl mb-4">🏆</div>
                <h3 className="text-xl font-bold text-gray-100 mb-2">Pending Approval</h3>
                <p className="text-gray-400 max-w-xl mx-auto">
                  Your certificate will be generated only after your application is verified and approved.
                  Minimum engagement is {GLOBAL_STANDARDS.MIN_SERVICE_MONTHS} months.
                </p>
                <div className="mt-6 flex gap-3 justify-center">
                  <Button onClick={() => setActiveTab('evidence')}>Complete Application</Button>
                  <Button variant="outline" onClick={() => setActiveTab('requirements')}>
                    View Requirements
                  </Button>
                </div>
                {app.approvalNotes && (
                  <div className="mt-6 text-sm text-amber-200">
                    Reviewer notes: <span className="text-amber-100">{app.approvalNotes}</span>
                  </div>
                )}
              </div>
            </Card>
          ) : (
            <>
              <div className="flex items-center justify-between p-5 rounded-2xl border border-gray-700 bg-black/20">
                <div>
                  <div className="text-xl font-bold text-gray-100">Certificate Ready</div>
                  <div className="text-sm text-gray-400">
                    ID: <b className="text-gray-200">{app.certificateId}</b> • Valid until:{' '}
                    <b className="text-gray-200">{app.certificateValidUntil}</b>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handlePrint}>Print</Button>
                  <Button variant="outline" onClick={handlePrint}>
                    Download PDF
                  </Button>
                </div>
              </div>
              <div className="overflow-auto py-8">
                <InternationalCertificate profile={profile} user={activeUser} app={app} />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};