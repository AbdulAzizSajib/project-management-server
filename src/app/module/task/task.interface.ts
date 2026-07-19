import {
  Priority,
  TaskStatus,
  TaskType,
} from "../../../generated/prisma/client";

export interface CreateTaskPayload {
  title: string;
  description?: string | null;
  type?: TaskType;
  status?: TaskStatus;
  priority?: Priority;
  assigneeId?: string | null;
  dueDate?: string | Date | null;
}

export interface UpdateTaskPayload {
  title?: string;
  description?: string | null;
  type?: TaskType;
  priority?: Priority;
  assigneeId?: string | null;
  dueDate?: string | Date | null;
}

export interface TaskFilters {
  status?: TaskStatus;
  type?: TaskType;
  priority?: Priority;
  assigneeId?: string;
}
