<p align="center">
  <a href="https://nestjs.com/" target="_blank">
    <img src="https://nestjs.com/img/logo-small.svg" width="120" alt="NestJS Logo" />
  </a>
</p>

<h1 align="center">Taskly Bot 🤖</h1>

<p align="center">
A Telegram bot built with <strong>NestJS</strong> to help you manage tasks, track focus time, and receive smart reminders.
</p>

---

## 🚀 Overview

**Taskly Bot** is a productivity-focused Telegram bot that helps users:

- Manage daily tasks
- Track working sessions
- Receive focus / break / half-time notifications
- View daily activity reports
- Control reminders through user settings

The bot is built with a **modular NestJS structure** and uses **config-driven scheduling** for time-based notifications.

---

## ✨ Features

### 📝 Task Management
- Add, edit, and delete tasks
- Start and end task sessions
- Prevent multiple active tasks at the same time

### ⏱ Time Tracking
- Track working sessions per task
- Automatically calculate duration
- Force-close active sessions at the end of the day

### 📊 Reports
- Daily task report
- Session breakdown per task
- Total working time per day

### 🔔 Smart Notifications
- Daily reminders
- Focus / Break / Half-time alerts (configurable)
- User-controlled settings (on/off)

### ⚙️ User Settings
- Enable / disable reminders
- Enable / disable focus time alerts
- Designed for future extensibility

---

## 🧠 Focus & Time Blocks

Taskly supports **automatic time-block notifications** such as:

- 🎯 Focus Time
- ☕ Break Time

Defined using a JSON configuration file and scheduled automatically.

Example:

```json
[
  {
    "type": "Focus",
    "startTime": "08:00:00",
    "endTime": "09:00:00"
  },
  {
    "type": "Break",
    "startTime": "09:00:00",
    "endTime": "09:15:00"
  }
]
```

## 🛠 Tech Stack

- **NestJS**
- **Telegram Bot API**
- **Prisma ORM**
- **PostgreSQL**
- **node-cron**
- **TypeScript**

---

## 🧪 Installation & Setup

### 1️⃣ Clone the repository

```bash
git clone https://github.com/Sepehr-Aghdasi/taskly-bot.git
cd taskly-bot
```

### 2️⃣ Install dependencies

```bash
npm install
```

### 3️⃣ Environment variables

Create a **.env** file:

```
DATABASE_URL=postgresql://user:password@localhost:5432/taskly
TELEGRAM_TOKEN=your_telegram_bot_token
```

### 4️⃣ Database setup

```bash
npx prisma generate
npx prisma migrate dev --name init
```

Optional: GUI to view database content

```bash
npx prisma studio
```

---

## ▶️ Running the Bot

```bash
npm run start:dev
```

### Production

```bash
npm run build
npm run start:prod
```

---

## 🤖 Bot Behavior

- `/start` initializes the user
- Button-based interactions for:
  - Task creation
  - Task list
  - Daily report
  - Settings
- All interactions are handled through **inline keyboard buttons**

---

--- 

## 📎 Project Links

- [LinkedIn Post about Taskly Bot](https://www.linkedin.com/...)  
- [Demo Video / Screenshots](https://...)  

---

## 🤝 Contributing

Pull requests are welcome.
Please keep commits clean and focused.

<p align="center"> Built with ❤️ using NestJS </p>
