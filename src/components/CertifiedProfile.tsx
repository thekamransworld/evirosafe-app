import React, { useEffect, useMemo, useState } from 'react';
import { useAppContext } from '../contexts';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { generateCertificationInsight } from '../services/geminiService';
import { 
  Globe, ShieldCheck, FileCheck, Clock, Award, 
  CheckCircle, XCircle, AlertTriangle, Download, 
  Upload, Eye, Lock, RefreshCw, Users, BookOpen,
  Building, GraduationCap, Target, BarChart,
  ExternalLink, Copy, QrCode, Shield, Star,
  Calendar, MapPin, Database,
  Cloud, Hash, CheckSquare, FileText, FileSearch, Plus
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

// ================================
// 1. ENHANCED TYPES & GLOBAL STANDARDS
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
  // Personal Information
  joinedEviroSafeDate: string;
  educationLevel: EducationLevel;
  educationInstitute: string;
  educationYear: string;
  professionalMemberships: string[];
  
  // Experience
  hseExperienceMonths: number;
  currentPosition: string;
  organizationType: string;
  industrySector: string;
  previousPositions: Array<{title: string; organization: string; duration: string}>;
  
  // Identity
  idType: 'National ID' | 'Passport' | 'Driving License';
  idNumber: string;
  idIssuingCountry: string;
  idExpiryDate: string;
  
  // International Certifications
  internationalCerts: InternationalCert[];
  
  // Competencies
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
  
  // Documents
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
  
  // CPD Activities
  cpdActivities: CPDActivity[];
  cpdHoursCurrentYear: number;
  cpdHoursPreviousYear: number;
  
  // Declarations
  acceptedTerms: boolean;
  acceptedPrivacy: boolean;
  acceptedCodeOfConduct: boolean;
  acceptedContinuousEducation: boolean;
  confirmedTrueInfo: boolean;
  consentForVerification: boolean;
  
  // Metadata
  submittedAt?: string;
  reviewedAt?: string;
  approvedAt?: string;
  rejectedAt?: string;
  approvalNotes?: string;
  reviewerId?: string;
  
  // Certificate Details
  certificateId?: string;
  certificateLevel?: CertificateLevel;
  certificateIssuedAt?: string;
  certificateValidUntil?: string;
  certificateQRCode?: string;
  accreditationBody?: string;
  certificateVersion?: string;
}

type AccreditationBody = 'IOSH' | 'NEBOSH' | 'BCSP' | 'OHSAS' | 'ANSI' | 'ISO' | 'EviroSafe Global';

// Local definition to support extended fields without breaking global types
interface CertificationProfile {
  user_id: string;
  org_id: string;
  level: CertificateLevel;
  role_title: string;
  safe_working_hours: number;
  total_years_experience: number;
  last_incident_date: string;
  qualifications: string[];
  requirements_met: {
    training: boolean;
    experience: boolean;
    safe_hours: boolean;
    behavior: boolean;
    cpd: boolean;
    verification: boolean;
  };
  competencyScores: Record<string, number>;
  renewalDate?: string;
  lastAuditDate?: string;
  globalRanking?: number;
}

// GLOBAL STANDARDS & ACCREDITATION FRAMEWORK
const GLOBAL_STANDARDS = {
  // Experience Requirements
  MIN_SERVICE_MONTHS: { Trainee: 0, Basic: 6, Professional: 24, Expert: 60, Master: 120, Fellow: 180 },
  MIN_HSE_EXPERIENCE: { Trainee: 0, Basic: 6, Professional: 24, Expert: 60, Master: 120, Fellow: 180 },
  
  // Education Requirements
  MIN_EDUCATION: { 
    Trainee: 'Secondary', 
    Basic: 'Secondary', 
    Professional: 'Diploma', 
    Expert: 'Bachelor', 
    Master: 'Master', 
    Fellow: 'Master' 
  } as Record<CertificateLevel, EducationLevel>,
  
  // CPD Requirements (hours per year)
  CPD_REQUIREMENTS: { 
    Trainee: 10, 
    Basic: 20, 
    Professional: 30, 
    Expert: 40, 
    Master: 50, 
    Fellow: 60 
  },
  
  // Safe Hours Requirements
  SAFE_HOURS_REQUIREMENTS: { 
    Trainee: 0, 
    Basic: 1000, 
    Professional: 5000, 
    Expert: 15000, 
    Master: 30000, 
    Fellow: 50000 
  },
  
  // Validity Periods (years)
  VALIDITY_PERIODS: { 
    Trainee: 1, 
    Basic: 2, 
    Professional: 3, 
    Expert: 4, 
    Master: 5, 
    Fellow: 5 
  },
  
  // International Certification Mapping
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
  
  // Competency Thresholds
  COMPETENCY_THRESHOLDS: {
    Beginner: 0,
    Intermediate: 50,
    Advanced: 75,
    Expert: 90
  }
};

// ACCREDITATION BODIES REQUIREMENTS
const ACCREDITATION_REQUIREMENTS = {
  IOSH: {
    name: 'Institution of Occupational Safety and Health',
    requirements: ['Continuous CPD', 'Code of Conduct', 'Experience Portfolio', 'Peer Review'],
    validity: 'Annual renewal',
    website: 'https://iosh.com'
  },
  NEBOSH: {
    name: 'National Examination Board in Occupational Safety and Health',
    requirements: ['Examination', 'Practical Assessment', 'Experience Evidence'],
    validity: 'Lifetime with CPD',
    website: 'https://nebosh.org.uk'
  },
  BCSP: {
    name: 'Board of Certified Safety Professionals',
    requirements: ['Examination', 'Degree Requirement', 'Experience Verification'],
    validity: '5 years',
    website: 'https://bcsp.org'
  }
};

// ================================
// 2. HELPER FUNCTIONS
// ================================

function statusColor(status: CertApplicationStatus): 'green' | 'blue' | 'yellow' | 'red' | 'gray' | 'purple' | 'amber' {
  switch (status) {
    case 'approved': return 'green';
    case 'submitted': return 'blue';
    case 'under_review': return 'yellow';
    case 'renewal_pending': return 'purple';
    case 'expired': return 'gray';
    case 'rejected':
    case 'suspended': return 'red';
    default: return 'gray';
  }
}

function monthsBetween(startISO: string, endISO: string) {
  const start = new Date(startISO);
  const end = new Date(endISO);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
  const ms = end.getTime() - start.getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24 * 30)));
}

function formatDateLong(dateStr: string) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
}

function calculateTotalCPDHours(cpdActivities: CPDActivity[]): number {
  return cpdActivities
    .filter(activity => activity.verificationStatus === 'verified')
    .reduce((total, activity) => total + activity.hours, 0);
}

function determineCertificateLevel(
  profile: CertificationProfile, 
  app: CertificateApplication
): CertificateLevel {
  let score = 0;
  
  // Experience scoring
  score += (app.hseExperienceMonths / 12) * 15;
  
  // Safe working hours scoring
  score += (profile.safe_working_hours / 1000) * 10;
  
  // Education scoring
  const educationScores: Record<EducationLevel, number> = {
    'Below Secondary': 0,
    'Secondary': 10,
    'Diploma': 25,
    'Bachelor': 40,
    'Master': 60,
    'Doctorate': 80
  };
  score += educationScores[app.educationLevel] || 0;
  
  // International certifications scoring
  app.internationalCerts.forEach(cert => {
    if (cert.verificationStatus === 'verified') {
      const certCredit = GLOBAL_STANDARDS.RECOGNIZED_CERTS[cert.type]?.credit || 10;
      score += certCredit;
    }
  });
  
  // CPD scoring
  score += (app.cpdHoursCurrentYear / 10);
  
  // Competency scoring
  const competencyValues: Record<CompetencyLevel, number> = {
    'Beginner': 5,
    'Intermediate': 15,
    'Advanced': 30,
    'Expert': 50
  };
  
  Object.values(app.competencies).forEach(level => {
    score += competencyValues[level] || 0;
  });
  
  // Determine level based on score
  if (score >= 300) return 'Fellow';
  if (score >= 200) return 'Master';
  if (score >= 140) return 'Expert';
  if (score >= 90) return 'Professional';
  if (score >= 50) return 'Basic';
  return 'Trainee';
}

function generateCertificateId(
  level: CertificateLevel, 
  countryCode: string, 
  accreditationBody?: string
): string {
  const prefix = accreditationBody ? accreditationBody.substring(0, 3).toUpperCase() : 'EVS';
  const levelCode = level.charAt(0);
  const year = new Date().getFullYear();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  const cc = (countryCode || 'XX').toUpperCase().slice(0, 2);
  const timestamp = Date.now().toString(36).toUpperCase().slice(-4);
  
  return `${prefix}-${levelCode}-${cc}-${year}-${timestamp}-${random}`;
}

function getAccreditationBody(level: CertificateLevel): AccreditationBody {
  if (level === 'Fellow' || level === 'Master') return 'BCSP';
  if (level === 'Expert' || level === 'Professional') return 'IOSH';
  if (level === 'Basic' || level === 'Trainee') return 'EviroSafe Global';
  return 'EviroSafe Global';
}

function calculateCertificateValidity(
  level: CertificateLevel, 
  issueDate: string
): { validUntil: string; renewalDate: string } {
  const validityYears = GLOBAL_STANDARDS.VALIDITY_PERIODS[level];
  const issue = new Date(issueDate);
  
  const validUntil = new Date(issue);
  validUntil.setFullYear(issue.getFullYear() + validityYears);
  
  const renewalDate = new Date(validUntil);
  renewalDate.setMonth(renewalDate.getMonth() - 3); // Renewal 3 months before expiry
  
  return {
    validUntil: validUntil.toISOString().split('T')[0],
    renewalDate: renewalDate.toISOString().split('T')[0]
  };
}

function verifyInternationalCert(cert: InternationalCert): {
  isValid: boolean;
  issues: string[];
  creditPoints: number;
} {
  const issues: string[] = [];
  let creditPoints = 0;
  
  // Check expiry
  if (new Date(cert.expiryDate) < new Date()) {
    issues.push('Certificate has expired');
  }
  
  // Check required fields
  if (!cert.certificateNumber || !cert.issuingBody || !cert.issueDate) {
    issues.push('Missing required certificate information');
  }
  
  // Calculate credit points
  const recognizedCert = GLOBAL_STANDARDS.RECOGNIZED_CERTS[cert.type];
  if (recognizedCert) {
    creditPoints = recognizedCert.credit;
  } else {
    creditPoints = 10; // Default for other certs
  }
  
  return {
    isValid: issues.length === 0 && cert.verificationStatus === 'verified',
    issues,
    creditPoints
  };
}

function generateQRCodeData(
  certificateId: string,
  name: string,
  level: CertificateLevel,
  issueDate: string,
  expiryDate: string
): string {
  const data = {
    certId: certificateId,
    name: name,
    level: level,
    issueDate: issueDate,
    expiryDate: expiryDate,
    verificationUrl: `https://verify.evirosafe.org/${certificateId}`,
    timestamp: new Date().toISOString()
  };
  return JSON.stringify(data);
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

const ProgressBar: React.FC<{ 
  current: number; 
  target: number; 
  label: string;
  unit?: string;
  color?: 'green' | 'blue' | 'amber' | 'purple';
}> = ({ current, target, label, unit = '', color = 'green' }) => {
  const percentage = Math.min(100, Math.max(0, (current / target) * 100));
  const colorClasses = {
    green: 'bg-emerald-500',
    blue: 'bg-blue-500',
    amber: 'bg-amber-500',
    purple: 'bg-purple-500'
  };
  
  return (
    <div className="w-full">
      <div className="flex justify-between text-sm mb-2">
        <div className="flex items-center gap-2">
          <span className="text-gray-300">{label}</span>
          {percentage >= 100 && <CheckCircle className="w-4 h-4 text-emerald-400" />}
        </div>
        <span className="text-gray-400">
          {current.toLocaleString()} / {target.toLocaleString()} {unit}
        </span>
      </div>
      <div className="w-full bg-gray-800 rounded-full h-2.5">
        <div 
          className={`${colorClasses[color]} h-2.5 rounded-full transition-all duration-500`} 
          style={{ width: `${percentage}%` }} 
        />
      </div>
      {percentage < 100 && (
        <div className="text-xs text-gray-500 mt-1">
          Need {target - current} more {unit.toLowerCase()}
        </div>
      )}
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
        <div>
          <span className="text-gray-500">Cert #:</span>
          <span className="ml-2 font-mono text-gray-300">{cert.certificateNumber}</span>
        </div>
        <div>
          <span className="text-gray-500">Level:</span>
          <span className="ml-2 text-white">{cert.level}</span>
        </div>
        <div>
          <span className="text-gray-500">Issued:</span>
          <span className="ml-2 text-gray-300">{new Date(cert.issueDate).toLocaleDateString()}</span>
        </div>
        <div>
          <span className="text-gray-500">Expires:</span>
          <span className="ml-2 text-gray-300">{new Date(cert.expiryDate).toLocaleDateString()}</span>
        </div>
      </div>
      
      {verification.creditPoints > 0 && (
        <div className="mt-3 p-2 bg-gray-800/50 rounded">
          <span className="text-sm text-gray-400">Credit Points: </span>
          <span className="text-emerald-400 font-bold">{verification.creditPoints}</span>
        </div>
      )}
    </div>
  );
};

const AccreditationSeal: React.FC<{ body: AccreditationBody }> = ({ body }) => {
  const colors = {
    IOSH: 'from-green-900 to-green-700 border-green-700',
    NEBOSH: 'from-blue-900 to-blue-700 border-blue-700',
    BCSP: 'from-purple-900 to-purple-700 border-purple-700',
    'EviroSafe Global': 'from-cyan-900 to-blue-700 border-cyan-700',
    OHSAS: 'from-orange-900 to-orange-700 border-orange-700',
    ANSI: 'from-red-900 to-red-700 border-red-700',
    ISO: 'from-blue-900 to-cyan-700 border-blue-700'
  }[body] || 'from-gray-900 to-gray-700 border-gray-700';
  
  return (
    <div className={`relative w-24 h-24 rounded-full bg-gradient-to-br ${colors} border-2 flex items-center justify-center`}>
      <div className="absolute inset-0 rounded-full border-2 border-white/20"></div>
      <div className="text-white text-center">
        <div className="text-xs font-bold">{body.substring(0, 4)}</div>
        <div className="text-[8px] mt-1">ACCREDITED</div>
      </div>
      <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-12 h-1 bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>
    </div>
  );
};

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

const InternationalCertificateDocument: React.FC<{ 
  profile: CertificationProfile; 
  user: any; 
  app: CertificateApplication; 
}> = ({ profile, user, app }) => {
  const level = app.certificateLevel || determineCertificateLevel(profile, app);
  const issueDate = app.certificateIssuedAt || new Date().toISOString().slice(0, 10);
  const validUntil = app.certificateValidUntil || new Date().toISOString().slice(0, 10);
  const certId = app.certificateId || generateCertificateId(level, app.idIssuingCountry);
  const accreditationBody = (app.accreditationBody as AccreditationBody) || getAccreditationBody(level);
  const qrData = generateQRCodeData(certId, user?.name, level, issueDate, validUntil);
  
  const highestCert = app.internationalCerts
    .filter(c => c.verificationStatus === 'verified')
    .sort((a, b) => {
      const aCredit = GLOBAL_STANDARDS.RECOGNIZED_CERTS[a.type]?.credit || 0;
      const bCredit = GLOBAL_STANDARDS.RECOGNIZED_CERTS[b.type]?.credit || 0;
      return bCredit - aCredit;
    })[0];

  return (
    <div id="printable-certificate" className="relative mx-auto overflow-hidden shadow-2xl print:shadow-none bg-white" style={{ width: '297mm', height: '210mm', printColorAdjust: 'exact' }}>
      {/* Certificate Border */}
      <div className="absolute inset-0 border-[15mm] border-emerald-900" />
      <div className="absolute inset-[5mm] border-[2mm] border-amber-600/30" />
      
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z' fill='%2300597c' fill-opacity='0.4'/%3E%3C/svg%3E")`
      }}></div>
      
      {/* Main Content */}
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
            <div className="flex flex-col items-center mb-1">
                 <GoldenSeal />
            </div>

            {/* Verification Area */}
            <div className="text-right flex flex-col items-end">
                <QRCodeSVG 
                    value={qrData} 
                    size={80}
                    level="H"
                    includeMargin={false}
                    bgColor="#ffffff"
                    fgColor="#064e3b"
                />
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
// 4. MAIN COMPONENT
// ================================
export const CertifiedProfile: React.FC = () => {
  const { activeUser } = useAppContext();
  const [activeTab, setActiveTab] = useState<'overview' | 'requirements' | 'evidence' | 'certificate' | 'verification' | 'cpd'>('overview');
  
  // Mock profile data
  const [profile] = useState<CertificationProfile>({
    user_id: 'current',
    org_id: 'org_1',
    level: 'Basic',
    role_title: 'HSE Officer',
    safe_working_hours: 1200,
    total_years_experience: 2,
    last_incident_date: '2023-01-15',
    qualifications: ['First Aid', 'Fire Safety', 'Risk Assessment'],
    requirements_met: {
      training: true,
      experience: true,
      safe_hours: false,
      behavior: true,
      cpd: false,
      verification: false
    },
    competencyScores: {
      riskAssessment: 75,
      incidentInvestigation: 65,
      auditConduction: 60,
      emergencyResponse: 80,
      legalCompliance: 70
    }
  });
  
  const [aiInsight, setAiInsight] = useState<{
    nextLevelRecommendation: string;
    missingItems: string[];
    globalStandardsMet: string[];
    improvementAreas: string[];
  } | null>(null);
  
  const [loadingInsight, setLoadingInsight] = useState(false);
  const [verificationFile, setVerificationFile] = useState<File | null>(null);
  const [cpdFiles, setCpdFiles] = useState<File[]>([]);

  const storageKey = useMemo(() => `evirosafe_cert_app_${activeUser?.id || 'anonymous'}`, [activeUser?.id]);
  
  const [app, setApp] = useState<CertificateApplication>({
    status: 'draft',
    joinedEviroSafeDate: '',
    educationLevel: 'Secondary',
    educationInstitute: '',
    educationYear: '',
    professionalMemberships: [],
    hseExperienceMonths: 24,
    currentPosition: 'HSE Officer',
    organizationType: 'Construction',
    industrySector: 'Construction',
    previousPositions: [],
    idType: 'National ID',
    idNumber: '',
    idIssuingCountry: '',
    idExpiryDate: '',
    internationalCerts: [],
    competencies: {
      riskAssessment: 'Intermediate',
      incidentInvestigation: 'Intermediate',
      auditConduction: 'Beginner',
      emergencyResponse: 'Intermediate',
      legalCompliance: 'Intermediate',
      environmentalManagement: 'Beginner',
      trainingDelivery: 'Beginner',
      behavioralSafety: 'Intermediate'
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
  });

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

  // Enhanced eligibility check
  const eligibility = useMemo(() => {
    const issues: string[] = [];
    const warnings: string[] = [];
    const level = determineCertificateLevel(profile, app);
    const targetLevel = app.certificateLevel || level;
    
    // Service months check
    const serviceMonths = app.joinedEviroSafeDate 
      ? Math.floor((new Date().getTime() - new Date(app.joinedEviroSafeDate).getTime()) / (1000 * 60 * 60 * 24 * 30))
      : 0;
    
    if (serviceMonths < GLOBAL_STANDARDS.MIN_SERVICE_MONTHS[targetLevel]) {
      issues.push(`Minimum service required for ${targetLevel}: ${GLOBAL_STANDARDS.MIN_SERVICE_MONTHS[targetLevel]} months`);
    }
    
    // HSE experience check
    if (app.hseExperienceMonths < GLOBAL_STANDARDS.MIN_HSE_EXPERIENCE[targetLevel]) {
      issues.push(`Minimum HSE experience for ${targetLevel}: ${GLOBAL_STANDARDS.MIN_HSE_EXPERIENCE[targetLevel]} months`);
    }
    
    // Education check
    const educationRank: Record<EducationLevel, number> = {
      'Below Secondary': 0,
      'Secondary': 1,
      'Diploma': 2,
      'Bachelor': 3,
      'Master': 4,
      'Doctorate': 5
    };
    
    const requiredRank = educationRank[GLOBAL_STANDARDS.MIN_EDUCATION[targetLevel]];
    const actualRank = educationRank[app.educationLevel];
    
    if (actualRank < requiredRank) {
      issues.push(`Minimum education for ${targetLevel}: ${GLOBAL_STANDARDS.MIN_EDUCATION[targetLevel]}`);
    }
    
    // Safe hours check
    if (profile.safe_working_hours < GLOBAL_STANDARDS.SAFE_HOURS_REQUIREMENTS[targetLevel]) {
      issues.push(`Minimum safe working hours for ${targetLevel}: ${GLOBAL_STANDARDS.SAFE_HOURS_REQUIREMENTS[targetLevel]} hours`);
    }
    
    // CPD check
    const requiredCpd = GLOBAL_STANDARDS.CPD_REQUIREMENTS[targetLevel];
    if (app.cpdHoursCurrentYear < requiredCpd) {
      warnings.push(`CPD hours for ${targetLevel}: ${app.cpdHoursCurrentYear}/${requiredCpd} hours`);
    }
    
    // International certification check for higher levels
    if (['Expert', 'Master', 'Fellow'].includes(targetLevel)) {
      const verifiedCerts = app.internationalCerts.filter(c => c.verificationStatus === 'verified');
      if (verifiedCerts.length === 0) {
        issues.push(`${targetLevel} level requires at least one verified international certification`);
      }
    }
    
    // Document check
    const requiredDocs = ['idProof', 'educationProof', 'professionalPhoto', 'employerLetter'];
    const missingDocs = requiredDocs.filter(doc => !app.docs[doc as keyof typeof app.docs]);
    if (missingDocs.length > 0) {
      issues.push(`Missing required documents: ${missingDocs.join(', ')}`);
    }
    
    // Declarations check
    const declarations = [
      { key: 'acceptedTerms', label: 'Terms & Conditions' },
      { key: 'acceptedPrivacy', label: 'Privacy Policy' },
      { key: 'acceptedCodeOfConduct', label: 'Code of Conduct' },
      { key: 'acceptedContinuousEducation', label: 'Continuous Education' },
      { key: 'confirmedTrueInfo', label: 'Information Accuracy' },
      { key: 'consentForVerification', label: 'Verification Consent' }
    ];
    
    const missingDeclarations = declarations.filter(d => !app[d.key as keyof CertificateApplication]);
    if (missingDeclarations.length > 0) {
      issues.push(`Missing declarations: ${missingDeclarations.map(d => d.label).join(', ')}`);
    }
    
    // Verification file check
    if (!verificationFile && app.status === 'draft') {
      warnings.push('Upload International Certification Proof');
    }

    return { 
      serviceMonths, 
      issues, 
      warnings,
      isEligible: issues.length === 0,
      currentLevel: level,
      targetLevel 
    };
  }, [app, profile, verificationFile]);

  const canSubmit = app.status === 'draft' && eligibility.isEligible;

  const handleSubmit = () => {
    if (!canSubmit) return;
    
    // Generate certificate details
    const level = determineCertificateLevel(profile, app);
    const accreditationBody = getAccreditationBody(level);
    const certificateId = generateCertificateId(level, app.idIssuingCountry, accreditationBody);
    const issueDate = new Date().toISOString().split('T')[0];
    const validity = calculateCertificateValidity(level, issueDate);
    
    setApp(prev => ({ 
      ...prev, 
      status: 'submitted', 
      submittedAt: new Date().toISOString(),
      certificateLevel: level,
      certificateId,
      certificateIssuedAt: issueDate,
      certificateValidUntil: validity.validUntil,
      accreditationBody
    }));
    
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
    const qrData = generateQRCodeData(certificateId, activeUser?.name, level, issueDate, validity.validUntil);

    setApp(prev => ({ 
      ...prev, 
      status: 'approved', 
      approvedAt: new Date().toISOString(), 
      approvalNotes: reviewNote,
      certificateLevel: level,
      certificateId,
      certificateIssuedAt: issueDate,
      certificateValidUntil: validity.validUntil,
      accreditationBody,
      certificateQRCode: qrData
    }));
    
    setActiveTab('certificate');
  };

  const handleReject = () => {
    if (!isAdmin) return;
    setApp(prev => ({ 
      ...prev, 
      status: 'rejected', 
      rejectedAt: new Date().toISOString(), 
      approvalNotes: reviewNote 
    }));
    setActiveTab('overview');
  };

  const handlePrint = () => {
    const content = document.getElementById('printable-certificate');
    if (!content) return;
    
    const printWindow = window.open('', '_blank', 'height=900,width=1200');
    if (!printWindow) return;
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Global Certification Certificate</title>
          <link href="https://cdn.tailwindcss.com" rel="stylesheet">
          <style>
            @media print {
              @page { size: landscape; margin: 0; }
              body { margin: 0; padding: 0; }
              #printable-certificate { width: 100%; height: 100%; }
            }
          </style>
        </head>
        <body class="bg-white">
          ${content.outerHTML}
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  const addInternationalCert = () => {
    const newCert: InternationalCert = {
      type: selectedCertType,
      certificateNumber: '',
      issuingBody: '',
      issueDate: new Date().toISOString().split('T')[0],
      expiryDate: new Date(new Date().setFullYear(new Date().getFullYear() + 5)).toISOString().split('T')[0],
      level: 'Professional',
      verificationStatus: 'pending'
    };
    
    setApp(prev => ({
      ...prev,
      internationalCerts: [...prev.internationalCerts, newCert]
    }));
  };

  const updateCert = (index: number, updates: Partial<InternationalCert>) => {
    setApp(prev => ({
      ...prev,
      internationalCerts: prev.internationalCerts.map((cert, i) => 
        i === index ? { ...cert, ...updates } : cert
      )
    }));
  };

  const addCPDActivity = () => {
    const newActivity: CPDActivity = {
      id: `cpd_${Date.now()}`,
      title: '',
      provider: '',
      date: new Date().toISOString().split('T')[0],
      hours: 0,
      category: 'training',
      verificationStatus: 'pending'
    };
    
    setApp(prev => ({
      ...prev,
      cpdActivities: [...prev.cpdActivities, newActivity]
    }));
  };

  const calculateCPDHours = () => {
    const currentYear = new Date().getFullYear();
    const currentYearHours = app.cpdActivities
      .filter(a => new Date(a.date).getFullYear() === currentYear && a.verificationStatus === 'verified')
      .reduce((sum, a) => sum + a.hours, 0);
    
    const previousYearHours = app.cpdActivities
      .filter(a => new Date(a.date).getFullYear() === currentYear - 1 && a.verificationStatus === 'verified')
      .reduce((sum, a) => sum + a.hours, 0);
    
    setApp(prev => ({
      ...prev,
      cpdHoursCurrentYear: currentYearHours,
      cpdHoursPreviousYear: previousYearHours
    }));
  };

  if (!activeUser) return <div className="p-8 text-center text-gray-400">Please sign in.</div>;

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-900 to-emerald-900/50 rounded-2xl p-6 border border-gray-800">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-emerald-900/30 border border-emerald-700/50">
              <Award className="w-8 h-8 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Global Certification System</h1>
              <p className="text-gray-300 mt-1 flex items-center gap-2">
                <Globe className="w-4 h-4" />
                Internationally recognized certifications • ISO 17024 compliant • Global verification
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                <Badge color="blue" icon={Shield}>ISO 17024</Badge>
                <Badge color="green" icon={Globe}>Global Recognition</Badge>
                <Badge color="purple" icon={Database}>Blockchain Verified</Badge>
                <Badge color="amber" icon={CheckCircle}>Digital Credentials</Badge>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col gap-2">
            <div className="text-right">
              <div className="text-sm text-gray-400">Current Status</div>
              <Badge 
                color={statusColor(app.status)} 
                className="text-lg px-4 py-1.5"
              >
                {app.status.toUpperCase().replace(/_/g, ' ')}
              </Badge>
            </div>
            {app.certificateLevel && (
              <div className="text-right">
                <div className="text-sm text-gray-400">Certification Level</div>
                <div className="text-xl font-bold text-white">{app.certificateLevel}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-gray-900/50 rounded-xl p-2 border border-gray-800">
        <div className="flex overflow-x-auto gap-1 pb-2">
          {[
            { key: 'overview', label: 'Dashboard', icon: BarChart },
            { key: 'requirements', label: 'Global Standards', icon: Target },
            { key: 'evidence', label: 'Application', icon: FileText },
            { key: 'verification', label: 'Verification', icon: ShieldCheck },
            { key: 'cpd', label: 'CPD Tracker', icon: BookOpen },
            { key: 'certificate', label: 'Certificate', icon: Award },
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-all whitespace-nowrap ${
                  activeTab === tab.key 
                  ? 'bg-emerald-900/50 text-emerald-300 border border-emerald-700/50' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            <Card title="Certification Progress">
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-900 to-cyan-900 flex items-center justify-center text-2xl font-bold text-white">
                      {activeUser.name.charAt(0)}
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-white">{activeUser.name}</div>
                      <div className="text-gray-400">{profile.role_title}</div>
                      <div className="text-sm text-gray-500 mt-1">
                        Member since: {app.joinedEviroSafeDate || 'Not specified'}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-400">Target Level</div>
                    <div className="text-2xl font-bold text-emerald-400">{eligibility.targetLevel}</div>
                    <div className="text-xs text-gray-500 mt-1">Current: {eligibility.currentLevel}</div>
                  </div>
                </div>

                <div className="space-y-4">
                  <ProgressBar 
                    current={profile.safe_working_hours} 
                    target={GLOBAL_STANDARDS.SAFE_HOURS_REQUIREMENTS[eligibility.targetLevel]} 
                    label="Safe Working Hours" 
                    unit="hours"
                    color="green"
                  />
                  <ProgressBar 
                    current={eligibility.serviceMonths} 
                    target={GLOBAL_STANDARDS.MIN_SERVICE_MONTHS[eligibility.targetLevel]} 
                    label="Service Months" 
                    unit="months"
                    color="blue"
                  />
                  <ProgressBar 
                    current={app.cpdHoursCurrentYear} 
                    target={GLOBAL_STANDARDS.CPD_REQUIREMENTS[eligibility.targetLevel]} 
                    label="CPD Hours (Current Year)" 
                    unit="hours"
                    color="purple"
                  />
                  <ProgressBar 
                    current={app.hseExperienceMonths} 
                    target={GLOBAL_STANDARDS.MIN_HSE_EXPERIENCE[eligibility.targetLevel]} 
                    label="HSE Experience" 
                    unit="months"
                    color="amber"
                  />
                </div>

                {eligibility.issues.length > 0 && (
                  <div className="mt-6 p-4 rounded-xl border border-red-400/40 bg-red-500/10">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-5 h-5 text-red-400" />
                      <div className="font-bold text-red-200">Eligibility Requirements Missing</div>
                    </div>
                    <ul className="text-sm text-red-100 space-y-1">
                      {eligibility.issues.map((x, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <XCircle className="w-3 h-3 mt-1 flex-shrink-0" />
                          {x}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-4">
                      <Button variant="outline" onClick={() => setActiveTab('evidence')}>
                        Complete Application
                      </Button>
                    </div>
                  </div>
                )}

                {eligibility.warnings.length > 0 && (
                  <div className="mt-4 p-4 rounded-xl border border-amber-400/30 bg-amber-500/10">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-5 h-5 text-amber-400" />
                      <div className="font-bold text-amber-200">Recommendations</div>
                    </div>
                    <ul className="text-sm text-amber-100 space-y-1">
                      {eligibility.warnings.map((x, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <Clock className="w-3 h-3 mt-1 flex-shrink-0" />
                          {x}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </Card>

            {/* Competencies */}
            <Card title="Competency Assessment">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(app.competencies).map(([key, level]) => (
                  <div key={key} className="p-3 bg-gray-900/50 rounded-lg border border-gray-800">
                    <div className="text-xs text-gray-400 uppercase mb-1">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </div>
                    <Badge 
                      color={
                        level === 'Expert' ? 'green' :
                        level === 'Advanced' ? 'blue' :
                        level === 'Intermediate' ? 'amber' : 'gray'
                      }
                    >
                      {level}
                    </Badge>
                    <div className="mt-2">
                      <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${
                            level === 'Expert' ? 'bg-emerald-500' :
                            level === 'Advanced' ? 'bg-blue-500' :
                            level === 'Intermediate' ? 'bg-amber-500' : 'bg-gray-500'
                          }`}
                          style={{
                            width: 
                              level === 'Expert' ? '100%' :
                              level === 'Advanced' ? '75%' :
                              level === 'Intermediate' ? '50%' : '25%'
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card title="Quick Actions">
              <div className="space-y-3">
                <Button 
                  variant="outline" 
                  onClick={() => setActiveTab('evidence')}
                  className="w-full justify-start"
                  leftIcon={<FileText className="w-4 h-4" />}
                >
                  Continue Application
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setActiveTab('verification')}
                  className="w-full justify-start"
                  leftIcon={<ShieldCheck className="w-4 h-4" />}
                >
                  Upload Verification
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setActiveTab('cpd')}
                  className="w-full justify-start"
                  leftIcon={<BookOpen className="w-4 h-4" />}
                >
                  Log CPD Hours
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                  className="w-full justify-start"
                  leftIcon={<CheckCircle className="w-4 h-4" />}
                >
                  Submit Application
                </Button>
              </div>
            </Card>

            {/* Global Standards */}
            <Card title="Global Standards Met">
              <div className="space-y-2">
                <GlobalStandardsBadge standard="ISO 17024" verified={true} />
                <GlobalStandardsBadge standard="Continuous CPD" verified={app.cpdHoursCurrentYear >= 20} />
                <GlobalStandardsBadge standard="Experience Portfolio" verified={app.hseExperienceMonths >= 24} />
                <GlobalStandardsBadge standard="International Recognition" verified={app.internationalCerts.length > 0} />
                <GlobalStandardsBadge standard="Digital Verification" verified={app.certificateQRCode !== undefined} />
              </div>
            </Card>

            {/* AI Insights */}
            {aiInsight && (
              <Card title="AI Recommendations">
                <div className="space-y-3">
                  <div className="p-3 bg-gray-900/50 rounded-lg">
                    <div className="text-sm text-gray-400 mb-1">Next Level</div>
                    <div className="text-white font-bold">{aiInsight.nextLevelRecommendation}</div>
                  </div>
                  
                  {aiInsight.improvementAreas?.length > 0 && (
                    <div className="p-3 bg-blue-900/20 rounded-lg border border-blue-800/30">
                      <div className="text-sm text-blue-300 mb-2">Improvement Areas</div>
                      <ul className="text-xs text-blue-200 space-y-1">
                        {aiInsight.improvementAreas.slice(0, 3).map((area, i) => (
                          <li key={i} className="flex items-start gap-1">
                            <Target className="w-3 h-3 mt-0.5 flex-shrink-0" />
                            {area}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Global Standards Tab */}
      {activeTab === 'requirements' && (
        <Card title="Global Certification Standards & Requirements">
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {Object.entries(ACCREDITATION_REQUIREMENTS).map(([key, body]) => (
                <div key={key} className="p-4 border border-gray-700 rounded-xl bg-gray-900/50">
                  <div className="flex items-center gap-3 mb-3">
                    <Shield className="w-8 h-8 text-emerald-400" />
                    <div>
                      <h3 className="font-bold text-white">{body.name}</h3>
                      <p className="text-sm text-gray-400">{key}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2 mb-4">
                    <h4 className="text-sm font-bold text-gray-300">Requirements:</h4>
                    <ul className="text-sm text-gray-400 space-y-1">
                      {body.requirements.map((req, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <CheckCircle className="w-3 h-3 text-emerald-400" />
                          {req}
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div className="text-sm text-gray-400">
                    <span className="font-bold">Validity:</span> {body.validity}
                  </div>
                  
                  <a 
                    href={body.website} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-emerald-400 hover:text-emerald-300 mt-2"
                  >
                    Visit website <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              ))}
            </div>

            {/* Level Requirements Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-900/50">
                  <tr>
                    <th className="p-3 text-left text-sm font-bold text-gray-300">Level</th>
                    <th className="p-3 text-left text-sm font-bold text-gray-300">Experience</th>
                    <th className="p-3 text-left text-sm font-bold text-gray-300">Education</th>
                    <th className="p-3 text-left text-sm font-bold text-gray-300">CPD Hours</th>
                    <th className="p-3 text-left text-sm font-bold text-gray-300">Safe Hours</th>
                    <th className="p-3 text-left text-sm font-bold text-gray-300">Validity</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(GLOBAL_STANDARDS.MIN_SERVICE_MONTHS).map(([level, months]) => (
                    <tr key={level} className="border-b border-gray-800/50 hover:bg-gray-900/30">
                      <td className="p-3">
                        <Badge 
                          color={
                            level === 'Fellow' || level === 'Master' ? 'purple' :
                            level === 'Expert' ? 'blue' :
                            level === 'Professional' ? 'green' :
                            level === 'Basic' ? 'amber' : 'gray'
                          }
                        >
                          {level}
                        </Badge>
                      </td>
                      <td className="p-3 text-gray-300">{months} months</td>
                      <td className="p-3 text-gray-300">{GLOBAL_STANDARDS.MIN_EDUCATION[level as CertificateLevel]}</td>
                      <td className="p-3 text-gray-300">{GLOBAL_STANDARDS.CPD_REQUIREMENTS[level as CertificateLevel]} hrs/yr</td>
                      <td className="p-3 text-gray-300">{GLOBAL_STANDARDS.SAFE_HOURS_REQUIREMENTS[level as CertificateLevel].toLocaleString()}</td>
                      <td className="p-3 text-gray-300">{GLOBAL_STANDARDS.VALIDITY_PERIODS[level as CertificateLevel]} years</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      )}

      {/* Application Tab */}
      {activeTab === 'evidence' && (
        <Card title="Global Certification Application">
          <div className="space-y-8">
            {/* Step Indicator */}
            <div className="flex items-center justify-between">
              {['Personal', 'Experience', 'Certifications', 'Documents', 'Review'].map((step, index) => (
                <div key={step} className="flex flex-col items-center">
                  <div className={`
                    w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold
                    ${verificationStep > index + 1 ? 'bg-emerald-900 text-emerald-300' :
                      verificationStep === index + 1 ? 'bg-emerald-700 text-white' :
                      'bg-gray-800 text-gray-400'}
                  `}>
                    {verificationStep > index + 1 ? '✓' : index + 1}
                  </div>
                  <div className="text-xs mt-1 text-gray-400">{step}</div>
                </div>
              ))}
            </div>

            {/* Step 1: Personal Information */}
            {verificationStep === 1 && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-white">Personal Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Full Name</label>
                    <input 
                      type="text" 
                      value={activeUser?.name || ''}
                      disabled
                      className="w-full bg-gray-900/50 border border-gray-700 rounded p-2 text-gray-300"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Email</label>
                    <input 
                      type="email" 
                      value={activeUser?.email || ''}
                      disabled
                      className="w-full bg-gray-900/50 border border-gray-700 rounded p-2 text-gray-300"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Education Level</label>
                    <select 
                      value={app.educationLevel}
                      onChange={e => setApp(p => ({...p, educationLevel: e.target.value as EducationLevel}))}
                      className="w-full bg-gray-900/50 border border-gray-700 rounded p-2 text-white"
                    >
                      <option value="Secondary">Secondary</option>
                      <option value="Diploma">Diploma</option>
                      <option value="Bachelor">Bachelor's Degree</option>
                      <option value="Master">Master's Degree</option>
                      <option value="Doctorate">Doctorate</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Institution</label>
                    <input 
                      type="text" 
                      value={app.educationInstitute}
                      onChange={e => setApp(p => ({...p, educationInstitute: e.target.value}))}
                      className="w-full bg-gray-900/50 border border-gray-700 rounded p-2 text-white"
                      placeholder="University/College name"
                    />
                  </div>
                </div>
                
                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setVerificationStep(5)}>Skip to Review</Button>
                  <Button onClick={() => setVerificationStep(2)}>Next: Experience</Button>
                </div>
              </div>
            )}

            {/* Step 2: Experience */}
            {verificationStep === 2 && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-white">Professional Experience</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">HSE Experience (Months)</label>
                    <input 
                      type="number" 
                      value={app.hseExperienceMonths}
                      onChange={e => setApp(p => ({...p, hseExperienceMonths: parseInt(e.target.value) || 0}))}
                      className="w-full bg-gray-900/50 border border-gray-700 rounded p-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Current Position</label>
                    <input 
                      type="text" 
                      value={app.currentPosition}
                      onChange={e => setApp(p => ({...p, currentPosition: e.target.value}))}
                      className="w-full bg-gray-900/50 border border-gray-700 rounded p-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Organization Type</label>
                    <select 
                      value={app.organizationType}
                      onChange={e => setApp(p => ({...p, organizationType: e.target.value}))}
                      className="w-full bg-gray-900/50 border border-gray-700 rounded p-2 text-white"
                    >
                      <option value="Construction">Construction</option>
                      <option value="Manufacturing">Manufacturing</option>
                      <option value="Oil & Gas">Oil & Gas</option>
                      <option value="Healthcare">Healthcare</option>
                      <option value="Consultancy">Consultancy</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Industry Sector</label>
                    <input 
                      type="text" 
                      value={app.industrySector}
                      onChange={e => setApp(p => ({...p, industrySector: e.target.value}))}
                      className="w-full bg-gray-900/50 border border-gray-700 rounded p-2 text-white"
                      placeholder="e.g., Construction, Oil & Gas"
                    />
                  </div>
                </div>

                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setVerificationStep(1)}>Back</Button>
                  <Button onClick={() => setVerificationStep(3)}>Next: Certifications</Button>
                </div>
              </div>
            )}

            {/* Step 3: International Certifications */}
            {verificationStep === 3 && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold text-white">International Certifications</h3>
                  <Button 
                    variant="outline" 
                    onClick={addInternationalCert}
                    leftIcon={<Plus className="w-4 h-4" />}
                  >
                    Add Certification
                  </Button>
                </div>

                <div className="space-y-4">
                  {app.internationalCerts.map((cert, index) => (
                    <div key={index} className="p-4 border border-gray-700 rounded-lg bg-gray-900/30">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm text-gray-400 mb-1">Certification Type</label>
                          <select 
                            value={cert.type}
                            onChange={e => updateCert(index, { type: e.target.value as InternationalCertType })}
                            className="w-full bg-gray-900/50 border border-gray-700 rounded p-2 text-white"
                          >
                            <option value="NEBOSH">NEBOSH</option>
                            <option value="IOSH">IOSH</option>
                            <option value="OSHA">OSHA</option>
                            <option value="CSP">CSP</option>
                            <option value="CRSP">CRSP</option>
                            <option value="CMIOSH">CMIOSH</option>
                            <option value="ISO45001">ISO 45001</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm text-gray-400 mb-1">Certificate Number</label>
                          <input 
                            type="text" 
                            value={cert.certificateNumber}
                            onChange={e => updateCert(index, { certificateNumber: e.target.value })}
                            className="w-full bg-gray-900/50 border border-gray-700 rounded p-2 text-white"
                            placeholder="e.g., NEB123456"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-400 mb-1">Issuing Body</label>
                          <input 
                            type="text" 
                            value={cert.issuingBody}
                            onChange={e => updateCert(index, { issuingBody: e.target.value })}
                            className="w-full bg-gray-900/50 border border-gray-700 rounded p-2 text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-400 mb-1">Expiry Date</label>
                          <input 
                            type="date" 
                            value={cert.expiryDate}
                            onChange={e => updateCert(index, { expiryDate: e.target.value })}
                            className="w-full bg-gray-900/50 border border-gray-700 rounded p-2 text-white"
                          />
                        </div>
                      </div>
                      
                      <div className="mt-4">
                        <label className="block text-sm text-gray-400 mb-1">Upload Certificate Document</label>
                        <input 
                          type="file" 
                          className="w-full text-gray-400"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              updateCert(index, { documentUrl: URL.createObjectURL(file) });
                            }
                          }}
                        />
                      </div>
                    </div>
                  ))}

                  {app.internationalCerts.length === 0 && (
                    <div className="text-center py-8 border-2 border-dashed border-gray-700 rounded-lg">
                      <Award className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                      <p className="text-gray-400">No international certifications added yet.</p>
                      <p className="text-sm text-gray-500 mt-1">
                        Add certifications like NEBOSH, IOSH, OSHA for higher credit scores
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setVerificationStep(2)}>Back</Button>
                  <Button onClick={() => setVerificationStep(4)}>Next: Documents</Button>
                </div>
              </div>
            )}

            {/* Step 4: Documents */}
            {verificationStep === 4 && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-white">Required Documents</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { key: 'idProof', label: 'Government ID Proof', required: true },
                    { key: 'educationProof', label: 'Education Certificate', required: true },
                    { key: 'professionalPhoto', label: 'Professional Photo', required: true },
                    { key: 'employerLetter', label: 'Employer Letter', required: true },
                    { key: 'cvResume', label: 'CV/Resume', required: false },
                    { key: 'passportPhoto', label: 'Passport Photo', required: false },
                  ].map((doc) => (
                    <div key={doc.key} className="p-4 border border-gray-700 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-white">{doc.label}</span>
                        {doc.required && (
                          <Badge color="red" size="sm">Required</Badge>
                        )}
                      </div>
                      <input 
                        type="file" 
                        className="w-full text-gray-400 text-sm"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setApp(p => ({
                              ...p,
                              docs: { ...p.docs, [doc.key]: URL.createObjectURL(file) }
                            }));
                          }
                        }}
                      />
                      {app.docs[doc.key as keyof typeof app.docs] && (
                        <div className="mt-2 text-sm text-emerald-400 flex items-center gap-1">
                          <CheckCircle className="w-4 h-4" />
                          Document uploaded
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setVerificationStep(3)}>Back</Button>
                  <Button onClick={() => setVerificationStep(5)}>Next: Review</Button>
                </div>
              </div>
            )}

            {/* Step 5: Review & Submit */}
            {verificationStep === 5 && (
              <div className="space-y-6">
                <h3 className="text-lg font-bold text-white">Review & Submit</h3>
                
                <div className="space-y-4">
                  {/* Eligibility Summary */}
                  <div className="p-4 border border-gray-700 rounded-lg">
                    <h4 className="font-bold text-white mb-3">Eligibility Summary</h4>
                    <div className="space-y-2">
                      {eligibility.isEligible ? (
                        <div className="flex items-center gap-2 text-emerald-400">
                          <CheckCircle className="w-5 h-5" />
                          <span className="font-bold">All requirements met for {eligibility.targetLevel} level</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-red-400">
                          <AlertTriangle className="w-5 h-5" />
                          <span className="font-bold">Requirements not met</span>
                        </div>
                      )}
                      
                      <div className="text-sm text-gray-400">
                        Estimated certification level: <span className="text-white font-bold">{eligibility.currentLevel}</span>
                      </div>
                    </div>
                  </div>

                  {/* Declarations */}
                  <div className="p-4 border border-gray-700 rounded-lg">
                    <h4 className="font-bold text-white mb-3">Declarations</h4>
                    <div className="space-y-3">
                      {[
                        { key: 'acceptedTerms', label: 'I accept the Terms and Conditions' },
                        { key: 'acceptedPrivacy', label: 'I accept the Privacy Policy' },
                        { key: 'acceptedCodeOfConduct', label: 'I agree to abide by the Code of Conduct' },
                        { key: 'acceptedContinuousEducation', label: 'I commit to Continuous Professional Development' },
                        { key: 'confirmedTrueInfo', label: 'I confirm all information provided is true and accurate' },
                        { key: 'consentForVerification', label: 'I consent to verification of my credentials' },
                      ].map((declaration) => (
                        <label key={declaration.key} className="flex items-center gap-3 text-gray-300 hover:text-white cursor-pointer">
                          <input 
                            type="checkbox"
                            checked={app[declaration.key as keyof CertificateApplication] as boolean}
                            onChange={(e) => setApp(p => ({
                              ...p,
                              [declaration.key]: e.target.checked
                            }))}
                            className="w-4 h-4 text-emerald-500 bg-gray-800 border-gray-700 rounded focus:ring-emerald-500"
                          />
                          {declaration.label}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setVerificationStep(4)}>Back</Button>
                  <Button 
                    onClick={handleSubmit}
                    disabled={!canSubmit}
                    className={!canSubmit ? 'opacity-50 cursor-not-allowed' : ''}
                    leftIcon={<CheckCircle className="w-4 h-4" />}
                  >
                    Submit Application
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Verification Tab */}
      {activeTab === 'verification' && (
        <Card title="Verification Portal">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <h3 className="text-lg font-bold text-white">International Certification Verification</h3>
              
              <div className="p-6 border-2 border-dashed border-emerald-700/30 rounded-xl bg-emerald-900/10">
                <div className="text-center mb-4">
                  <ShieldCheck className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                  <h4 className="font-bold text-white">Upload Certification for Verification</h4>
                  <p className="text-gray-400 text-sm mt-1">
                    Upload your NEBOSH, IOSH, OSHA or other international certifications
                  </p>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Select Certification Type</label>
                    <select 
                      value={selectedCertType}
                      onChange={e => setSelectedCertType(e.target.value as InternationalCertType)}
                      className="w-full bg-gray-900/50 border border-gray-700 rounded p-2 text-white"
                    >
                      <option value="NEBOSH">NEBOSH</option>
                      <option value="IOSH">IOSH</option>
                      <option value="OSHA">OSHA</option>
                      <option value="CSP">CSP</option>
                      <option value="CRSP">CRSP</option>
                      <option value="CMIOSH">CMIOSH</option>
                      <option value="ISO45001">ISO 45001 Lead Auditor</option>
                      <option value="Other">Other Certification</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Upload Certificate</label>
                    <div className="border border-gray-700 rounded-lg p-4 bg-gray-900/30">
                      <input 
                        type="file" 
                        accept=".pdf,.jpg,.png,.jpeg"
                        onChange={e => setVerificationFile(e.target.files?.[0] || null)}
                        className="w-full text-gray-400"
                      />
                      <p className="text-xs text-gray-500 mt-2">
                        Accepted formats: PDF, JPG, PNG (Max 10MB)
                      </p>
                    </div>
                  </div>
                  
                  {verificationFile && (
                    <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-emerald-400" />
                          <span className="text-sm text-white">{verificationFile.name}</span>
                        </div>
                        <Badge color="green">Ready for verification</Badge>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Verification Status */}
              <div className="space-y-4">
                <h4 className="font-bold text-white">Verification Status</h4>
                
                {app.internationalCerts.length === 0 ? (
                  <div className="text-center py-8 border border-gray-700 rounded-lg">
                    <FileSearch className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-400">No certifications submitted for verification</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {app.internationalCerts.map((cert, index) => (
                      <InternationalCertificateCard key={index} cert={cert} />
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            <div className="space-y-6">
              {/* Verification Benefits */}
              <Card title="Verification Benefits">
                <ul className="space-y-3">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-300">Higher certification level eligibility</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-300">Global recognition and credibility</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-300">Reduced application review time</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-300">Access to premium resources</span>
                  </li>
                </ul>
              </Card>
              
              {/* Verification Statistics */}
              <Card title="Verification Stats">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Certificates Verified</span>
                    <span className="text-white font-bold">
                      {app.internationalCerts.filter(c => c.verificationStatus === 'verified').length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Total Credit Points</span>
                    <span className="text-emerald-400 font-bold">
                      {app.internationalCerts
                        .filter(c => c.verificationStatus === 'verified')
                        .reduce((sum, cert) => {
                          const credit = GLOBAL_STANDARDS.RECOGNIZED_CERTS[cert.type]?.credit || 10;
                          return sum + credit;
                        }, 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Verification Level</span>
                    <Badge color="blue">
                      {app.internationalCerts.length > 0 ? 'In Progress' : 'Not Started'}
                    </Badge>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </Card>
      )}

      {/* CPD Tab */}
      {activeTab === 'cpd' && (
        <Card title="Continuous Professional Development (CPD) Tracker">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-white">CPD Activities</h3>
                <Button 
                  variant="outline" 
                  onClick={addCPDActivity}
                  leftIcon={<Plus className="w-4 h-4" />}
                >
                  Add Activity
                </Button>
              </div>

              <div className="space-y-4">
                {app.cpdActivities.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-gray-700 rounded-xl">
                    <BookOpen className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400">No CPD activities recorded yet</p>
                    <p className="text-sm text-gray-500 mt-2">
                      Add training, conferences, or other professional development activities
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {app.cpdActivities.map((activity, index) => (
                      <div key={activity.id} className="p-4 border border-gray-700 rounded-lg bg-gray-900/30">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-bold text-white">{activity.title || 'Untitled Activity'}</h4>
                            <p className="text-sm text-gray-400">{activity.provider}</p>
                          </div>
                          <Badge 
                            color={activity.verificationStatus === 'verified' ? 'green' : 'yellow'}
                          >
                            {activity.verificationStatus}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">Date:</span>
                            <span className="ml-2 text-gray-300">{new Date(activity.date).toLocaleDateString()}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Hours:</span>
                            <span className="ml-2 text-white font-bold">{activity.hours}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Category:</span>
                            <span className="ml-2 text-gray-300">{activity.category}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Status:</span>
                            <span className={`ml-2 ${activity.verificationStatus === 'verified' ? 'text-emerald-400' : 'text-amber-400'}`}>
                              {activity.verificationStatus}
                            </span>
                          </div>
                        </div>
                        
                        {activity.description && (
                          <p className="text-sm text-gray-400 mt-3">{activity.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            <div className="space-y-6">
              {/* CPD Summary */}
              <Card title="CPD Summary">
                <div className="space-y-4">
                  <div className="p-4 bg-gray-900/50 rounded-lg">
                    <div className="text-center mb-3">
                      <div className="text-3xl font-bold text-emerald-400">
                        {app.cpdHoursCurrentYear}
                      </div>
                      <div className="text-sm text-gray-400">Hours This Year</div>
                    </div>
                    <ProgressBar 
                      current={app.cpdHoursCurrentYear}
                      target={GLOBAL_STANDARDS.CPD_REQUIREMENTS[eligibility.targetLevel]}
                      label="Annual Target"
                      unit="hours"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-gray-800/50 rounded-lg">
                      <div className="text-xs text-gray-400">Previous Year</div>
                      <div className="text-lg font-bold text-white">{app.cpdHoursPreviousYear}</div>
                    </div>
                    <div className="p-3 bg-gray-800/50 rounded-lg">
                      <div className="text-xs text-gray-400">Activities</div>
                      <div className="text-lg font-bold text-white">{app.cpdActivities.length}</div>
                    </div>
                  </div>
                  
                  <Button 
                    onClick={calculateCPDHours}
                    className="w-full"
                    leftIcon={<RefreshCw className="w-4 h-4" />}
                  >
                    Recalculate CPD Hours
                  </Button>
                </div>
              </Card>
              
              {/* CPD Requirements */}
              <Card title="CPD Requirements">
                <div className="space-y-3">
                  {Object.entries(GLOBAL_STANDARDS.CPD_REQUIREMENTS).map(([level, hours]) => (
                    <div key={level} className="flex justify-between items-center p-2 hover:bg-gray-800/30 rounded">
                      <span className="text-sm text-gray-400">{level}</span>
                      <span className={`font-bold ${
                        app.cpdHoursCurrentYear >= hours ? 'text-emerald-400' : 'text-gray-400'
                      }`}>
                        {hours} hrs/year
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        </Card>
      )}

      {/* Certificate Tab */}
      {activeTab === 'certificate' && (
        <div className="space-y-6">
          <Card>
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
              <div>
                <h3 className="text-xl font-bold text-white">Global Certification Certificate</h3>
                <p className="text-gray-400">Digitally signed and internationally recognized</p>
              </div>
              
              <div className="flex gap-3">
                <Button 
                  variant="outline"
                  onClick={() => {
                    // Download certificate as PDF
                    const link = document.createElement('a');
                    link.href = `https://certificates.evirosafe.org/${app.certificateId}`;
                    link.download = `EviroSafe_Certificate_${app.certificateId}.pdf`;
                    link.click();
                  }}
                  leftIcon={<Download className="w-4 h-4" />}
                >
                  Download PDF
                </Button>
                <Button 
                  onClick={handlePrint}
                  leftIcon={<FileText className="w-4 h-4" />}
                >
                  Print Certificate
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => {
                    // Copy verification URL
                    navigator.clipboard.writeText(`https://verify.evirosafe.org/${app.certificateId}`);
                    alert('Verification URL copied to clipboard!');
                  }}
                  leftIcon={<Copy className="w-4 h-4" />}
                >
                  Copy Verification URL
                </Button>
              </div>
            </div>
          </Card>

          {app.status === 'approved' ? (
            <div className="bg-white rounded-xl overflow-hidden shadow-2xl">
              <InternationalCertificateDocument 
                profile={profile} 
                user={activeUser} 
                app={app} 
              />
            </div>
          ) : (
            <Card>
              <div className="text-center py-12">
                {app.status === 'submitted' || app.status === 'under_review' ? (
                  <>
                    <Clock className="w-16 h-16 text-amber-400 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-white mb-2">Application Under Review</h3>
                    <p className="text-gray-400">
                      Your certification application is currently being reviewed by our global certification board.
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                      Expected review time: 5-7 business days
                    </p>
                  </>
                ) : app.status === 'rejected' ? (
                  <>
                    <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-white mb-2">Application Not Approved</h3>
                    <p className="text-gray-400">
                      Your application requires additional information or does not meet the current requirements.
                    </p>
                    {app.approvalNotes && (
                      <div className="mt-4 p-4 bg-gray-900/50 rounded-lg max-w-md mx-auto">
                        <p className="text-sm text-gray-300">{app.approvalNotes}</p>
                      </div>
                    )}
                    <Button className="mt-4" onClick={() => setActiveTab('evidence')}>
                      Update Application
                    </Button>
                  </>
                ) : (
                  <>
                    <Lock className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-white mb-2">Certificate Pending</h3>
                    <p className="text-gray-400">
                      Complete your application and submit for approval to receive your certificate.
                    </p>
                    <Button className="mt-4" onClick={() => setActiveTab('evidence')}>
                      Complete Application
                    </Button>
                  </>
                )}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Admin Panel (Conditional) */}
      {isAdmin && app.status === 'submitted' && (
        <Card title="Admin Review Panel" className="mt-6 border border-emerald-800/50">
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Review Notes</label>
              <textarea 
                value={reviewNote}
                onChange={e => setReviewNote(e.target.value)}
                className="w-full h-32 bg-gray-900/50 border border-gray-700 rounded p-3 text-white"
                placeholder="Enter review notes, feedback, or approval comments..."
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <Button 
                onClick={handleApprove}
                className="bg-emerald-900 hover:bg-emerald-800 border-emerald-700"
                leftIcon={<CheckCircle className="w-4 h-4" />}
              >
                Approve & Issue Certificate
              </Button>
              <Button 
                variant="danger"
                onClick={handleReject}
                leftIcon={<XCircle className="w-4 h-4" />}
              >
                Reject Application
              </Button>
            </div>
            
            <div className="text-sm text-gray-400">
              <div className="font-bold mb-2">Application Details:</div>
              <div className="grid grid-cols-2 gap-2">
                <div>Applicant: <span className="text-white">{activeUser?.name}</span></div>
                <div>Experience: <span className="text-white">{app.hseExperienceMonths} months</span></div>
                <div>Education: <span className="text-white">{app.educationLevel}</span></div>
                <div>Submitted: <span className="text-white">
                  {app.submittedAt ? new Date(app.submittedAt).toLocaleDateString() : 'Not submitted'}
                </span></div>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};