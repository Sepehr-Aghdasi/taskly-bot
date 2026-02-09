import { Task, User } from '@prisma/client';
import { Injectable, OnModuleInit } from '@nestjs/common';
import TelegramBot, { KeyboardButton } from 'node-telegram-bot-api';
import { UserService } from 'src/user/user.service';
import { UserState } from 'src/shared/user-state.type';
import { TimeService } from 'src/time-service/time.service';
import { getWelcomeMessage } from 'src/shared/messages/welcome-message';
import { BotButtons, UserSettingsButtons } from 'src/shared/bot-buttons.enum';
import { TimeBlock, TimeBlockTypes } from 'src/shared/configs/time-blocks.type';

@Injectable()
export class TelegramService implements OnModuleInit {
    private bot: TelegramBot;
    private userState = new Map<number, UserState>();
    private cancelMessageIds = new Map<number, number>();
    private selectedTask = new Map<number, Task>();

    constructor(
        private readonly userService: UserService,
        private readonly timeService: TimeService
    ) { }

    onModuleInit() {
        this.bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true });

        this.handleStart();
        this.handleMessages();
        this.handleCallbacks(); // Only need for canceling the add task or editing task name => inline keyboard button.
    }

    private async sendMainMenu(chatId: number, text = "منوی اصلی") {
        const keyboard: KeyboardButton[][] = [
            [{ text: BotButtons.ADD_TASK }],
            [{ text: BotButtons.TASK_LIST }],
            [{ text: BotButtons.TODAY_REPORT }],
            [{ text: BotButtons.SETTINGS }],
        ];

        await this.bot.sendMessage(chatId, text, {
            reply_markup: { keyboard, resize_keyboard: true },
        });
    }

    private async sendTaskActionsMenu(chatId: number, task: Task) {
        const activeSession = await this.userService.getActiveSession(task.userId);

        let keyboard: KeyboardButton[][] = [];

        if (activeSession && activeSession.taskId === task.id) {
            keyboard.push([{ text: BotButtons.END_SELECTED_TASK }]);
        } else {
            keyboard.push([{ text: BotButtons.START_SELECTED_TASK }]);
        }

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
        this.bot.onText(/\/start/, async (msg) => this.performStart(msg));
    }

    private async performStart(message: TelegramBot.Message) {
        const chatId = message.chat.id;

        const user = await this.userService.getOrCreateUser(
            message.from.id.toString(),
            {
                username: message.from.username,
                firstName: message.from.first_name,
                lastName: message.from.last_name,
            }
        );

        this.userState.set(chatId, 'MainMenu');
        const name = `${user.firstName || 'دوست من'}`;
        const welcomeMessage = getWelcomeMessage(name);
        await this.bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' });

        return user;
    }

    private handleMessages() {
        this.bot.on('message', async (msg) => {
            const chatId = msg.chat.id;
            const text = msg.text;
            if (!text) return;

            let user = await this.userService.findByTelegramId(msg.from.id.toString());
            if (!user) {
                user = await this.performStart(msg);
            }

            const state = this.userState.get(chatId);
            const inputStates: UserState[] = ['AddingTaskName', 'EditingTaskName'];

            if (this.isNavigationCommand(text) && !inputStates.includes(state)) {
                await this.handleNavigation(chatId, user);
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
                case 'SettingsMenu':
                    if (text.startsWith(UserSettingsButtons.REMINDER)) {
                        this.toggleReminder(user.id, chatId);
                    } else if (text.startsWith(UserSettingsButtons.FOCUS_ALERTS)) {
                        this.toggleFocusAlerts(user.id, chatId);
                    }

                default:
                case 'MainMenu':
                    if (text === BotButtons.ADD_TASK) {
                        await this.promptAddTaskName(chatId);
                    } else if (text === BotButtons.TASK_LIST) {
                        await this.showTaskList(chatId, user.id);
                    } else if (text === BotButtons.TODAY_REPORT) {
                        await this.sendReport(chatId, user.id);
                    } else if (text === BotButtons.SETTINGS) {
                        this.showSettingsMenu(chatId, user.id);
                    }
                    break;
            }
        });
    }

    private isNavigationCommand(text: string) {
        return text === BotButtons.BACK || text === BotButtons.CANCEL;
    }

    private async handleNavigation(chatId: number, user: User) {
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

            const cancelMessageId = this.cancelMessageIds.get(chatId);
            if (cancelMessageId) {
                await this.bot.editMessageReplyMarkup(
                    { inline_keyboard: [] },
                    { chat_id: chatId, message_id: cancelMessageId }
                );
                this.cancelMessageIds.delete(chatId);
            }

            await this.sendMainMenu(chatId);
            return;
        }

        this.userState.set(chatId, 'MainMenu');
        await this.sendMainMenu(chatId);
    }

    private async promptAddTaskName(chatId: number) {
        this.userState.set(chatId, 'AddingTaskName');

        await this.bot.sendMessage(chatId, 'اسم تسک رو وارد کن 👇', {
            reply_markup: { remove_keyboard: true }
        });

        const cancelMsg = await this.bot.sendMessage(chatId, 'برای لغو می‌تونی از این استفاده کنی:', {
            reply_markup: {
                inline_keyboard: [
                    [{ text: BotButtons.CANCEL, callback_data: BotButtons.CANCEL }]
                ]
            }
        });

        this.cancelMessageIds.set(chatId, cancelMsg.message_id);
    }

    private handleCallbacks() {
        this.bot.on('callback_query', async (query) => {
            const chatId = query.message?.chat.id;
            if (!chatId) return;

            if (query.data === BotButtons.CANCEL) {
                this.userState.set(chatId, 'MainMenu');
                this.selectedTask.delete(chatId);

                const cancelMessageId = this.cancelMessageIds.get(chatId);
                if (cancelMessageId) {
                    await this.bot.editMessageReplyMarkup(
                        { inline_keyboard: [] },
                        { chat_id: chatId, message_id: cancelMessageId }
                    );
                    this.cancelMessageIds.delete(chatId);
                }

                await this.bot.answerCallbackQuery(query.id);
                await this.sendMainMenu(chatId, '❌ لغو شد');
                return;
            }

            await this.bot.answerCallbackQuery(query.id);
        });
    }

    private async handleAddTask(chatId: number, text: string, user: User) {
        const task = await this.userService.getOrCreateTask(user.id, text);

        const cancelMessageId = this.cancelMessageIds.get(chatId);
        if (cancelMessageId) {
            await this.bot.editMessageReplyMarkup(
                { inline_keyboard: [] },
                { chat_id: chatId, message_id: cancelMessageId }
            );
            this.cancelMessageIds.delete(chatId);
        }

        this.selectedTask.set(chatId, task);
        this.userState.set(chatId, 'TaskActions');

        const keyboard = [
            [{ text: BotButtons.START_SELECTED_TASK }],
            [{ text: BotButtons.BACK }]
        ];

        await this.bot.sendMessage(
            chatId,
            `✅ تسک «${task.name}» ثبت شد!\nمی‌خوای شروعش کنی یا برگردی؟`,
            { reply_markup: { keyboard, resize_keyboard: true } }
        );
    }

    private async showTaskList(chatId: number, userId: number) {
        const tasks = await this.userService.getTodayReport(userId);
        if (!tasks.length) {
            await this.bot.sendMessage(chatId, 'هیچ تسکی ثبت نشده.');
            return;
        }

        const keyboard = tasks.map(task => [{ text: task.name }]);
        keyboard.push([{ text: BotButtons.BACK }]);

        this.userState.set(chatId, 'SelectingTask');
        await this.bot.sendMessage(chatId, 'یک تسک انتخاب کن:', { reply_markup: { keyboard, resize_keyboard: true } });
    }

    private async handleSelectTask(chatId: number, text: string, user: User) {
        const tasks = await this.userService.getTodayReport(user.id);
        const task = tasks.find(t => t.name === text);
        if (!task) return;

        this.selectedTask.set(chatId, task);
        this.userState.set(chatId, 'TaskActions');
        await this.sendTaskActionsMenu(chatId, task);
    }

    private async handleTaskActions(chatId: number, text: string, user: User) {
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
            await this.promptEditTaskName(chatId);
            return;
        }
    }

    private async handleConfirmStartNewTask(chatId: number, text: string, user: User) {
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

    private async promptEditTaskName(chatId: number) {
        const task = this.selectedTask.get(chatId);
        if (!task) return;

        this.userState.set(chatId, 'EditingTaskName');

        await this.bot.sendMessage(chatId, '✏️ اسم جدید تسک رو وارد کن 👇', { reply_markup: { remove_keyboard: true } });

        const cancelMsg = await this.bot.sendMessage(chatId, 'برای لغو می‌تونی از این استفاده کنی:', {
            reply_markup: { inline_keyboard: [[{ text: BotButtons.CANCEL, callback_data: BotButtons.CANCEL }]] }
        });

        this.cancelMessageIds.set(chatId, cancelMsg.message_id);
    }

    private async handleEditTaskName(chatId: number, text: string) {
        const task = this.selectedTask.get(chatId);
        if (!task) return;

        const cancelMessageId = this.cancelMessageIds.get(chatId);
        if (cancelMessageId) {
            await this.bot.editMessageReplyMarkup(
                { inline_keyboard: [] },
                { chat_id: chatId, message_id: cancelMessageId }
            );
            this.cancelMessageIds.delete(chatId);
        }

        // Update task in DB
        const updatedTask = await this.userService.updateTask(task.id, text);

        // Update the selectedTask map
        this.selectedTask.set(chatId, { ...updatedTask, name: updatedTask.name });

        // Check if task is currently active
        const activeSession = await this.userService.getActiveSession(task.userId);
        const startOrEndButton = activeSession?.taskId === task.id
            ? BotButtons.END_SELECTED_TASK
            : BotButtons.START_SELECTED_TASK;

        const keyboard = [
            [{ text: startOrEndButton }],
            [{ text: BotButtons.BACK }]
        ];

        await this.bot.sendMessage(chatId, `✅ تغییرات ذخیره شد\nنام جدید: ${text}`,
            { reply_markup: { keyboard, resize_keyboard: true } }
        );

        this.userState.set(chatId, 'TaskActions');
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

                reportText += `   ⏱ ${start} تا ${end}\n`;
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

                reportText += `   ⏱ ${start} تا ${end}\n`;
                taskMinutes += sessionDuration;
            }

            totalDayMinutes += taskMinutes;
            reportText += `   🧮 مجموع: ${this.formatMinutes(taskMinutes)}\n`;
        }

        reportText += `\n━━━━━━━━━━━━━━\n`;
        reportText += `🟢 جمع کل امروز: ${this.formatMinutes(totalDayMinutes)}\n`;

        await this.bot.sendMessage(chatId, reportText);
    }

    private async showSettingsMenu(chatId: number, userId: number) {
        const userSettings = await this.userService.getUserSettings(userId);

        const reminderStatus = userSettings?.reminder ? "✅" : "❌";
        const focusAlertsStatus = userSettings?.focusAlerts ? "✅" : "❌";

        const settingsKeyboard = [
            [{ text: `${UserSettingsButtons.REMINDER} (${reminderStatus})` }],
            [{ text: `${UserSettingsButtons.FOCUS_ALERTS} (${focusAlertsStatus})` }],
            [{ text: BotButtons.BACK }]
        ];

        this.userState.set(chatId, 'SettingsMenu');

        await this.bot.sendMessage(chatId, "⚙️ تنظیمات شما:", {
            reply_markup: {
                keyboard: settingsKeyboard,
                resize_keyboard: true,
                one_time_keyboard: true,
            },
        });
    }

    private async toggleReminder(userId: number, chatId: number) {
        const settings = await this.userService.getUserSettings(userId);
        const newReminder = !settings.reminder;

        await this.userService.updateUserSettings(userId, { reminder: newReminder });

        const statusText = newReminder ? "✅ روشن شد" : "❌ خاموش شد";
        await this.bot.sendMessage(chatId, `${UserSettingsButtons.REMINDER} ${statusText}`);

        this.userState.set(chatId, 'MainMenu');
        await this.sendMainMenu(chatId);
    }

    private async toggleFocusAlerts(userId: number, chatId: number) {
        const settings = await this.userService.getUserSettings(userId);
        const newFocusAlerts = !settings.focusAlerts;

        await this.userService.updateUserSettings(userId, { focusAlerts: newFocusAlerts });

        const statusText = newFocusAlerts ? "✅ روشن شد" : "❌ خاموش شد";
        await this.bot.sendMessage(chatId, `${UserSettingsButtons.FOCUS_ALERTS} ${statusText}`);

        this.userState.set(chatId, 'MainMenu');
        await this.sendMainMenu(chatId);
    }

    async scheduleDailyReport() {
        const users = await this.userService.getAllUsers();

        for (const user of users) {
            const reminder = user.userSettings.reminder;
            if (!reminder) continue;

            const chatId = Number(user.telegramId);

            await this.sendReport(chatId, user.id, true);

            await this.bot.sendMessage(
                chatId,
                '⏰ یادآوری دوستانه:\nاگه هنوز تسکی ثبت نکردی حتماً ثبتش کن 📌'
            );
        }
    }

    async sendTimeBlockNotification(block: TimeBlock) {
        const users = await this.userService.getAllUsersWithFocusAlertsEnabled();

        const messages: Record<TimeBlockTypes, string> = {
            Focus: 'وقت فوکوس رسیده! 💪',
            Break: 'وقت استراحت است! 😌',
            Half: 'وقت ناهاره! 🍽️',
        };

        for (const user of users) {
            await this.bot.sendMessage(
                user.telegramId,
                messages[block.type]
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
