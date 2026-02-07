export interface TimeBlock {
    type: TimeBlockTypes;
    startTime: string; // HH:MM:SS format
    endTime: string; // HH:MM:SS format
}

export type TimeBlockTypes = "Break" | "Focus" | "Half";
