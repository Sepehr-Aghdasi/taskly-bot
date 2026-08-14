export const nl = {
    buttons: {
        ADD_TASK: "➕ Taak toevoegen",
        TASK_LIST: "📋 Takenlijst",
        TODAY_REPORT: "📊 Dagrapport",
        SETTINGS: "⚙️ Instellingen",

        START_SELECTED_TASK: "▶️ Taak starten",
        END_SELECTED_TASK: "⏹️ Taak beëindigen",
        DELETE_SELECTED_TASK: "🗑 Taak verwijderen",
        EDIT_TASK: "✏️ Taak bewerken",

        BACK: "🔙 Terug",
        CANCEL: "❌ Annuleren",
        START_NEW_TASK_AFTER_ENDING_ACTIVE: "🔄 Vorige taak beëindigen & nieuwe starten",

        REMINDER: "🔔 Herinnering",
        FOCUS_ALERTS: "⏰ Focusmeldingen",
        LANGUAGE: "🌐 Taal"
    },

    menu: {
        main: "Hoofdmenu",
        selectTask: "Selecteer een taak:",
        noTask: "Geen taken geregistreerd.",
        noTaskToday: "Vandaag zijn er geen taken geregistreerd.",
        useButtonsOnly: "⚠️ Gebruik de knoppen om met de bot te werken."
    },

    task: {
        selected: "Geselecteerde taak:\n📌 {{name}}",
        enterName: "Voer de naam van de taak in 👇",
        enterNewName: "✏️ Voer de nieuwe naam van de taak in 👇",
        created: "✅ Taak «{{name}}» aangemaakt!\nWil je deze starten of teruggaan?",
        duplicateToday: "⚠️ Er bestaat vandaag al een taak met deze naam. Kies een andere naam.",
        started: "🕒 Taak gestart.",
        ended: "⏹️ Taak «{{name}}» beëindigd.",
        endedAndStartedNew: "⏹️ Vorige taak beëindigd en «{{name}}» gestart.",
        notRunning: "⚠️ Deze taak wordt momenteel niet uitgevoerd.",
        activeExists: "⛔ Je hebt al een actieve taak: {{name}}\nWil je die beëindigen en deze starten?",
        deleteBlocked: "⛔ Taak «{{name}}» is actief en kan niet worden verwijderd.",
        deleted: "🗑 Taak verwijderd.",
        editSaved: "✅ Wijzigingen opgeslagen\nNieuwe naam: {{name}}",
        inProgress: "🔹 Bezig",
    },

    report: {
        title: "📊 Rapport van vandaag:\n",
        autoTitle: "📊 (Automatisch) Rapport van vandaag:\n",
        total: "🧮 Totaal vandaag: {{time}}",
        now: "Nu",
        totalLabel: "🧮 Totaal: {{time}}",
    },

    settings: {
        title: "⚙️ Je instellingen:",
        enabled: "✅ Ingeschakeld",
        disabled: "❌ Uitgeschakeld",
        languageChanged: "🌐 Je taal is gewijzigd naar {{language}}!"
    },

    cancel: {
        hint: "Je kunt annuleren met deze knop:",
        done: "❌ Geannuleerd",
    },

    reminders: {
        morning: "☀️ Goedemorgen! Vergeet niet je taken van vandaag in te voeren 📌",
        dailyFollowUp: "⏰ Vriendelijke herinnering:\nAls je nog geen taak hebt geregistreerd, doe dat dan even 📌",
    },

    notifications: {
        focus: "Focustijd! 💪",
        break: "Pauzetijd! 😌",
        half: "Lunchtijd! 🍽️",
        autoClosed: "⏹️ Taak «{{name}}» is automatisch beëindigd.",
        outsideHours: "⏰ Buiten de toegestane werktijden.",
    },

    time: {
        hours: "uur",
        minutes: "minuten",
        fromTo: "⏱ {{start}} tot {{end}}",
    },

    myFriend: "Mijn vriend",

    welcomeMessage: `
Hallo {{name}} 👋
Welkom bij de **Taskly Bot**! 🎯

Deze bot helpt je je taken en tijd te beheren, zodat je altijd weet waar je aan werkt:

📝 Nieuwe taken toevoegen
⏱ Taken starten en beëindigen
📊 Dagrapporten
🔔 Vriendelijke herinneringen
✏️ Taken bewerken en verwijderen

Met eenvoudige en gebruiksvriendelijke knoppen kun je je taken gemakkelijk beheren ✅
    `,
} as const;
