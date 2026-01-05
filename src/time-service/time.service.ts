// time.service.ts
import { Injectable } from '@nestjs/common';

@Injectable()
export class TimeService {
    private readonly IRAN_TZ = "Asia/Tehran";

    // Current time in UTC
    nowUTC(): Date {
        return new Date();
    }

    // Current Iran hour (business logic safe)
    getIranHour(): number {
        const iranTime = new Date(
            new Date().toLocaleString("en-US", { timeZone: this.IRAN_TZ })
        );
        return iranTime.getHours();
    }

    // Format time for messages (UI layer)
    formatIranTime(date: Date): string {
        return date.toLocaleTimeString("en-GB", {
            timeZone: this.IRAN_TZ,
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
        });
    }

    // Difference in minutes based on Iran time
    diffMinutes(from: Date, to: Date): number {
        const fromIran = new Date(
            from.toLocaleString('en-US', { timeZone: this.IRAN_TZ })
        );

        const toIran = new Date(
            to.toLocaleString('en-US', { timeZone: this.IRAN_TZ })
        );

        return Math.floor((toIran.getTime() - fromIran.getTime()) / 60000);
    }

    getIranDayRange() {
        const nowIran = new Date(
            new Date().toLocaleString('en-US', { timeZone: 'Asia/Tehran' })
        );

        const startOfDay = new Date(nowIran);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(nowIran);
        endOfDay.setHours(23, 59, 59, 999);

        return { startOfDay, endOfDay };
    }
}
