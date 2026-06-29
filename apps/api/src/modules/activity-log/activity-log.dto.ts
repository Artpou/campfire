import { createSelectSchema } from "drizzle-zod";
import { z } from "zod";

import { paginationDto } from "@/helpers/pagination.dto";
import { activityLog, activityLogActionEnum, activityLogTypeEnum } from "./activity-log.schema";

export const activityLogSelectSchema = createSelectSchema(activityLog);
export type ActivityLog = z.infer<typeof activityLogSelectSchema>;

export type { ActivityLogAction, ActivityLogType } from "./activity-log.schema";

export const listActivityLogsDto = paginationDto.extend({
  action: z.enum(activityLogActionEnum).optional(),
  type: z.enum(activityLogTypeEnum).optional(),
});
export type ListActivityLogsQuery = z.infer<typeof listActivityLogsDto>;
