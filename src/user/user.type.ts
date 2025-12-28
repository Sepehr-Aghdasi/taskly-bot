export interface UserModel {
    id: number;
    telegramId: string;
    username?: string;
    timezone: string;
    createdAt: Date;
}