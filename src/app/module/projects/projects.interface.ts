import { Priority, ProjectStatus } from "../../../generated/prisma/client";

export interface CreateProjectPayload {
  name: string;
  description?: string;
  status: ProjectStatus;
  priority: Priority;
  progress: number;
  startDate?: string | Date | null;
  endDate?: string | Date | null;
  workspaceId: string;
  teamLeadId?: string;
}

export interface UpdateProjectPayload {
  name?: string;
  description?: string | null;
  status?: ProjectStatus;
  priority?: Priority;
  startDate?: string | Date | null;
  endDate?: string | Date | null;
  teamLeadId?: string | null;
}
