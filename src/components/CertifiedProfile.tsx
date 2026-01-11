import React, { useEffect, useMemo, useState } from 'react';
import { useAppContext } from '../contexts';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { certificationProfile as mockProfile } from '../data';
import { generateCertificationInsight } from '../services/geminiService';
import { generatePdf } from '../services/pdfService';
import type { CertificationProfile } from '../types';
import { 
  Globe, ShieldCheck, FileText, Clock, Award, 
  CheckCircle, XCircle, AlertTriangle, 
  BookOpen, Target, BarChart, ExternalLink, 
  Shield, Plus, RefreshCw
} from 'lucide-react';

// ================================
// 1. TYPES & STANDARDS
// ================================
type EducationLevel = 'Below Secondary' | 'Secondary' | 'Diploma' | 'Bachelor' | 'Master' | 'Doctorate';
type CertApplicationStatus = 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'suspended' | 'renewal_pending' | 'expired';
type CertificateLevel = 'Trainee' | 'Basic' | 'Professional' | 'Expert' | 'Master' | 'Fellow';

type InternationalCertType = 
  | 'NEBOSH' | 'IOSH' | 'OSHA' | 'ISO45001' | 'ISO14001' 
  | 'CSP' | 'CRSP' | 'CMIOSH' | 'CERTIOSH' | 'NVQ'
  | 'RSP' | 'DipNEBOSH' | 'Other';

type CompetencyLevel = 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';

interface InternationalCert {
  type: InternationalCertType;
  certificateNumber: string;
  issuingBody: string;
  issueDate: string;
  expiryDate: string;
  level: string;
  verificationStatus: 'pending' | 'verified' | 'rejected' | 'expired';
  verifiedBy?: string;
  verifiedAt?: string;
  documentUrl?: string;
  creditHours?: number;
}

interface CPDActivity {
  id: string;
  title: string;
  provider: string;
  date: string;
  hours: number;
  category: 'training' | 'conference' | 'publication' | 'mentoring' | 'examination';
  verificationStatus: 'pending' | 'verified';
  description?: string;
}

interface CertificateApplication {
  status: CertApplicationStatus;
  joinedEviroSafeDate: string;
  educationLevel: EducationLevel;
  educationInstitute: string;
  educationYear: string;
  professionalMemberships: string[];
  hseExperienceMonths: number;
  currentPosition: string;
  organizationType: string;
  industrySector: string;
  previousPositions: Array<{title: string; organization: string; duration: string}>;
  idType: 'National ID' | 'Passport' | 'Driving License';
  idNumber: string;
  idIssuingCountry: string;
  idExpiryDate: string;
  internationalCerts: InternationalCert[];
  competencies: {
    riskAssessment: CompetencyLevel;
    incidentInvestigation: CompetencyLevel;
    auditConduction: CompetencyLevel;
    emergencyResponse: CompetencyLevel;
    legalCompliance: CompetencyLevel;
    environmentalManagement: CompetencyLevel;
    trainingDelivery: CompetencyLevel;
    behavioralSafety: CompetencyLevel;
  };
  docs: {
    idProof?: string;
    educationProof?: string;
    professionalPhoto?: string;
    employerLetter?: string;
    experienceLetters?: string[];
    cvResume?: string;
    passportPhoto?: string;
    backgroundCheck?: string;
  };
  cpdActivities: CPDActivity[];
  cpdHoursCurrentYear: number;
  cpdHoursPreviousYear: number;
  acceptedTerms: boolean;
  acceptedPrivacy: boolean;
  acceptedCodeOfConduct: boolean;
  acceptedContinuousEducation: boolean;
  confirmedTrueInfo: boolean;
  consentForVerification: boolean;
  submittedAt?: string;
  reviewedAt?: string;
  approvedAt?: string;
  rejectedAt?: string;
  approvalNotes?: string;
  reviewerId?: string;
  certificateId?: string;
  certificateLevel?: CertificateLevel;
  certificateIssuedAt?: string;
  certificateValidUntil?: string;
  certificateQRCode?: string;
  accreditationBody?: string;
  certificateVersion?: string;
}

type AccreditationBody = 'IOSH' | 'NEBOSH' | 'BCSP' | 'OHSAS' | 'ANSI' | 'ISO' | 'EviroSafe Global';

const GLOBAL_STANDARDS = {
  MIN_SERVICE_MONTHS: { Trainee: 0, Basic: 6, Professional: 24, Expert: 60, Master: 120, Fellow: 180 },
  MIN_HSE_EXPERIENCE: { Trainee: 0, Basic: 6, Professional: 24, Expert: 60, Master: 120, Fellow: 180 },
  MIN_EDUCATION: { 
    Trainee: 'Secondary', 
    Basic: 'Secondary', 
    Professional: 'Diploma', 
    Expert: 'Bachelor', 
    Master: 'Master', 
    Fellow: 'Master' 
  } as Record<CertificateLevel, EducationLevel>,
  CPD_REQUIREMENTS: { Trainee: 10, Basic: 20, Professional: 30, Expert: 40, Master: 50, Fellow: 60 },
  SAFE_HOURS_REQUIREMENTS: { Trainee: 0, Basic: 1000, Professional: 5000, Expert: 15000, Master: 30000, Fellow: 50000 },
  VALIDITY_PERIODS: { Trainee: 1, Basic: 2, Professional: 3, Expert: 4, Master: 5, Fellow: 5 },
  RECOGNIZED_CERTS: {
    NEBOSH: { level: 'Professional', credit: 40 },
    IOSH: { level: 'Professional', credit: 35 },
    OSHA: { level: 'Basic', credit: 20 },
    CSP: { level: 'Expert', credit: 60 },
    CRSP: { level: 'Expert', credit: 60 },
    CMIOSH: { level: 'Master', credit: 80 },
    'DipNEBOSH': { level: 'Expert', credit: 70 },
    ISO45001: { level: 'Professional', credit: 30 },
  } as Record<string, { level: string; credit: number }>,
};

const ACCREDITATION_REQUIREMENTS = {
  IOSH: { name: 'Institution of Occupational Safety and Health', requirements: ['Continuous CPD', 'Code of Conduct', 'Experience Portfolio', 'Peer Review'], validity: 'Annual renewal', website: 'https://iosh.com' },
  NEBOSH: { name: 'National Examination Board in Occupational Safety and Health', requirements: ['Examination', 'Practical Assessment', 'Experience Evidence'], validity: 'Lifetime with CPD', website: 'https://nebosh.org.uk' },
  BCSP: { name: 'Board of Certified Safety Professionals', requirements: ['Examination', 'Degree Requirement', 'Experience Verification'], validity: '5 years', website: 'https://bcsp.org' }
};

const DEFAULT_APP: CertificateApplication = {
  status: 'draft',
  joinedEviroSafeDate: '',
  educationLevel: 'Secondary',
  educationInstitute: '',
  educationYear: '',
  professionalMemberships: [],
  hseExperienceMonths: 0,
  currentPosition: '',
  organizationType: 'Other',
  industrySector: '',
  previousPositions: [],
  idType: 'National ID',
  idNumber: '',
  idIssuingCountry: '',
  idExpiryDate: '',
  internationalCerts: [],
  competencies: {
    riskAssessment: 'Beginner',
    incidentInvestigation: 'Beginner',
    auditConduction: 'Beginner',
    emergencyResponse: 'Beginner',
    legalCompliance: 'Beginner',
    environmentalManagement: 'Beginner',
    trainingDelivery: 'Beginner',
    behavioralSafety: 'Beginner'
  },
  docs: {},
  cpdActivities: [],
  cpdHoursCurrentYear: 0,
  cpdHoursPreviousYear: 0,
  acceptedTerms: false,
  acceptedPrivacy: false,
  acceptedCodeOfConduct: false,
  acceptedContinuousEducation: false,
  confirmedTrueInfo: false,
  consentForVerification: false
};

// ================================
// 2. HELPER FUNCTIONS
// ================================

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

function formatDateLong(dateStr: string) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
}

function determineCertificateLevel(profile: CertificationProfile, app: CertificateApplication): CertificateLevel {
  let score = 0;
  score += (app.hseExperienceMonths / 12) * 15;
  score += (profile.safe_working_hours / 1000) * 10;
  
  const educationScores: Record<EducationLevel, number> = {
    'Below Secondary': 0, 'Secondary': 10, 'Diploma': 25, 'Bachelor': 40, 'Master': 60, 'Doctorate': 80
  };
  score += educationScores[app.educationLevel] || 0;
  
  app.internationalCerts.forEach(cert => {
    if (cert.verificationStatus === 'verified') {
      score += GLOBAL_STANDARDS.RECOGNIZED_CERTS[cert.type]?.credit || 10;
    }
  });
  
  score += (app.cpdHoursCurrentYear / 10);
  
  if (score >= 300) return 'Fellow';
  if (score >= 200) return 'Master';
  if (score >= 140) return 'Expert';
  if (score >= 90) return 'Professional';
  if (score >= 50) return 'Basic';
  return 'Trainee';
}

// FIX: Added safety check for 'level' being undefined
function generateCertificateId(level: CertificateLevel, countryCode: string, accreditationBody?: string): string {
  const prefix = accreditationBody ? accreditationBody.substring(0, 3).toUpperCase() : 'EVS';
  const levelCode = (level || 'T').charAt(0); 
  const year = new Date().getFullYear();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  const cc = (countryCode || 'XX').toUpperCase().slice(0, 2);
  return `${prefix}-${levelCode}-${cc}-${year}-${random}`;
}

function getAccreditationBody(level: CertificateLevel): AccreditationBody {
  if (level === 'Fellow' || level === 'Master') return 'BCSP';
  if (level === 'Expert' || level === 'Professional') return 'IOSH';
  return 'EviroSafe Global';
}

function calculateCertificateValidity(level: CertificateLevel, issueDate: string): { validUntil: string; renewalDate: string } {
  const validityYears = GLOBAL_STANDARDS.VALIDITY_PERIODS[level];
  const issue = new Date(issueDate);
  const validUntil = new Date(issue);
  validUntil.setFullYear(issue.getFullYear() + validityYears);
  const renewalDate = new Date(validUntil);
  renewalDate.setMonth(renewalDate.getMonth() - 3);
  return {
    validUntil: validUntil.toISOString().split('T')[0],
    renewalDate: renewalDate.toISOString().split('T')[0]
  };
}

function verifyInternationalCert(cert: InternationalCert): { isValid: boolean; issues: string[]; creditPoints: number; } {
  const issues: string[] = [];
  let creditPoints = 0;
  if (new Date(cert.expiryDate) < new Date()) issues.push('Certificate has expired');
  if (!cert.certificateNumber || !cert.issuingBody || !cert.issueDate) issues.push('Missing required certificate information');
  creditPoints = GLOBAL_STANDARDS.RECOGNIZED_CERTS[cert.type]?.credit || 10;
  return { isValid: issues.length === 0 && cert.verificationStatus === 'verified', issues, creditPoints };
}

function generateQRCodeData(certificateId: string, name: string, level: CertificateLevel, issueDate: string, expiryDate: string): string {
  return JSON.stringify({ certId: certificateId, name, level, issueDate, expiryDate, verificationUrl: `https://verify.evirosafe.org/${certificateId}` });
}

// ================================
// 3. VISUAL COMPONENTS
// ================================

const GlobalStandardsBadge: React.FC<{ standard: string; verified: boolean }> = ({ standard, verified }) => (
  <Badge color={verified ? 'green' : 'gray'} className="flex items-center gap-1">
    {verified ? <CheckCircle className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
    {standard}
  </Badge>
);

const ProgressBar: React.FC<{ current: number; target: number; label: string; unit?: string; color?: 'green' | 'blue' | 'amber' | 'purple'; }> = ({ current, target, label, unit = '', color = 'green' }) => {
  const percentage = Math.min(100, Math.max(0, (current / target) * 100));
  const colorClasses = { green: 'bg-emerald-500', blue: 'bg-blue-500', amber: 'bg-amber-500', purple: 'bg-purple-500' };
  return (
    <div className="w-full">
      <div className="flex justify-between text-sm mb-2">
        <div className="flex items-center gap-2">
          <span className="text-gray-300">{label}</span>
          {percentage >= 100 && <CheckCircle className="w-4 h-4 text-emerald-400" />}
        </div>
        <span className="text-gray-400">{current.toLocaleString()} / {target.toLocaleString()} {unit}</span>
      </div>
      <div className="w-full bg-gray-800 rounded-full h-2.5">
        <div className={`${colorClasses[color]} h-2.5 rounded-full transition-all duration-500`} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
};

const VerificationStatus: React.FC<{ status: string }> = ({ status }) => {
  const config = {
    verified: { color: 'green', icon: ShieldCheck, text: 'Verified' },
    pending: { color: 'yellow', icon: Clock, text: 'Pending Review' },
    rejected: { color: 'red', icon: XCircle, text: 'Rejected' },
    expired: { color: 'gray', icon: AlertTriangle, text: 'Expired' }
  }[status] || { color: 'gray', icon: AlertTriangle, text: 'Unknown' };
  const Icon = config.icon;
  return (
    // @ts-ignore
    <Badge color={config.color as any} className="flex items-center gap-1">
      <Icon className="w-3 h-3" />
      {config.text}
    </Badge>
  );
};

const InternationalCertificateCard: React.FC<{ cert: InternationalCert }> = ({ cert }) => {
  const verification = verifyInternationalCert(cert);
  return (
    <div className="p-4 border border-gray-700 rounded-lg bg-gray-900/50">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h4 className="font-bold text-white">{cert.type}</h4>
          <p className="text-sm text-gray-400">{cert.issuingBody}</p>
        </div>
        <VerificationStatus status={cert.verificationStatus} />
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div><span className="text-gray-500">Cert #:</span><span className="ml-2 font-mono text-gray-300">{cert.certificateNumber}</span></div>
        <div><span className="text-gray-500">Level:</span><span className="ml-2 text-white">{cert.level}</span></div>
        <div><span className="text-gray-500">Issued:</span><span className="ml-2 text-gray-300">{new Date(cert.issueDate).toLocaleDateString()}</span></div>
        <div><span className="text-gray-500">Expires:</span><span className="ml-2 text-gray-300">{new Date(cert.expiryDate).toLocaleDateString()}</span></div>
      </div>
      {verification.creditPoints > 0 && (
        <div className="mt-3 p-2 bg-gray-800/50 rounded"><span className="text-sm text-gray-400">Credit Points: </span><span className="text-emerald-400 font-bold">{verification.creditPoints}</span></div>
      )}
    </div>
  );
};

const GoldenSeal: React.FC = () => (
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
        <polygon points="100,10 115,35 140,30 145,55 170,60 160,85 185,100 160,115 170,140 145,145 140,170 115,165 100,190 85,165 60,170 55,145 30,140 40,115 15,100 40,85 30,60 55,55 60,30 85,35" fill="url(#goldGradient)" stroke="#AA6C39" strokeWidth="2" />
        <circle cx="100" cy="100" r="70" fill="none" stroke="#AA6C39" strokeWidth="2" />
        <circle cx="100" cy="100" r="65" fill="none" stroke="#F1D87E" strokeWidth="1" />
        <path id="textCurveTop" d="M 50,100 A 50,50 0 1,1 150,100" fill="none" />
        <text fontSize="13" fontWeight="bold" fill="#5C3A1E" letterSpacing="1"><textPath xlinkHref="#textCurveTop" startOffset="50%" textAnchor="middle">EVIROSAFE CERTIFIED</textPath></text>
        <path id="textCurveBottom" d="M 45,100 A 55,55 0 0,0 155,100" fill="none" />
        <text fontSize="10" fontWeight="bold" fill="#5C3A1E" letterSpacing="1"><textPath xlinkHref="#textCurveBottom" startOffset="50%" textAnchor="middle">OFFICIAL STANDARD</textPath></text>
        <path transform="translate(85, 80) scale(1.2)" d="M12 2L3 7v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z" fill="none" stroke="#5C3A1E" strokeWidth="2" />
        <text x="100" y="108" textAnchor="middle" fontSize="16" fontWeight="900" fill="#5C3A1E">ES</text>
      </svg>
    </div>
);

const InternationalCertificateDocument: React.FC<{ profile: CertificationProfile; user: any; app: CertificateApplication; }> = ({ profile, user, app }) => {
  const level = app.certificateLevel || determineCertificateLevel(profile, app);
  const issueDate = app.certificateIssuedAt || new Date().toISOString().slice(0, 10);
  const validUntil = app.certificateValidUntil || new Date().toISOString().slice(0, 10);
  const certId = app.certificateId || generateCertificateId(level, app.idIssuingCountry);
  const qrData = generateQRCodeData(certId, user?.name, level, issueDate, validUntil);

  return (
    <div id="printable-certificate" className="relative mx-auto overflow-hidden shadow-2xl print:shadow-none bg-white" style={{ width: '297mm', height: '210mm', printColorAdjust: 'exact' }}>
      <div className="absolute inset-0 border-[15mm] border-emerald-900" />
      <div className="absolute inset-[5mm] border-[2mm] border-amber-600/30" />
      <div className="absolute inset-0 opacity-5" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z' fill='%2300597c' fill-opacity='0.4'/%3E%3C/svg%3E")` }}></div>
      <div className="relative z-10 h-full px-20 py-16 flex flex-col justify-between font-serif">
        <div className="text-center space-y-4">
            <div className="flex justify-center items-center gap-3 mb-2">
                 <img src="/icons/evirosafe-512.png" alt="Logo" className="h-16 w-16 drop-shadow-md" />
                 <div className="text-left">
                     <h2 className="text-2xl font-bold text-emerald-900 uppercase tracking-widest leading-none">EviroSafe</h2>
                     <p className="text-[10px] text-[#c5a059] font-bold uppercase tracking-[0.3em]">International Safety Standards</p>
                 </div>
            </div>
            <div className="border-b-2 border-[#c5a059] w-24 mx-auto mb-6"></div>
            <h1 className="text-5xl font-black text-emerald-950 uppercase tracking-wider font-serif" style={{ textShadow: '1px 1px 0px rgba(197, 160, 89, 0.5)' }}>Certificate of Competence</h1>
            <p className="text-lg text-emerald-800 italic font-medium">Health, Safety & Environment Proficiency</p>
        </div>
        <div className="text-center mt-4">
            <p className="text-sm text-slate-500 uppercase tracking-widest mb-4">This certifies that</p>
            <div className="relative inline-block px-12 py-2">
                {/* FIX: Added safety check for user.name */}
                <h2 className="text-4xl font-bold text-slate-900 font-serif border-b-2 border-slate-900/10 pb-2 mb-2">{(user?.name || 'Recipient Name').toUpperCase()}</h2>
                <div className="w-full h-1 bg-gradient-to-r from-transparent via-[#c5a059] to-transparent opacity-50"></div>
            </div>
            <p className="mt-6 text-sm text-slate-700 max-w-3xl mx-auto leading-loose">
                Has successfully fulfilled the rigorous requirements set forth by the <strong>EviroSafe Global Certification Board</strong>. 
                The holder has demonstrated exceptional knowledge, practical experience, and commitment to maintaining the highest 
                standards of operational safety and risk management in accordance with <strong> ISO 45001:2018</strong> frameworks.
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
        <div className="mt-auto pt-8 flex items-end justify-between border-t border-emerald-900/10">
            <div className="text-center">
                 <div className="w-48 border-b border-slate-400 mb-2">
                     <img src="https://upload.wikimedia.org/wikipedia/commons/e/e4/Signature_sample.svg" alt="Sig" className="h-10 mx-auto opacity-70" />
                 </div>
                 <p className="text-xs font-bold text-emerald-900 uppercase">Director of Certification</p>
                 <p className="text-[10px] text-slate-500">EviroSafe Global HQ</p>
            </div>
            <div className="flex flex-col items-center mb-1"><GoldenSeal /></div>
            <div className="text-right flex flex-col items-end">
                <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrData)}&color=064e3b`}
                    alt="Verification QR"
                    className="w-20 h-20"
                />
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
// 4. MAIN COMPONENT
// ================================
export const CertifiedProfile: React.FC = () => {
  const { activeUser } = useAppContext();
  const [activeTab, setActiveTab] = useState<'overview' | 'requirements' | 'evidence' | 'certificate' | 'verification' | 'cpd'>('overview');
  const [profile] = useState<CertificationProfile>(mockProfile);
  const [aiInsight, setAiInsight] = useState<{ nextLevelRecommendation: string; missingItems: string[]; globalStandardsMet: string[]; improvementAreas: string[]; } | null>(null);
  const [loadingInsight, setLoadingInsight] = useState(false);
  const [verificationFile, setVerificationFile] = useState<File | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const storageKey = useMemo(() => `evirosafe_cert_app_${activeUser?.id || 'anonymous'}`, [activeUser?.id]);
  const [app, setApp] = useState<CertificateApplication>(DEFAULT_APP);
  const [reviewNote, setReviewNote] = useState('');
  const [verificationStep, setVerificationStep] = useState(1);
  const [selectedCertType, setSelectedCertType] = useState<InternationalCertType>('OSHA');

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
      try {
        const insight = await generateCertificationInsight(profile);
        setAiInsight(insight);
      } catch (e) { console.error("AI Insight failed", e); }
      setLoadingInsight(false);
    };
    run();
  }, [profile]);

  const eligibility = useMemo(() => {
    const issues: string[] = [];
    const warnings: string[] = [];
    const level = determineCertificateLevel(profile, app);
    const targetLevel = app.certificateLevel || level;
    
    const serviceMonths = app.joinedEviroSafeDate ? Math.floor((new Date().getTime() - new Date(app.joinedEviroSafeDate).getTime()) / (1000 * 60 * 60 * 24 * 30)) : 0;
    if (serviceMonths < GLOBAL_STANDARDS.MIN_SERVICE_MONTHS[targetLevel]) issues.push(`Minimum service required for ${targetLevel}: ${GLOBAL_STANDARDS.MIN_SERVICE_MONTHS[targetLevel]} months`);
    if (app.hseExperienceMonths < GLOBAL_STANDARDS.MIN_HSE_EXPERIENCE[targetLevel]) issues.push(`Minimum HSE experience for ${targetLevel}: ${GLOBAL_STANDARDS.MIN_HSE_EXPERIENCE[targetLevel]} months`);
    
    const educationRank: Record<EducationLevel, number> = { 'Below Secondary': 0, 'Secondary': 1, 'Diploma': 2, 'Bachelor': 3, 'Master': 4, 'Doctorate': 5 };
    if (educationRank[app.educationLevel] < educationRank[GLOBAL_STANDARDS.MIN_EDUCATION[targetLevel]]) issues.push(`Minimum education for ${targetLevel}: ${GLOBAL_STANDARDS.MIN_EDUCATION[targetLevel]}`);
    
    if (profile.safe_working_hours < GLOBAL_STANDARDS.SAFE_HOURS_REQUIREMENTS[targetLevel]) issues.push(`Minimum safe working hours for ${targetLevel}: ${GLOBAL_STANDARDS.SAFE_HOURS_REQUIREMENTS[targetLevel]} hours`);
    
    const requiredCpd = GLOBAL_STANDARDS.CPD_REQUIREMENTS[targetLevel];
    if (app.cpdHoursCurrentYear < requiredCpd) warnings.push(`CPD hours for ${targetLevel}: ${app.cpdHoursCurrentYear}/${requiredCpd} hours`);
    
    const requiredDocs = ['idProof', 'educationProof', 'professionalPhoto', 'employerLetter'];
    const missingDocs = requiredDocs.filter(doc => !app.docs[doc as keyof typeof app.docs]);
    if (missingDocs.length > 0) issues.push(`Missing required documents: ${missingDocs.join(', ')}`);
    
    const declarations = ['acceptedTerms', 'acceptedPrivacy', 'acceptedCodeOfConduct', 'acceptedContinuousEducation', 'confirmedTrueInfo', 'consentForVerification'];
    const missingDeclarations = declarations.filter(d => !app[d as keyof CertificateApplication]);
    if (missingDeclarations.length > 0) issues.push(`Missing declarations`);

    return { serviceMonths, issues, warnings, isEligible: issues.length === 0, currentLevel: level, targetLevel };
  }, [app, profile, verificationFile]);

  const canSubmit = app.status === 'draft' && eligibility.isEligible;

  const handleSubmit = () => {
    if (!canSubmit) return;
    const level = determineCertificateLevel(profile, app);
    const accreditationBody = getAccreditationBody(level);
    const certificateId = generateCertificateId(level, app.idIssuingCountry, accreditationBody);
    const issueDate = new Date().toISOString().split('T')[0];
    const validity = calculateCertificateValidity(level, issueDate);
    setApp(prev => ({ ...prev, status: 'submitted', submittedAt: new Date().toISOString(), certificateLevel: level, certificateId, certificateIssuedAt: issueDate, certificateValidUntil: validity.validUntil, accreditationBody }));
    setActiveTab('overview');
  };

  const isAdmin = String(activeUser?.role || '').toUpperCase() === 'ADMIN';

  const handleApprove = () => {
    if (!isAdmin) return;
    const level = determineCertificateLevel(profile, app);
    const accreditationBody = getAccreditationBody(level);
    const certificateId = generateCertificateId(level, app.idIssuingCountry, accreditationBody);
    const issueDate = new Date().toISOString().split('T')[0];
    const validity = calculateCertificateValidity(level, issueDate);
    // FIX: Added safety check for activeUser?.name
    const qrData = generateQRCodeData(certificateId, activeUser?.name || 'Admin', level, issueDate, validity.validUntil);
    setApp(prev => ({ ...prev, status: 'approved', approvedAt: new Date().toISOString(), approvalNotes: reviewNote, certificateLevel: level, certificateId, certificateIssuedAt: issueDate, certificateValidUntil: validity.validUntil, accreditationBody, certificateQRCode: qrData }));
    setActiveTab('certificate');
  };

  const handleReject = () => {
    if (!isAdmin) return;
    setApp(prev => ({ ...prev, status: 'rejected', rejectedAt: new Date().toISOString(), approvalNotes: reviewNote }));
    setActiveTab('overview');
  };

  const handleDownloadPDF = async () => {
    setIsGeneratingPdf(true);
    await generatePdf('printable-certificate', `EviroSafe-Certificate-${app.certificateId}`);
    setIsGeneratingPdf(false);
  };

  const handlePrint = () => {
    const content = document.getElementById('printable-certificate');
    if (!content) return;
    const printWindow = window.open('', '_blank', 'height=900,width=1200');
    if (!printWindow) return;
    printWindow.document.write(`<html><head><title>EviroSafe Certificate</title><link href="https://cdn.tailwindcss.com" rel="stylesheet"><style>@media print {@page { size: landscape; margin: 0; } body { margin: 0; padding: 0; } #printable-certificate { width: 100%; height: 100%; }}</style></head><body class="bg-white">${content.outerHTML}</body></html>`);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
  };

  const addInternationalCert = () => {
    const newCert: InternationalCert = { type: selectedCertType, certificateNumber: '', issuingBody: '', issueDate: new Date().toISOString().split('T')[0], expiryDate: new Date(new Date().setFullYear(new Date().getFullYear() + 5)).toISOString().split('T')[0], level: 'Professional', verificationStatus: 'pending' };
    setApp(prev => ({ ...prev, internationalCerts: [...prev.internationalCerts, newCert] }));
  };

  const updateCert = (index: number, updates: Partial<InternationalCert>) => {
    setApp(prev => ({ ...prev, internationalCerts: prev.internationalCerts.map((cert, i) => i === index ? { ...cert, ...updates } : cert) }));
  };

  const addCPDActivity = () => {
    const newActivity: CPDActivity = { id: `cpd_${Date.now()}`, title: '', provider: '', date: new Date().toISOString().split('T')[0], hours: 0, category: 'training', verificationStatus: 'pending' };
    setApp(prev => ({ ...prev, cpdActivities: [...prev.cpdActivities, newActivity] }));
  };

  const calculateCPDHours = () => {
    const currentYear = new Date().getFullYear();
    const currentYearHours = app.cpdActivities.filter(a => new Date(a.date).getFullYear() === currentYear && a.verificationStatus === 'verified').reduce((sum, a) => sum + a.hours, 0);
    const previousYearHours = app.cpdActivities.filter(a => new Date(a.date).getFullYear() === currentYear - 1 && a.verificationStatus === 'verified').reduce((sum, a) => sum + a.hours, 0);
    setApp(prev => ({ ...prev, cpdHoursCurrentYear: currentYearHours, cpdHoursPreviousYear: previousYearHours }));
  };

  if (!activeUser) return <div className="p-8 text-center text-gray-400">Please sign in.</div>;

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="bg-gradient-to-r from-gray-900 to-emerald-900/50 rounded-2xl p-6 border border-gray-800">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-emerald-900/30 border border-emerald-700/50"><Award className="w-8 h-8 text-emerald-400" /></div>
            <div>
              <h1 className="text-3xl font-bold text-white">Global Certification System</h1>
              <p className="text-gray-300 mt-1 flex items-center gap-2"><Globe className="w-4 h-4" /> Internationally recognized certifications • ISO 17024 compliant • Global verification</p>
              <div className="flex flex-wrap gap-2 mt-3">
                <Badge color="blue">ISO 17024</Badge><Badge color="green">Global Recognition</Badge><Badge color="purple">Blockchain Verified</Badge><Badge color="amber">Digital Credentials</Badge>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <div className="text-right"><div className="text-sm text-gray-400">Current Status</div><Badge color={statusColor(app.status)} className="text-lg px-4 py-1.5">{app.status.toUpperCase().replace(/_/g, ' ')}</Badge></div>
            {app.certificateLevel && <div className="text-right"><div className="text-sm text-gray-400">Certification Level</div><div className="text-xl font-bold text-white">{app.certificateLevel}</div></div>}
          </div>
        </div>
      </div>

      <div className="bg-gray-900/50 rounded-xl p-2 border border-gray-800">
        <div className="flex overflow-x-auto gap-1 pb-2">
          {[{ key: 'overview', label: 'Dashboard', icon: BarChart }, { key: 'requirements', label: 'Global Standards', icon: Target }, { key: 'evidence', label: 'Application', icon: FileText }, { key: 'verification', label: 'Verification', icon: ShieldCheck }, { key: 'cpd', label: 'CPD Tracker', icon: BookOpen }, { key: 'certificate', label: 'Certificate', icon: Award }].map(tab => {
            const Icon = tab.icon;
            return <button key={tab.key} onClick={() => setActiveTab(tab.key as any)} className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-all whitespace-nowrap ${activeTab === tab.key ? 'bg-emerald-900/50 text-emerald-300 border border-emerald-700/50' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}><Icon className="w-4 h-4" />{tab.label}</button>;
          })}
        </div>
      </div>

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card title="Certification Progress">
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    {/* FIX: Safety check for charAt */}
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-900 to-cyan-900 flex items-center justify-center text-2xl font-bold text-white">{(activeUser.name || 'U').charAt(0)}</div>
                    <div><div className="text-2xl font-bold text-white">{activeUser.name}</div><div className="text-gray-400">{profile.role_title}</div><div className="text-sm text-gray-500 mt-1">Member since: {app.joinedEviroSafeDate || 'Not specified'}</div></div>
                  </div>
                  <div className="text-right"><div className="text-sm text-gray-400">Target Level</div><div className="text-2xl font-bold text-emerald-400">{eligibility.targetLevel}</div><div className="text-xs text-gray-500 mt-1">Current: {eligibility.currentLevel}</div></div>
                </div>
                <div className="space-y-4">
                  <ProgressBar current={profile.safe_working_hours} target={GLOBAL_STANDARDS.SAFE_HOURS_REQUIREMENTS[eligibility.targetLevel]} label="Safe Working Hours" unit="hours" color="green" />
                  <ProgressBar current={eligibility.serviceMonths} target={GLOBAL_STANDARDS.MIN_SERVICE_MONTHS[eligibility.targetLevel]} label="Service Months" unit="months" color="blue" />
                  <ProgressBar current={app.cpdHoursCurrentYear} target={GLOBAL_STANDARDS.CPD_REQUIREMENTS[eligibility.targetLevel]} label="CPD Hours (Current Year)" unit="hours" color="purple" />
                  <ProgressBar current={app.hseExperienceMonths} target={GLOBAL_STANDARDS.MIN_HSE_EXPERIENCE[eligibility.targetLevel]} label="HSE Experience" unit="months" color="amber" />
                </div>
                {eligibility.issues.length > 0 && <div className="mt-6 p-4 rounded-xl border border-red-400/40 bg-red-500/10"><div className="flex items-center gap-2 mb-2"><AlertTriangle className="w-5 h-5 text-red-400" /><div className="font-bold text-red-200">Eligibility Requirements Missing</div></div><ul className="text-sm text-red-100 space-y-1">{eligibility.issues.map((x, i) => <li key={i} className="flex items-start gap-2"><XCircle className="w-3 h-3 mt-1 flex-shrink-0" />{x}</li>)}</ul><div className="mt-4"><Button variant="outline" onClick={() => setActiveTab('evidence')}>Complete Application</Button></div></div>}
              </div>
            </Card>
          </div>
          <div className="space-y-6">
            <Card title="Quick Actions">
              <div className="space-y-3">
                <Button variant="outline" onClick={() => setActiveTab('evidence')} className="w-full justify-start" leftIcon={<FileText className="w-4 h-4" />}>Continue Application</Button>
                <Button variant="outline" onClick={() => setActiveTab('verification')} className="w-full justify-start" leftIcon={<ShieldCheck className="w-4 h-4" />}>Upload Verification</Button>
                <Button variant="outline" onClick={() => setActiveTab('cpd')} className="w-full justify-start" leftIcon={<BookOpen className="w-4 h-4" />}>Log CPD Hours</Button>
                <Button variant="outline" onClick={handleSubmit} disabled={!canSubmit} className="w-full justify-start" leftIcon={<CheckCircle className="w-4 h-4" />}>Submit Application</Button>
              </div>
            </Card>
            <Card title="Global Standards Met">
              <div className="space-y-2">
                <GlobalStandardsBadge standard="ISO 17024" verified={true} />
                <GlobalStandardsBadge standard="Continuous CPD" verified={app.cpdHoursCurrentYear >= 20} />
                <GlobalStandardsBadge standard="Experience Portfolio" verified={app.hseExperienceMonths >= 24} />
                <GlobalStandardsBadge standard="International Recognition" verified={app.internationalCerts.length > 0} />
                <GlobalStandardsBadge standard="Digital Verification" verified={app.certificateQRCode !== undefined} />
              </div>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'requirements' && (
        <Card title="Global Certification Standards & Requirements">
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {Object.entries(ACCREDITATION_REQUIREMENTS).map(([key, body]) => (
                <div key={key} className="p-4 border border-gray-700 rounded-xl bg-gray-900/50">
                  <div className="flex items-center gap-3 mb-3"><Shield className="w-8 h-8 text-emerald-400" /><div><h3 className="font-bold text-white">{body.name}</h3><p className="text-sm text-gray-400">{key}</p></div></div>
                  <div className="space-y-2 mb-4"><h4 className="text-sm font-bold text-gray-300">Requirements:</h4><ul className="text-sm text-gray-400 space-y-1">{body.requirements.map((req, i) => <li key={i} className="flex items-center gap-2"><CheckCircle className="w-3 h-3 text-emerald-400" />{req}</li>)}</ul></div>
                  <div className="text-sm text-gray-400"><span className="font-bold">Validity:</span> {body.validity}</div>
                  <a href={body.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-emerald-400 hover:text-emerald-300 mt-2">Visit website <ExternalLink className="w-3 h-3" /></a>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {activeTab === 'evidence' && (
        <Card title="Global Certification Application">
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              {['Personal', 'Experience', 'Certifications', 'Documents', 'Review'].map((step, index) => (
                <div key={step} className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${verificationStep > index + 1 ? 'bg-emerald-900 text-emerald-300' : verificationStep === index + 1 ? 'bg-emerald-700 text-white' : 'bg-gray-800 text-gray-400'}`}>{verificationStep > index + 1 ? '✓' : index + 1}</div>
                  <div className="text-xs mt-1 text-gray-400">{step}</div>
                </div>
              ))}
            </div>
            {verificationStep === 1 && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-white">Personal Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><label className="block text-sm text-gray-400 mb-1">Full Name</label><input type="text" value={activeUser?.name || ''} disabled className="w-full bg-gray-900/50 border border-gray-700 rounded p-2 text-gray-300" /></div>
                  <div><label className="block text-sm text-gray-400 mb-1">Email</label><input type="email" value={activeUser?.email || ''} disabled className="w-full bg-gray-900/50 border border-gray-700 rounded p-2 text-gray-300" /></div>
                  <div><label className="block text-sm text-gray-400 mb-1">Education Level</label><select value={app.educationLevel} onChange={e => setApp(p => ({...p, educationLevel: e.target.value as EducationLevel}))} className="w-full bg-gray-900/50 border border-gray-700 rounded p-2 text-white"><option value="Secondary">Secondary</option><option value="Diploma">Diploma</option><option value="Bachelor">Bachelor's Degree</option><option value="Master">Master's Degree</option><option value="Doctorate">Doctorate</option></select></div>
                  <div><label className="block text-sm text-gray-400 mb-1">Institution</label><input type="text" value={app.educationInstitute} onChange={e => setApp(p => ({...p, educationInstitute: e.target.value}))} className="w-full bg-gray-900/50 border border-gray-700 rounded p-2 text-white" placeholder="University/College name" /></div>
                </div>
                <div className="flex justify-between"><Button variant="outline" onClick={() => setVerificationStep(5)}>Skip to Review</Button><Button onClick={() => setVerificationStep(2)}>Next: Experience</Button></div>
              </div>
            )}
            {verificationStep === 2 && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-white">Professional Experience</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><label className="block text-sm text-gray-400 mb-1">HSE Experience (Months)</label><input type="number" value={app.hseExperienceMonths} onChange={e => setApp(p => ({...p, hseExperienceMonths: parseInt(e.target.value) || 0}))} className="w-full bg-gray-900/50 border border-gray-700 rounded p-2 text-white" /></div>
                  <div><label className="block text-sm text-gray-400 mb-1">Current Position</label><input type="text" value={app.currentPosition} onChange={e => setApp(p => ({...p, currentPosition: e.target.value}))} className="w-full bg-gray-900/50 border border-gray-700 rounded p-2 text-white" /></div>
                </div>
                <div className="flex justify-between"><Button variant="outline" onClick={() => setVerificationStep(1)}>Back</Button><Button onClick={() => setVerificationStep(3)}>Next: Certifications</Button></div>
              </div>
            )}
            {verificationStep === 3 && (
              <div className="space-y-4">
                <div className="flex justify-between items-center"><h3 className="text-lg font-bold text-white">International Certifications</h3><Button variant="outline" onClick={addInternationalCert} leftIcon={<Plus className="w-4 h-4" />}>Add Certification</Button></div>
                <div className="space-y-4">
                  {app.internationalCerts.map((cert, index) => (
                    <div key={index} className="p-4 border border-gray-700 rounded-lg bg-gray-900/30">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><label className="block text-sm text-gray-400 mb-1">Certification Type</label><select value={cert.type} onChange={e => updateCert(index, { type: e.target.value as InternationalCertType })} className="w-full bg-gray-900/50 border border-gray-700 rounded p-2 text-white"><option value="NEBOSH">NEBOSH</option><option value="IOSH">IOSH</option><option value="OSHA">OSHA</option><option value="Other">Other</option></select></div>
                        <div><label className="block text-sm text-gray-400 mb-1">Certificate Number</label><input type="text" value={cert.certificateNumber} onChange={e => updateCert(index, { certificateNumber: e.target.value })} className="w-full bg-gray-900/50 border border-gray-700 rounded p-2 text-white" /></div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between"><Button variant="outline" onClick={() => setVerificationStep(2)}>Back</Button><Button onClick={() => setVerificationStep(4)}>Next: Documents</Button></div>
              </div>
            )}
            {verificationStep === 4 && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-white">Required Documents</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[{ key: 'idProof', label: 'Government ID Proof', required: true }, { key: 'educationProof', label: 'Education Certificate', required: true }].map((doc) => (
                    <div key={doc.key} className="p-4 border border-gray-700 rounded-lg"><div className="flex items-center justify-between mb-2"><span className="text-white">{doc.label}</span>{doc.required && <Badge color="red" size="sm">Required</Badge>}</div><input type="file" className="w-full text-gray-400 text-sm" onChange={(e) => { const file = e.target.files?.[0]; if (file) setApp(p => ({ ...p, docs: { ...p.docs, [doc.key]: URL.createObjectURL(file) } })); }} /></div>
                  ))}
                </div>
                <div className="flex justify-between"><Button variant="outline" onClick={() => setVerificationStep(3)}>Back</Button><Button onClick={() => setVerificationStep(5)}>Next: Review</Button></div>
              </div>
            )}
            {verificationStep === 5 && (
              <div className="space-y-6">
                <h3 className="text-lg font-bold text-white">Review & Submit</h3>
                <div className="p-4 border border-gray-700 rounded-lg"><h4 className="font-bold text-white mb-3">Declarations</h4><div className="space-y-3"><label className="flex items-center gap-3 text-gray-300 hover:text-white cursor-pointer"><input type="checkbox" checked={app.acceptedTerms} onChange={(e) => setApp(p => ({ ...p, acceptedTerms: e.target.checked }))} className="w-4 h-4 text-emerald-500 bg-gray-800 border-gray-700 rounded focus:ring-emerald-500" />I accept the Terms and Conditions</label></div></div>
                <div className="flex justify-between"><Button variant="outline" onClick={() => setVerificationStep(4)}>Back</Button><Button onClick={handleSubmit} disabled={!canSubmit} className={!canSubmit ? 'opacity-50 cursor-not-allowed' : ''} leftIcon={<CheckCircle className="w-4 h-4" />}>Submit Application</Button></div>
              </div>
            )}
          </div>
        </Card>
      )}

      {activeTab === 'verification' && (
        <Card title="Verification Portal">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <h3 className="text-lg font-bold text-white">International Certification Verification</h3>
              <div className="p-6 border-2 border-dashed border-emerald-700/30 rounded-xl bg-emerald-900/10">
                <div className="text-center mb-4"><ShieldCheck className="w-12 h-12 text-emerald-400 mx-auto mb-3" /><h4 className="font-bold text-white">Upload Certification for Verification</h4></div>
                <div className="space-y-4">
                  <div><label className="block text-sm text-gray-400 mb-2">Select Certification Type</label><select value={selectedCertType} onChange={e => setSelectedCertType(e.target.value as InternationalCertType)} className="w-full bg-gray-900/50 border border-gray-700 rounded p-2 text-white"><option value="NEBOSH">NEBOSH</option><option value="IOSH">IOSH</option><option value="OSHA">OSHA</option></select></div>
                  <div><label className="block text-sm text-gray-400 mb-2">Upload Certificate</label><div className="border border-gray-700 rounded-lg p-4 bg-gray-900/30"><input type="file" accept=".pdf,.jpg,.png,.jpeg" onChange={e => setVerificationFile(e.target.files?.[0] || null)} className="w-full text-gray-400" /></div></div>
                </div>
              </div>
              <div className="space-y-4"><h4 className="font-bold text-white">Verification Status</h4><div className="space-y-3">{app.internationalCerts.map((cert, index) => <InternationalCertificateCard key={index} cert={cert} />)}</div></div>
            </div>
          </div>
        </Card>
      )}

      {activeTab === 'cpd' && (
        <Card title="Continuous Professional Development (CPD) Tracker">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="flex justify-between items-center"><h3 className="text-lg font-bold text-white">CPD Activities</h3><Button variant="outline" onClick={addCPDActivity} leftIcon={<Plus className="w-4 h-4" />}>Add Activity</Button></div>
              <div className="space-y-4">{app.cpdActivities.map((activity, index) => <div key={activity.id} className="p-4 border border-gray-700 rounded-lg bg-gray-900/30"><h4 className="font-bold text-white">{activity.title || 'Untitled Activity'}</h4></div>)}</div>
            </div>
            <div className="space-y-6"><Card title="CPD Summary"><div className="space-y-4"><div className="p-4 bg-gray-900/50 rounded-lg"><div className="text-center mb-3"><div className="text-3xl font-bold text-emerald-400">{app.cpdHoursCurrentYear}</div><div className="text-sm text-gray-400">Hours This Year</div></div><ProgressBar current={app.cpdHoursCurrentYear} target={GLOBAL_STANDARDS.CPD_REQUIREMENTS[eligibility.targetLevel]} label="Annual Target" unit="hours" /></div><Button onClick={calculateCPDHours} className="w-full" leftIcon={<RefreshCw className="w-4 h-4" />}>Recalculate CPD Hours</Button></div></Card></div>
          </div>
        </Card>
      )}

      {activeTab === 'certificate' && (
        <div className="space-y-6">
          {app.status === 'approved' ? (
            <div className="bg-white rounded-xl overflow-hidden shadow-2xl">
              <InternationalCertificateDocument profile={profile} user={activeUser} app={app} />
            </div>
          ) : (
            <Card>
              <div className="text-center py-12">
                <Clock className="w-16 h-16 text-amber-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">Application Under Review</h3>
                <p className="text-gray-400">Your certification application is currently being reviewed.</p>
              </div>
            </Card>
          )}
        </div>
      )}

      {isAdmin && app.status === 'submitted' && (
        <Card title="Admin Review Panel" className="mt-6 border border-emerald-800/50">
          <div className="space-y-4">
            <div><label className="block text-sm text-gray-400 mb-2">Review Notes</label><textarea value={reviewNote} onChange={e => setReviewNote(e.target.value)} className="w-full h-32 bg-gray-900/50 border border-gray-700 rounded p-3 text-white" placeholder="Enter review notes..." /></div>
            <div className="grid grid-cols-2 gap-4"><Button onClick={handleApprove} className="bg-emerald-900 hover:bg-emerald-800 border-emerald-700" leftIcon={<CheckCircle className="w-4 h-4" />}>Approve & Issue Certificate</Button><Button variant="danger" onClick={handleReject} leftIcon={<XCircle className="w-4 h-4" />}>Reject Application</Button></div>
          </div>
        </Card>
      )}
    </div>
  );
};