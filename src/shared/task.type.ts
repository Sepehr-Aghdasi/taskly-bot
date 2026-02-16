export interface BaseTask {
    id: number;
    name: string;
    userId: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface TaskSession {
    id: number;
    startTime: Date;
    endTime: Date;
    duration: number;
    taskId: number;
}

export interface TaskWithSessions extends BaseTask {
    sessions: TaskSession[];
}
