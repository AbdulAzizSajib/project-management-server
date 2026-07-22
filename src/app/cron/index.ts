import cron from "node-cron";
import { sendOverdueTaskReminders } from "../module/task/task.reminder";

/*
==================================================================
  CRON JOBS — server chalu howar por schedule hoy
==================================================================
  Overdue task reminder: protidin sokal 8 ta (server time) e chole।
  task.reminder er nijer duplicate-guard ache, tai din e ekbar
  cholai jothesto — kintu barbar chalaleও spam hobe na।
==================================================================
*/

export const registerCronJobs = () => {
  // protidin 08:00 e overdue reminder
  cron.schedule("0 8 * * *", async () => {
    try {
      const result = await sendOverdueTaskReminders();
      console.log(
        `[cron] overdue reminders: scanned ${result.scanned}, notified ${result.notified}`,
      );
    } catch (error) {
      console.error("[cron] overdue reminder failed:", error);
    }
  });

  console.log("[cron] jobs registered");
};
