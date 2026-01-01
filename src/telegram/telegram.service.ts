import { Injectable, OnModuleInit } from '@nestjs/common';
import TelegramBot, { KeyboardButton } from 'node-telegram-bot-api';
import { BotButtons } from 'src/shared/bot-buttons.enum';
import { UserState } from 'src/shared/user-state.type';
import { UserService } from 'src/user/user.service';

@Injectable()
export class TelegramService implements OnModuleInit {
    private bot: TelegramBot;
    private userState = new Map<number, UserState>();
    private tempTaskName = new Map<number, string>();

    constructor(private readonly userService: UserService) { }

    onModuleInit() {
        this.bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true });

        this.handleStart();
        this.handleAddTask();
        this.handleEndTask();
        this.handleMessages();
    }

    private async sendMenu(chatId: number, userId: number, text = 'منوی اصلی') {
        const activeSession = await this.userService.getActiveSession(userId);

        const keyboard: KeyboardButton[][] = activeSession
            ? [[{ text: BotButtons.END_TASK }]]
            : [[{ text: BotButtons.START_TASK }]];

        keyboard.push(
            [{ text: BotButtons.TODAY_REPORT }],
            [{ text: BotButtons.TASK_LIST }],
            [{ text: BotButtons.DELETE_TASK }]
        );

        await this.bot.sendMessage(chatId, text, {
            reply_markup: { keyboard, resize_keyboard: true },
        });
    }

    private handleStart() {
        this.bot.onText(/\/start/, async (msg) => {
            const chatId = msg.chat.id;
            const telegramId = msg.from.id.toString();
            const username = msg.from.first_name || 'فلانی';

            const user = await this.userService.getOrCreate(telegramId, username);
            this.userState.set(chatId, 'IDLE');

            await this.sendMenu(chatId, user.id, `سلام ${username} 👋`);
        });
    }

    private handleAddTask() {
        this.bot.onText(new RegExp(BotButtons.START_TASK), async (msg) => {
            const chatId = msg.chat.id;
            const user = await this.userService.findByTelegramId(msg.from.id.toString());
            if (!user) return;

            if (this.isOutsideWorkingHours()) {
                await this.bot.sendMessage(
                    chatId,
                    '⏰ خارج از ساعات مجاز کاری هست.\nفقط بین ۸ صبح تا ۱۰ شب امکان شروع تسک وجود دارد.'
                );
                return;
            }

            const active = await this.userService.getActiveSession(user.id);
            if (active) {
                await this.sendMenu(chatId, user.id, 'یک تسک فعال داری');
                return;
            }

            this.userState.set(chatId, 'AddingTaskName');
            await this.bot.sendMessage(
                chatId,
                'اسم تسک رو وارد کن 👇',
                { reply_markup: this.cancelKeyboard() }
            );
        });
    }

    private handleEndTask() {
        this.bot.onText(new RegExp(BotButtons.END_TASK), async (msg) => {
            const chatId = msg.chat.id;
            const user = await this.userService.findByTelegramId(msg.from.id.toString());
            if (!user) return;

            const session = await this.userService.getActiveSession(user.id);
            if (!session) {
                await this.sendMenu(chatId, user.id, 'تسکی برای پایان نیست');
                return;
            }

            const ended = await this.userService.endTask(user.id);
            if (!ended) {
                await this.sendMenu(chatId, user.id, 'تسکی برای پایان نیست');
                return;
            }

            await this.sendMenu(
                chatId,
                user.id,
                `تسک «${ended.task.name}» با کد «${ended.task.code}» تموم شد ✅`
            );
        });
    }

    private handleMessages() {
        this.bot.on('message', async (msg) => {
            const chatId = msg.chat.id;
            const text = msg.text;
            if (!text) return;

            const user = await this.userService.findByTelegramId(msg.from.id.toString());
            if (!user) return;

            const state = this.userState.get(chatId);

            if (text === BotButtons.BACK || text === BotButtons.CANCEL) {
                this.userState.set(chatId, 'IDLE');
                this.tempTaskName.delete(chatId);
                await this.sendMenu(chatId, user.id);
                return;
            }

            if (text === BotButtons.TODAY_REPORT) {
                await this.sendReport(chatId, user.id);
                return;
            }

            if (text === BotButtons.TASK_LIST) {
                const tasks = await this.userService.getTodayReport(user.id);
                if (!tasks.length) {
                    await this.bot.sendMessage(chatId, 'هیچ تسکی امروز ثبت نشده.');
                    return;
                }

                const keyboard = tasks.map(t => [{ text: `${t.name} (${t.code})` }]);
                keyboard.push([{ text: BotButtons.BACK }]);

                await this.bot.sendMessage(chatId, 'یک تسک را برای شروع دوباره انتخاب کن:', {
                    reply_markup: { keyboard, resize_keyboard: true },
                });
                return;
            }

            if (text === BotButtons.DELETE_TASK) {
                const tasks = await this.userService.getTodayReport(user.id);
                if (!tasks.length) {
                    await this.bot.sendMessage(chatId, 'هیچ تسکی برای حذف وجود ندارد.');
                    return;
                }

                const keyboard = tasks.map(t => [{ text: `${t.name} (${t.code})`, code: t.code }]);
                keyboard.push([{ text: BotButtons.BACK, code: BotButtons.BACK }]);

                this.userState.set(chatId, 'DeletingTask');
                await this.bot.sendMessage(chatId, 'کدام تسک را می‌خوای حذف کنی؟', {
                    reply_markup: { keyboard, resize_keyboard: true, one_time_keyboard: true },
                });
                return;
            }

            if (state === 'DeletingTask') {
                if (text === BotButtons.BACK) {
                    this.userState.set(chatId, 'IDLE');
                    await this.sendMenu(chatId, user.id);
                    return;
                }

                // Extract code from text
                const codeMatch = text.match(/\(([^)]+)\)$/);
                if (!codeMatch) {
                    await this.bot.sendMessage(chatId, '⚠️ تسک نامعتبر است.');
                    return;
                }
                const code = codeMatch[1];

                const tasks = await this.userService.getTodayReport(user.id);
                const selected = tasks.find(t => t.code === code);

                if (!selected) {
                    await this.bot.sendMessage(chatId, '⚠️ تسک پیدا نشد یا معتبر نیست.');
                    return;
                }

                const activeSession = await this.userService.getActiveSession(user.id);
                if (activeSession && activeSession.taskId === selected.id) {
                    await this.bot.sendMessage(
                        chatId,
                        `⛔ تسک «${selected.name}» با کد (${selected.code}) در حال اجراست.\n` +
                        `اول این تسک رو متوقف کن، سپس می‌تونی حذفش کنی.`
                    );
                    return;
                }

                await this.userService.deleteTask(selected.id);
                this.userState.set(chatId, 'IDLE');

                await this.sendMenu(chatId, user.id, `تسک «${selected.name}» با کد (${selected.code}) حذف شد ✅`);
                return;
            }

            if (state === 'AddingTaskName') {
                this.tempTaskName.set(chatId, text);
                this.userState.set(chatId, 'AddingTaskCode');

                await this.bot.sendMessage(
                    chatId,
                    'حالا کد یکتای تسک را وارد کن 👇',
                    { reply_markup: this.cancelKeyboard() }
                );
                return;
            }

            if (state === 'AddingTaskCode') {
                const name = this.tempTaskName.get(chatId);
                const code = text;

                const result = await this.userService.getOrCreateTask(user.id, name, code);

                if (result.alreadyExists) {
                    await this.bot.sendMessage(
                        chatId,
                        '⚠️ تسکی با این کد از قبل وجود دارد.\n' +
                        'لطفاً یک کد متفاوت وارد کن یا از لیست تسک‌ها استفاده کن.'
                    );
                    return;
                }

                await this.userService.startExistingTask(result.task);

                this.userState.set(chatId, 'IDLE');
                this.tempTaskName.delete(chatId);

                await this.sendMenu(
                    chatId,
                    user.id,
                    `تسک «${result.task.name}» با کد «${result.task.code}» شروع شد 🕒`
                );
            }

            // Start existing task
            if (state === 'IDLE') {
                const tasks = await this.userService.getTodayReport(user.id);
                const selected = tasks.find(t => `${t.name} (${t.code})` === text);
                if (!selected) return;

                const activeSession = await this.userService.getActiveSession(user.id);

                if (activeSession) {
                    await this.bot.sendMessage(
                        chatId,
                        `⛔ تسک «${activeSession.task.name}» با کد «${activeSession.task.code}» در حال اجراست.\n` +
                        `اول این تسک رو پایان بده، بعد تسک جدید رو شروع کن.`
                    );
                    return;
                }

                await this.userService.startTask(user.id, selected);
                await this.sendMenu(chatId, user.id, `تسک «${selected.name}» دوباره شروع شد 🕒`);
            }
        });
    }

    private cancelKeyboard() {
        return {
            keyboard: [[{ text: BotButtons.CANCEL }]],
            resize_keyboard: true,
        };
    }

    private async sendReport(chatId: number, userId: number, isAutomate: boolean = false) {
        const tasks = await this.userService.getTodayReport(userId);
        if (!tasks.length) {
            await this.bot.sendMessage(chatId, 'هیچ تسکی امروز ثبت نشده.');
            return;
        }

        let reportText = isAutomate ? '📊 (خودکار) گزارش امروز:\n' : '📊 گزارش امروز:\n';
        let totalDayMinutes = 0;

        for (const task of tasks) {
            let taskMinutes = 0;

            reportText += `\n📌 ${task.name} (کد: ${task.code})\n`;

            for (const session of task.sessions) {
                const start = session.startTime.toLocaleTimeString('fa-IR', {
                    hour: '2-digit',
                    minute: '2-digit',
                });

                const end = session.endTime
                    ? session.endTime.toLocaleTimeString('fa-IR', {
                        hour: '2-digit',
                        minute: '2-digit',
                    })
                    : '⏳';

                reportText += `⏱ ${start} تا ${end}\n`;

                if (session.duration) {
                    taskMinutes += session.duration;
                }
            }

            totalDayMinutes += taskMinutes;
            reportText += `🧮 مجموع این تسک: ${this.formatMinutes(taskMinutes)}\n`;
        }

        reportText += `\n━━━━━━━━━━━━━━\n`;
        reportText += `🟢 جمع کل کارکرد امروز: ${this.formatMinutes(totalDayMinutes)}\n`;

        await this.bot.sendMessage(chatId, reportText);
    }

    async scheduleDailyReport() {
        const users = await this.userService.getAllUsers();

        for (const user of users) {
            const chatId = Number(user.telegramId);

            await this.sendReport(chatId, user.id, true);

            await this.bot.sendMessage(
                chatId,
                '⏰ یادآوری دوستانه:\nاگه هنوز تسکی ثبت نکردی حتماً ثبتش کن 📌'
            );
        }
    }

    private isOutsideWorkingHours() {
        const h = new Date().getHours();
        return h >= 22 || h < 8;
    }

    private formatMinutes(totalMinutes: number) {
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;

        if (hours && minutes) return `${hours} ساعت ${minutes} دقیقه`;
        if (hours) return `${hours} ساعت`;
        return `${minutes} دقیقه`;
    }
}
