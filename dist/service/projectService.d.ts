import { IProject } from '../model/Project/projectModel';
declare const projectService: {
    create: (data: IProject) => Promise<{
        id: number;
        name: string;
        description: string | null;
        startDate: Date | null;
        endDate: Date | null;
        status: string;
        tutorId: number | null;
    }>;
    getAll: () => Promise<({
        participants: {
            username: string;
            role: string;
            password: string;
            id: number;
        }[];
    } & {
        id: number;
        name: string;
        description: string | null;
        startDate: Date | null;
        endDate: Date | null;
        status: string;
        tutorId: number | null;
    })[]>;
    getById: (id: number) => Promise<{
        id: number;
        name: string;
        description: string | null;
        startDate: Date | null;
        endDate: Date | null;
        status: string;
        tutorId: number | null;
    } | null>;
    update: (id: number, data: Partial<IProject>) => Promise<{
        id: number;
        name: string;
        description: string | null;
        startDate: Date | null;
        endDate: Date | null;
        status: string;
        tutorId: number | null;
    }>;
    delete: (id: number) => Promise<{
        id: number;
        name: string;
        description: string | null;
        startDate: Date | null;
        endDate: Date | null;
        status: string;
        tutorId: number | null;
    }>;
};
export default projectService;
//# sourceMappingURL=projectService.d.ts.map