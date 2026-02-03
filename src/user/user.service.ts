import { Injectable } from '@nestjs/common';
import { Task, UserSettings } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { TimeService } from 'src/time-service/time.service';
import { CreateOrUpdateUserDto } from './dto/create-or-update-user.dto';

@Injectable()
export class UserService {

    constructor(
        private readonly prisma: PrismaService,
        private readonly timeService: TimeService,
    ) { }

    async getAllUsers() {
        return this.prisma.user.findMany({ include: { userSetting: true } });
    }

    async getOrCreateUser(telegramId: string, data?: CreateOrUpdateUserDto) {
        const user = await this.prisma.user.upsert({
            where: { telegramId },
            create: {
                telegramId,
                username: data?.username,
                firstName: data?.firstName,
                lastName: data?.lastName,
                userSetting: {
                    create: { reminder: true },
                },
            },
            update: {
                firstName: data?.firstName ?? undefined,
                lastName: data?.lastName ?? undefined,
            },
            include: { userSetting: true },
        });

        return user;
    }

    async findByTelegramId(telegramId: string) {
        return this.prisma.user.findUnique({
            where: { telegramId },
            include: { userSetting: true },
        });
    }

    async getUserSettings(userId: number) {
        return this.prisma.userSettings.findUnique({
            where: { userId }
        });
    }

    async updateUserSettings(userId: number, settings: Partial<{ reminder: boolean }>): Promise<UserSettings> {
        const existing = await this.prisma.userSettings.findUnique({
            where: { userId },
        });

        if (!existing) {
            return this.prisma.userSettings.create({
                data: {
                    userId,
                    ...settings,
                },
            });
        }

        return this.prisma.userSettings.update({
            where: { userId },
            data: {
                ...settings,
            },
        });
    }

    async getOrCreateTask(userId: number, name: string) {
        const existing = await this.prisma.task.findFirst({
            where: { userId, name },
        });

        if (existing) {
            return existing;
        }

        const task = await this.prisma.task.create({
            data: { userId, name },
        });

        return task;
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
        const duration = this.timeService.diffMinutes(session.startTime, endTime);

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

    async deleteTask(taskId: number) {
        await this.prisma.task.delete({ where: { id: taskId } });
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
        const { startOfDay, endOfDay } = this.timeService.getIranDayRange();

        return this.prisma.task.findMany({
            where: {
                userId,
                createdAt: {
                    gte: startOfDay,
                    lte: endOfDay,
                },
            },
            include: {
                sessions: {
                    orderBy: {
                        startTime: 'asc',
                    },
                },
            },
        });
    }

    async forceCloseAllActiveSessions() {
        const activeSessions = await this.prisma.taskSession.findMany({
            where: { endTime: null },
            include: {
                task: {
                    include: { user: true },
                },
            },
        });

        const now = this.timeService.nowUTC();
        const closedSessions: { telegramId: string; taskName: string }[] = [];

        for (const session of activeSessions) {
            const duration = Math.floor(
                (now.getTime() - session.startTime.getTime()) / 60000
            );

            await this.prisma.taskSession.update({
                where: { id: session.id },
                data: { endTime: now, duration },
            });

            closedSessions.push({
                telegramId: session.task.user.telegramId,
                taskName: session.task.name,
            });
        }

        return closedSessions;
    }

    async updateTask(taskId: number, newName: string): Promise<Task | null> {
        const existing = await this.prisma.task.findFirst({
            where: {
                name: newName,
                NOT: { id: taskId },
            },
        });

        if (existing) {
            return null;
        }

        const task = await this.prisma.task.update({
            where: { id: taskId },
            data: { name: newName },
        });

        return task;
    }
}
