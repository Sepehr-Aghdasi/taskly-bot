import { Injectable } from '@nestjs/common';
import { Task, UserSettings } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { TaskWithSessions } from 'src/shared/task.type';
import { TimeService } from 'src/time-service/time.service';
import { UserSettingsFactory } from './user-settings-factory';
import { UpdateUserSettingsDto } from './dto/update-user-settings.dto';
import { CreateOrUpdateUserDto } from './dto/create-or-update-user.dto';

@Injectable()
export class UserService {

    constructor(
        private readonly prisma: PrismaService,
        private readonly timeService: TimeService,
    ) { }

    async getAllUsers() {
        return this.prisma.user.findMany({ include: { userSettings: true } });
    }

    async getOrCreateUser(telegramId: string, data?: CreateOrUpdateUserDto) {
        // Try to find the user first
        let user = await this.prisma.user.findUnique({
            where: { telegramId },
            include: { userSettings: true },
        });

        if (user) {
            return user;
        }

        try {
            user = await this.prisma.user.create({
                data: {
                    telegramId,
                    username: data?.username,
                    firstName: data?.firstName,
                    lastName: data?.lastName,
                    userSettings: { create: UserSettingsFactory.defaultSettings() },
                },
                include: { userSettings: true },
            });
        } catch (err) {
            if (err.code === 'P2002') {
                // Race condition: someone else created the user
                user = await this.prisma.user.findUnique({
                    where: { telegramId },
                    include: { userSettings: true },
                });
            } else {
                throw err;
            }
        }

        return user;
    }

    async findByTelegramId(telegramId: string) {
        return this.prisma.user.findUnique({
            where: { telegramId },
            include: { userSettings: true },
        });
    }

    async getUserSettings(userId: number) {
        return this.prisma.userSettings.findUnique({
            where: { userId }
        });
    }

    async updateUserSettings(userId: number, settings: Partial<UpdateUserSettingsDto>): Promise<UserSettings> {
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

    /**
      * Creates a task for the user if it doesn't already exist today.
      * @returns Object with:
      *   - alreadyExistsToday: true if a task with the same name exists today
      *   - task: the existing or newly created task
    */
    async getOrCreateTask(userId: number, name: string): Promise<{ alreadyExistsToday: boolean; task: Task }> {
        const { startOfDay } = this.timeService.getIranDayRange();

        const existingTask = await this.prisma.task.findFirst({
            where: {
                userId,
                name,
                createdAt: {
                    gte: startOfDay,
                },
            },
        });

        if (existingTask) {
            return { alreadyExistsToday: true, task: existingTask };
        }

        const newTask = await this.prisma.task.create({
            data: { userId, name },
        });

        return { alreadyExistsToday: false, task: newTask };
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

    async deleteTask(taskId: number, userId: number): Promise<number> {
        await this.prisma.task.delete({
            where: { id: taskId },
        });

        const { startOfDay, endOfDay } = this.timeService.getIranDayRange();
        const remainingCount = await this.prisma.task.count({
            where: {
                userId,
                createdAt: {
                    gte: startOfDay,
                    lte: endOfDay,
                },
            },
        });

        return remainingCount;
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

    async getTodayReport(userId: number): Promise<TaskWithSessions[]> {
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
        const closedSessions: { userId: number; telegramId: string; task: Task; }[] = [];

        for (const session of activeSessions) {
            const duration = Math.floor(
                (now.getTime() - session.startTime.getTime()) / 60000
            );

            await this.prisma.taskSession.update({
                where: { id: session.id },
                data: { endTime: now, duration },
            });

            closedSessions.push({
                userId: session.task.userId,
                telegramId: session.task.user.telegramId,
                task: session.task,
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

    async getAllUsersWithFocusAlertsEnabled() {
        return this.prisma.user.findMany({
            where: {
                userSettings: {
                    focusAlerts: true,
                },
            }
        });
    }

}
