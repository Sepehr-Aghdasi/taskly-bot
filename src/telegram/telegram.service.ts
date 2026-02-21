import { Task, User } from '@prisma/client';
import { Injectable, OnModuleInit } from '@nestjs/common';
import TelegramBot, { KeyboardButton } from 'node-telegram-bot-api';
import { UserService } from 'src/user/user.service';
import { UserState } from 'src/shared/user-state.type';
import { TaskWithSessions } from 'src/shared/task.type';
import { TimeService } from 'src/time-service/time.service';
import { TranslateService } from 'src/i18n/translate.service';
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
        private readonly timeService: TimeService,
        private readonly translateService: TranslateService,
    ) { }

    onModuleInit() {
        this.bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true });

        this.handleStart();
        this.handleMessages();
        this.handleCallbacks(); // Only need for canceling the add task or editing task name => inline keyboard button.
    }

    private async sendMainMenu(chatId: number, userId: number, text?: string) {
        const menuText = text || this.translateService.translate(userId, 'menu.main');

        const addTaskButton = this.translateService.translate(userId, BotButtons.ADD_TASK);
        const taskListButton = this.translateService.translate(userId, BotButtons.TASK_LIST);
        const todayReportButton = this.translateService.translate(userId, BotButtons.TODAY_REPORT);
        const settingsButton = this.translateService.translate(userId, BotButtons.SETTINGS);

        const keyboard: KeyboardButton[][] = [
            [{ text: addTaskButton }],
            [{ text: taskListButton }],
            [{ text: todayReportButton }],
            [{ text: settingsButton }],
        ];

        await this.safeSendMessage(chatId, menuText, {
            reply_markup: { keyboard, resize_keyboard: true },
        });
    }

    private async sendTaskActionsMenu(chatId: number, task: Task) {
        const activeSession = await this.userService.getActiveSession(task.userId);

        const endSelectedTaskButton = this.translateService.translate(task.userId, BotButtons.END_SELECTED_TASK);
        const startSelectedTaskButton = this.translateService.translate(task.userId, BotButtons.START_SELECTED_TASK);
        const deleteSelectedTaskButton = this.translateService.translate(task.userId, BotButtons.DELETE_SELECTED_TASK);
        const editTaskButton = this.translateService.translate(task.userId, BotButtons.EDIT_TASK);
        const backButton = this.translateService.translate(task.userId, BotButtons.BACK);

        let keyboard: KeyboardButton[][] = [];

        if (activeSession && activeSession.taskId === task.id) {
            keyboard.push([{ text: endSelectedTaskButton }]);
        } else {
            keyboard.push([{ text: startSelectedTaskButton }]);
        }

        keyboard.push(
            [{ text: deleteSelectedTaskButton }],
            [{ text: editTaskButton }],
            [{ text: backButton }]
        );

        const message = this.translateService.translate(task.userId, "task.selected", { name: task.name });
        await this.safeSendMessage(
            chatId,
            message,
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

        // Ensure language is loaded
        await this.translateService.loadUserLanguage(user.id);

        this.userState.set(chatId, 'MainMenu');

        let name: string = "";
        if (user.firstName) {
            name = user.firstName;
        } else {
            name = this.translateService.translate(user.id, "myFriend");
        }

        const welcomeMessage = this.translateService.translate(user.id, "welcomeMessage", { name: name });
        await this.safeSendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' });
        await this.sendMainMenu(chatId, user.id);

        return user;
    }

    private handleMessages() {
        this.bot.on('message', async (msg) => {
            const chatId = msg.chat.id;
            const text = msg.text;
            if (!text) return;

            if (text === '/start') return;

            let user = await this.userService.findByTelegramId(msg.from.id.toString());
            if (!user) {
                user = await this.performStart(msg);
            }

            // Ensure language is loaded
            await this.translateService.loadUserLanguage(user.id);

            const state = this.userState.get(chatId) ?? 'MainMenu';
            const inputStates: UserState[] = ['AddingTaskName', 'EditingTaskName'];

            if (await this.isNavigationCommand(text, user.id) && !inputStates.includes(state)) {
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
                    const reminderButton = this.translateService.translate(user.id, UserSettingsButtons.REMINDER);
                    const focusAlertButton = this.translateService.translate(user.id, UserSettingsButtons.FOCUS_ALERTS);
                    const languageButton = this.translateService.translate(user.id, UserSettingsButtons.LANGUAGE);

                    if (text.startsWith(reminderButton)) {
                        this.toggleReminder(user.id, chatId);
                    } else if (text.startsWith(focusAlertButton)) {
                        this.toggleFocusAlerts(user.id, chatId);
                    } else if (text.startsWith(languageButton)) {
                        this.showLanguageMenu(user.id, chatId);
                    }
                    break;

                case 'SelectingLanguage':
                    this.handleLanguageSelection(chatId, text, user);
                    break;

                default:
                case 'MainMenu':
                    const addTaskButton = this.translateService.translate(user.id, BotButtons.ADD_TASK);
                    const taskListButton = this.translateService.translate(user.id, BotButtons.TASK_LIST);
                    const reportButton = this.translateService.translate(user.id, BotButtons.TODAY_REPORT);
                    const settingsButton = this.translateService.translate(user.id, BotButtons.SETTINGS);

                    if (text === addTaskButton) {
                        await this.promptAddTaskName(chatId, user.id);
                    } else if (text === taskListButton) {
                        await this.showTaskList(chatId, user.id);
                    } else if (text === reportButton) {
                        await this.sendReport(chatId, user.id);
                    } else if (text === settingsButton) {
                        this.showSettingsMenu(chatId, user.id);
                    } else {
                        this.sendMainMenu(chatId, user.id);
                    }
                    break;
            }
        });
    }

    private async isNavigationCommand(text: string, userId: number) {
        const backButton = this.translateService.translate(userId, BotButtons.BACK);
        const cancelButton = this.translateService.translate(userId, BotButtons.CANCEL);

        return text === backButton || text === cancelButton;
    }

    private async handleNavigation(chatId: number, user: User) {
        const currentState = this.userState.get(chatId);

        if (currentState === 'TaskActions') {
            const tasks = await this.userService.getTodayReport(user.id);
            if (!tasks.length) {
                this.userState.set(chatId, 'MainMenu');
                this.selectedTask.delete(chatId);
                await this.sendMainMenu(chatId, user.id);
                return;
            }

            this.userState.set(chatId, 'SelectingTask');
            this.selectedTask.delete(chatId);

            const keyboard = tasks.map(t => [{ text: t.name }]);
            const backButton = this.translateService.translate(user.id, BotButtons.BACK);

            keyboard.push([{ text: backButton }]);
            const message = this.translateService.translate(user.id, 'menu.selectTask');
            await this.safeSendMessage(chatId, message, { reply_markup: { keyboard, resize_keyboard: true } });
            return;
        }

        if (['SelectingTask', 'AddingTaskName', 'EditingTaskName', 'ConfirmStartNewTaskAfterEndingActive'].includes(currentState)) {
            this.userState.set(chatId, 'MainMenu');
            this.selectedTask.delete(chatId);

            await this.clearCancelInline(chatId);

            await this.sendMainMenu(chatId, user.id);
            return;
        }

        this.userState.set(chatId, 'MainMenu');
        await this.sendMainMenu(chatId, user.id);
    }

    private async promptAddTaskName(chatId: number, userId: number) {
        this.userState.set(chatId, 'AddingTaskName');

        const enterNameMessage = this.translateService.translate(userId, 'task.enterName');
        await this.safeSendMessage(chatId, enterNameMessage, {
            reply_markup: { remove_keyboard: true }
        });

        const cancelHintMessage = this.translateService.translate(userId, 'cancel.hint');
        const cancelButton = this.translateService.translate(userId, BotButtons.CANCEL);

        const cancelMsg = await this.safeSendMessage(chatId, cancelHintMessage, {
            reply_markup: {
                inline_keyboard: [
                    [{ text: cancelButton, callback_data: cancelButton }]
                ]
            }
        });

        this.cancelMessageIds.set(chatId, cancelMsg.message_id);
    }

    private handleCallbacks() {
        this.bot.on('callback_query', async (query) => {
            const chatId = query.message?.chat.id;
            if (!chatId) return;

            const telegramId = query.from.id.toString();
            const user = await this.userService.findByTelegramId(telegramId);

            // Ensure language is loaded
            await this.translateService.loadUserLanguage(user.id);

            const cancelButton = this.translateService.translate(user.id, BotButtons.CANCEL);

            if (query.data === cancelButton) {
                this.userState.set(chatId, 'MainMenu');
                this.selectedTask.delete(chatId);

                await this.clearCancelInline(chatId);

                const message = this.translateService.translate(user.id, 'cancel.done');

                await this.bot.answerCallbackQuery(query.id);
                await this.sendMainMenu(chatId, user.id, message);
                return;
            }

            await this.bot.answerCallbackQuery(query.id);
        });
    }

    private async handleAddTask(chatId: number, text: string, user: User) {
        const { task, alreadyExistsToday } = await this.userService.getOrCreateTask(user.id, text);

        if (alreadyExistsToday) {
            const message = this.translateService.translate(user.id, 'task.duplicateToday');
            await this.safeSendMessage(chatId, message);
            return;
        }

        await this.clearCancelInline(chatId);

        this.selectedTask.set(chatId, task);
        this.userState.set(chatId, 'TaskActions');

        const startSelectedTaskButton = this.translateService.translate(user.id, BotButtons.START_SELECTED_TASK);
        const backButton = this.translateService.translate(user.id, BotButtons.BACK);
        const keyboard = [
            [{ text: startSelectedTaskButton }],
            [{ text: backButton }]
        ];

        const message = this.translateService.translate(user.id, 'task.created', { name: task.name });
        await this.safeSendMessage(
            chatId,
            message,
            { reply_markup: { keyboard, resize_keyboard: true } }
        );
    }

    private async showTaskList(chatId: number, userId: number) {
        const tasks = await this.userService.getTodayReport(userId);
        if (!tasks.length) {
            const message = this.translateService.translate(userId, 'menu.noTask');
            await this.safeSendMessage(chatId, message);
            return;
        }

        const keyboard = tasks.map(task => [{ text: task.name }]);
        const backButton = this.translateService.translate(userId, BotButtons.BACK);
        keyboard.push([{ text: backButton }]);

        this.userState.set(chatId, 'SelectingTask');
        const message = this.translateService.translate(userId, 'menu.selectTask');
        await this.safeSendMessage(chatId, message, { reply_markup: { keyboard, resize_keyboard: true } });
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

        const active = await this.userService.getActiveSession(user.id);

        const startSelectedTaskButton = this.translateService.translate(user.id, BotButtons.START_SELECTED_TASK);
        const endSelectedTaskButton = this.translateService.translate(user.id, BotButtons.END_SELECTED_TASK);
        const deleteSelectedTaskButton = this.translateService.translate(user.id, BotButtons.DELETE_SELECTED_TASK);
        const editTaskButton = this.translateService.translate(user.id, BotButtons.EDIT_TASK);

        switch (text) {
            case startSelectedTaskButton: {
                if (active && active.taskId !== task.id) {

                    const startNewTaskAfterEndingActiveButton = this.translateService.translate(user.id, BotButtons.START_NEW_TASK_AFTER_ENDING_ACTIVE);
                    const cancelButton = this.translateService.translate(user.id, BotButtons.CANCEL);

                    const keyboard: KeyboardButton[][] = [
                        [{ text: startNewTaskAfterEndingActiveButton }],
                        [{ text: cancelButton }],
                    ];

                    const message = this.translateService.translate(user.id, 'task.activeExists', { name: task.name });
                    await this.safeSendMessage(
                        chatId,
                        message,
                        { reply_markup: { keyboard, resize_keyboard: true } }
                    );
                    this.userState.set(chatId, 'ConfirmStartNewTaskAfterEndingActive');
                    return;
                }

                if (this.isOutsideWorkingHours()) {
                    const message = this.translateService.translate(user.id, 'notifications.outsideHours');
                    await this.safeSendMessage(chatId, message);
                    return;
                }

                if (!active || active.taskId !== task.id) {
                    await this.userService.startTask(user.id, task);
                }

                await this.sendTaskActionsMenu(chatId, task);
                const message = this.translateService.translate(user.id, 'task.started');
                await this.safeSendMessage(chatId, message);
                return;
            }

            case endSelectedTaskButton: {
                if (!active || active.taskId !== task.id) {
                    const message = this.translateService.translate(user.id, 'task.notRunning');
                    await this.safeSendMessage(chatId, message);
                    return;
                }

                await this.userService.endTask(user.id);

                await this.sendTaskActionsMenu(chatId, task);
                const message = this.translateService.translate(user.id, 'task.ended', { name: task.name });
                await this.safeSendMessage(chatId, message);
                await this.sendReport(chatId, user.id, true);
                return;
            }

            case deleteSelectedTaskButton: {
                if (active && active.taskId === task.id) {
                    const message = this.translateService.translate(user.id, 'task.deleteBlocked', { name: task.name });
                    await this.safeSendMessage(chatId, message);
                    return;
                }

                const remainingTasksCount = await this.userService.deleteTask(task.id, user.id);
                this.selectedTask.delete(chatId);

                const deletedMessage = this.translateService.translate(user.id, 'task.deleted', { name: task.name });
                if (remainingTasksCount === 0) {
                    this.userState.set(chatId, 'MainMenu');
                    await this.sendMainMenu(chatId, user.id, deletedMessage);
                } else {
                    this.userState.set(chatId, 'SelectingTask');
                    await this.safeSendMessage(chatId, deletedMessage);
                    await this.showTaskList(chatId, user.id);
                }
                return;
            }

            case editTaskButton:
                await this.promptEditTaskName(chatId, user.id);
                return;

            default:
                const message = this.translateService.translate(user.id, 'menu.useButtonsOnly');
                await this.safeSendMessage(chatId, message);
                return;
        }
    }

    private async handleConfirmStartNewTask(chatId: number, text: string, user: User) {
        const task = this.selectedTask.get(chatId);
        if (!task) return;

        const startNewTaskAfterEndingActiveButton = this.translateService.translate(user.id, BotButtons.START_NEW_TASK_AFTER_ENDING_ACTIVE);
        const cancelButton = this.translateService.translate(user.id, BotButtons.CANCEL);

        if (text === startNewTaskAfterEndingActiveButton) {
            const active = await this.userService.getActiveSession(user.id);
            if (active) await this.userService.endTask(user.id);

            await this.userService.startTask(user.id, task);
            this.userState.set(chatId, 'TaskActions');
            await this.sendTaskActionsMenu(chatId, task);

            const message = this.translateService.translate(user.id, 'task.endedAndStartedNew', { name: task.name });
            await this.safeSendMessage(chatId, message);
        }

        if (text === cancelButton) {
            this.userState.set(chatId, 'MainMenu');
            this.selectedTask.delete(chatId);
            await this.sendMainMenu(chatId, user.id);
        }
    }

    private async promptEditTaskName(chatId: number, userId: number) {
        const task = this.selectedTask.get(chatId);
        if (!task) return;

        this.userState.set(chatId, 'EditingTaskName');

        const message = this.translateService.translate(userId, "task.enterNewName");
        await this.safeSendMessage(chatId, message, { reply_markup: { remove_keyboard: true } });

        const cancelTranslate = this.translateService.translate(userId, "cancel.hint");
        const cancelButton = this.translateService.translate(userId, BotButtons.CANCEL);
        const cancelMsg = await this.safeSendMessage(chatId, cancelTranslate, {
            reply_markup: { inline_keyboard: [[{ text: cancelButton, callback_data: cancelButton }]] }
        });

        this.cancelMessageIds.set(chatId, cancelMsg.message_id);
    }

    private async handleEditTaskName(chatId: number, text: string) {
        const task = this.selectedTask.get(chatId);
        if (!task) return;

        await this.clearCancelInline(chatId);

        // Update task in DB
        const updatedTask = await this.userService.updateTask(task.id, text);

        // Update the selectedTask map
        this.userState.set(chatId, 'TaskActions');
        this.selectedTask.set(chatId, { ...updatedTask, name: updatedTask.name });

        const message = this.translateService.translate(task.userId, 'task.editSaved', { name: task.name });
        await this.sendTaskActionsMenu(chatId, task);
        await this.safeSendMessage(chatId, message);
    }

    private async clearCancelInline(chatId: number) {
        const cancelMessageId = this.cancelMessageIds.get(chatId);

        if (cancelMessageId) {
            await this.bot.editMessageReplyMarkup(
                { inline_keyboard: [] },
                { chat_id: chatId, message_id: cancelMessageId }
            );
            this.cancelMessageIds.delete(chatId);
        }
    }

    private async sendReport(chatId: number, userId: number, isAutomate = false) {
        const tasks = await this.userService.getTodayReport(userId);

        if (!tasks.length) {
            const message = this.translateService.translate(userId, 'menu.noTaskToday');
            return this.safeSendMessage(chatId, message);
        }

        const now = this.timeService.nowUTC();

        let totalDayMinutes = 0;

        let reportText = isAutomate
            ? this.translateService.translate(userId, 'report.autoTitle')
            : this.translateService.translate(userId, 'report.title');

        const activeTask = tasks.find(t => t.sessions.some(s => !s.endTime));
        const inactiveTasks = tasks.filter(t => t !== activeTask);

        // In-active task
        for (const task of inactiveTasks) {
            const { text, minutes } = await this.buildTaskReport(userId, task, now);
            reportText += text;
            totalDayMinutes += minutes;
        }

        // active task at the end
        if (activeTask) {
            const { text, minutes } = await this.buildTaskReport(userId, activeTask, now);
            reportText += text;
            totalDayMinutes += minutes;
        }

        reportText += `\n━━━━━━━━━━━━━━\n`;
        reportText += this.translateService.translate(userId, 'report.total', {
            time: await this.formatMinutes(userId, totalDayMinutes),
        }) + '\n';

        return this.safeSendMessage(chatId, reportText);
    }

    private buildTaskReport(userId: number, task: TaskWithSessions, now: Date) {
        let taskMinutes = 0;

        let text = `\n📌 ${task.name}`;

        const activeSession = task.sessions.find(s => !s.endTime);
        const isActive = !!activeSession;

        if (isActive) {
            const inProgress = this.translateService.translate(userId, 'task.inProgress');
            text += ` ${inProgress}`;
        }

        text += '\n';

        for (const session of task.sessions) {
            const start = this.timeService.formatIranTime(session.startTime);

            let end: string;
            let sessionDuration: number;

            if (session.endTime) {
                end = this.timeService.formatIranTime(session.endTime);
                sessionDuration = session.duration ?? 0;
            } else {
                end = this.translateService.translate(userId, 'report.now');
                sessionDuration = this.timeService.diffMinutes(session.startTime, now);
            }

            text +=
                '   ' +
                this.translateService.translate(userId, 'time.fromTo', {
                    start,
                    end,
                }) +
                '\n';

            taskMinutes += sessionDuration;
        }

        text +=
            '   ' +
            this.translateService.translate(userId, 'report.totalLabel', {
                time: this.formatMinutes(userId, taskMinutes),
            }) +
            '\n';

        return { text, minutes: taskMinutes };
    }

    private async showSettingsMenu(chatId: number, userId: number) {
        const userSettings = await this.userService.getUserSettings(userId);

        const reminderStatus = userSettings?.reminder ? "✅" : "❌";
        const focusAlertsStatus = userSettings?.focusAlerts ? "✅" : "❌";

        const supportedLanguages = this.translateService.getSupportedLanguages();
        const currentLang = supportedLanguages.find(lang => lang.code === userSettings.language);
        const currentLanguageEmoji = currentLang.emoji;

        const remainderTranslate = this.translateService.translate(userId, UserSettingsButtons.REMINDER);
        const focusAlertsTranslate = this.translateService.translate(userId, UserSettingsButtons.FOCUS_ALERTS);
        const languageTranslate = this.translateService.translate(userId, UserSettingsButtons.LANGUAGE);
        const backButton = this.translateService.translate(userId, BotButtons.BACK);

        const settingsKeyboard = [
            [{ text: `${remainderTranslate} (${reminderStatus})` }],
            [{ text: `${focusAlertsTranslate} (${focusAlertsStatus})` }],
            [{ text: `${languageTranslate} (${currentLanguageEmoji})` }],
            [{ text: backButton }]
        ];

        this.userState.set(chatId, 'SettingsMenu');

        const message = this.translateService.translate(userId, 'settings.title');
        await this.safeSendMessage(chatId, message, {
            reply_markup: {
                keyboard: settingsKeyboard,
                resize_keyboard: true,
                one_time_keyboard: true,
            },
        });
    }

    private async showLanguageMenu(userId: number, chatId: number) {
        const title = this.translateService.translate(userId, 'settings.title');

        this.userState.set(chatId, 'SelectingLanguage');

        const supportedLanguages = this.translateService.getSupportedLanguages();
        const languages = supportedLanguages.map(lang => ({ text: lang.label, code: lang.code }));
        const backButton = this.translateService.translate(userId, BotButtons.BACK);

        const keyboard = {
            keyboard: languages.map(lang => [{ text: lang.text }]).concat([[{ text: backButton }]]),
            resize_keyboard: true,
            one_time_keyboard: true,
        };

        return this.safeSendMessage(chatId, title, { reply_markup: keyboard });
    }

    private async handleLanguageSelection(chatId: number, text: string, user: User) {
        const backButton = this.translateService.translate(user.id, BotButtons.BACK);

        if (text === backButton) {
            this.userState.set(chatId, 'SettingsMenu');
            await this.showSettingsMenu(chatId, user.id);
            return;
        }

        const supportedLanguages = this.translateService.getSupportedLanguages();
        const selected = supportedLanguages.find(lang => lang.label === text);
        if (!selected) return;

        const settings = await this.userService.getUserSettings(user.id);
        settings.language = selected.code;

        await this.userService.updateUserSettings(user.id, settings);

        this.userState.set(chatId, 'SettingsMenu');

        this.translateService.setUserLanguage(user.id, selected.code);

        const successMessage = this.translateService.translate(user.id, 'settings.languageChanged', {
            language: selected.label,
        });

        await this.safeSendMessage(chatId, successMessage, { reply_markup: { remove_keyboard: true } });

        await this.showSettingsMenu(chatId, user.id);
    }

    private async toggleReminder(userId: number, chatId: number) {
        const settings = await this.userService.getUserSettings(userId);
        const newReminder = !settings.reminder;

        await this.userService.updateUserSettings(userId, { reminder: newReminder });

        const statusText = newReminder
            ? this.translateService.translate(userId, 'settings.enabled')
            : this.translateService.translate(userId, 'settings.disabled');

        const remainderTranslate = this.translateService.translate(userId, UserSettingsButtons.REMINDER);
        await this.safeSendMessage(chatId, `${remainderTranslate} ${statusText}`);

        this.userState.set(chatId, 'MainMenu');
        await this.sendMainMenu(chatId, userId);
    }

    private async toggleFocusAlerts(userId: number, chatId: number) {
        const settings = await this.userService.getUserSettings(userId);
        const newFocusAlerts = !settings.focusAlerts;

        await this.userService.updateUserSettings(userId, { focusAlerts: newFocusAlerts });

        const statusText = newFocusAlerts
            ? this.translateService.translate(userId, 'settings.enabled')
            : this.translateService.translate(userId, 'settings.disabled');

        const focusAlertTranslate = this.translateService.translate(userId, UserSettingsButtons.FOCUS_ALERTS);
        await this.safeSendMessage(chatId, `${focusAlertTranslate} ${statusText}`);

        this.userState.set(chatId, 'MainMenu');
        await this.sendMainMenu(chatId, userId);
    }

    async scheduleMorningReminder() {
        const users = await this.userService.getAllUsers();

        const jobs = users.map(async (user) => {
            if (!user.userSettings?.reminder) return;

            const chatId = Number(user.telegramId);

            const message = this.translateService.translate(user.id, "reminders.morning");
            await this.safeSendMessage(chatId, message);
        });

        await Promise.all(jobs);
    }

    async scheduleDailyReport() {
        const users = await this.userService.getAllUsers();

        const jobs = users.map(async (user) => {
            const reminder = user.userSettings?.reminder;
            if (!reminder) return;

            const chatId = Number(user.telegramId);

            await this.sendReport(chatId, user.id, true);

            const message = this.translateService.translate(user.id, "reminders.dailyFollowUp");

            await this.safeSendMessage(chatId, message);
        });

        await Promise.all(jobs);
    }

    async sendTimeBlockNotification(block: TimeBlock) {
        const users = await this.userService.getAllUsersWithFocusAlertsEnabled();

        const messageKeyMap: Record<TimeBlockTypes, string> = {
            Focus: 'notifications.focus',
            Break: 'notifications.break',
            Half: 'notifications.half',
        };

        for (const user of users) {
            const message = this.translateService.translate(user.id, messageKeyMap[block.type]);

            await this.safeSendMessage(Number(user.telegramId), message);
        }
    }

    private async safeSendMessage(
        chatId: number,
        text: string,
        options?: TelegramBot.SendMessageOptions,
        attempt: number = 1
    ): Promise<TelegramBot.Message | null> {
        const maxAttempts = 3;

        try {
            return await this.bot.sendMessage(chatId, text, options);
        } catch (error: any) {
            const iranNow = new Date().toLocaleString('en-US', {
                timeZone: this.timeService.IRAN_TZ,
                hour12: false,
            });

            // User blocked the bot → no retry
            if (error?.response?.body?.description?.includes('bot was blocked by the user')) {
                console.log(`[${iranNow}] User ${chatId} blocked the bot.`);
                return null;
            }

            // Network errors → retry
            const isNetworkError =
                error?.code === 'EFATAL' ||
                error?.cause?.code === 'ECONNRESET' ||
                error?.cause?.code === 'ETIMEDOUT';

            if (isNetworkError && attempt <= maxAttempts) {
                const delay = 500 * attempt; // 500ms, 1000ms, 1500ms
                await new Promise(res => setTimeout(res, delay));

                return this.safeSendMessage(chatId, text, options, attempt + 1);
            }

            console.error(`[${iranNow}] Failed to send message to ${chatId} after ${attempt} attempts`, error);

            return null;
        }
    }

    async forceCloseAndNotify() {
        const closedSessions = await this.userService.forceCloseAllActiveSessions();

        for (const session of closedSessions) {
            const userId = session.userId;
            const chatId = Number(session.telegramId);

            const message = this.translateService.translate(
                userId,
                'notifications.autoClosed',
                { name: session.task.name }
            );

            await this.safeSendMessage(chatId, message);

            // If the user is currently in TaskActions state, update their menu
            const currentState = this.userState.get(chatId);
            console.log(currentState);
            if (currentState === 'TaskActions') {
                // Remove the selected task since it has been closed
                this.selectedTask.delete(chatId);

                // Show the updated task list so the user can choose another task
                await this.sendTaskActionsMenu(chatId, session.task);
            }
        }
    }

    private isOutsideWorkingHours(): boolean {
        const hour = this.timeService.getIranHour();
        return hour >= 22 || hour < 8;
    }

    private formatMinutes(userId: number, totalMinutes: number) {
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;

        const hoursLabel = this.translateService.translate(userId, 'time.hours');
        const minutesLabel = this.translateService.translate(userId, 'time.minutes');

        if (hours && minutes) {
            return `${hours} ${hoursLabel} ${minutes} ${minutesLabel}`;
        }

        if (hours) {
            return `${hours} ${hoursLabel}`;
        }

        return `${minutes} ${minutesLabel}`;
    }

}
