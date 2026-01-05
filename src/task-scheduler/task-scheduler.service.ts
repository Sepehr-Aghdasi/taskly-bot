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
        // Only for Thursday
        cron.schedule('45 12 * * 4', async () => {
            this.telegramService.scheduleDailyReport();
        }, { timezone: this.timeService.IRAN_TZ });

        // Regular days except Fridays and Thursday
        cron.schedule('45 16 * * 0-3-5', async () => {
            this.telegramService.scheduleDailyReport();
        }, { timezone: this.timeService.IRAN_TZ });

        cron.schedule('0 22 * * *', async () => {
            this.telegramService.forceCloseAndNotify();
        }, { timezone: this.timeService.IRAN_TZ });
    }

}
