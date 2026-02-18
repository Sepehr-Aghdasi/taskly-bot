import { Injectable } from '@nestjs/common';
import { en } from './en';
import { fa } from './fa';

@Injectable()
export class TranslateService {

    // Cache user language
    private userLanguages = new Map<number, Language>();

    constructor() { }

    translate(userId: number, key: string, params?: Record<string, string | number>): string {
        const lang = this.userLanguages.get(userId) || 'en';
        const value = this.getNestedValue(translations[lang], key);
        if (!value) return key;

        return this.interpolate(value, params);
    }

    setUserLanguage(userId: number, lang: Language) {
        this.userLanguages.set(userId, lang);
    }

    getSupportedLanguages() {
        return structuredClone(supportedLanguages);
    }

    private getNestedValue(obj: any, path: string): string | null {
        return path.split('.').reduce((acc, part) => acc?.[part], obj) || null;
    }

    private interpolate(text: string, params?: Record<string, string | number>): string {
        if (!params) return text;
        return text.replace(/{{(\w+)}}/g, (_, key) =>
            params[key] !== undefined ? String(params[key]) : `{{${key}}}`
        );
    }

}

const supportedLanguages: { code: Language; label: string; emoji: string; }[] = [
    { code: 'fa', label: '🇮🇷 فارسی', emoji: '🇮🇷' },
    { code: 'en', label: '🇬🇧 English', emoji: '🇬🇧' },
];

const translations = {
    en,
    fa,
};

type Language = keyof typeof translations;
