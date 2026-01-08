export interface Chat {
    id: string;
    title: string;
    preview: string;
    createdAt: string;
    updatedAt: string;
}

export interface ChatUpdate {
    title?: string;
}
