import { Injectable, OnModuleInit } from '@nestjs/common';
import * as cron from 'node-cron';
import { UserService } from 'src/user/user.service';
import { TelegramService } from 'src/telegram/telegram.service';

@Injectable()
export class TaskSchedulerService implements OnModuleInit {

    constructor(
        private userService: UserService,
        private telegramService: TelegramService,
    ) { }

    onModuleInit() {
        this.start();
    }

    start() {
        // Thursday
        cron.schedule('45 12 * * 4', async () => {
            this.telegramService.scheduleDailyReport();
        });

        // Regular days except Fridays
        cron.schedule('45 16 * * 0-3-5', async () => {
            this.telegramService.scheduleDailyReport();
        });

        cron.schedule('0 22 * * *', async () => {
            this.userService.forceCloseAllActiveSessions();
        });
    }

}
