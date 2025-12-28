import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class UserService {

    constructor(private prisma: PrismaService) { }

    async getOrCreate(telegramId: string, username: string) {
        let user = await this.prisma.user.findUnique({ where: { telegramId } });
        if (!user) {
            user = await this.prisma.user.create({ data: { telegramId, username } });
        }
        return user;
    }

    async findByTelegramId(telegramId: string) {
        return this.prisma.user.findUnique({ where: { telegramId } });
    }

    async addTask(userId: number, name: string) {
        return this.prisma.task.create({
            data: { userId, name, startTime: new Date() },
        });
    }

    // async endTask(userId: number) {
    //     const task = await this.prisma.task.findFirst({
    //         where: { userId, endTime: null },
    //         orderBy: { startTime: 'desc' },
    //     });

    //     if (!task) return null;

    //     const endTime = new Date();
    //     const duration = Math.floor((endTime.getTime() - task.startTime.getTime()) / 60000);

    //     return this.prisma.task.update({
    //         where: { id: task.id },
    //         data: { endTime, duration },
    //     });
    // }

    async endTask(userId: number) {
        const task = await this.prisma.task.findFirst({
            where: {
                userId,
                endTime: null, // فقط همین کافی است
            },
            orderBy: {
                startTime: 'desc',
            },
        });

        if (!task) return null;

        const endTime = new Date();
        const duration = Math.floor(
            (endTime.getTime() - task.startTime.getTime()) / 60000
        );

        return this.prisma.task.update({
            where: { id: task.id },
            data: {
                endTime,
                duration: (task.duration ?? 0) + duration,
            },
        });
    }


    async getTasksToday(userId: number) {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        return this.prisma.task.findMany({
            where: {
                userId,
                startTime: {
                    gte: startOfDay,
                    lte: endOfDay,
                },
            },
            orderBy: { startTime: 'asc' },
        });
    }

    async getAllUsers() {
        return this.prisma.user.findMany();
    }

    async getActiveTask(userId: number) {
        return this.prisma.task.findFirst({
            where: {
                userId,
                endTime: null,
            },
            orderBy: {
                startTime: 'desc',
            },
        });
    }

    // شروع دوباره یک تسک موجود
    // async startTask(userId: number, taskId: number) {
    //     const task = await this.prisma.task.findFirst({
    //         where: {
    //             id: taskId,
    //             userId,
    //         },
    //     });

    //     if (!task) throw new Error('تسک پیدا نشد');

    //     // اگر تسک قبلاً پایان یافته بود، می‌توانیم یک رکورد جدید بسازیم یا endTime را پاک کنیم
    //     if (task.endTime) {
    //         const newTask = await this.prisma.task.create({
    //             data: {
    //                 name: task.name,
    //                 userId,
    //                 startTime: new Date(),
    //             },
    //         });
    //         return newTask;
    //     } else {
    //         // اگر تسک هنوز باز است، می‌توانیم چیزی تغییر ندهیم یا زمان شروع جدید ثبت کنیم
    //         return task;
    //     }
    // }

    async startTask(userId: number, taskId: number) {
        const task = await this.prisma.task.findFirst({
            where: {
                id: taskId,
                userId,
            },
        });

        if (!task) {
            throw new Error('Task not found');
        }

        // اگر همین الان فعاله، دوباره شروعش نکن
        if (task.startTime && !task.endTime) {
            return task;
        }

        return this.prisma.task.update({
            where: { id: task.id },
            data: {
                startTime: new Date(),
                endTime: null,
                // ❗ duration دست نمی‌خوره
            },
        });
    }

}
