export const fa = {
    buttons: {
        ADD_TASK: "➕ افزودن تسک",
        TASK_LIST: "📋 لیست تسک‌ها",
        TODAY_REPORT: "📊 گزارش روزانه",
        SETTINGS: "⚙️ تنظیمات",

        START_SELECTED_TASK: "▶️ شروع تسک",
        END_SELECTED_TASK: "⏹️ پایان تسک",
        DELETE_SELECTED_TASK: "🗑 حذف تسک",
        EDIT_TASK: "✏️ ویرایش تسک",

        BACK: "🔙 برگشت",
        CANCEL: "❌ انصراف",
        START_NEW_TASK_AFTER_ENDING_ACTIVE: "🔄 پایان تسک قبلی و شروع تسک جدید",

        REMINDER: "🔔 یادآوری",
        FOCUS_ALERTS: "⏰ هشدار فوکوس",
        LANGUAGE: "🌐 زبان"
    },

    menu: {
        main: "منوی اصلی",
        selectTask: "یک تسک انتخاب کن:",
        noTask: "هیچ تسکی ثبت نشده.",
        noTaskToday: "هیچ تسکی امروز ثبت نشده.",
        useButtonsOnly: "⚠️ لطفاً برای کار با ربات از دکمه‌ها استفاده کنید."
    },

    task: {
        selected: "تسک انتخاب‌شده:\n📌 {{name}}",
        enterName: "اسم تسک رو وارد کن 👇",
        enterNewName: "✏️ اسم جدید تسک رو وارد کن 👇",
        created: "✅ تسک «{{name}}» ثبت شد!\nمی‌خوای شروعش کنی یا برگردی؟",
        duplicateToday: "⚠️ تسکی با این اسم امروز قبلاً ثبت شده! لطفاً اسم دیگری انتخاب کن.",
        started: "🕒 تسک شروع شد.",
        ended: "⏹️ تسک «{{name}}» پایان یافت.",
        endedAndStartedNew: "⏹️ تسک قبلی پایان یافت و تسک «{{name}}» شروع شد.",
        notRunning: "⚠️ این تسک در حال اجرا نیست.",
        activeExists: "⛔ ابتدا یک تسک فعال دارید: {{name}}\nمی‌خواید اون رو پایان بدیم و این تسک رو شروع کنیم؟",
        deleteBlocked: "⛔ تسک «{{name}}» فعاله و نمی‌شه حذفش کرد.",
        deleted: "🗑 تسک حذف شد.",
        editSaved: "✅ تغییرات ذخیره شد\nنام جدید: {{name}}",
        inProgress: "🔹 در جریان",
    },

    report: {
        title: "📊 گزارش امروز:\n",
        autoTitle: "📊 (خودکار) گزارش امروز:\n",
        total: "🧮 جمع کل امروز: {{time}}",
        now: "اکنون",
        totalLabel: "🧮 مجموع: {{time}}",
    },

    settings: {
        title: "⚙️ تنظیمات شما:",
        enabled: "✅ روشن شد",
        disabled: "❌ خاموش شد",
        languageChanged: "🌐 زبان شما به {{language}} تغییر کرد!"
    },

    cancel: {
        hint: "برای لغو می‌تونی از این استفاده کنی:",
        done: "❌ لغو شد",
    },

    reminders: {
        morning: "☀️ صبح بخیر! یادت باشه تسک‌های امروزت رو وارد کنی 📌",
        dailyFollowUp: "⏰ یادآوری دوستانه:\nاگه هنوز تسکی ثبت نکردی حتماً ثبتش کن 📌",
    },

    notifications: {
        focus: "وقت فوکوس رسیده! 💪",
        break: "وقت استراحت است! 😌",
        half: "وقت ناهاره! 🍽️",
        autoClosed: "⏹️ تسک «{{name}}» به‌صورت خودکار پایان یافت.",
        outsideHours: "⏰ خارج از ساعات مجاز کاری هست.",
        disableFocusAlerts: "غیرفعال کردن هشدارهای تمرکز"
    },

    time: {
        hours: "ساعت",
        minutes: "دقیقه",
        fromTo: "⏱ {{start}} تا {{end}}",
    },

    myFriend: "دوست من",

    welcomeMessage: `
{{name}} عزیز، سلام 👋
خوش اومدی به **Taskly Bot**! 🎯

این ربات بهت کمک می‌کنه تا تسک‌ها و زمانت رو مدیریت کنی و همیشه بدونی روی چه چیزی کار می‌کنی:

📝 ثبت تسک جدید
⏱ شروع و پایان تسک‌ها
📊 گزارش روزانه
🔔 یادآوری دوستانه
✏️ ویرایش و حذف تسک‌ها

با دکمه‌های ساده و کاربرپسند راحت می‌تونی کارهات رو مدیریت کنی ✅
    `
} as const;
