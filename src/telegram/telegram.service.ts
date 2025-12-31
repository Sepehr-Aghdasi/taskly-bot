import { Injectable, OnModuleInit } from '@nestjs/common';
import TelegramBot, { KeyboardButton } from 'node-telegram-bot-api';
import { UserService } from 'src/user/user.service';
import * as cron from 'node-cron';

type UserState = "IDLE" | "AddingTask" | "DeletingTask";

@Injectable()
export class TelegramService implements OnModuleInit {
    private bot: TelegramBot;
    private userState = new Map<number, UserState>();

    constructor(private readonly userService: UserService) { }

    onModuleInit() {
        this.bot = new TelegramBot(process.env.TELEGRAM_TOKEN!, { polling: true });

        this.handleStart();

        this.handleAddTask();

        this.handleEndTask()

        this.bot.onText(/^\/report$/, async (msg) => {
            const chatId = msg.chat.id;
            const telegramId = msg.from.id.toString();
            const user = await this.userService.findByTelegramId(telegramId);
            if (!user) {
                this.bot.sendMessage(chatId, 'اول باید /start بزنی!');
                return;
            }

            await this.sendReport(chatId, user.id);
        });

        this.handleMessages();

        this.scheduleDailyReport();
    }

    private scheduleDailyReport() {
        // هر روز ساعت 16:45
        cron.schedule('45 16 * * *', async () => {
            const users = await this.userService.getAllUsers(); // همه کاربران ثبت شده

            for (const user of users) {
                const tasks = await this.userService.getTasksToday(user.id);

                let reportText = '📊 گزارش امروز (خودکار):\n';
                let totalMinutes = 0;

                tasks.forEach((t) => {
                    const start = t.startTime;
                    if (t.endTime) {
                        const end = t.endTime;
                        const duration = t.duration ?? Math.floor((end.getTime() - start.getTime()) / 60000);
                        const startStr = start.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
                        const endStr = end.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
                        reportText += `- ${t.name}: ${duration} دقیقه (از ${startStr} تا ${endStr})\n`;
                        totalMinutes += duration;
                    } else {
                        const startStr = start.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
                        reportText += `- ${t.name}: ⏳ هنوز پایان نیافته (شروع: ${startStr})\n`;
                    }
                });

                const totalHours = Math.floor(totalMinutes / 60);
                const totalMins = totalMinutes % 60;
                reportText += `\n⏱ مجموع: ${totalMinutes} دقیقه (${totalHours} ساعت و ${totalMins} دقیقه)`;

                // ارسال پیام به کاربر
                this.bot.sendMessage(user.telegramId, reportText);
            }
        });
    }

    private async sendMenu(
        chatId: number,
        userId: number,
        text = 'منوی اصلی'
    ) {
        const activeTask = await this.userService.getActiveTask(userId);

        let keyboard: KeyboardButton[][];

        if (activeTask) {
            keyboard = [
                [{ text: '🔚 پایان تسک' }],
                [{ text: '📊 گزارش امروز' }],
                [{ text: '📋 لیست تسک‌ها' }],
                [{ text: '🗑 حذف تسک' }],
            ];
        } else {
            keyboard = [
                [{ text: '➕ افزودن تسک' }],
                [{ text: '📊 گزارش امروز' }],
                [{ text: '📋 لیست تسک‌ها' }],
                [{ text: '🗑 حذف تسک' }],
            ];
        }

        await this.bot.sendMessage(chatId, text, {
            reply_markup: {
                keyboard,
                resize_keyboard: true,
            },
        });
    }

    private handleStart() {
        this.bot.onText(/\/start/, async (msg) => {
            const chatId = msg.chat.id;
            const telegramId = msg.from.id.toString();
            const username = msg.from.first_name || msg.from.username || 'Unknown';

            const user = await this.userService.getOrCreate(
                telegramId,
                username,
            );

            this.userState.set(chatId, 'IDLE');

            await this.sendMenu(chatId, user.id, `سلام ${username} 👋`);
        });
    }

    // private handleAddTask() {
    //     this.bot.onText(/افزودن تسک/, async (msg) => {
    //         const chatId = msg.chat.id;
    //         const telegramId = msg.from.id.toString();
    //         const user = await this.userService.findByTelegramId(telegramId);
    //         if (!user) return;

    //         if (this.isOutsideWorkingHours()) {
    //             await this.bot.sendMessage(
    //                 chatId,
    //                 '⏰ خارج از ساعات مجاز کاری هست.\nامکان شروع تسک فقط بین ۸ صبح تا ۱۰ شب وجود دارد.'
    //             );
    //             return;
    //         }

    //         const activeTask = await this.userService.getActiveTask(user.id);
    //         if (activeTask) {
    //             await this.sendMenu(chatId, user.id, 'یک تسک فعال داری');
    //             return;
    //         }

    //         // ✅ اصلاح این خط
    //         this.userState.set(chatId, 'AddingTask');

    //         await this.bot.sendMessage(chatId, 'اسم تسک رو وارد کن 👇', {
    //             reply_markup: {
    //                 keyboard: [[{ text: '🔙 برگشت' }]],
    //                 resize_keyboard: true,
    //             },
    //         });
    //     });
    // }

    private handleAddTask() {
        this.bot.onText(/افزودن تسک/, async (msg) => {
            const chatId = msg.chat.id;
            const telegramId = msg.from.id.toString();
            const user = await this.userService.findByTelegramId(telegramId);
            if (!user) return;

            // محدودیت ساعت
            if (this.isOutsideWorkingHours()) {
                await this.bot.sendMessage(
                    chatId,
                    '⏰ خارج از ساعات مجاز کاری هست.\nامکان شروع تسک فقط بین ۸ صبح تا ۱۰ شب وجود دارد.'
                );
                return;
            }

            const activeTask = await this.userService.getActiveTask(user.id);
            if (activeTask) {
                await this.sendMenu(chatId, user.id, 'یک تسک فعال داری');
                return;
            }

            this.userState.set(chatId, 'AddingTask');

            await this.bot.sendMessage(chatId, 'اسم تسک رو وارد کن 👇', {
                reply_markup: {
                    keyboard: [[{ text: '🔙 برگشت' }]],
                    resize_keyboard: true,
                },
            });
        });
    }

    private handleMessages() {
        this.bot.on('message', async (msg) => {
            const chatId = msg.chat.id;
            const text = msg.text;
            if (!text) return;

            const telegramId = msg.from.id.toString();
            const user = await this.userService.findByTelegramId(telegramId);
            if (!user) return;

            const state = this.userState.get(chatId);

            // =========================
            // دکمه 🔙 برگشت
            // =========================
            if (text === '🔙 برگشت') {
                this.userState.set(chatId, 'IDLE');
                await this.sendMenu(chatId, user.id);
                return;
            }

            // =========================
            // گزارش امروز
            // =========================
            if (text === '📊 گزارش امروز') {
                await this.sendReport(chatId, user.id);
                return;
            }

            // =========================
            // لیست تسک‌ها
            // =========================
            if (text === '📋 لیست تسک‌ها') {
                await this.sendTaskList(chatId, user.id);
                return;
            }

            if (text === '🗑 حذف تسک') {
                const activeTask = await this.userService.getActiveTask(user.id);
                if (activeTask) {
                    await this.bot.sendMessage(
                        chatId,
                        `تسک «${activeTask.name}» در حال اجراست ⏳\nاول اون رو پایان بده، بعد حذف کن.`,
                    );
                    return;
                }

                this.userState.set(chatId, 'DeletingTask');
                await this.sendTaskDeleteList(chatId, user.id);
                return;
            }

            // =========================
            // افزودن تسک (وارد کردن اسم)
            // =========================
            if (state === 'AddingTask') {
                const activeTask = await this.userService.getActiveTask(user.id);
                if (activeTask) {
                    await this.sendMenu(
                        chatId,
                        user.id,
                        `تسک «${activeTask.name}» در حال اجراست ⏳`
                    );
                    return;
                }

                const task = await this.userService.addTask(user.id, text);
                this.userState.set(chatId, 'IDLE');

                await this.sendMenu(
                    chatId,
                    user.id,
                    `تسک «${task.name}» شروع شد 🕒`
                );
                return;
            }

            // =========================
            // انتخاب از لیست تسک‌ها
            // =========================
            if (state === 'IDLE') {
                const activeTask = await this.userService.getActiveTask(user.id);

                if (activeTask) {
                    const startTimeStr = activeTask.startTime.toLocaleTimeString('fa-IR', {
                        hour: '2-digit',
                        minute: '2-digit',
                    });

                    await this.bot.sendMessage(
                        chatId,
                        `تسک «${activeTask.name}» از ساعت ${startTimeStr} در جریان است ⏳\nاول آن را پایان بده، بعد تسک جدید را شروع کن.`
                    );
                    return;
                }

                const todayTasks = await this.userService.getTasksToday(user.id);
                const selectedTask = todayTasks.find(t => t.name === text);
                if (!selectedTask) return;

                const task = await this.userService.startTask(user.id, selectedTask.id);

                await this.sendMenu(
                    chatId,
                    user.id,
                    `تسک «${task.name}» دوباره شروع شد 🕒`
                );
            }

            if (state === 'DeletingTask' && text.startsWith('🗑 ')) {
                const taskName = text.replace('🗑 ', '');

                const deleted = await this.userService.deleteTaskByNameToday(
                    user.id,
                    taskName,
                );

                this.userState.set(chatId, 'IDLE');

                if (!deleted) {
                    await this.sendMenu(chatId, user.id, '❌ تسک پیدا نشد');
                    return;
                }

                await this.sendMenu(
                    chatId,
                    user.id,
                    `تسک «${taskName}» حذف شد 🗑`,
                );
                return;
            }
        });
    }

    private handleEndTask() {
        this.bot.onText(/پایان تسک/, async (msg) => {
            const chatId = msg.chat.id;
            const telegramId = msg.from.id.toString();
            const user = await this.userService.findByTelegramId(telegramId);
            if (!user) return;

            const task = await this.userService.endTask(user.id);
            if (!task) {
                await this.sendMenu(chatId, user.id, 'تسکی برای پایان نیست');
                return;
            }

            await this.sendMenu(
                chatId,
                user.id,
                `تسک "${task.name}" تموم شد ✅`
            );
        });
    }

    private formatDuration(minutes: number): string {
        if (minutes < 60) return `${minutes} دقیقه`;
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours} ساعت و ${mins} دقیقه`;
    }

    private async sendReport(chatId: number, userId: number) {
        const tasks = await this.userService.getTasksToday(userId);
        if (!tasks.length) {
            await this.bot.sendMessage(chatId, 'هیچ تسکی امروز ثبت نشده.');
            return;
        }

        let reportText = '📊 گزارش امروز:\n';
        let totalMinutes = 0;

        tasks.forEach((t) => {
            const start = t.startTime;

            if (t.endTime) {
                const end = t.endTime;
                const duration = t.duration ?? Math.floor((end.getTime() - start.getTime()) / 60000);
                const startStr = start.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
                const endStr = end.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });

                reportText += `- ${t.name}: ${this.formatDuration(duration)} (از ${startStr} تا ${endStr})\n`;
                totalMinutes += duration;
            } else {
                const startStr = start.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
                reportText += `- ${t.name}: ⏳ هنوز پایان نیافته (شروع: ${startStr})\n`;
            }
        });

        reportText += `\n⏱ مجموع: ${this.formatDuration(totalMinutes)}`;

        await this.bot.sendMessage(chatId, reportText);
    }

    private async sendTaskList(chatId: number, userId: number) {
        const tasks = await this.userService.getTasksToday(userId);

        if (!tasks.length) {
            await this.bot.sendMessage(chatId, 'هیچ تسکی امروز ثبت نشده.');
            return;
        }

        const keyboard: KeyboardButton[][] = tasks.map(t => [
            { text: t.name },
        ]);

        keyboard.push([{ text: '🔙 برگشت' }]);

        await this.bot.sendMessage(
            chatId,
            'یک تسک را برای شروع دوباره انتخاب کن:',
            {
                reply_markup: {
                    keyboard,
                    resize_keyboard: true,
                },
            },
        );
    }

    private async sendTaskDeleteList(chatId: number, userId: number) {
        const tasks = await this.userService.getTasksToday(userId);

        if (!tasks.length) {
            await this.bot.sendMessage(chatId, 'هیچ تسکی برای حذف وجود ندارد.');
            this.userState.set(chatId, 'IDLE');
            return;
        }

        const keyboard: KeyboardButton[][] = tasks.map(t => [
            { text: `🗑 ${t.name}` },
        ]);

        keyboard.push([{ text: '🔙 برگشت' }]);

        await this.bot.sendMessage(
            chatId,
            'کدوم تسک رو می‌خوای حذف کنی؟',
            {
                reply_markup: {
                    keyboard,
                    resize_keyboard: true,
                },
            },
        );
    }

    private isOutsideWorkingHours(): boolean {
        const now = new Date();
        const hour = now.getHours();

        // از 22 تا 8 صبح
        return hour >= 22 || hour < 8;
    }

}
