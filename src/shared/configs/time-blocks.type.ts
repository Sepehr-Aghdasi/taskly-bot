export interface TimeBlock {
    type: TimeBlockType;
    startTime: string; // HH:MM:SS format
    endTime: string; // HH:MM:SS format
}

export type TimeBlockType = "Break" | "Focus";
