import { Injectable, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as cron from 'node-cron';
import { TimeService } from 'src/time-service/time.service';
import { TimeBlock } from 'src/shared/configs/time-blocks.type';
import { TelegramService } from 'src/telegram/telegram.service';

@Injectable()
export class TimeBlockSchedulerService implements OnModuleInit {

    private timeBlocks: TimeBlock[];

    constructor(
        private readonly timeService: TimeService,
        private readonly telegramService: TelegramService,
    ) { }

    async onModuleInit() {
        await this.loadTimeBlocks();

        this.scheduleTimeBlocks();
    }

    private async loadTimeBlocks() {
        const filePath = path.join(process.cwd(), 'src/shared/configs/time-blocks.json');
        const raw = await fs.promises.readFile(filePath, 'utf-8');
        this.timeBlocks = JSON.parse(raw) as TimeBlock[];
    }

    private scheduleTimeBlocks() {
        this.timeBlocks.forEach(block => {
            const [hour, minute] = block.startTime.split(':');

            // Days of the week: Sunday 0 to Saturday 6 → Friday (5) excluded
            const cronExpression = `${minute} ${hour} * * 0-4,6`;

            cron.schedule(cronExpression, async () => {
                await this.notifyUsers(block);
            }, { timezone: this.timeService.IRAN_TZ });
        });
    }

    private async notifyUsers(block: TimeBlock) {
        this.telegramService.sendTimeBlockNotification(block);
    }

}
