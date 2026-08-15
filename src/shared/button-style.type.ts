import { KeyboardButton } from 'node-telegram-bot-api';

export type ButtonStyle = "primary" | "danger" | "success";

export type StyledKeyboardButton = KeyboardButton & { style?: ButtonStyle };
