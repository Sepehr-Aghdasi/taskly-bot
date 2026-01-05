import { Injectable, OnModuleInit } from '@nestjs/common';
import { Task } from '@prisma/client';
import TelegramBot, { KeyboardButton } from 'node-telegram-bot-api';
import { BotButtons } from 'src/shared/bot-buttons.enum';
import { UserState } from 'src/shared/user-state.type';
import { TimeService } from 'src/time-service/time.service';
import { UserService } from 'src/user/user.service';

@Injectable()
export class TelegramService implements OnModuleInit {
    private bot: TelegramBot;
    private userState = new Map<number, UserState>();
    private tempTaskName = new Map<number, string>();
    private selectedTask = new Map<number, any>();

    constructor(
        private readonly userService: UserService,
        private readonly timeService: TimeService
    ) { }

    onModuleInit() {
        this.bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true });

        this.handleStart();
        this.handleMessages();
    }

    private async sendMainMenu(chatId: number, text = "منوی اصلی") {
        const keyboard: KeyboardButton[][] = [
            [{ text: BotButtons.ADD_TASK }],
            [{ text: BotButtons.TASK_LIST }],
            [{ text: BotButtons.TODAY_REPORT }],
        ];

        await this.bot.sendMessage(chatId, text, {
            reply_markup: { keyboard, resize_keyboard: true },
        });
    }

    private async sendTaskActionsMenu(chatId: number, task: Task) {
        // Check if this task is currently active
        const activeSession = await this.userService.getActiveSession(task.userId);

        let keyboard: KeyboardButton[][] = [];

        if (activeSession && activeSession.taskId === task.id) {
            // If the task is active, show only the "End Task" button
            keyboard.push([{ text: BotButtons.END_SELECTED_TASK }]);
        } else {
            // If the task is not active, show the "Start Task" button
            keyboard.push([{ text: BotButtons.START_SELECTED_TASK }]);
        }

        // Always show these options
        keyboard.push(
            [{ text: BotButtons.DELETE_SELECTED_TASK }],
            [{ text: BotButtons.EDIT_TASK }],
            [{ text: BotButtons.BACK }]
        );

        await this.bot.sendMessage(
            chatId,
            `تسک انتخاب‌شده:\n📌 ${task.name} (${task.code})`,
            { reply_markup: { keyboard, resize_keyboard: true } }
        );
    }

    private handleStart() {
        this.bot.onText(/\/start/, async (msg) => {
            const chatId = msg.chat.id;

            const user = await this.userService.getOrCreateUser(
                msg.from.id.toString(),
                {
                    username: msg.from.username,
                    firstName: msg.from.first_name,
                    lastName: msg.from.last_name,
                }
            );

            this.userState.set(chatId, 'IDLE');
            await this.sendMainMenu(chatId, `سلام ${user.firstName || 'دوست من'} 👋`);
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
                const state = this.userState.get(chatId);

                // If user is inside task actions, go back to task list
                if (state === 'TaskActions') {
                    this.selectedTask.delete(chatId);
                    this.userState.set(chatId, 'SelectingTask');

                    const tasks = await this.userService.getTodayReport(user.id);
                    if (!tasks.length) {
                        await this.sendMainMenu(chatId);
                        return;
                    }

                    const keyboard = tasks.map(t => [{ text: `${t.name} (${t.code})` }]);
                    keyboard.push([{ text: BotButtons.BACK }]);

                    await this.bot.sendMessage(chatId, 'یک تسک انتخاب کن:', {
                        reply_markup: { keyboard, resize_keyboard: true },
                    });
                    return;
                }

                // Default behavior: go back to main menu
                this.userState.set(chatId, 'IDLE');
                this.tempTaskName.delete(chatId);
                this.selectedTask.delete(chatId);
                await this.sendMainMenu(chatId);
                return;
            }

            if (text === BotButtons.ADD_TASK) {
                this.userState.set(chatId, 'AddingTaskName');
                await this.bot.sendMessage(chatId, 'اسم تسک رو وارد کن 👇', {
                    reply_markup: this.cancelKeyboard(),
                });
                return;
            }

            if (state === 'AddingTaskName') {
                this.tempTaskName.set(chatId, text);
                this.userState.set(chatId, 'AddingTaskCode');
                await this.bot.sendMessage(chatId, 'کد تسک رو وارد کن 👇', {
                    reply_markup: this.cancelKeyboard(),
                });
                return;
            }

            if (state === 'AddingTaskCode') {
                const name = this.tempTaskName.get(chatId);
                const code = text;

                const result = await this.userService.getOrCreateTask(user.id, name, code);
                if (result.alreadyExists) {
                    await this.bot.sendMessage(chatId, '⚠️ این کد قبلاً استفاده شده.');
                    return;
                }

                this.userState.set(chatId, 'IDLE');
                this.tempTaskName.delete(chatId);
                await this.sendMainMenu(chatId, '✅ تسک ثبت شد.');
                return;
            }

            if (text === BotButtons.TASK_LIST) {
                const tasks = await this.userService.getTodayReport(user.id);
                if (!tasks.length) {
                    await this.bot.sendMessage(chatId, 'هیچ تسکی ثبت نشده.');
                    return;
                }

                const keyboard = tasks.map(t => [{ text: `${t.name} (${t.code})` }]);
                keyboard.push([{ text: BotButtons.BACK }]);

                this.userState.set(chatId, 'SelectingTask');
                await this.bot.sendMessage(chatId, 'یک تسک انتخاب کن:', {
                    reply_markup: { keyboard, resize_keyboard: true },
                });
                return;
            }

            if (state === 'SelectingTask') {
                const tasks = await this.userService.getTodayReport(user.id);
                const task = tasks.find(t => `${t.name} (${t.code})` === text);
                if (!task) return;

                this.selectedTask.set(chatId, task);
                this.userState.set(chatId, 'TaskActions');
                await this.sendTaskActionsMenu(chatId, task);
                return;
            }

            if (state === 'TaskActions') {
                const task = this.selectedTask.get(chatId);
                if (!task) return;

                if (text === BotButtons.START_SELECTED_TASK) {
                    const active = await this.userService.getActiveSession(user.id);
                    if (active) {
                        // Show active task name and code for clarity
                        await this.bot.sendMessage(
                            chatId,
                            `⛔ اول تسک فعال رو تموم کن.\n📌 در حال اجرا: ${active.task.name} (${active.task.code})`
                        );
                        return;
                    }

                    if (this.isOutsideWorkingHours()) {
                        await this.bot.sendMessage(chatId, '⏰ خارج از ساعات مجاز کاری هست.');
                        return;
                    }

                    await this.userService.startTask(user.id, task);
                    this.userState.set(chatId, 'IDLE');
                    this.selectedTask.delete(chatId);
                    await this.sendMainMenu(chatId, '🕒 تسک شروع شد.');
                    return;
                }

                if (text === BotButtons.END_SELECTED_TASK) {
                    const active = await this.userService.getActiveSession(user.id);
                    // Check if the selected task is currently active
                    if (!active || active.taskId !== task.id) {
                        await this.bot.sendMessage(chatId, '⚠️ این تسک در حال اجرا نیست.');
                        return;
                    }

                    await this.userService.endTask(user.id);
                    this.userState.set(chatId, 'IDLE');
                    this.selectedTask.delete(chatId);
                    await this.sendMainMenu(chatId, `⏹️ تسک «${task.name}» پایان یافت.`);
                    return;
                }

                if (text === BotButtons.DELETE_SELECTED_TASK) {
                    await this.userService.deleteTask(task.id);
                    this.userState.set(chatId, 'IDLE');
                    this.selectedTask.delete(chatId);
                    await this.sendMainMenu(chatId, '🗑 تسک حذف شد.');
                    return;
                }

                if (text === BotButtons.EDIT_TASK) {
                    this.userState.set(chatId, 'EditingTaskName');
                    await this.bot.sendMessage(
                        chatId,
                        '✏️ اسم جدید تسک رو وارد کن 👇',
                        { reply_markup: this.cancelKeyboard() }
                    );
                    return;
                }
            }

            if (state === 'EditingTaskName') {
                const task = this.selectedTask.get(chatId);
                if (!task) return;

                task._newName = text;
                this.userState.set(chatId, 'EditingTaskCode');

                await this.bot.sendMessage(
                    chatId,
                    'حالا کد جدید تسک رو وارد کن 👇\n(یا 🔙 برای لغو)',
                    { reply_markup: this.cancelKeyboard() }
                );
                return;
            }

            if (state === 'EditingTaskCode') {
                const task = this.selectedTask.get(chatId);
                if (!task) return;

                const newName = task._newName;
                const newCode = text;

                const result = await this.userService.updateTask(task.id, newName, newCode);

                if (result.alreadyExists) {
                    await this.bot.sendMessage(chatId, '⚠️ این کد قبلاً استفاده شده. لطفاً یک کد متفاوت وارد کن.');
                    return;
                }

                if (!result.task) {
                    await this.bot.sendMessage(chatId, '⚠️ خطا در ویرایش تسک.');
                    return;
                }

                this.userState.set(chatId, 'IDLE');
                this.selectedTask.delete(chatId);

                await this.sendMainMenu(
                    chatId,
                    `✅ تسک با موفقیت ویرایش شد:\n📌 ${newName} (${newCode})`
                );
                return;
            }

            if (text === BotButtons.TODAY_REPORT) {
                await this.sendReport(chatId, user.id);
                return;
            }
        });
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
                const start = this.timeService.formatIranTime(session.startTime);

                let end: string;
                let sessionDuration = 0;

                if (session.endTime) {
                    end = this.timeService.formatIranTime(session.endTime);
                    sessionDuration = session.duration ?? 0;
                } else {
                    end = '⏳';
                    sessionDuration = this.timeService.diffMinutes(session.startTime, this.timeService.nowUTC());
                }

                reportText += `⏱ ${start} تا ${end}\n`;
                taskMinutes += sessionDuration;
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

    async forceCloseAndNotify() {
        const closedSessions = await this.userService.forceCloseAllActiveSessions();

        for (const session of closedSessions) {
            await this.bot.sendMessage(
                Number(session.telegramId),
                `⏹️ تسک «${session.taskName}» با کد «${session.taskCode}» به‌صورت خودکار پایان یافت.`
            );
        }
    }

    private cancelKeyboard() {
        return {
            keyboard: [[{ text: BotButtons.CANCEL }]],
            resize_keyboard: true,
        };
    }

    private isOutsideWorkingHours(): boolean {
        const hour = this.timeService.getIranHour();
        return hour >= 22 || hour < 8;
    }

    private formatMinutes(totalMinutes: number) {
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;

        if (hours && minutes) return `${hours} ساعت ${minutes} دقیقه`;
        if (hours) return `${hours} ساعت`;
        return `${minutes} دقیقه`;
    }
}
