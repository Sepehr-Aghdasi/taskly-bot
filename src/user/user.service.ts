import { Injectable } from '@nestjs/common';
import { Task } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateOrUpdateUserDto } from './dto/create-or-update-user.dto';

@Injectable()
export class UserService {

    constructor(private prisma: PrismaService) { }

    async getAllUsers() {
        return this.prisma.user.findMany();
    }

    async getOrCreateUser(telegramId: string, data?: CreateOrUpdateUserDto) {
        let user = await this.prisma.user.findUnique({
            where: { telegramId },
        });

        if (!user) {
            user = await this.prisma.user.create({
                data: {
                    telegramId,
                    username: data?.username,
                    firstName: data?.firstName,
                    lastName: data?.lastName,
                },
            });
        } else {
            if (!user.firstName || !user.lastName) {
                user = await this.prisma.user.update({
                    where: { telegramId },
                    data: {
                        firstName: user.firstName ?? data?.firstName,
                        lastName: user.lastName ?? data?.lastName,
                    },
                });
            }
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

    async deleteTask(taskId: number) {
        await this.prisma.task.delete({ where: { id: taskId } });
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
                task: {
                    include: {
                        user: true,
                    },
                },
            },
        });

        const now = new Date();
        const closedSessions: {
            telegramId: string;
            taskName: string;
            taskCode: string;
        }[] = [];

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

            closedSessions.push({
                telegramId: session.task.user.telegramId,
                taskName: session.task.name,
                taskCode: session.task.code,
            });
        }

        return closedSessions;
    }

    async updateTask(taskId: number, newName: string, newCode: string) {
        const existing = await this.prisma.task.findFirst({
            where: {
                code: newCode,
                NOT: { id: taskId },
            },
        });

        if (existing) {
            return {
                task: null,
                alreadyExists: true,
            };
        }

        const task = await this.prisma.task.update({
            where: { id: taskId },
            data: {
                name: newName,
                code: newCode,
            },
        });

        return {
            task,
            alreadyExists: false,
        };
    }

}
