import * as cron from 'node-cron';
import { PrismaService } from 'src/prisma/prisma.service';

export class TaskScheduler {
    constructor(private prisma: PrismaService) { }

    start() {
        // هر شب ساعت 22:00
        cron.schedule('0 22 * * *', async () => {
            const now = new Date();
            const tasks = await this.prisma.task.findMany({
                where: {
                    endTime: null,
                    startTime: {
                        lte: now
                    }
                }
            });

            for (const task of tasks) {
                const endTime = new Date();
                endTime.setHours(22, 0, 0, 0);
                const duration = Math.floor((endTime.getTime() - task.startTime.getTime()) / 60000);
                await this.prisma.task.update({
                    where: { id: task.id },
                    data: { endTime, duration }
                });
            }

            console.log(`✅ تسک‌های باز تا ساعت 22 بسته شدند: ${tasks.length}`);
        });
    }
}
