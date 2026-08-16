export const de = {
    buttons: {
        ADD_TASK: "➕ Aufgabe hinzufügen",
        TASK_LIST: "📋 Aufgabenliste",
        TODAY_REPORT: "📊 Tagesbericht",
        SETTINGS: "⚙️ Einstellungen",

        START_SELECTED_TASK: "▶️ Aufgabe starten",
        END_SELECTED_TASK: "⏹️ Aufgabe beenden",
        DELETE_SELECTED_TASK: "🗑 Aufgabe löschen",
        EDIT_TASK: "✏️ Aufgabe bearbeiten",

        BACK: "🔙 Zurück",
        CANCEL: "❌ Abbrechen",
        START_NEW_TASK_AFTER_ENDING_ACTIVE: "🔄 Vorherige Aufgabe beenden & neue starten",

        REMINDER: "🔔 Erinnerung",
        FOCUS_ALERTS: "⏰ Fokus-Erinnerungen",
        LANGUAGE: "🌐 Sprache"
    },

    menu: {
        main: "Hauptmenü",
        selectTask: "Aufgabe auswählen:",
        noTask: "Keine Aufgaben vorhanden.",
        noTaskToday: "Heute wurden keine Aufgaben eingetragen.",
        useButtonsOnly: "⚠️ Bitte benutze die Schaltflächen, um mit dem Bot zu interagieren."
    },

    task: {
        selected: "Ausgewählte Aufgabe:\n📌 {{name}}",
        enterName: "Gib den Namen der Aufgabe ein 👇",
        enterNewName: "✏️ Gib den neuen Aufgabennamen ein 👇",
        created: "✅ Aufgabe «{{name}}» erstellt!\nMöchtest du sie starten oder zurückgehen?",
        duplicateToday: "⚠️ Eine Aufgabe mit diesem Namen existiert heute bereits. Bitte wähle einen anderen Namen.",
        started: "🕒 Aufgabe gestartet.",
        ended: "⏹️ Aufgabe «{{name}}» beendet.",
        endedAndStartedNew: "⏹️ Vorherige Aufgabe beendet und «{{name}}» gestartet.",
        notRunning: "⚠️ Diese Aufgabe läuft derzeit nicht.",
        activeExists: "⛔ Du hast bereits eine aktive Aufgabe: {{name}}\nMöchtest du sie beenden und diese starten?",
        deleteBlocked: "⛔ Aufgabe «{{name}}» ist aktiv und kann nicht gelöscht werden.",
        deleted: "🗑 Aufgabe gelöscht.",
        editSaved: "✅ Änderungen gespeichert\nNeuer Name: {{name}}",
        inProgress: "🔹 In Bearbeitung",
    },

    report: {
        title: "📊 Heutiger Bericht:\n",
        autoTitle: "📊 (Automatisch) Heutiger Bericht:\n",
        total: "🧮 Heute insgesamt: {{time}}",
        now: "Jetzt",
        totalLabel: "🧮 Gesamt: {{time}}",
    },

    settings: {
        title: "⚙️ Deine Einstellungen:",
        enabled: "✅ Aktiviert",
        disabled: "❌ Deaktiviert",
        languageChanged: "🌐 Deine Sprache wurde auf {{language}} geändert!"
    },

    cancel: {
        hint: "Du kannst mit dieser Schaltfläche abbrechen:",
        done: "❌ Abgebrochen",
    },

    reminders: {
        morning: "☀️ Guten Morgen! Vergiss nicht, deine heutigen Aufgaben einzutragen 📌",
        dailyFollowUp: "⏰ Freundliche Erinnerung:\nWenn du noch keine Aufgabe eingetragen hast, hol das bitte nach 📌",
    },

    notifications: {
        focus: "Fokuszeit! 💪",
        break: "Pausenzeit! 😌",
        half: "Mittagspause! 🍽️",
        autoClosed: "⏹️ Aufgabe «{{name}}» wurde automatisch beendet.",
        outsideHours: "⏰ Außerhalb der erlaubten Arbeitszeiten.",
    },

    time: {
        hours: "Stunden",
        minutes: "Minuten",
        fromTo: "⏱ {{start}} bis {{end}}",
    },

    myFriend: "Mein Freund",

    welcomeMessage: `
Hallo {{name}} 👋
Willkommen beim **Taskly Bot**! 🎯

Dieser Bot hilft dir, deine Aufgaben und Zeit zu verwalten, damit du immer weißt, woran du gerade arbeitest:

📝 Neue Aufgaben hinzufügen
⏱ Aufgaben starten und beenden
📊 Tagesberichte
🔔 Freundliche Erinnerungen
✏️ Aufgaben bearbeiten und löschen

Mit einfachen und benutzerfreundlichen Schaltflächen kannst du deine Aufgaben ganz leicht verwalten ✅
    `,
} as const;
