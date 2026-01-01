import { Injectable } from '@nestjs/common';
import { Task } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class UserService {

    constructor(private prisma: PrismaService) { }

    async getAllUsers() {
        return this.prisma.user.findMany();
    }

    async getOrCreate(telegramId: string, username?: string) {
        let user = await this.prisma.user.findUnique({
            where: { telegramId },
        });

        if (!user) {
            user = await this.prisma.user.create({
                data: { telegramId, username },
            });
        }

        return user;
    }

    async findByTelegramId(telegramId: string) {
        return this.prisma.user.findUnique({ where: { telegramId } });
    }

    async getOrCreateTask(userId: number, name: string, code: string) {
        const existing = await this.prisma.task.findUnique({
            where: { code },
        });

        if (existing) {
            return {
                task: existing,
                alreadyExists: true,
            };
        }

        const task = await this.prisma.task.create({
            data: { userId, name, code },
        });

        return {
            task,
            alreadyExists: false,
        };
    }

    async startTask(userId: number, task: Task) {
        const activeSession = await this.getActiveSession(userId);
        if (activeSession) return activeSession;

        return this.prisma.taskSession.create({
            data: {
                taskId: task.id,
                startTime: new Date(),
            },
            include: {
                task: true,
            },
        });
    }

    async endTask(userId: number) {
        const session = await this.getActiveSession(userId);
        if (!session) return null;

        const endTime = new Date();
        const duration = Math.floor(
            (endTime.getTime() - session.startTime.getTime()) / 60000,
        );

        return this.prisma.taskSession.update({
            where: { id: session.id },
            data: {
                endTime,
                duration,
            },
            include: {
                task: true,
            },
        });
    }

    async startExistingTask(task: Task) {
        const activeSession = await this.getActiveSession(task.userId);
        if (activeSession) return activeSession;

        return this.prisma.taskSession.create({
            data: {
                taskId: task.id,
                startTime: new Date(),
            },
            include: { task: true },
        });
    }

    async getActiveSession(userId: number) {
        return this.prisma.taskSession.findFirst({
            where: {
                endTime: null,
                task: {
                    userId,
                },
            },
            include: {
                task: true,
            },
            orderBy: {
                startTime: 'desc',
            },
        });
    }

    async getTodayReport(userId: number) {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        return this.prisma.task.findMany({
            where: { userId },
            include: {
                sessions: {
                    where: {
                        startTime: {
                            gte: startOfDay,
                            lte: endOfDay,
                        },
                    },
                    orderBy: {
                        startTime: 'asc',
                    },
                },
            },
        });
    }

    async forceCloseAllActiveSessions() {
        const activeSessions = await this.prisma.taskSession.findMany({
            where: {
                endTime: null,
            },
            include: {
                task: true,
            },
        });

        const now = new Date();

        for (const session of activeSessions) {
            const duration = Math.floor(
                (now.getTime() - session.startTime.getTime()) / 60000
            );

            await this.prisma.taskSession.update({
                where: { id: session.id },
                data: {
                    endTime: now,
                    duration,
                },
            });
        }

        return activeSessions;
    }

}
