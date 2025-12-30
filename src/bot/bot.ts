import TelegramBot from 'node-telegram-bot-api';
import { PrismaService } from 'src/prisma/prisma.service';
import { UserService } from 'src/user/user.service';

const token = process.env.BOT_TOKEN!;
export const bot = new TelegramBot(token, { polling: true });

// Services
const prismaService = new PrismaService();
const userService = new UserService(prismaService);

// Map برای نگهداری وضعیت وارد کردن اسم تسک
const taskNameMap = new Map<number, string>();

/**
 * هندلر /start
 */
bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const telegramId = msg.from?.id.toString();
    const username = msg.from?.username || msg.from?.first_name || 'Unknown';

    let user = await userService.findByTelegramId(telegramId!);
    if (!user) {
        user = await prismaService.user.create({
            data: { telegramId: telegramId!, username },
        });
    }

    bot.sendMessage(chatId, `سلام ${username}! تو الان ثبت شدی. UserID تو دیتابیس: ${user.id}`);
});

/**
 * هندلر /add_task
 */
bot.onText(/^\/add_task$/, async (msg) => {
    const chatId = msg.chat.id;
    const telegramId = msg.from?.id.toString();

    const user = await userService.findByTelegramId(telegramId!);
    console.log('FIND USER:', user);
    if (!user) {
        bot.sendMessage(chatId, 'اول باید /start بزنی!');
        return;
    }

    bot.sendMessage(chatId, 'اسم تسک رو وارد کن:');
    taskNameMap.set(chatId, ''); // فعال کردن مرحله وارد کردن اسم تسک
});


/**
 * هندلر /end_task
 */
bot.onText(/\/end_task/, async (msg) => {
    const chatId = msg.chat.id;
    const telegramId = msg.from?.id.toString();

    const user = await userService.findByTelegramId(telegramId!);
    if (!user) {
        bot.sendMessage(chatId, 'اول باید /start بزنی!');
        return;
    }

    const task = await userService.endTask(user.id);
    if (!task) {
        bot.sendMessage(chatId, 'هیچ تسک باز برای پایان دادن پیدا نشد.');
        return;
    }

    bot.sendMessage(chatId, `تسک "${task.name}" تموم شد. ⏱ مدت زمان: ${task.duration} دقیقه`);
});
