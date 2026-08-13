export const en = {
    buttons: {
        ADD_TASK: "➕ Add Task",
        TASK_LIST: "📋 Task List",
        TODAY_REPORT: "📊 Daily Report",
        SETTINGS: "⚙️ Settings",

        START_SELECTED_TASK: "▶️ Start Task",
        END_SELECTED_TASK: "⏹️ End Task",
        DELETE_SELECTED_TASK: "🗑 Delete Task",
        EDIT_TASK: "✏️ Edit Task",

        BACK: "🔙 Back",
        CANCEL: "❌ Cancel",
        START_NEW_TASK_AFTER_ENDING_ACTIVE: "🔄 End Previous Task & Start New",

        REMINDER: "🔔 Reminder",
        FOCUS_ALERTS: "⏰ Focus Alerts",
        LANGUAGE: "🌐 Language"
    },

    menu: {
        main: "Main menu",
        selectTask: "Select a task:",
        noTask: "No tasks registered.",
        noTaskToday: "No tasks registered today.",
        useButtonsOnly: "⚠️ Please use the buttons to interact with the bot."
    },

    task: {
        selected: "Selected task:\n📌 {{name}}",
        enterName: "Enter the task name 👇",
        enterNewName: "✏️ Enter the new task name 👇",
        created: "✅ Task «{{name}}» created!\nDo you want to start it or go back?",
        duplicateToday: "⚠️ A task with this name already exists today. Please choose another name.",
        started: "🕒 Task started.",
        ended: "⏹️ Task «{{name}}» ended.",
        endedAndStartedNew: "⏹️ Previous task ended and «{{name}}» started.",
        notRunning: "⚠️ This task is not currently running.",
        activeExists: "⛔ You already have an active task: {{name}}\nDo you want to end it and start this one?",
        deleteBlocked: "⛔ Task «{{name}}» is active and cannot be deleted.",
        deleted: "🗑 Task deleted.",
        editSaved: "✅ Changes saved\nNew name: {{name}}",
        inProgress: "🔹 In progress",
    },

    report: {
        title: "📊 Today's report:\n",
        autoTitle: "📊 (Automatic) Today's report:\n",
        total: "🧮 Total today: {{time}}",
        now: "Now",
        totalLabel: "🧮 Total: {{time}}",
    },

    settings: {
        title: "⚙️ Your Settings:",
        enabled: "✅ Enabled",
        disabled: "❌ Disabled",
        languageChanged: "🌐 Your language has been changed to {{language}}!"
    },

    cancel: {
        hint: "You can cancel using this:",
        done: "❌ Cancelled",
    },

    reminders: {
        morning: "☀️ Good morning! Don't forget to enter today's tasks 📌",
        dailyFollowUp: "⏰ Friendly reminder:\nIf you haven't logged any task yet, make sure to do it 📌",
    },

    notifications: {
        focus: "Focus time! 💪",
        break: "Break time! 😌",
        half: "Lunch time! 🍽️",
        autoClosed: "⏹️ Task «{{name}}» was automatically ended.",
        outsideHours: "⏰ Outside allowed working hours.",
        disableFocusAlerts: "Disable focus alerts"
    },

    time: {
        hours: "hours",
        minutes: "minutes",
        fromTo: "⏱ {{start}} to {{end}}",
    },

    myFriend: "My Friend",

    welcomeMessage: `
Hello {{name}} 👋
Welcome to **Taskly Bot**! 🎯

This bot helps you manage your tasks and time, so you always know what you are working on:

📝 Add new tasks
⏱ Start and end tasks
📊 Daily reports
🔔 Friendly reminders
✏️ Edit and delete tasks

With simple and user-friendly buttons, you can easily manage your tasks ✅
    `,
} as const;
