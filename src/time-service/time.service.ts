import { Injectable } from '@nestjs/common';

@Injectable()
export class TimeService {

    public readonly IRAN_TZ = "Asia/Tehran";

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
        return date.toLocaleTimeString("en-US", {
            timeZone: this.IRAN_TZ,
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
        });
    }

    // Difference in minutes based on Iran time
    diffMinutes(from: Date, to: Date): number {
        const msDiff = to.getTime() - from.getTime();
        return Math.round(msDiff / 60000);
    }

    getIranDayRange() {
        const now = new Date();

        // Get Iran time parts safely
        const iranDateParts = new Intl.DateTimeFormat('en-US', {
            timeZone: 'Asia/Tehran',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour12: false,
        }).formatToParts(now);

        const year = Number(iranDateParts.find(p => p.type === 'year')!.value);
        const month = Number(iranDateParts.find(p => p.type === 'month')!.value);
        const day = Number(iranDateParts.find(p => p.type === 'day')!.value);

        // Build UTC range that represents Iran day
        const startOfDay = new Date(Date.UTC(year, month - 1, day, -3, -30, 0, 0));
        const endOfDay = new Date(Date.UTC(year, month - 1, day, 20, 29, 59, 999));

        return { startOfDay, endOfDay };
    }

}
