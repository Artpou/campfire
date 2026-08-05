import { z } from "zod";

import { activityLogActionEnum, activityLogTypeEnum } from "./enums";
import { paginationDto } from "./pagination.dto";

export const listActivityLogsDto = paginationDto.extend({
  action: z.enum(activityLogActionEnum).optional(),
  type: z.enum(activityLogTypeEnum).optional(),
});
export type ListActivityLogsQuery = z.infer<typeof listActivityLogsDto>;
