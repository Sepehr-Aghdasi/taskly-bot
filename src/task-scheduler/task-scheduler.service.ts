import { Injectable, OnModuleInit } from '@nestjs/common';
import * as cron from 'node-cron';
import { TimeService } from 'src/time-service/time.service';
import { TelegramService } from 'src/telegram/telegram.service';

@Injectable()
export class TaskSchedulerService implements OnModuleInit {

    constructor(
        private readonly timeService: TimeService,
        private readonly telegramService: TelegramService,
    ) { }

    onModuleInit() {
        this.start();
    }

    start() {
        // Only for Thursday 12:45
        cron.schedule('45 12 * * 4', async () => {
            await this.telegramService.scheduleDailyReport();
        }, { timezone: this.timeService.IRAN_TZ });

        // Morning reminder, every day except Thursday & Friday 9:30
        cron.schedule('30 9 * * 0-3,6', async () => {
            await this.telegramService.scheduleMorningReminder();
        }, { timezone: this.timeService.IRAN_TZ });

        // Regular daily report, every day except Thursday & Friday 16:45
        cron.schedule('45 16 * * 0-3,6', async () => {
            await this.telegramService.scheduleDailyReport();
        }, { timezone: this.timeService.IRAN_TZ });

        // Force-close tasks and notify user, every day 22:00
        cron.schedule('0 22 * * *', async () => {
            await this.telegramService.forceCloseAndNotify();
        }, { timezone: this.timeService.IRAN_TZ });
    }

}
