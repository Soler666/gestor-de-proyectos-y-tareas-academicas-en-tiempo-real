import { ITask } from '../model/Task/taskModel';
declare const taskService: {
    create: (data: ITask) => Promise<{
        id: number;
        name: string;
        description: string | null;
        status: string;
        projectId: number;
        responsibleId: number;
        dueDate: Date | null;
        priority: string;
    }>;
    getAll: () => Promise<{
        id: number;
        name: string;
        description: string | null;
        status: string;
        projectId: number;
        responsibleId: number;
        dueDate: Date | null;
        priority: string;
    }[]>;
    getById: (id: number) => Promise<{
        id: number;
        name: string;
        description: string | null;
        status: string;
        projectId: number;
        responsibleId: number;
        dueDate: Date | null;
        priority: string;
    } | null>;
    update: (id: number, data: Partial<ITask>) => Promise<{
        id: number;
        name: string;
        description: string | null;
        status: string;
        projectId: number;
        responsibleId: number;
        dueDate: Date | null;
        priority: string;
    }>;
    delete: (id: number) => Promise<{
        id: number;
        name: string;
        description: string | null;
        status: string;
        projectId: number;
        responsibleId: number;
        dueDate: Date | null;
        priority: string;
    }>;
};
export default taskService;
//# sourceMappingURL=taskService.d.ts.map