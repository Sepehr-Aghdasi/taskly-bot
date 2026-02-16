import { Injectable } from '@nestjs/common';

@Injectable()
export class TimeService {
    public readonly IRAN_TZ = 'Asia/Tehran';

    // Current time in UTC
    nowUTC(): Date {
        return new Date();
    }

    // Current Iran hour (business logic safe)
    getIranHour(): number {
        const parts = new Intl.DateTimeFormat('en-US', {
            timeZone: this.IRAN_TZ,
            hour12: false,
            hour: '2-digit',
        }).formatToParts(new Date());

        return Number(parts.find(p => p.type === 'hour')?.value ?? 0);
    }

    /** Format a Date object to Iran time string HH:mm */
    formatIranTime(date: Date): string {
        return date.toLocaleTimeString("en-US", {
            timeZone: this.IRAN_TZ,
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
        });
    }

    /** Difference in minutes between two dates */
    diffMinutes(from: Date, to: Date): number {
        const msDiff = to.getTime() - from.getTime();
        return Math.round(msDiff / 60000);
    }

    /**
     * Get start and end of the current day in Iran timezone
     * Returns { startOfDay, endOfDay } as UTC Dates
     */
    getIranDayRange() {
        const now = new Date();

        // Extract Iran date parts safely
        const parts = new Intl.DateTimeFormat('en-US', {
            timeZone: this.IRAN_TZ,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour12: false,
        }).formatToParts(now);

        const year = Number(parts.find(p => p.type === 'year')!.value);
        const month = Number(parts.find(p => p.type === 'month')!.value);
        const day = Number(parts.find(p => p.type === 'day')!.value);

        // Construct UTC dates that correspond to Iran start/end of day
        const startOfDay = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
        const endOfDay = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));

        return { startOfDay, endOfDay };
    }
}
