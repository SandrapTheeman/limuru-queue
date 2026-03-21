'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Globe, Check, ChevronDown } from 'lucide-react';

type Language = 'en' | 'sw';

interface LanguageOption {
  code: Language;
  name: string;
  nativeName: string;
  flag: string;
}

const languages: LanguageOption[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
  { code: 'sw', name: 'Swahili', nativeName: 'Kiswahili', flag: '🇰🇪' },
];

interface LanguageSwitcherProps {
  variant?: 'dropdown' | 'inline';
  className?: string;
  onLanguageChange?: (lang: Language) => void;
}

function getStoredLanguage(): Language {
  if (typeof window === 'undefined') return 'en';
  return (localStorage.getItem('hospital_language') as Language) || 'en';
}

export function LanguageSwitcher({
  variant = 'dropdown',
  className = '',
  onLanguageChange,
}: LanguageSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentLang, setCurrentLang] = useState<Language>('en');
  const [mounted, setMounted] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    setCurrentLang(getStoredLanguage());
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEscape);
    }
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  const handleLanguageSelect = (lang: Language) => {
    setCurrentLang(lang);
    localStorage.setItem('hospital_language', lang);
    onLanguageChange?.(lang);
    setIsOpen(false);
  };

  const currentLanguage = languages.find((l) => l.code === currentLang) || languages[0];

  if (!mounted) {
    return (
      <button className={`p-2 rounded-lg ${className}`} aria-label="Select language">
        <Globe className="w-5 h-5" />
      </button>
    );
  }

  if (variant === 'inline') {
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        {languages.map((lang) => (
          <button
            key={lang.code}
            onClick={() => handleLanguageSelect(lang.code)}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              currentLang === lang.code
                ? 'bg-primary-500 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {lang.flag} {lang.code.toUpperCase()}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg shadow-sm transition-colors"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <Globe className="w-4 h-4 text-gray-500" />
        <span className="text-sm font-medium text-gray-700">{currentLanguage.flag}</span>
        <span className="text-sm text-gray-600">{currentLanguage.code.toUpperCase()}</span>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div
            role="listbox"
            className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20 animate-fade-in"
          >
            {languages.map((lang) => (
              <button
                key={lang.code}
                role="option"
                aria-selected={currentLang === lang.code}
                onClick={() => handleLanguageSelect(lang.code)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                  currentLang === lang.code
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span className="text-xl">{lang.flag}</span>
                <div className="flex-1">
                  <p className="font-medium">{lang.name}</p>
                  <p className="text-xs text-gray-500">{lang.nativeName}</p>
                </div>
                {currentLang === lang.code && <Check className="w-4 h-4 text-primary-500" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

type TranslationCategory = {
  en: string;
  sw: string;
};

type Translations = Record<string, TranslationCategory>;

const translations: Translations = {
  'common.submit': { en: 'Submit', sw: 'Wasilisha' },
  'common.cancel': { en: 'Cancel', sw: 'Ghairi' },
  'common.save': { en: 'Save', sw: 'Hifadhi' },
  'common.search': { en: 'Search', sw: 'Tafuta' },
  'common.loading': { en: 'Loading...', sw: 'Inapakia...' },
  'common.close': { en: 'Close', sw: 'Funga' },
  'auth.login': { en: 'Login', sw: 'Ingia' },
  'auth.logout': { en: 'Logout', sw: 'Toka' },
  'auth.register': { en: 'Register', sw: 'Sajili' },
  'queue.yourTurn': { en: "It's your turn!", sw: 'Ni change yako!' },
  'queue.waiting': { en: 'Waiting...', sw: 'Inasubiri...' },
  'queue.position': { en: 'Position', sw: 'Nafasi' },
  'queue.called': { en: 'Called', sw: 'Imeitwa' },
  'queue.inProgress': { en: 'In Progress', sw: 'Inaendelea' },
  'queue.completed': { en: 'Completed', sw: 'Imekamilika' },
  'reception.registerPatient': { en: 'Register Patient', sw: 'Sajili Mgonjwa' },
  'reception.addToQueue': { en: 'Add to Queue', sw: 'Ongeza kwenye foleni' },
  'reception.transfer': { en: 'Transfer', sw: 'Hamisha' },
  'reception.call': { en: 'Call', sw: 'Ita' },
  'doctor.startConsultation': { en: 'Start Consultation', sw: 'Anza Mashauriano' },
  'doctor.completeVisit': { en: 'Complete Visit', sw: 'Maliza Ziara' },
  'doctor.noShow': { en: 'No Show', sw: 'Hajafika' },
  'doctor.emergency': { en: 'Emergency', sw: 'Dharura' },
};

export function useTranslation() {
  const [lang, setLang] = useState<Language>('en');

  useEffect(() => {
    setLang(getStoredLanguage());
  }, []);

  const t = (key: string): string => {
    return translations[key]?.[lang] || key;
  };

  return { t, lang, setLang };
}
