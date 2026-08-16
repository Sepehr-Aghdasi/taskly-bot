export const fr = {
    buttons: {
        ADD_TASK: "➕ Ajouter une tâche",
        TASK_LIST: "📋 Liste des tâches",
        TODAY_REPORT: "📊 Rapport quotidien",
        SETTINGS: "⚙️ Paramètres",

        START_SELECTED_TASK: "▶️ Démarrer la tâche",
        END_SELECTED_TASK: "⏹️ Terminer la tâche",
        DELETE_SELECTED_TASK: "🗑 Supprimer la tâche",
        EDIT_TASK: "✏️ Modifier la tâche",

        BACK: "🔙 Retour",
        CANCEL: "❌ Annuler",
        START_NEW_TASK_AFTER_ENDING_ACTIVE: "🔄 Terminer la tâche précédente & en démarrer une nouvelle",

        REMINDER: "🔔 Rappel",
        FOCUS_ALERTS: "⏰ Alertes de concentration",
        LANGUAGE: "🌐 Langue"
    },

    menu: {
        main: "Menu principal",
        selectTask: "Sélectionnez une tâche :",
        noTask: "Aucune tâche enregistrée.",
        noTaskToday: "Aucune tâche enregistrée aujourd'hui.",
        useButtonsOnly: "⚠️ Veuillez utiliser les boutons pour interagir avec le bot."
    },

    task: {
        selected: "Tâche sélectionnée :\n📌 {{name}}",
        enterName: "Entrez le nom de la tâche 👇",
        enterNewName: "✏️ Entrez le nouveau nom de la tâche 👇",
        created: "✅ Tâche «{{name}}» créée !\nVoulez-vous la démarrer ou revenir en arrière ?",
        duplicateToday: "⚠️ Une tâche portant ce nom existe déjà aujourd'hui. Veuillez choisir un autre nom.",
        started: "🕒 Tâche démarrée.",
        ended: "⏹️ Tâche «{{name}}» terminée.",
        endedAndStartedNew: "⏹️ Tâche précédente terminée et «{{name}}» démarrée.",
        notRunning: "⚠️ Cette tâche n'est pas en cours.",
        activeExists: "⛔ Vous avez déjà une tâche active : {{name}}\nVoulez-vous la terminer et démarrer celle-ci ?",
        deleteBlocked: "⛔ La tâche «{{name}}» est active et ne peut pas être supprimée.",
        deleted: "🗑 Tâche supprimée.",
        editSaved: "✅ Modifications enregistrées\nNouveau nom : {{name}}",
        inProgress: "🔹 En cours",
    },

    report: {
        title: "📊 Rapport d'aujourd'hui :\n",
        autoTitle: "📊 (Automatique) Rapport d'aujourd'hui :\n",
        total: "🧮 Total aujourd'hui : {{time}}",
        now: "Maintenant",
        totalLabel: "🧮 Total : {{time}}",
    },

    settings: {
        title: "⚙️ Vos paramètres :",
        enabled: "✅ Activé",
        disabled: "❌ Désactivé",
        languageChanged: "🌐 Votre langue a été changée en {{language}} !"
    },

    cancel: {
        hint: "Vous pouvez annuler avec ce bouton :",
        done: "❌ Annulé",
    },

    reminders: {
        morning: "☀️ Bonjour ! N'oubliez pas d'ajouter vos tâches du jour 📌",
        dailyFollowUp: "⏰ Petit rappel :\nSi vous n'avez pas encore enregistré de tâche, pensez à le faire 📌",
    },

    notifications: {
        focus: "C'est l'heure de se concentrer ! 💪",
        break: "C'est l'heure de faire une pause ! 😌",
        half: "C'est l'heure du déjeuner ! 🍽️",
        autoClosed: "⏹️ La tâche «{{name}}» a été terminée automatiquement.",
        outsideHours: "⏰ En dehors des heures de travail autorisées.",
    },

    time: {
        hours: "heures",
        minutes: "minutes",
        fromTo: "⏱ {{start}} à {{end}}",
    },

    myFriend: "Mon ami",

    welcomeMessage: `
Bonjour {{name}} 👋
Bienvenue sur **Taskly Bot** ! 🎯

Ce bot vous aide à gérer vos tâches et votre temps, afin que vous sachiez toujours sur quoi vous travaillez :

📝 Ajouter de nouvelles tâches
⏱ Démarrer et terminer les tâches
📊 Rapports quotidiens
🔔 Rappels amicaux
✏️ Modifier et supprimer des tâches

Grâce à des boutons simples et faciles à utiliser, vous pouvez gérer vos tâches en toute simplicité ✅
    `,
} as const;
