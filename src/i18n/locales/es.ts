export const es = {
    buttons: {
        ADD_TASK: "➕ Añadir tarea",
        TASK_LIST: "📋 Lista de tareas",
        TODAY_REPORT: "📊 Informe diario",
        SETTINGS: "⚙️ Configuración",

        START_SELECTED_TASK: "▶️ Iniciar tarea",
        END_SELECTED_TASK: "⏹️ Finalizar tarea",
        DELETE_SELECTED_TASK: "🗑 Eliminar tarea",
        EDIT_TASK: "✏️ Editar tarea",

        BACK: "🔙 Atrás",
        CANCEL: "❌ Cancelar",
        START_NEW_TASK_AFTER_ENDING_ACTIVE: "🔄 Finalizar tarea anterior y comenzar una nueva",

        REMINDER: "🔔 Recordatorio",
        FOCUS_ALERTS: "⏰ Alertas de concentración",
        LANGUAGE: "🌐 Idioma"
    },

    menu: {
        main: "Menú principal",
        selectTask: "Selecciona una tarea:",
        noTask: "No hay tareas registradas.",
        noTaskToday: "Hoy no hay tareas registradas.",
        useButtonsOnly: "⚠️ Utiliza los botones para interactuar con el bot."
    },

    task: {
        selected: "Tarea seleccionada:\n📌 {{name}}",
        enterName: "Introduce el nombre de la tarea 👇",
        enterNewName: "✏️ Introduce el nuevo nombre de la tarea 👇",
        created: "✅ ¡Tarea «{{name}}» creada!\n¿Quieres iniciarla o volver atrás?",
        duplicateToday: "⚠️ Ya existe una tarea con este nombre hoy. Elige otro nombre.",
        started: "🕒 Tarea iniciada.",
        ended: "⏹️ Tarea «{{name}}» finalizada.",
        endedAndStartedNew: "⏹️ Tarea anterior finalizada y «{{name}}» iniciada.",
        notRunning: "⚠️ Esta tarea no está en ejecución.",
        activeExists: "⛔ Ya tienes una tarea activa: {{name}}\n¿Quieres finalizarla y comenzar esta?",
        deleteBlocked: "⛔ La tarea «{{name}}» está activa y no se puede eliminar.",
        deleted: "🗑 Tarea eliminada.",
        editSaved: "✅ Cambios guardados\nNuevo nombre: {{name}}",
        inProgress: "🔹 En progreso",
    },

    report: {
        title: "📊 Informe de hoy:\n",
        autoTitle: "📊 (Automático) Informe de hoy:\n",
        total: "🧮 Total de hoy: {{time}}",
        now: "Ahora",
        totalLabel: "🧮 Total: {{time}}",
    },

    settings: {
        title: "⚙️ Tu configuración:",
        enabled: "✅ Activado",
        disabled: "❌ Desactivado",
        languageChanged: "🌐 Tu idioma ha cambiado a {{language}}!"
    },

    cancel: {
        hint: "Puedes cancelar usando este botón:",
        done: "❌ Cancelado",
    },

    reminders: {
        morning: "☀️ ¡Buenos días! No olvides introducir tus tareas de hoy 📌",
        dailyFollowUp: "⏰ Recordatorio amistoso:\nSi todavía no has registrado ninguna tarea, asegúrate de hacerlo 📌",
    },

    notifications: {
        focus: "¡Hora de concentrarse! 💪",
        break: "¡Hora de descansar! 😌",
        half: "¡Hora de comer! 🍽️",
        autoClosed: "⏹️ La tarea «{{name}}» se finalizó automáticamente.",
        outsideHours: "⏰ Fuera del horario laboral permitido.",
    },

    time: {
        hours: "horas",
        minutes: "minutos",
        fromTo: "⏱ {{start}} a {{end}}",
    },

    myFriend: "Mi amigo",

    welcomeMessage: `
Hola {{name}} 👋
¡Bienvenido a **Taskly Bot**! 🎯

Este bot te ayuda a gestionar tus tareas y tu tiempo, para que siempre sepas en qué estás trabajando:

📝 Añadir nuevas tareas
⏱ Iniciar y finalizar tareas
📊 Informes diarios
🔔 Recordatorios amistosos
✏️ Editar y eliminar tareas

Con botones sencillos y fáciles de usar, puedes gestionar tus tareas fácilmente ✅
    `,
} as const;
