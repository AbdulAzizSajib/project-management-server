export interface IcreateWorkspacePayload {
    name: string;
    description?: string;
    slug: string;
    ownerId: string;
    image?: string;
}
