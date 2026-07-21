export interface ILoginUserPayload {
    email: string;
    password: string;
}

export interface IRegisterUserPayload {
    name: string;
    email: string;
    password: string;
    contactNumber?: string;
}

export interface IChangePasswordPayload {
    currentPassword: string;
    newPassword: string;
}

export interface IUpdateProfilePayload {
    name?: string;
    contactNumber?: string | null;
    image?: string | null;
}
