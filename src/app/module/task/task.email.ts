import { envVars } from "../../config/env";
import { sendEmail } from "../../utils/email";

/*
==================================================================
  TASK EMAIL HELPERS — assign + overdue email ek jaygay
==================================================================
  taskNotification.ejs template ke dui kaje reuse kore. Email fail
  hole mul flow (assign / cron) jeno break na kore — tai eikhane
  try/catch kore shudhu log kori, throw kori na.
==================================================================
*/

// TaskDetails page er frontend URL banai (Navbar link er motoi pattern)
const buildTaskUrl = (projectId: string, taskId: string) =>
  `${envVars.FRONTEND_URL}/taskDetails?projectId=${projectId}&taskId=${taskId}`;

interface TaskEmailInput {
  to: string;
  recipientName: string;
  taskTitle: string;
  projectName: string;
  projectId: string;
  taskId: string;
  dueDate?: Date | null;
}

// Task assign howar por assignee ke email
export const sendTaskAssignedEmail = async (input: TaskEmailInput) => {
  try {
    await sendEmail({
      to: input.to,
      subject: `New task assigned: ${input.taskTitle}`,
      templateName: "taskNotification",
      templateData: {
        heading: "A task was assigned to you",
        recipientName: input.recipientName,
        message: `You have been assigned to the task "${input.taskTitle}".`,
        taskTitle: input.taskTitle,
        projectName: input.projectName,
        dueDate: input.dueDate ?? null,
        taskUrl: buildTaskUrl(input.projectId, input.taskId),
        isOverdue: false,
      },
    });
  } catch (error) {
    console.error("Failed to send task-assigned email:", error);
  }
};

// Task overdue hole assignee ke reminder email (cron theke)
export const sendTaskOverdueEmail = async (input: TaskEmailInput) => {
  try {
    await sendEmail({
      to: input.to,
      subject: `Overdue task: ${input.taskTitle}`,
      templateName: "taskNotification",
      templateData: {
        heading: "A task is overdue",
        recipientName: input.recipientName,
        message: `The task "${input.taskTitle}" has passed its due date and is not done yet.`,
        taskTitle: input.taskTitle,
        projectName: input.projectName,
        dueDate: input.dueDate ?? null,
        taskUrl: buildTaskUrl(input.projectId, input.taskId),
        isOverdue: true,
      },
    });
  } catch (error) {
    console.error("Failed to send task-overdue email:", error);
  }
};
