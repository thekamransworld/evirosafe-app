
import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../contexts';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { certificationProfile as mockProfile } from '../data';
import { generateCertificationInsight } from '../services/geminiService';
import type { CertificationProfile, Qualification } from '../types';

const LevelBadge: React.FC<{ level: string }> = ({ level }) => {
    let colorClass = 'bg-gray-100 text-gray-800 border-gray-300';
    let icon = '🛡️';

    switch (level) {
        case 'Beginner':
            colorClass = 'bg-slate-200 text-slate-800 border-slate-400';
            icon = '🌱';
            break;
        case 'Competent':
            colorClass = 'bg-blue-100 text-blue-800 border-blue-400';
            icon = '🛠️';
            break;
        case 'Advanced':
            colorClass = 'bg-purple-100 text-purple-800 border-purple-400';
            icon = '🚀';
            break;
        case 'Expert':
            colorClass = 'bg-amber-100 text-amber-800 border-amber-400';
            icon = '⭐';
            break;
        case 'Certified Professional':
            colorClass = 'bg-gradient-to-r from-amber-200 to-yellow-400 text-amber-900 border-amber-500 shadow-[0_0_15px_rgba(251,191,36,0.4)]';
            icon = '👑';
            break;
    }

    return (
        <div className={`inline-flex items-center px-4 py-2 rounded-full border-2 font-bold text-sm ${colorClass}`}>
            <span className="mr-2 text-lg">{icon}</span>
            {level}
        </div>
    );
};

const ProgressBar: React.FC<{ current: number; target: number; label: string }> = ({ current, target, label }) => {
    const percentage = Math.min(100, Math.max(0, (current / target) * 100));
    return (
        <div className="w-full">
            <div className="flex justify-between text-xs mb-1 text-gray-400">
                <span>{label}</span>
                <span>{current} / {target}</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2.5 dark:bg-gray-700">
                <div className="bg-neon-green h-2.5 rounded-full transition-all duration-500" style={{ width: `${percentage}%` }}></div>
            </div>
        </div>
    );
};

const DigitalCertificate: React.FC<{ profile: CertificationProfile; user: any }> = ({ profile, user }) => (
    <div id="printable-certificate" className="w-full max-w-4xl mx-auto bg-white text-slate-900 p-12 border-8 border-double border-slate-900 relative overflow-hidden font-serif shadow-2xl">
        {/* Watermark */}
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none">
            <img src="https://storage.googleapis.com/aai-web-samples/app-icons/evirosafe.png" className="w-[500px] grayscale" />
        </div>
        
        {/* Header */}
        <div className="text-center mb-12 relative z-10">
            <div className="flex justify-center mb-6">
                <img src="https://storage.googleapis.com/aai-web-samples/app-icons/evirosafe.png" className="h-20 w-20" />
            </div>
            <h1 className="text-5xl font-bold uppercase tracking-widest text-slate-800 mb-2">Certificate of Competence</h1>
            <p className="text-xl text-slate-600 italic">This is to certify that</p>
        </div>

        {/* User Name */}
        <div className="text-center mb-10 relative z-10">
            <h2 className="text-4xl font-bold text-blue-900 border-b-2 border-slate-300 inline-block pb-2 px-8">{user.name}</h2>
        </div>

        {/* Body */}
        <div className="text-center mb-12 relative z-10">
            <p className="text-xl leading-relaxed text-slate-700">
                Has successfully met the professional standards and requirements for the level of
            </p>
            <h3 className="text-3xl font-bold text-amber-600 mt-4 mb-2">{profile.level.toUpperCase()}</h3>
            <p className="text-lg font-semibold text-slate-600">{profile.role_title}</p>
        </div>

        {/* Metrics */}
        <div className="flex justify-center gap-12 mb-16 text-center relative z-10">
            <div>
                <p className="text-3xl font-bold text-slate-800">{profile.safe_working_hours}+</p>
                <p className="text-sm uppercase tracking-wide text-slate-500">Safe Working Hours</p>
            </div>
            <div>
                <p className="text-3xl font-bold text-slate-800">{profile.total_years_experience}</p>
                <p className="text-sm uppercase tracking-wide text-slate-500">Years Experience</p>
            </div>
             <div>
                <p className="text-3xl font-bold text-slate-800">{profile.qualifications.length}</p>
                <p className="text-sm uppercase tracking-wide text-slate-500">Verified Qualifications</p>
            </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-end border-t border-slate-300 pt-8 relative z-10">
            <div className="text-center">
                <p className="text-sm text-slate-500 mb-4">Authorized Signature</p>
                <div className="h-12 w-48 border-b border-slate-400 mb-2 flex items-end justify-center font-cursive text-2xl text-blue-800">
                    System Verified
                </div>
                <p className="font-bold text-slate-700">EviroSafe Certification Board</p>
            </div>
            <div className="text-center">
                 <img src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=EviroSafe-Cert-${profile.user_id}`} className="mx-auto mb-2" />
                 <p className="text-xs text-slate-400 font-mono">ID: ES-{profile.user_id.substring(0,8).toUpperCase()}</p>
            </div>
            <div className="text-center">
                <p className="text-sm text-slate-500 mb-6">Date of Issue</p>
                <p className="font-bold text-slate-700 text-lg">{new Date().toLocaleDateString()}</p>
            </div>
        </div>
    </div>
);

export const CertifiedProfile: React.FC = () => {
    const { activeUser } = useAppContext();
    const [activeTab, setActiveTab] = useState<'overview' | 'requirements' | 'evidence' | 'certificate'>('overview');
    const [profile, setProfile] = useState<CertificationProfile>(mockProfile);
    const [aiInsight, setAiInsight] = useState<{ nextLevelRecommendation: string, missingItems: string[] } | null>(null);
    const [loadingInsight, setLoadingInsight] = useState(false);

    useEffect(() => {
        const fetchInsight = async () => {
            setLoadingInsight(true);
            const insight = await generateCertificationInsight(profile);
            setAiInsight(insight);
            setLoadingInsight(false);
        };
        fetchInsight();
    }, []);

    const handlePrint = () => {
        const content = document.getElementById('printable-certificate');
        if (!content) return;
        
        const printWindow = window.open('', '', 'height=800,width=1000');
        if (printWindow) {
            printWindow.document.write('<html><head><title>Certificate</title>');
            printWindow.document.write('<script src="https://cdn.tailwindcss.com"></script>');
            printWindow.document.write('</head><body>');
            printWindow.document.write(content.outerHTML);
            printWindow.document.write('</body></html>');
            printWindow.document.close();
            printWindow.print();
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-end mb-2">
                <div>
                    <h1 className="text-3xl font-bold text-text-primary dark:text-white">My Certification Profile</h1>
                    <p className="text-text-secondary dark:text-gray-400">Track your professional growth and safety competency.</p>
                </div>
                {activeTab !== 'certificate' && (
                    <Button onClick={() => setActiveTab('certificate')}>View Certificate</Button>
                )}
            </div>

            {/* Hero Profile Card */}
            <div className="hero-card-normal rounded-2xl p-6 shadow-lg flex flex-col md:flex-row items-center md:items-start gap-6">
                <div className="flex-shrink-0">
                    <img src={activeUser?.avatar_url} alt="Profile" className="w-24 h-24 rounded-full border-4 border-white/10 shadow-2xl" />
                </div>
                <div className="flex-grow text-center md:text-left">
                    <div className="flex flex-col md:flex-row items-center gap-4 mb-2">
                        <h2 className="text-2xl font-bold text-white">{activeUser?.name}</h2>
                        <LevelBadge level={profile.level} />
                    </div>
                    <p className="text-indigo-200 mb-4">{profile.role_title} • {profile.org_id === 'org_1' ? 'Clint Operations' : 'Facilities Management'}</p>
                    
                    <div className="grid grid-cols-3 gap-4 text-center md:text-left">
                        <div className="bg-black/20 rounded-lg p-3 border border-white/5">
                            <p className="text-xs text-indigo-300 uppercase tracking-wider font-bold">Safe Hours</p>
                            <p className="text-2xl font-mono font-bold text-neon-green">{profile.safe_working_hours.toLocaleString()}</p>
                        </div>
                        <div className="bg-black/20 rounded-lg p-3 border border-white/5">
                            <p className="text-xs text-indigo-300 uppercase tracking-wider font-bold">Experience</p>
                            <p className="text-2xl font-mono font-bold text-white">{profile.total_years_experience} <span className="text-sm">Yrs</span></p>
                        </div>
                        <div className="bg-black/20 rounded-lg p-3 border border-white/5">
                            <p className="text-xs text-indigo-300 uppercase tracking-wider font-bold">Training</p>
                            <p className="text-2xl font-mono font-bold text-white">100%</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex space-x-1 bg-gray-800/50 p-1 rounded-xl w-full md:w-fit">
                {(['overview', 'requirements', 'evidence', 'certificate'] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${
                            activeTab === tab 
                            ? 'bg-primary-600 text-white shadow-lg' 
                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                        }`}
                    >
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="min-h-[400px]">
                {activeTab === 'overview' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <Card title="Path to Expert Level" className="lg:col-span-2">
                            <div className="space-y-6">
                                <ProgressBar current={profile.safe_working_hours} target={5000} label="Safe Working Hours (Target: 5,000)" />
                                <ProgressBar current={3} target={5} label="Required Certifications (Target: 5)" />
                                <ProgressBar current={85} target={100} label="Leadership Engagement Score" />
                                <p className="text-sm text-gray-400 mt-4 italic">
                                    "You are consistently demonstrating high safety standards. To reach the next level, focus on leading more Toolbox Talks and mentoring junior staff."
                                </p>
                            </div>
                        </Card>
                        <Card title="AI Competency Insight" edgeColor="purple">
                            {loadingInsight ? (
                                <p className="text-gray-400 animate-pulse">Analyzing profile data...</p>
                            ) : (
                                <div className="space-y-4">
                                    <div className="p-3 bg-indigo-900/20 rounded-lg border border-indigo-500/30">
                                        <p className="text-indigo-300 font-semibold text-sm mb-1">Recommendation</p>
                                        <p className="text-gray-300 text-sm">{aiInsight?.nextLevelRecommendation}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-400 text-xs uppercase font-bold mb-2">Missing Requirements</p>
                                        <ul className="space-y-2">
                                            {aiInsight?.missingItems.map((item, i) => (
                                                <li key={i} className="flex items-center text-sm text-red-300">
                                                    <span className="mr-2 text-red-500">•</span> {item}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            )}
                        </Card>
                    </div>
                )}

                {activeTab === 'requirements' && (
                    <Card title="Level Requirements Checklist">
                        <div className="space-y-4">
                            {[
                                { label: 'Minimum 2 Years Experience', met: true },
                                { label: 'Completed "Managing Safely" Course', met: true },
                                { label: 'Logged 1,000+ Safe Hours', met: true },
                                { label: 'First Aid Certification (Valid)', met: false },
                                { label: 'No Lost Time Injuries (LTI) in last 12 months', met: true },
                                { label: 'Supervisor Endorsement', met: true },
                            ].map((req, i) => (
                                <div key={i} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-white/5 rounded-lg border dark:border-white/10">
                                    <span className={`text-sm ${req.met ? 'text-gray-700 dark:text-gray-300' : 'text-gray-500 dark:text-gray-500'}`}>{req.label}</span>
                                    {req.met ? (
                                        <span className="text-green-500 flex items-center font-bold text-xs"><CheckIcon className="w-4 h-4 mr-1"/> COMPLETED</span>
                                    ) : (
                                        <span className="text-amber-500 flex items-center font-bold text-xs">PENDING</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </Card>
                )}

                {activeTab === 'evidence' && (
                    <Card title="Evidence Locker">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <h4 className="font-bold text-sm text-gray-400 uppercase mb-3">Verified Documents</h4>
                                <div className="space-y-3">
                                    {profile.qualifications.map(q => (
                                        <div key={q.id} className="flex items-center justify-between p-3 bg-green-900/10 border border-green-500/30 rounded-lg">
                                            <div>
                                                <p className="text-sm font-semibold text-green-300">{q.title}</p>
                                                <p className="text-xs text-green-500/70">{q.issuer} • {q.date_obtained}</p>
                                            </div>
                                            <Badge color="green">Verified</Badge>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <h4 className="font-bold text-sm text-gray-400 uppercase mb-3">Upload New Evidence</h4>
                                <div className="border-2 border-dashed border-gray-600 rounded-xl p-8 text-center hover:bg-white/5 transition-colors cursor-pointer">
                                    <div className="mx-auto h-12 w-12 text-gray-400 mb-3">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>
                                    </div>
                                    <p className="text-sm font-medium text-gray-300">Click to upload certificates or documents</p>
                                    <p className="text-xs text-gray-500 mt-1">PDF, JPG, PNG up to 5MB</p>
                                </div>
                            </div>
                        </div>
                    </Card>
                )}

                {activeTab === 'certificate' && (
                    <div className="flex flex-col items-center">
                        <div className="mb-6 flex gap-4 print:hidden">
                            <Button onClick={handlePrint}>
                                <PrinterIcon className="w-5 h-5 mr-2" />
                                Print Certificate
                            </Button>
                            <Button variant="secondary">
                                <ShareIcon className="w-5 h-5 mr-2" />
                                Share Link
                            </Button>
                        </div>
                        <DigitalCertificate profile={profile} user={activeUser} />
                    </div>
                )}
            </div>
        </div>
    );
};

// Icons
const CheckIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>;
const PrinterIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03-.48.062-.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.32 0c.045-.247.075-.5.075-.75V13.5c0-.75-.03-1.492-.075-2.221m-11.245 0c-.045.729-.075 1.471-.075 2.221v3.75c0 .25.03.495.075.75m11.245 0c.383 0 .75.053 1.102.143m-12.447 0c.352-.09.719-.143 1.102-.143m10.245 0c.373 0 .73.056 1.074.156M4.86 18c.344-.1.691-.156 1.074-.156m12.092 0c.344.1.691.156 1.074.156" /></svg>;
const ShareIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" /></svg>;
