import { IUser, IEditUser } from '../model/IUser';
declare const userService: {
    create: (data: IUser) => Promise<{
        username: string;
        role: string;
        password: string;
        id: number;
    }>;
    getById: (id: number) => Promise<{
        username: string;
        role: string;
        password: string;
        id: number;
    } | null>;
    getByUsername: (username: string) => Promise<{
        username: string;
        role: string;
        password: string;
        id: number;
    } | null>;
    update: (id: number, data: IEditUser) => Promise<{
        username: string;
        role: string;
        password: string;
        id: number;
    }>;
    delete: (id: number) => Promise<{
        username: string;
        role: string;
        password: string;
        id: number;
    }>;
};
export default userService;
//# sourceMappingURL=userService.d.ts.map