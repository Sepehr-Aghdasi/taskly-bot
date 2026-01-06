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
            `تسک انتخاب‌شده:\n📌 ${task.name}`,
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

            this.userState.set(chatId, 'MainMenu');
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

            if (this.isNavigationCommand(text)) {
                await this.handleNavigation(chatId, text, user);
                return;
            }

            switch (state) {
                case 'AddingTaskName':
                    await this.handleAddTask(chatId, text, user);
                    break;
                case 'SelectingTask':
                    await this.handleSelectTask(chatId, text, user);
                    break;
                case 'TaskActions':
                    await this.handleTaskActions(chatId, text, user);
                    break;
                case 'ConfirmStartNewTaskAfterEndingActive':
                    await this.handleConfirmStartNewTask(chatId, text, user);
                    break;
                case 'EditingTaskName':
                    await this.handleEditTaskName(chatId, text);
                    break;
                default:
                    if (text === BotButtons.ADD_TASK) {
                        await this.promptAddTaskName(chatId);
                    } else if (text === BotButtons.TASK_LIST) {
                        await this.showTaskList(chatId, user);
                    } else if (text === BotButtons.TODAY_REPORT) {
                        await this.sendReport(chatId, user.id);
                    }
                    break;
            }
        });
    }

    private isNavigationCommand(text: string) {
        return text === BotButtons.BACK || text === BotButtons.CANCEL;
    }

    private async handleNavigation(chatId: number, text: string, user: any) {
        const currentState = this.userState.get(chatId);

        if (currentState === 'TaskActions') {
            const tasks = await this.userService.getTodayReport(user.id);
            if (!tasks.length) {
                this.userState.set(chatId, 'MainMenu');
                this.selectedTask.delete(chatId);
                await this.sendMainMenu(chatId);
                return;
            }

            this.userState.set(chatId, 'SelectingTask');
            this.selectedTask.delete(chatId);

            const keyboard = tasks.map(t => [{ text: t.name }]);
            keyboard.push([{ text: BotButtons.BACK }]);
            await this.bot.sendMessage(chatId, 'یک تسک انتخاب کن:', { reply_markup: { keyboard, resize_keyboard: true } });
            return;
        }

        if (['SelectingTask', 'AddingTaskName', 'EditingTaskName', 'ConfirmStartNewTaskAfterEndingActive'].includes(currentState)) {
            this.userState.set(chatId, 'MainMenu');
            this.selectedTask.delete(chatId);
            this.tempTaskName.delete(chatId);
            await this.sendMainMenu(chatId);
            return;
        }

        this.userState.set(chatId, 'MainMenu');
        await this.sendMainMenu(chatId);
    }

    private async promptAddTaskName(chatId: number) {
        this.userState.set(chatId, 'AddingTaskName');
        await this.bot.sendMessage(chatId, 'اسم تسک رو وارد کن 👇', { reply_markup: this.cancelKeyboard() });
    }

    private async handleAddTask(chatId: number, text: string, user: any) {
        const task = await this.userService.getOrCreateTask(user.id, text);
        this.tempTaskName.delete(chatId);
        this.selectedTask.set(chatId, task);
        this.userState.set(chatId, 'TaskActions');

        const keyboard: KeyboardButton[][] = [
            [{ text: BotButtons.START_SELECTED_TASK }],
            [{ text: BotButtons.BACK }],
        ];

        await this.bot.sendMessage(
            chatId,
            `✅ تسک «${task.name}» ثبت شد!\nمی‌خوای شروعش کنی یا برگردی؟`,
            { reply_markup: { keyboard, resize_keyboard: true } }
        );
    }

    private async showTaskList(chatId: number, user: any) {
        const tasks = await this.userService.getTodayReport(user.id);
        if (!tasks.length) {
            await this.bot.sendMessage(chatId, 'هیچ تسکی ثبت نشده.');
            return;
        }

        const keyboard = tasks.map(task => [{ text: task.name }]);
        keyboard.push([{ text: BotButtons.BACK }]);

        this.userState.set(chatId, 'SelectingTask');
        await this.bot.sendMessage(chatId, 'یک تسک انتخاب کن:', { reply_markup: { keyboard, resize_keyboard: true } });
    }

    private async handleSelectTask(chatId: number, text: string, user: any) {
        const tasks = await this.userService.getTodayReport(user.id);
        const task = tasks.find(t => t.name === text);
        if (!task) return;

        this.selectedTask.set(chatId, task);
        this.userState.set(chatId, 'TaskActions');
        await this.sendTaskActionsMenu(chatId, task);
    }

    private async handleTaskActions(chatId: number, text: string, user: any) {
        const task = this.selectedTask.get(chatId);
        if (!task) return;

        if (text === BotButtons.START_SELECTED_TASK) {
            const active = await this.userService.getActiveSession(user.id);
            if (active) {
                const keyboard: KeyboardButton[][] = [
                    [{ text: BotButtons.START_NEW_TASK_AFTER_ENDING_ACTIVE }],
                    [{ text: BotButtons.CANCEL }],
                ];
                await this.bot.sendMessage(chatId,
                    `⛔ ابتدا یک تسک فعال دارید: ${active.task.name}\nمی‌خواید اون رو پایان بدیم و این تسک رو شروع کنیم؟`,
                    { reply_markup: { keyboard, resize_keyboard: true } }
                );
                this.userState.set(chatId, 'ConfirmStartNewTaskAfterEndingActive');
                return;
            }

            if (this.isOutsideWorkingHours()) {
                await this.bot.sendMessage(chatId, '⏰ خارج از ساعات مجاز کاری هست.');
                return;
            }

            await this.userService.startTask(user.id, task);
            this.userState.set(chatId, 'MainMenu');
            this.selectedTask.delete(chatId);
            await this.sendMainMenu(chatId, '🕒 تسک شروع شد.');
            return;
        }

        if (text === BotButtons.END_SELECTED_TASK) {
            const active = await this.userService.getActiveSession(user.id);
            if (!active || active.taskId !== task.id) {
                await this.bot.sendMessage(chatId, '⚠️ این تسک در حال اجرا نیست.');
                return;
            }
            await this.userService.endTask(user.id);
            this.userState.set(chatId, 'MainMenu');
            this.selectedTask.delete(chatId);
            await this.sendMainMenu(chatId, `⏹️ تسک «${task.name}» پایان یافت.`);
            return;
        }

        if (text === BotButtons.DELETE_SELECTED_TASK) {
            const active = await this.userService.getActiveSession(user.id);
            if (active && active.taskId === task.id) {
                await this.bot.sendMessage(chatId, `⛔ تسک «${task.name}» فعاله و نمی‌شه حذفش کرد.`);
                return;
            }
            await this.userService.deleteTask(task.id);
            this.userState.set(chatId, 'MainMenu');
            this.selectedTask.delete(chatId);
            await this.sendMainMenu(chatId, '🗑 تسک حذف شد.');
            return;
        }

        if (text === BotButtons.EDIT_TASK) {
            this.userState.set(chatId, 'EditingTaskName');
            await this.bot.sendMessage(chatId, '✏️ اسم جدید تسک رو وارد کن 👇', { reply_markup: this.cancelKeyboard() });
            return;
        }
    }

    private async handleConfirmStartNewTask(chatId: number, text: string, user: any) {
        const task = this.selectedTask.get(chatId);
        if (!task) return;

        if (text === BotButtons.START_NEW_TASK_AFTER_ENDING_ACTIVE) {
            const active = await this.userService.getActiveSession(user.id);
            if (active) await this.userService.endTask(user.id);

            await this.userService.startTask(user.id, task);
            this.userState.set(chatId, 'MainMenu');
            this.selectedTask.delete(chatId);

            await this.sendMainMenu(chatId, `⏹️ تسک قبلی پایان یافت و تسک «${task.name}» شروع شد.`);
        }

        if (text === BotButtons.CANCEL) {
            this.userState.set(chatId, 'MainMenu');
            this.selectedTask.delete(chatId);
            await this.sendMainMenu(chatId);
        }
    }

    private async handleEditTaskName(chatId: number, text: string) {
        const task = this.selectedTask.get(chatId);
        if (!task) return;

        task._newName = text;
        await this.bot.sendMessage(chatId, '✅ تغییرات ذخیره شد', { reply_markup: this.cancelKeyboard() });
    }

    private async sendReport(chatId: number, userId: number, isAutomate: boolean = false) {
        const tasks = await this.userService.getTodayReport(userId);

        if (!tasks.length) {
            await this.bot.sendMessage(chatId, 'هیچ تسکی امروز ثبت نشده.');
            return;
        }

        let reportText = isAutomate ? '📊 (خودکار) گزارش امروز:\n' : '📊 گزارش امروز:\n';
        let totalDayMinutes = 0;

        const activeTaskIndex = tasks.findIndex(t => t.sessions.some(s => !s.endTime));
        let activeTask;
        if (activeTaskIndex !== -1) {
            activeTask = tasks.splice(activeTaskIndex, 1)[0];
        }

        // Inactive tasks first
        for (const task of tasks) {
            let taskMinutes = 0;
            reportText += `\n📌 ${task.name}\n`;

            for (const session of task.sessions) {
                const start = this.timeService.formatIranTime(session.startTime);
                let end: string;
                let sessionDuration = 0;

                if (session.endTime) {
                    end = this.timeService.formatIranTime(session.endTime);
                    sessionDuration = session.duration ?? 0;
                } else {
                    end = 'اکنون';
                    sessionDuration = this.timeService.diffMinutes(session.startTime, this.timeService.nowUTC());
                }

                reportText += `   ⏱ ${end} ← ${start}\n`;
                taskMinutes += sessionDuration;
            }

            totalDayMinutes += taskMinutes;
            reportText += `   🧮 مجموع: ${this.formatMinutes(taskMinutes)}\n`;
        }

        // Add current active task to the end of the text
        if (activeTask) {
            let taskMinutes = 0;
            reportText += `\n📌 ${activeTask.name} 🔹 در جریان\n`;

            for (const session of activeTask.sessions) {
                const start = this.timeService.formatIranTime(session.startTime);
                let end: string;
                let sessionDuration = 0;

                if (session.endTime) {
                    end = this.timeService.formatIranTime(session.endTime);
                    sessionDuration = session.duration ?? 0;
                } else {
                    end = 'اکنون';
                    sessionDuration = this.timeService.diffMinutes(session.startTime, this.timeService.nowUTC());
                }

                reportText += `   ⏱ ${end} ← ${start}\n`;
                taskMinutes += sessionDuration;
            }

            totalDayMinutes += taskMinutes;
            reportText += `   🧮 مجموع: ${this.formatMinutes(taskMinutes)}\n`;
        }

        reportText += `\n━━━━━━━━━━━━━━\n`;
        reportText += `🟢 جمع کل امروز: ${this.formatMinutes(totalDayMinutes)}\n`;

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
                `⏹️ تسک «${session.taskName}» به‌صورت خودکار پایان یافت.`
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
