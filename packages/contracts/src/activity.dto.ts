import { z } from "zod";

import { activityActionEnum, activityCategoryEnum, activityTypeEnum } from "./enums";
import { paginationDto } from "./pagination.dto";

export const listActivityDto = paginationDto.extend({
  action: z.enum(activityActionEnum).optional(),
  type: z.enum(activityTypeEnum).optional(),
  category: z.enum(activityCategoryEnum).optional(),
  q: z.string().max(256).optional(),
});
export type ListActivityQuery = z.infer<typeof listActivityDto>;
