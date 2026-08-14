import { fa } from './fa';
import { en } from './en';
import { de } from './de';
import { nl } from './nl';
import { fr } from './fr';
import { es } from './es';
import { it } from './it';

export const translations = {
    en,
    fa,
    de,
    nl,
    fr,
    es,
    it,
};

export type Language = keyof typeof translations;
