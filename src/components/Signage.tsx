import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import type { Sign, PtwType, User } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { signageConfig, ptwTypeDetails } from '../config';
import { Badge } from './ui/Badge';
import { useAppContext, useDataContext } from '../contexts';
import { SearchInput } from './ui/SearchInput';
import { LoadingSpinner } from './ui/LoadingSpinner';
import { EmptyState } from './ui/EmptyState';
import { BaseModal } from './ui/BaseModal';
import { Tooltip } from './ui/Tooltip';
import { ConfirmationDialog } from './ui/ConfirmationDialog';
import { FavoritesManager } from './ui/FavoritesManager';

interface SignageProps {}

interface SignFilterState {
  category: string;
  activity: string;
  size: 'small' | 'medium' | 'large' | 'all';
  color: string;
  searchQuery: string;
  favoritesOnly: boolean;
  recentlyUsed: boolean;
}

interface SignStats {
  total: number;
  byCategory: Record<string, number>;
  byActivity: Record<string, number>;
  favorites: number;
  recentlyUsed: number;
}

const FilterButton: React.FC<{
  label: string; 
  value: string; 
  currentFilter: string; 
  setFilter: (val: string) => void;
  count?: number;
  icon?: React.ReactNode;
}> = ({ label, value, currentFilter, setFilter, count, icon }) => (
  <button
    onClick={() => setFilter(value)}
    className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 flex items-center gap-2 ${
      currentFilter === value 
        ? 'bg-primary-600 text-white shadow-md' 
        : 'bg-gray-100 dark:bg-dark-card text-gray-700 dark:text-text-secondary hover:bg-gray-200 dark:hover:bg-white/10'
    }`}
    title={label}
  >
    {icon && <span className="text-lg">{icon}</span>}
    <span className="truncate max-w-[120px]">{label}</span>
    {count !== undefined && (
      <span className={`px-2 py-1 text-xs rounded-full ${
        currentFilter === value 
          ? 'bg-white/20' 
          : 'bg-gray-300 dark:bg-gray-700'
      }`}>
        {count}
      </span>
    )}
  </button>
);

const SizeFilter: React.FC<{ 
  value: string; 
  onChange: (value: string) => void 
}> = ({ value, onChange }) => (
  <div className="flex items-center gap-2 p-2 bg-gray-100 dark:bg-dark-card rounded-lg">
    <span className="text-sm font-medium">Size:</span>
    <div className="flex gap-1">
      {[
        { value: 'small', label: 'S', tooltip: 'Small (A5)' },
        { value: 'medium', label: 'M', tooltip: 'Medium (A4)' },
        { value: 'large', label: 'L', tooltip: 'Large (A3)' },
        { value: 'all', label: 'All', tooltip: 'All sizes' },
      ].map(size => (
        <Tooltip key={size.value} content={size.tooltip}>
          <button
            onClick={() => onChange(size.value)}
            className={`w-8 h-8 flex items-center justify-center rounded-md text-sm font-medium ${
              value === size.value 
                ? 'bg-primary-600 text-white' 
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            {size.label}
          </button>
        </Tooltip>
      ))}
    </div>
  </div>
);

const ColorFilter: React.FC<{ 
  value: string; 
  onChange: (value: string) => void 
}> = ({ value, onChange }) => {
  const colors = [
    { value: 'all', label: 'All Colors', color: 'bg-gradient-to-r from-primary-500 to-purple-500' },
    { value: 'red', label: 'Red', color: 'bg-red-500' },
    { value: 'yellow', label: 'Yellow', color: 'bg-yellow-500' },
    { value: 'green', label: 'Green', color: 'bg-green-500' },
    { value: 'blue', label: 'Blue', color: 'bg-blue-500' },
    { value: 'orange', label: 'Orange', color: 'bg-orange-500' },
    { value: 'purple', label: 'Purple', color: 'bg-purple-500' },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {colors.map(color => (
        <Tooltip key={color.value} content={color.label}>
          <button
            onClick={() => onChange(color.value)}
            className={`w-8 h-8 rounded-full ${color.color} border-2 ${
              value === color.value 
                ? 'border-white ring-2 ring-offset-2 ring-primary-500' 
                : 'border-transparent hover:border-white'
            }`}
            aria-label={color.label}
          />
        </Tooltip>
      ))}
    </div>
  );
};

const DownloadDropdown: React.FC<{ 
  onSelect: (format: 'PNG' | 'PDF' | 'SVG' | 'JPG') => void;
  signTitle: string;
  size?: 'small' | 'medium' | 'large';
}> = ({ onSelect, signTitle, size = 'medium' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
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

  const handleDownload = async (format: 'PNG' | 'PDF' | 'SVG' | 'JPG') => {
    setIsDownloading(true);
    try {
      await onSelect(format);
      // Simulate download delay
      await new Promise(resolve => setTimeout(resolve, 1000));
    } finally {
      setIsDownloading(false);
      setIsOpen(false);
    }
  };

  const getSizeLabel = (): string => {
    switch(size) {
      case 'small': return 'A5';
      case 'medium': return 'A4';
      case 'large': return 'A3';
      default: return 'A4';
    }
  };

  return (
    <div ref={ref} className="relative">
      <Tooltip content={`Download ${signTitle}`}>
        <button
          onClick={() => setIsOpen(p => !p)}
          disabled={isDownloading}
          className="p-1.5 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10 hover:text-gray-700 dark:hover:text-white transition-colors disabled:opacity-50"
          aria-label={`Download ${signTitle}`}
        >
          {isDownloading ? (
            <LoadingSpinner size="sm" />
          ) : (
            <DownloadIcon className="w-5 h-5" />
          )}
        </button>
      </Tooltip>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-48 origin-top-right rounded-lg bg-white dark:bg-dark-card shadow-lg ring-1 ring-black dark:ring-dark-border ring-opacity-5 z-50 animate-fadeIn">
          <div className="py-2" role="menu">
            <div className="px-4 py-2 border-b dark:border-dark-border">
              <p className="text-xs font-semibold text-gray-500">Download Options</p>
              <p className="text-xs text-gray-400">Size: {getSizeLabel()}</p>
            </div>
            {['PNG', 'PDF', 'SVG', 'JPG'].map(format => (
              <button
                key={format}
                onClick={() => handleDownload(format as any)}
                disabled={isDownloading}
                className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-dark-background transition-colors flex items-center justify-between disabled:opacity-50"
                role="menuitem"
              >
                <span>{format}</span>
                <FileSizeIcon format={format.toLowerCase()} />
              </button>
            ))}
            <div className="border-t dark:border-dark-border pt-2 px-4 pb-2">
              <button
                onClick={() => handleDownload('PDF')}
                className="w-full text-sm text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300 flex items-center justify-center gap-2"
              >
                <PrinterIcon className="w-4 h-4" />
                Quick Print
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const SignCard: React.FC<{ 
  sign: Sign;
  onFavoriteToggle: (signId: string) => void;
  onQuickView: (sign: Sign) => void;
  isFavorite: boolean;
}> = ({ sign, onFavoriteToggle, onQuickView, isFavorite }) => {
  const { language, activeOrg } = useAppContext();
  const config = signageConfig[sign.category];
  const [isHovered, setIsHovered] = useState(false);
  
  const title = sign.title[language] || sign.title[activeOrg.primaryLanguage] || sign.title['en'];
  const description = sign.description[language] || sign.description[activeOrg.primaryLanguage] || sign.description['en'];

  const handleDownload = async (format: 'PNG' | 'PDF' | 'SVG' | 'JPG') => {
    console.log(`Downloading "${title}" as ${format}`);
    // TODO: Implement actual download logic
    return new Promise(resolve => setTimeout(resolve, 1000));
  };

  const renderShape = () => {
    const symbol = <div className={`text-5xl ${config.symbolColor || ''}`}>{sign.icon_url}</div>;

    const getDimensions = () => {
      switch(sign.size || 'medium') {
        case 'small': return 'w-20 h-20';
        case 'large': return 'w-32 h-32';
        default: return 'w-24 h-24';
      }
    };

    switch(config.shape) {
      case 'triangle':
        return (
          <div className={`relative ${getDimensions()} flex items-center justify-center transition-transform duration-300 ${isHovered ? 'scale-110' : ''}`}>
            <svg viewBox="0 0 100 87" className="absolute w-full h-full drop-shadow-lg">
              <polygon 
                points="50,0 100,87 0,87" 
                className={`fill-current ${config.bgColor.replace('bg-', 'text-')}`}
              />
              <polygon 
                points="50,5 95,84 5,84" 
                className="fill-transparent stroke-white dark:stroke-gray-800 stroke-[3]"
              />
              {config.hasOutline && (
                <polygon 
                  points="50,3 97,85 3,85" 
                  className="fill-transparent stroke-black stroke-[1] opacity-20"
                />
              )}
            </svg>
            <div className="z-10 drop-shadow-lg">{symbol}</div>
            {config.hasSlash && (
              <div className="absolute w-full h-1 bg-red-600 transform rotate-45 opacity-80"></div>
            )}
          </div>
        );
      case 'circle':
        return (
          <div className={`relative ${getDimensions()} flex items-center justify-center rounded-full ${config.bgColor} ${config.borderColor} border-4 shadow-lg transition-all duration-300 ${isHovered ? 'scale-110 ring-4 ring-white/30' : ''}`}>
            {symbol}
            {config.hasSlash && (
              <div className="absolute w-full h-1.5 bg-red-600 transform rotate-45"></div>
            )}
          </div>
        );
      default: // rectangle
        return (
          <div className={`${getDimensions()} flex items-center justify-center rounded-xl ${config.bgColor} shadow-lg transition-all duration-300 ${isHovered ? 'scale-110' : ''} ${config.borderColor ? config.borderColor : ''}`}>
            {symbol}
            {config.hasOutline && (
              <div className="absolute inset-0 border-2 border-white/30 rounded-xl"></div>
            )}
          </div>
        );
    }
  };

  const getCategoryIcon = () => {
    const icons: Record<string, string> = {
      'warning': '⚠️',
      'mandatory': '📋',
      'prohibition': '⛔',
      'emergency': '🚨',
      'fire': '🔥',
      'first-aid': '➕',
      'hazard': '⚠️',
    };
    return icons[sign.category] || '🏷️';
  };

  return (
    <Card 
      className="relative flex flex-col h-full hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Favorite Button */}
      <button
        onClick={() => onFavoriteToggle(sign.id)}
        className="absolute top-3 left-3 z-10 p-1.5 rounded-full bg-white/80 dark:bg-dark-card/80 backdrop-blur-sm hover:bg-white dark:hover:bg-dark-card transition-colors shadow-sm"
        aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
      >
        <HeartIcon className={`w-5 h-5 ${isFavorite ? 'text-red-500 fill-red-500' : 'text-gray-400'}`} />
      </button>

      {/* Category Badge */}
      <div className="absolute top-3 right-3 z-10">
        <Badge color={config.color || 'gray'} size="sm">
          <span className="mr-1">{getCategoryIcon()}</span>
          {sign.category}
        </Badge>
      </div>

      {/* Quick View Button */}
      <button
        onClick={() => onQuickView(sign)}
        className="absolute top-12 right-3 z-10 p-1.5 rounded-full bg-white/80 dark:bg-dark-card/80 backdrop-blur-sm hover:bg-white dark:hover:bg-dark-card transition-colors shadow-sm opacity-0 group-hover:opacity-100"
        aria-label="Quick view"
      >
        <EyeIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
      </button>

      {/* Sign Shape */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="relative">
          {renderShape()}
          {/* Download Overlay */}
          <div className={`absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
            <DownloadDropdown 
              onSelect={handleDownload} 
              signTitle={title}
              size={sign.size as any}
            />
          </div>
        </div>
      </div>

      {/* Sign Info */}
      <div className="p-4 pt-0 border-t dark:border-dark-border">
        <h3 className="font-bold text-text-primary dark:text-dark-text-primary text-center line-clamp-2 mb-2 min-h-[3rem]">
          {title}
        </h3>
        
        <p className="text-sm text-text-secondary dark:text-dark-text-secondary text-center line-clamp-3 mb-4 min-h-[4.5rem]">
          {description}
        </p>

        {/* Size Indicator */}
        {sign.size && (
          <div className="flex items-center justify-center gap-1 mb-3">
            <SizeIndicator size={sign.size} />
            <span className="text-xs text-gray-500">
              {sign.size === 'small' ? 'A5' : sign.size === 'large' ? 'A3' : 'A4'}
            </span>
          </div>
        )}

        {/* Matched Activities */}
        {sign.matched_activities.length > 0 && (
          <div className="mb-3">
            <p className="text-xs text-gray-500 mb-2">Used For:</p>
            <div className="flex flex-wrap gap-1 justify-center">
              {sign.matched_activities.slice(0, 3).map(activity => (
                <Badge key={activity} color="blue" size="xs">
                  {activity}
                </Badge>
              ))}
              {sign.matched_activities.length > 3 && (
                <Tooltip content={`${sign.matched_activities.slice(3).join(', ')}`}>
                  <Badge color="gray" size="xs">
                    +{sign.matched_activities.length - 3}
                  </Badge>
                </Tooltip>
              )}
            </div>
          </div>
        )}

        {/* Usage Stats */}
        <div className="flex justify-between items-center text-xs text-gray-500 pt-2 border-t dark:border-dark-border">
          <div className="flex items-center gap-1">
            <DownloadIcon className="w-3 h-3" />
            <span>{sign.downloadCount || 0}</span>
          </div>
          <div className="flex items-center gap-1">
            <EyeIcon className="w-3 h-3" />
            <span>{sign.viewCount || 0}</span>
          </div>
          <div className="flex items-center gap-1">
            <CalendarIcon className="w-3 h-3" />
            <span>{new Date(sign.lastUsed || sign.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
    </Card>
  );
};

const SignQuickView: React.FC<{
  sign: Sign;
  isOpen: boolean;
  onClose: () => void;
  onDownload: (format: string) => void;
}> = ({ sign, isOpen, onClose, onDownload }) => {
  const { language, activeOrg } = useAppContext();
  const config = signageConfig[sign.category];
  
  const title = sign.title[language] || sign.title[activeOrg.primaryLanguage] || sign.title['en'];
  const description = sign.description[language] || sign.description[activeOrg.primaryLanguage] || sign.description['en'];

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <div className="p-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-bold">{title}</h2>
            <p className="text-gray-600 dark:text-gray-400">{description}</p>
          </div>
          <Badge color={config.color || 'gray'}>{sign.category}</Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Sign Preview */}
          <div className="flex flex-col items-center justify-center">
            <div className="mb-8">
              <PrintableSign sign={sign} />
            </div>
            <div className="flex gap-3">
              {['PNG', 'PDF', 'SVG', 'JPG'].map(format => (
                <Button
                  key={format}
                  onClick={() => onDownload(format)}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <DownloadIcon className="w-4 h-4" />
                  Download {format}
                </Button>
              ))}
            </div>
          </div>

          {/* Sign Details */}
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold mb-2">Specifications</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Size</p>
                  <p className="font-medium">{sign.size || 'Medium'} ({sign.size === 'small' ? 'A5' : sign.size === 'large' ? 'A3' : 'A4'})</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Category</p>
                  <p className="font-medium">{sign.category}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Format</p>
                  <p className="font-medium">Vector (Scalable)</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Last Updated</p>
                  <p className="font-medium">{new Date(sign.updatedAt).toLocaleDateString()}</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Compatible Activities</h3>
              <div className="flex flex-wrap gap-2">
                {sign.matched_activities.map(activity => (
                  <Badge key={activity} color="blue">{activity}</Badge>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Safety Standards</h3>
              <ul className="space-y-1 text-sm">
                <li className="flex items-center gap-2">
                  <CheckCircleIcon className="w-4 h-4 text-green-500" />
                  ISO 7010 compliant
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircleIcon className="w-4 h-4 text-green-500" />
                  ANSI Z535 compliant
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircleIcon className="w-4 h-4 text-green-500" />
                  OSHA compliant
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Usage Statistics</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <p className="text-2xl font-bold">{sign.downloadCount || 0}</p>
                  <p className="text-xs text-gray-500">Downloads</p>
                </div>
                <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <p className="text-2xl font-bold">{sign.viewCount || 0}</p>
                  <p className="text-xs text-gray-500">Views</p>
                </div>
                <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <p className="text-2xl font-bold">
                    {sign.lastUsed ? new Date(sign.lastUsed).toLocaleDateString() : 'Never'}
                  </p>
                  <p className="text-xs text-gray-500">Last Used</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

const SizeIndicator: React.FC<{ size: 'small' | 'medium' | 'large' }> = ({ size }) => {
  const getSizeIcon = () => {
    switch(size) {
      case 'small': return 'S';
      case 'medium': return 'M';
      case 'large': return 'L';
      default: return 'M';
    }
  };

  const getSizeColor = () => {
    switch(size) {
      case 'small': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'medium': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'large': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  return (
    <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${getSizeColor()}`}>
      {getSizeIcon()}
    </span>
  );
};

export const Signage: React.FC<SignageProps> = () => {
  const { signs, isLoading, user } = useDataContext();
  const { activeOrg } = useAppContext();
  
  const [filters, setFilters] = useState<SignFilterState>({
    category: 'All',
    activity: 'All',
    size: 'all',
    color: 'all',
    searchQuery: '',
    favoritesOnly: false,
    recentlyUsed: false,
  });

  const [signsToPrint, setSignsToPrint] = useState<Sign[] | null>(null);
  const [selectedSigns, setSelectedSigns] = useState<Set<string>>(new Set());
  const [quickViewSign, setQuickViewSign] = useState<Sign | null>(null);
  const [showBulkDownload, setShowBulkDownload] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [recentlyViewed, setRecentlyViewed] = useState<string[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Initialize favorites from user preferences
  useEffect(() => {
    if (user?.preferences?.favoriteSigns) {
      setFavorites(new Set(user.preferences.favoriteSigns));
    }
  }, [user]);

  // Calculate statistics
  const stats = useMemo<SignStats>(() => {
    const byCategory: Record<string, number> = {};
    const byActivity: Record<string, number> = {};
    
    signs.forEach(sign => {
      byCategory[sign.category] = (byCategory[sign.category] || 0) + 1;
      sign.matched_activities.forEach(activity => {
        byActivity[activity] = (byActivity[activity] || 0) + 1;
      });
    });

    return {
      total: signs.length,
      byCategory,
      byActivity,
      favorites: favorites.size,
      recentlyUsed: recentlyViewed.length,
    };
  }, [signs, favorites, recentlyViewed]);

  // Filter signs based on all criteria
  const filteredSigns = useMemo(() => {
    return signs.filter(sign => {
      // Category filter
      if (filters.category !== 'All' && sign.category !== filters.category) return false;
      
      // Activity filter
      if (filters.activity !== 'All' && !sign.matched_activities.includes(filters.activity as PtwType)) return false;
      
      // Size filter
      if (filters.size !== 'all' && sign.size !== filters.size) return false;
      
      // Color filter
      if (filters.color !== 'all') {
        const config = signageConfig[sign.category];
        if (!config.color.includes(filters.color)) return false;
      }
      
      // Search query
      if (filters.searchQuery) {
        const searchLower = filters.searchQuery.toLowerCase();
        const title = sign.title[activeOrg.primaryLanguage] || sign.title['en'];
        const description = sign.description[activeOrg.primaryLanguage] || sign.description['en'];
        
        if (!title.toLowerCase().includes(searchLower) && 
            !description.toLowerCase().includes(searchLower) &&
            !sign.category.toLowerCase().includes(searchLower)) {
          return false;
        }
      }
      
      // Favorites only
      if (filters.favoritesOnly && !favorites.has(sign.id)) return false;
      
      // Recently used
      if (filters.recentlyUsed && !recentlyViewed.includes(sign.id)) return false;
      
      return true;
    });
  }, [signs, filters, activeOrg.primaryLanguage, favorites, recentlyViewed]);

  // Handle print functionality
  useEffect(() => {
    if (signsToPrint && signsToPrint.length > 0) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Print Signs</title>
              <style>
                @media print {
                  body { margin: 0; }
                  .sign-page {
                    page-break-after: always;
                    height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                  }
                  .sign-page:last-child {
                    page-break-after: auto;
                  }
                }
                @page {
                  size: A4 portrait;
                  margin: 1cm;
                }
              </style>
            </head>
            <body>
              ${signsToPrint.map(sign => {
                const config = signageConfig[sign.category];
                const title = sign.title['en'];
                return `
                  <div class="sign-page">
                    <div style="
                      width: 80%;
                      height: 80%;
                      display: flex;
                      flex-direction: column;
                      align-items: center;
                      justify-content: center;
                      text-align: center;
                      padding: 2rem;
                      background-color: white;
                      border: 2px solid #ccc;
                    ">
                      <div style="font-size: 8rem; margin-bottom: 2rem;">
                        ${sign.icon_url}
                      </div>
                      <h1 style="font-size: 3rem; font-weight: bold; margin-bottom: 1rem;">
                        ${title}
                      </h1>
                      <p style="color: #666; font-size: 1.2rem;">
                        ${sign.description['en']}
                      </p>
                      <div style="margin-top: 2rem; color: #999; font-size: 0.9rem;">
                        Printed from Safety Suite • ${new Date().toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                `;
              }).join('')}
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 500);
      }
      setSignsToPrint(null);
    }
  }, [signsToPrint]);

  const handleQuickView = useCallback((sign: Sign) => {
    setQuickViewSign(sign);
    // Add to recently viewed
    setRecentlyViewed(prev => {
      const filtered = prev.filter(id => id !== sign.id);
      return [sign.id, ...filtered.slice(0, 9)];
    });
  }, []);

  const handleFavoriteToggle = useCallback((signId: string) => {
    setFavorites(prev => {
      const newSet = new Set(prev);
      if (newSet.has(signId)) {
        newSet.delete(signId);
      } else {
        newSet.add(signId);
      }
      
      // Save to user preferences (in a real app, this would be an API call)
      if (user) {
        // updateUserPreferences({ favoriteSigns: Array.from(newSet) });
      }
      
      return newSet;
    });
  }, [user]);

  const handleBulkDownload = useCallback(async (format: 'PNG' | 'PDF' | 'ZIP') => {
    const selected = Array.from(selectedSigns);
    if (selected.length === 0) return;

    setShowBulkDownload(true);
    try {
      // Simulate bulk download
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log(`Bulk downloading ${selected.length} signs as ${format}`);
      
      if (format === 'ZIP') {
        // Generate ZIP file
      } else if (format === 'PDF') {
        // Generate combined PDF
        setSignsToPrint(signs.filter(s => selected.includes(s.id)));
      }
    } finally {
      setShowBulkDownload(false);
      setSelectedSigns(new Set());
    }
  }, [selectedSigns, signs]);

  const resetFilters = useCallback(() => {
    setFilters({
      category: 'All',
      activity: 'All',
      size: 'all',
      color: 'all',
      searchQuery: '',
      favoritesOnly: false,
      recentlyUsed: false,
    });
    setSelectedSigns(new Set());
  }, []);

  const categories = useMemo(() => ['All', ...Object.keys(signageConfig)], []);
  const activities = useMemo(() => ['All', ...Object.keys(ptwTypeDetails)], []);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Printable Signs (hidden) */}
      {signsToPrint && (
        <div id="printable-signs-container" className="hidden print:block">
          {signsToPrint.map(sign => (
            <div key={sign.id} className="print-page">
              <PrintableSign sign={sign} />
            </div>
          ))}
        </div>
      )}

      {/* Quick View Modal */}
      {quickViewSign && (
        <SignQuickView
          sign={quickViewSign}
          isOpen={!!quickViewSign}
          onClose={() => setQuickViewSign(null)}
          onDownload={(format) => console.log(`Download ${format}`)}
        />
      )}

      {/* Bulk Download Dialog */}
      <ConfirmationDialog
        isOpen={showBulkDownload}
        onClose={() => setShowBulkDownload(false)}
        onConfirm={() => handleBulkDownload('PDF')}
        title="Bulk Download"
        message={`Download ${selectedSigns.size} selected signs as PDF?`}
        confirmText="Download"
        isLoading={showBulkDownload}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-text-primary dark:text-dark-text-primary">
            Signage Library
          </h1>
          <p className="text-gray-600 dark:text-dark-text-secondary mt-1">
            {stats.total} safety signs • {stats.favorites} favorites • {signs.length - filteredSigns.length} hidden
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button 
            variant="ghost" 
            onClick={() => setFilters(prev => ({ ...prev, favoritesOnly: !prev.favoritesOnly }))}
            className={filters.favoritesOnly ? 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300' : ''}
          >
            <HeartIcon className={`w-5 h-5 mr-2 ${filters.favoritesOnly ? 'fill-red-500 text-red-500' : ''}`} />
            Favorites ({stats.favorites})
          </Button>
          <Button 
            variant="ghost"
            onClick={handleBulkDownload}
            disabled={selectedSigns.size === 0}
          >
            <DownloadIcon className="w-5 h-5 mr-2" />
            Download Selected ({selectedSigns.size})
          </Button>
          <Button onClick={() => setShowCreateModal(true)}>
            <PlusIcon className="w-5 h-5 mr-2" />
            Create Custom Sign
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <Card className="p-4 text-center hover:shadow-md cursor-pointer" onClick={() => setFilters(prev => ({ ...prev, category: 'All' }))}>
          <div className="text-2xl font-bold text-primary-600">{stats.total}</div>
          <div className="text-sm text-gray-500">Total Signs</div>
        </Card>
        {Object.entries(stats.byCategory).slice(0, 5).map(([category, count]) => (
          <Card 
            key={category} 
            className="p-4 text-center hover:shadow-md cursor-pointer"
            onClick={() => setFilters(prev => ({ ...prev, category }))}
          >
            <div className="text-2xl font-bold" style={{ color: signageConfig[category]?.color || '#666' }}>
              {count}
            </div>
            <div className="text-sm text-gray-500">{category}</div>
          </Card>
        ))}
      </div>

      {/* Filters Card */}
      <Card className="p-6">
        <div className="space-y-6">
          {/* Search Bar */}
          <div>
            <SearchInput
              value={filters.searchQuery}
              onChange={(value) => setFilters(prev => ({ ...prev, searchQuery: value }))}
              placeholder="Search signs by title, description, or category..."
              className="w-full"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Category Filter */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text-secondary mb-2">
                Category
              </label>
              <div className="flex flex-col gap-2 max-h-48 overflow-y-auto p-1">
                <FilterButton 
                  label="All Categories" 
                  value="All" 
                  currentFilter={filters.category} 
                  setFilter={(val) => setFilters(prev => ({ ...prev, category: val }))}
                  count={stats.total}
                />
                {categories.slice(1).map(category => (
                  <FilterButton
                    key={category}
                    label={category}
                    value={category}
                    currentFilter={filters.category}
                    setFilter={(val) => setFilters(prev => ({ ...prev, category: val }))}
                    count={stats.byCategory[category] || 0}
                    icon={signageConfig[category]?.icon}
                  />
                ))}
              </div>
            </div>

            {/* Activity Filter */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text-secondary mb-2">
                Activity / PTW Type
              </label>
              <div className="flex flex-col gap-2 max-h-48 overflow-y-auto p-1">
                <FilterButton 
                  label="All Activities" 
                  value="All" 
                  currentFilter={filters.activity} 
                  setFilter={(val) => setFilters(prev => ({ ...prev, activity: val }))}
                  count={stats.total}
                />
                {activities.slice(1).map(activity => (
                  <FilterButton
                    key={activity}
                    label={activity}
                    value={activity}
                    currentFilter={filters.activity}
                    setFilter={(val) => setFilters(prev => ({ ...prev, activity: val }))}
                    count={stats.byActivity[activity] || 0}
                  />
                ))}
              </div>
            </div>

            {/* Additional Filters */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text-secondary mb-2">
                  Size
                </label>
                <SizeFilter value={filters.size} onChange={(val) => setFilters(prev => ({ ...prev, size: val as any }))} />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text-secondary mb-2">
                  Color
                </label>
                <ColorFilter value={filters.color} onChange={(val) => setFilters(prev => ({ ...prev, color: val }))} />
              </div>

              <div className="flex gap-2 pt-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={resetFilters}
                  className="flex-1"
                >
                  Reset Filters
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setSignsToPrint(filteredSigns)}
                  className="flex-1"
                >
                  Print All ({filteredSigns.length})
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Selection Bar */}
      {selectedSigns.size > 0 && (
        <div className="sticky top-4 z-10 p-4 bg-primary-50 dark:bg-primary-900/20 rounded-lg border border-primary-200 dark:border-primary-800 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="font-medium text-primary-700 dark:text-primary-300">
                {selectedSigns.size} signs selected
              </span>
              <button
                onClick={() => setSelectedSigns(new Set())}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Clear selection
              </button>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="secondary" 
                size="sm"
                onClick={() => handleBulkDownload('PDF')}
                disabled={showBulkDownload}
              >
                {showBulkDownload ? 'Preparing...' : 'Download as PDF'}
              </Button>
              <Button 
                variant="secondary" 
                size="sm"
                onClick={() => handleBulkDownload('ZIP')}
                disabled={showBulkDownload}
              >
                Download as ZIP
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Signs Grid */}
      {filteredSigns.length === 0 ? (
        <EmptyState
          title="No signs found"
          description={filters.searchQuery ? "Try adjusting your search or filters" : "No signs available in the library"}
          actionLabel="Reset Filters"
          onAction={resetFilters}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {filteredSigns.map((sign) => (
              <SignCard 
                key={sign.id}
                sign={sign}
                onFavoriteToggle={handleFavoriteToggle}
                onQuickView={handleQuickView}
                isFavorite={favorites.has(sign.id)}
              />
            ))}
          </div>
          
          {/* Pagination */}
          {filteredSigns.length > 20 && (
            <div className="flex justify-center mt-8">
              <div className="flex gap-2">
                <Button variant="secondary" size="sm">Previous</Button>
                <Button variant="secondary" size="sm" className="bg-primary-600 text-white">1</Button>
                <Button variant="secondary" size="sm">2</Button>
                <Button variant="secondary" size="sm">3</Button>
                <Button variant="secondary" size="sm">Next</Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

// Enhanced PrintableSign Component
const PrintableSign: React.FC<{ sign: Sign }> = ({ sign }) => {
  const { language, activeOrg } = useAppContext();
  const config = signageConfig[sign.category];
  const title = sign.title[language] || sign.title[activeOrg.primaryLanguage] || sign.title['en'];
  const description = sign.description[language] || sign.description[activeOrg.primaryLanguage] || sign.description['en'];

  const renderSignContent = () => (
    <div className="flex flex-col items-center justify-center text-center w-full h-full p-12">
      <div className={`text-[10rem] leading-none ${config.symbolColor || ''} mb-8`}>{sign.icon_url}</div>
      <h1 className={`text-6xl font-bold mb-4 ${config.textColor}`}>{title}</h1>
      {description && (
        <p className={`text-2xl ${config.textColor} opacity-90 max-w-2xl`}>{description}</p>
      )}
      <div className="mt-12 pt-8 border-t border-white/30 w-full">
        <p className="text-lg text-gray-600">
          Safety Sign • {sign.category} • {new Date().toLocaleDateString()}
        </p>
      </div>
    </div>
  );
  
  const getSizeClass = () => {
    switch(sign.size || 'medium') {
      case 'small': return 'w-[420px] h-[594px]'; // A5
      case 'large': return 'w-[841px] h-[1189px]'; // A3
      default: return 'w-[595px] h-[842px]'; // A4
    }
  };

  switch (config.shape) {
    case 'circle':
      return (
        <div className={`relative ${getSizeClass()} rounded-full flex items-center justify-center p-16 ${config.bgColor} border-[20px] ${config.borderColor} shadow-2xl`}>
          {renderSignContent()}
          {config.hasSlash && (
            <div className="absolute w-full h-12 bg-red-600 transform rotate-45 opacity-80"></div>
          )}
        </div>
      );
    case 'triangle':
      return (
        <div className="relative w-[700px] h-[607px] flex items-center justify-center">
          <svg viewBox="0 0 100 87" className="absolute w-full h-full">
            <polygon points="50,0 100,87 0,87" className={`fill-current ${config.bgColor.replace('bg-', 'text-')}`} />
            <polygon points="50,5 95,84 5,84" className="fill-transparent stroke-white stroke-[10]" />
          </svg>
          <div className="z-10 w-full h-full pt-24">{renderSignContent()}</div>
        </div>
      );
    default: // rectangle
      return (
        <div className={`${getSizeClass()} flex items-center justify-center p-8 ${config.bgColor} shadow-2xl rounded-2xl`}>
          {renderSignContent()}
        </div>
      );
  }
};

// Enhanced Icons
const PlusIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
  </svg>
);

const DownloadIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
  </svg>
);

const HeartIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
  </svg>
);

const EyeIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const CalendarIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
  </svg>
);

const CheckCircleIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const PrinterIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" />
  </svg>
);

const FileSizeIcon: React.FC<{ format: string } & React.SVGProps<SVGSVGElement>> = ({ format, ...props }) => {
  const getFileIcon = () => {
    switch(format) {
      case 'png': return '🖼️';
      case 'pdf': return '📄';
      case 'svg': return '🔺';
      case 'jpg': return '📷';
      default: return '📁';
    }
  };

  return <span {...props as any}>{getFileIcon()}</span>;
};

// Add CSS animation
const style = document.createElement('style');
style.textContent = `
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .animate-fadeIn {
    animation: fadeIn 0.2s ease-out;
  }
`;
document.head.appendChild(style);