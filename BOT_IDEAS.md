# Telegram Task Bot – Ideas & Workflow

This file outlines the features we plan to add to the Telegram bot and the proposed workflow for managing tasks.

---

## 1. Add Tasks Without Auto-Start

- When a user enters a task name and code, the task **does not start automatically**.  
- The task is only added to the list; the user must select it to start.  
- **Purpose:** Let users prepare tasks in advance and decide when to execute them.

---

## 2. Adjust Bot Workflow

### Main menu should include:

1. **Add Task** – register a new task  
2. **Task List** – view all registered tasks  
3. **Daily Report** – see today’s performance

### When a user opens the **Task List** and selects a task, the bot should offer:

- **Start Task** – begin the selected task  
- **Delete Task** – remove the task from the list  
- **Edit Task** – modify task info (name, code, etc.)  
> Details of editable fields will be defined later.

**Purpose:** Make workflow clearer and more flexible, giving users full control over task management.

---

## 3. Smart Reminders

- **Auto reminder for un started tasks:**  
  After 30 minutes, send:  
  `"⏰ Task «X» hasn’t started yet. Do you want to start it?"`

- **Task completion reminder:**  
  2–3 hours after starting a task, send:  
  `"⏱ Time to end task «X» or continue?"`

---

## 4. Task Prioritization & Categorization

- Allow tags or priorities: High, Medium, Low  
- Filter tasks by priority from the task list

---

## 5. Advanced Editing

- When editing, let the user choose what to edit:  

  `[Edit Name] | [Edit Code] | [Cancel]`

- Simplifies UX and makes it more intuitive.

---

## 6. Reports & Visual Stats

- Small emoji-based progress chart: 🌕🌗🌑  
- Compare today’s productivity with yesterday:  
  `"🟢 You worked 5 hours today, 4 hours yesterday – great!"`

---

## 7. Undo Feature

- After accidentally deleting or editing, a `[Undo Last Change]` button is available for a few minutes.

---

## 8. Shortcuts / Quick Actions

- From main menu or task list:  
  - `[Quick Start]` – start the last registered task  
  - `[Quick End]` – end the last running task

---

## 9. Gamification

- Reward completion of all daily tasks with an emoji or message:  
  `"🎉 Congrats! You completed all your tasks today!"`

---

## 10. Multi-Mode & Calendar Reports

- Report type selection: `[Daily] | [Weekly] | [Monthly]`  
- Display reports by Gregorian or Solar Hijri calendar and day of the week:  
  - `"📅 This week (Sat–Fri): 20 hours worked"`  
  - `"📅 This month (Farvardin): 80 hours worked"`  
- Option to adjust week start or calendar type per user preference  
- Simple emoji charts to compare productivity across days, weeks, or months

---

## 11. Logging Errors Service + Table

Right now, your bot can crash silently if something unexpected happens. Creating an error logging service plus a database table lets you:

* Keep track of all errors in one place
* Investigate later without having to reproduce issues
* Potentially alert yourself when something goes wrong

**Step 1: Create an ErrorLog table in Prisma**

Add this to your schema.prisma:

```prisma
model ErrorLog {
  id        Int      @id @default(autoincrement())
  message   String
  stack     String?
  context   String?   // optional: where error happened
  createdAt DateTime @default(now())
}
```

Then run:

```bash
npx prisma migrate dev --name add_error_log
npx prisma generate
```

**Step 2: Create a logging service**

```ts
@Injectable()
export class ErrorLoggerService {
  constructor(private readonly prisma: PrismaService) {}

  async logError(error: any, context?: string) {
    await this.prisma.errorLog.create({
      data: {
        message: error.message ?? 'Unknown error',
        stack: error.stack,
        context,
      },
    });
    console.error(`[Error] ${context ?? 'No context'}:`, error);
  }
}
```

**Step 3: Use it in services**

Example in UserService:

```ts
try {
  // some Prisma call
} catch (err) {
  await this.errorLoggerService.logError(err, 'getOrCreateUser');
  throw err; // optionally rethrow if you want the bot to know
}
```

This way, no error is lost, and you can review them later in the DB.

**Optional: Global Error Catcher**

In main.ts:

```ts
process.on('unhandledRejection', async (err) => {
  console.error('Unhandled Rejection:', err);
  // optionally call ErrorLoggerService here if you have access
});

process.on('uncaughtException', async (err) => {
  console.error('Uncaught Exception:', err);
});
```

## 12. Repository Layer

Right now, your services directly call Prisma like:

```ts
this.prisma.user.findUnique({ … });
this.prisma.user.create({ … });
```

That’s fine, but a repository layer adds an extra layer of abstraction:

* Makes your services cleaner
* Centralizes database access (so you don’t repeat Prisma queries everywhere)
* Makes testing easier (you can mock repositories instead of Prisma)

**Example:**

```ts
@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByTelegramId(telegramId: string) {
    return this.prisma.user.findUnique({
      where: { telegramId },
      include: { userSetting: true },
    });
  }

  createUser(data: CreateOrUpdateUserDto) {
    return this.prisma.user.create({
      data: {
        telegramId: data.telegramId,
        username: data.username,
        firstName: data.firstName,
        lastName: data.lastName,
        userSetting: { create: { reminder: true } },
      },
      include: { userSetting: true },
    });
  }
}
```

Then your service becomes:

```ts
async getOrCreateUser(telegramId: string, data?: CreateOrUpdateUserDto) {
  let user = await this.userRepo.findByTelegramId(telegramId);
  if (!user) {
    try {
      user = await this.userRepo.createUser({ telegramId, ...data });
    } catch (err) {
      if (err.code === 'P2002') {
        user = await this.userRepo.findByTelegramId(telegramId);
      } else {
        throw err;
      }
    }
  }
  return user;
}
```

✅ **Benefits:**

* Service focuses on business logic, not database quirks
* Easy to swap out Prisma later if needed
* Makes testing much easier — you just mock the repository

---

## Additional Notes

- Cancel/Back buttons (`❌ Cancel` / `🔙 Back`) should always return the user to the main menu  
- Task timing should include active tasks without showing actual end time, but total elapsed time should be calculated  
- Future improvements may include automatic reminders, task prioritization, and tagging
