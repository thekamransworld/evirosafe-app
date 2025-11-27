

import React, { useState, useMemo, useEffect, useRef } from 'react';
import type { Sign, PtwType } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { signageConfig, ptwTypeDetails } from '../config';
import { Badge } from './ui/Badge';
import { useAppContext, useDataContext } from '../contexts';

interface SignageProps {}

const FilterButton: React.FC<{label: string, value: string, currentFilter: string, setFilter: (val: string) => void}> = ({ label, value, currentFilter, setFilter }) => (
    <button
        onClick={() => setFilter(value)}
        className={`px-3 py-1 text-sm font-medium rounded-full transition-colors duration-200 ${
            currentFilter === value ? 'bg-primary-600 text-white' : 'bg-gray-200 dark:bg-dark-card dark:text-text-secondary dark:hover:bg-gray-300 dark:hover:bg-white/10 text-gray-700'
        }`}
    >
        {label}
    </button>
)

const DownloadDropdown: React.FC<{ onSelect: (format: 'PNG' | 'PDF' | 'SVG') => void }> = ({ onSelect }) => {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div ref={ref} className="relative">
            <button
                onClick={() => setIsOpen(p => !p)}
                className="p-1.5 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10 hover:text-gray-700 dark:hover:text-white transition-colors"
                title="Download Sign"
            >
                <DownloadIcon className="w-5 h-5"/>
            </button>

            {isOpen && (
                <div className="absolute top-full right-0 mt-2 w-32 origin-top-right rounded-md bg-white dark:bg-dark-card shadow-lg ring-1 ring-black dark:ring-dark-border ring-opacity-5 focus:outline-none z-10">
                    <div className="py-1" role="menu" aria-orientation="vertical">
                        {['PNG', 'PDF', 'SVG'].map(format => (
                            <a
                                key={format}
                                href="#"
                                onClick={(e) => { e.preventDefault(); onSelect(format as 'PNG' | 'PDF' | 'SVG'); setIsOpen(false); }}
                                className="text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-dark-background block px-4 py-2 text-sm"
                                role="menuitem"
                            >
                                {format}
                            </a>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};


const SignCard: React.FC<{ sign: Sign }> = ({ sign }) => {
    const { language, activeOrg } = useAppContext();
    const config = signageConfig[sign.category];
    
    const title = sign.title[language] || sign.title[activeOrg.primaryLanguage] || sign.title['en'];
    const description = sign.description[language] || sign.description[activeOrg.primaryLanguage] || sign.description['en'];

    const handleDownload = (format: 'PNG' | 'PDF' | 'SVG') => {
        console.log(`Downloading "${title}" as ${format}`);
        // Mock download logic
    };

    const renderShape = () => {
        const symbol = <div className={`text-5xl ${config.symbolColor || ''}`}>{sign.icon_url}</div>;

        switch(config.shape) {
            case 'triangle':
                return (
                    <div className="relative w-24 h-24 flex items-center justify-center">
                        <svg viewBox="0 0 100 87" className="absolute w-full h-full drop-shadow-md">
                            <polygon points="50,0 100,87 0,87" className={`fill-current ${config.bgColor.replace('bg-', 'text-')}`}/>
                            <polygon points="50,5 95,84 5,84" className="fill-transparent stroke-black stroke-[5]"/>
                        </svg>
                        <div className="z-10">{symbol}</div>
                    </div>
                );
            case 'circle':
                 return (
                    <div className={`relative w-24 h-24 flex items-center justify-center rounded-full ${config.bgColor} ${config.borderColor} border-4 shadow-md`}>
                        {symbol}
                        {config.hasSlash && <div className="absolute w-full h-1 bg-red-600 transform rotate-45"></div>}
                    </div>
                 );
            default: // rectangle
                return (
                     <div className={`w-24 h-32 flex items-center justify-center rounded-lg ${config.bgColor} shadow-md`}>
                        {symbol}
                    </div>
                );
        }
    };

    return (
        <div className="relative flex flex-col items-center text-center p-4 border rounded-lg hover:shadow-lg transition-shadow bg-background dark:bg-dark-background border-border-color dark:border-dark-border">
            <div className="absolute top-2 right-2">
                <DownloadDropdown onSelect={handleDownload} />
            </div>
            <div className="h-32 flex items-center justify-center">{renderShape()}</div>
            <p className="font-semibold text-sm text-text-primary dark:text-dark-text-primary mt-3 h-10 flex items-center">{title}</p>
            <p className="text-xs text-text-secondary dark:text-dark-text-secondary h-16 overflow-hidden">{description}</p>
            <div className="mt-auto pt-2 w-full border-t dark:border-dark-border flex flex-wrap gap-1 justify-center">
                {sign.matched_activities.slice(0, 3).map(act => (
                    <Badge key={act} color="blue" size="sm">{act}</Badge>
                ))}
            </div>
        </div>
    )
};


const PrintableSign: React.FC<{ sign: Sign }> = ({ sign }) => {
    const { language, activeOrg } = useAppContext();
    const config = signageConfig[sign.category];
    const title = sign.title[language] || sign.title[activeOrg.primaryLanguage] || sign.title['en'];

    const renderSignContent = () => (
        <div className="flex flex-col items-center justify-center text-center w-full h-full">
            <div className={`text-[12rem] leading-none ${config.symbolColor || ''}`}>{sign.icon_url}</div>
            <h1 className={`text-5xl font-bold mt-8 ${config.textColor}`}>{title}</h1>
        </div>
    );
    
    switch (config.shape) {
        case 'circle':
            return (
                <div className={`relative w-[600px] h-[600px] rounded-full flex items-center justify-center p-8 ${config.bgColor} border-[20px] ${config.borderColor}`}>
                    {renderSignContent()}
                    {config.hasSlash && <div className="absolute w-full h-8 bg-red-600 transform rotate-45"></div>}
                </div>
            )
        case 'triangle':
            return (
                <div className="relative w-[700px] h-[607px] flex items-center justify-center">
                     <svg viewBox="0 0 100 87" className="absolute w-full h-full">
                        <polygon points="50,0 100,87 0,87" className={`fill-current ${config.bgColor.replace('bg-', 'text-')}`}/>
                        <polygon points="50,5 95,84 5,84" className="fill-transparent stroke-black stroke-[5]"/>
                    </svg>
                    <div className="z-10 w-full h-full pt-16">{renderSignContent()}</div>
                </div>
            )
        default: // rectangle
            return (
                 <div className={`w-[600px] h-[800px] flex items-center justify-center p-8 ${config.bgColor}`}>
                    {renderSignContent()}
                </div>
            )
    }
}

export const Signage: React.FC<SignageProps> = () => {
  const { signs } = useDataContext();
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [activityFilter, setActivityFilter] = useState('All');
  const [signsToPrint, setSignsToPrint] = useState<Sign[] | null>(null);
  
  const categories = useMemo(() => ['All', ...Object.keys(signageConfig)], []);
  const activities = useMemo(() => ['All', ...Object.keys(ptwTypeDetails)], []);
  
  const filteredSigns = useMemo(() => {
    return signs.filter(sign => {
      const categoryMatch = categoryFilter === 'All' || sign.category === categoryFilter;
      const activityMatch = activityFilter === 'All' || sign.matched_activities.includes(activityFilter as PtwType);
      return categoryMatch && activityMatch;
    });
  }, [signs, categoryFilter, activityFilter]);

  useEffect(() => {
    if (signsToPrint && signsToPrint.length > 0) {
      const printTimeout = setTimeout(() => {
        window.print();
        setSignsToPrint(null);
      }, 100);
      return () => clearTimeout(printTimeout);
    }
  }, [signsToPrint]);

  const handleDownloadAll = () => {
    setSignsToPrint(filteredSigns);
  };

  return (
    <div>
       {signsToPrint && (
        <div id="printable-signs-container" className="hidden print:block">
            {signsToPrint.map(sign => (
                <div key={sign.id} className="print-page">
                    <PrintableSign sign={sign} />
                </div>
            ))}
        </div>
      )}

      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-signs-container, #printable-signs-container * {
            visibility: visible;
          }
          #printable-signs-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .print-page {
            page-break-after: always;
            height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
          }
           .print-page:last-child {
            page-break-after: auto;
          }
          @page {
            size: A4 portrait;
            margin: 1cm;
          }
        }
      `}</style>

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-text-primary dark:text-dark-text-primary">Signage Library</h1>
        <div className="space-x-2 flex items-center">
            <Button variant="ghost" onClick={handleDownloadAll}>
                <DownloadIcon className="w-5 h-5 mr-2"/>
                Download All ({filteredSigns.length})
            </Button>
            <Button>
                <PlusIcon className="w-5 h-5 mr-2" />
                Add New Sign
            </Button>
        </div>
      </div>

       <Card className="mb-6">
        <div className="space-y-3">
          <div>
            <label className="text-sm font-semibold text-gray-600 dark:text-dark-text-secondary">Filter by Category</label>
            <div className="flex flex-wrap gap-2 mt-2">
                {categories.map(category => (
                    <FilterButton
                        key={category}
                        label={category}
                        value={category}
                        currentFilter={categoryFilter}
                        setFilter={setCategoryFilter}
                    />
                ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-600 dark:text-dark-text-secondary">Filter by Activity / PTW Type</label>
            <div className="flex flex-wrap gap-2 mt-2">
                {activities.map(activity => (
                    <FilterButton
                        key={activity}
                        label={activity}
                        value={activity}
                        currentFilter={activityFilter}
                        setFilter={setActivityFilter}
                    />
                ))}
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {filteredSigns.map((sign) => (
            <SignCard 
                key={sign.id}
                sign={sign}
            />
        ))}
      </div>
      {filteredSigns.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-500">
              <p>No signs found for the selected filters.</p>
          </div>
      )}
    </div>
  );
};

const PlusIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
  </svg>
);

// FIX: Defined the missing DownloadIcon component.
const DownloadIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>;