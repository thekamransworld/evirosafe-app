
import React, { useState, useRef, useEffect } from 'react';
import { Button } from './Button';

interface ActionsBarProps {
  onEmail?: () => void;
  onPrint?: () => void;
  onDownloadPdf?: () => void;
  downloadOptions?: {
      label: string;
      handler: () => void;
  }[];
}

export const ActionsBar: React.FC<ActionsBarProps> = ({ onEmail, onPrint, onDownloadPdf, downloadOptions }) => {
  const [downloadOpen, setDownloadOpen] = useState(false);
  const downloadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (downloadRef.current && !downloadRef.current.contains(event.target as Node)) {
        setDownloadOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="flex items-center space-x-2 print:hidden">
      {onPrint && <Button variant="secondary" size="sm" onClick={onPrint} leftIcon={<PrinterIcon />}>Print</Button>}
      
      {onDownloadPdf && !downloadOptions && (
          <Button variant="secondary" size="sm" onClick={onDownloadPdf} leftIcon={<DownloadIcon />}>Download PDF</Button>
      )}

      {downloadOptions && downloadOptions.length > 0 && (
        <div className="relative" ref={downloadRef}>
            <Button variant="secondary" size="sm" onClick={() => setDownloadOpen(prev => !prev)} leftIcon={<DownloadIcon />}>
            Download ▾
            </Button>
            {downloadOpen && (
            <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-md bg-white dark:bg-dark-card shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-20 border dark:border-dark-border">
                <div className="py-1" role="menu" aria-orientation="vertical">
                {downloadOptions.map(opt => (
                    <a
                        key={opt.label}
                        href="#"
                        onClick={(e) => { e.preventDefault(); opt.handler(); setDownloadOpen(false); }}
                        className="text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10 block px-4 py-2 text-sm"
                        role="menuitem"
                    >
                        {opt.label}
                    </a>
                ))}
                </div>
            </div>
            )}
        </div>
      )}

      {onEmail && <Button variant="secondary" size="sm" onClick={onEmail} leftIcon={<MailIcon />}>Email</Button>}
    </div>
  );
};

// Icons
const PrinterIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03-.48.062-.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.32 0c.045-.247.075-.5.075-.75V13.5c0-.75-.03-1.492-.075-2.221m-11.245 0c-.045.729-.075 1.471-.075 2.221v3.75c0 .25.03.495.075.75m11.245 0c.383 0 .75.053 1.102.143m-12.447 0c.352-.09.719-.143 1.102-.143m10.245 0c.373 0 .73.056 1.074.156M4.86 18c.344-.1.691-.156 1.074-.156m12.092 0c.344.1.691.156 1.074.156" /></svg>;
const DownloadIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>;
const MailIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>;
