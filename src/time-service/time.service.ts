import { Injectable } from "@nestjs/common";



@Injectable()
export class TimeService {
    public readonly IRAN_TZ = "Asia/Tehran";

    private readonly MS_PER_MINUTE = 60_000;
    private readonly MS_PER_HOUR = 60 * this.MS_PER_MINUTE;
    private readonly MS_PER_DAY = 24 * this.MS_PER_HOUR;
    private readonly ONE_MS = 1;

    nowUTC(): Date {
        return new Date();
    }

    getIranHour(): number {
        return this.getIranParts(new Date()).hour;
    }

    formatIranTime(date: Date): string {
        return date.toLocaleTimeString("en-US", {
            timeZone: this.IRAN_TZ,
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
        });
    }

    diffMinutes(from: Date, to: Date): number {
        return Math.round((to.getTime() - from.getTime()) / this.MS_PER_MINUTE);
    }

    /**
     * Start and end of "today" in Iran time, expressed as real UTC Dates.
     */
    getIranDayRange(): { startOfDay: Date; endOfDay: Date } {
        const now = new Date();
        const { year, month, day } = this.getIranParts(now);

        // "Iran midnight" expressed in UTC = UTC midnight of the same Y/M/D,
        // shifted by however far Iran's clock currently is from UTC.
        const offsetMs = this.getIranOffsetMs(now);
        const startOfDay = new Date(Date.UTC(year, month - 1, day) - offsetMs);
        const endOfDay = new Date(startOfDay.getTime() + this.MS_PER_DAY - this.ONE_MS);

        return { startOfDay, endOfDay };
    }

    /** Breaks a Date into Iran-local Y/M/D/hour, as numbers. */
    private getIranParts(date: Date): { year: number; month: number; day: number; hour: number } {
        const parts = new Intl.DateTimeFormat("en-US", {
            timeZone: this.IRAN_TZ,
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            hour12: false,
        }).formatToParts(date);

        const get = (type: string): number => Number(parts.find((p) => p.type === type)!.value);

        return { year: get("year"), month: get("month"), day: get("day"), hour: get("hour") };
    }

    /** How far Iran's local clock is ahead of UTC right now, in milliseconds. */
    private getIranOffsetMs(date: Date): number {
        // Format the instant as if Iran's wall-clock reading were itself UTC,
        // then compare it to the real UTC instant — the gap is the offset.
        const iranAsUTC = new Date(date.toLocaleString("en-US", { timeZone: this.IRAN_TZ }));
        return iranAsUTC.getTime() - date.getTime();
    }
}
