import { en } from './en';
import { fa } from './fa';

export const translations = {
    en,
    fa,
};

export type Language = keyof typeof translations;
