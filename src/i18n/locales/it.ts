export const it = {
    buttons: {
        ADD_TASK: "➕ Aggiungi attività",
        TASK_LIST: "📋 Elenco attività",
        TODAY_REPORT: "📊 Report giornaliero",
        SETTINGS: "⚙️ Impostazioni",

        START_SELECTED_TASK: "▶️ Avvia attività",
        END_SELECTED_TASK: "⏹️ Termina attività",
        DELETE_SELECTED_TASK: "🗑 Elimina attività",
        EDIT_TASK: "✏️ Modifica attività",

        BACK: "🔙 Indietro",
        CANCEL: "❌ Annulla",
        START_NEW_TASK_AFTER_ENDING_ACTIVE: "🔄 Termina attività precedente e avviane una nuova",

        REMINDER: "🔔 Promemoria",
        FOCUS_ALERTS: "⏰ Avvisi di concentrazione",
        LANGUAGE: "🌐 Lingua"
    },

    menu: {
        main: "Menu principale",
        selectTask: "Seleziona un'attività:",
        noTask: "Nessuna attività registrata.",
        noTaskToday: "Nessuna attività registrata oggi.",
        useButtonsOnly: "⚠️ Usa i pulsanti per interagire con il bot."
    },

    task: {
        selected: "Attività selezionata:\n📌 {{name}}",
        enterName: "Inserisci il nome dell'attività 👇",
        enterNewName: "✏️ Inserisci il nuovo nome dell'attività 👇",
        created: "✅ Attività «{{name}}» creata!\nVuoi avviarla o tornare indietro?",
        duplicateToday: "⚠️ Oggi esiste già un'attività con questo nome. Scegli un altro nome.",
        started: "🕒 Attività avviata.",
        ended: "⏹️ Attività «{{name}}» terminata.",
        endedAndStartedNew: "⏹️ Attività precedente terminata e «{{name}}» avviata.",
        notRunning: "⚠️ Questa attività non è attualmente in esecuzione.",
        activeExists: "⛔ Hai già un'attività attiva: {{name}}\nVuoi terminarla e avviare questa?",
        deleteBlocked: "⛔ L'attività «{{name}}» è attiva e non può essere eliminata.",
        deleted: "🗑 Attività eliminata.",
        editSaved: "✅ Modifiche salvate\nNuovo nome: {{name}}",
        inProgress: "🔹 In corso",
    },

    report: {
        title: "📊 Report di oggi:\n",
        autoTitle: "📊 (Automatico) Report di oggi:\n",
        total: "🧮 Totale di oggi: {{time}}",
        now: "Ora",
        totalLabel: "🧮 Totale: {{time}}",
    },

    settings: {
        title: "⚙️ Le tue impostazioni:",
        enabled: "✅ Attivato",
        disabled: "❌ Disattivato",
        languageChanged: "🌐 La tua lingua è stata cambiata in {{language}}!"
    },

    cancel: {
        hint: "Puoi annullare usando questo pulsante:",
        done: "❌ Annullato",
    },

    reminders: {
        morning: "☀️ Buongiorno! Non dimenticare di inserire le attività di oggi 📌",
        dailyFollowUp: "⏰ Promemoria amichevole:\nSe non hai ancora registrato alcuna attività, ricordati di farlo 📌",
    },

    notifications: {
        focus: "È ora di concentrarsi! 💪",
        break: "È ora di fare una pausa! 😌",
        half: "È ora di pranzo! 🍽️",
        autoClosed: "⏹️ L'attività «{{name}}» è stata terminata automaticamente.",
        outsideHours: "⏰ Al di fuori dell'orario di lavoro consentito.",
    },

    time: {
        hours: "ore",
        minutes: "minuti",
        fromTo: "⏱ {{start}} - {{end}}",
    },

    myFriend: "Mio amico",

    welcomeMessage: `
Ciao {{name}} 👋
Benvenuto su **Taskly Bot**! 🎯

Questo bot ti aiuta a gestire le tue attività e il tuo tempo, così sai sempre su cosa stai lavorando:

📝 Aggiungi nuove attività
⏱ Avvia e termina le attività
📊 Report giornalieri
🔔 Promemoria amichevoli
✏️ Modifica ed elimina le attività

Con pulsanti semplici e intuitivi, puoi gestire facilmente le tue attività ✅
    `,
} as const;
