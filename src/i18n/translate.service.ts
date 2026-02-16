import { Injectable } from '@nestjs/common';
import { UserService } from 'src/user/user.service';
import { translations, Language } from './index';

@Injectable()
export class TranslateService {

    constructor(private readonly userService: UserService) { }

    async translate(userId: number, key: string, params?: Record<string, string | number>): Promise<string> {
        const lang = await this.resolveLanguage(userId);

        const value = this.getNestedValue(translations[lang], key);

        if (!value) {
            return key;
        }

        return this.interpolate(value, params);
    }

    private async resolveLanguage(userId: number | null): Promise<Language> {
        if (!userId) return 'fa';

        const settings = await this.userService.getUserSettings(userId);
        return (settings as any)?.language ?? 'fa'; // TODO
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
