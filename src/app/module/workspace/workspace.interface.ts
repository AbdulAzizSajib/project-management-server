export interface IcreateWorkspacePayload {
    name: string;
    description?: string;
    slug: string;
    ownerId: string;
    image?: string;
}

export interface IUpdateWorkspacePayload {
    name?: string;
    description?: string | null;
    slug?: string;
    image?: string;
}
