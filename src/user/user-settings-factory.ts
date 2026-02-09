import { UserSettings } from "@prisma/client";

export class UserSettingsFactory {

    static defaultSettings(): Omit<UserSettings, "id" | "userId" | "createdAt" | "updatedAt"> {
        return { reminder: true, focusAlerts: false };
    }

}
