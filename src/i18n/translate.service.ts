import { Injectable, OnModuleInit } from '@nestjs/common';
import { UserService } from 'src/user/user.service';
import { Language, translations } from './locales';

@Injectable()
export class TranslateService implements OnModuleInit {

    private userLanguages = new Map<number, string>(); // cache user languages
    private loadingLanguages = new Map<number, Promise<string>>(); // prevent race conditions

    constructor(private readonly userService: UserService) { }

    async onModuleInit() {
        const users = await this.userService.getAllUsers();

        for (const user of users) {
            if (user.userSettings?.language) {
                this.userLanguages.set(user.id, user.userSettings.language);
            }
        }
    }

    translate(userId: number, key: string, params?: Record<string, string | number>): string {
        const lang = this.userLanguages.get(userId) || 'en';
        const value = this.getNestedValue(translations[lang], key);
        if (!value) return key;

        return this.interpolate(value, params);
    }

    // Load user language from DB if not cached
    async loadUserLanguage(userId: number): Promise<void> {
        if (this.userLanguages.has(userId)) return;

        // Prevent multiple simultaneous DB requests
        if (this.loadingLanguages.has(userId)) {
            await this.loadingLanguages.get(userId);
            return;
        }

        const promise = this.userService.getUserSettings(userId)
            .then(settings => {
                const lang = settings.language;
                this.userLanguages.set(userId, lang);
                return lang;
            })
            .finally(() => {
                this.loadingLanguages.delete(userId);
            });

        this.loadingLanguages.set(userId, promise);
        await promise;
    }

    setUserLanguage(userId: number, lang: string) {
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

const supportedLanguages: Readonly<{ code: Language; label: string; emoji: string }[]> = [
    { code: 'fa', label: '🇮🇷 فارسی', emoji: '🇮🇷' },
    { code: 'en', label: '🇬🇧 English', emoji: '🇬🇧' },
    { code: 'de', label: '🇩🇪 Deutsch', emoji: '🇩🇪' },
    { code: 'nl', label: '🇳🇱 Nederlands', emoji: '🇳🇱' },
    { code: 'fr', label: '🇫🇷 Français', emoji: '🇫🇷' },
    { code: 'es', label: '🇪🇸 Español', emoji: '🇪🇸' },
    { code: 'it', label: '🇮🇹 Italiano', emoji: '🇮🇹' },
];
