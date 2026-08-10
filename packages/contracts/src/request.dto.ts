import { z } from "zod";

import { mediaTypeEnum } from "./enums";
import { paginationDto } from "./pagination.dto";

export const listRequestsDto = paginationDto.extend({
  type: z.enum(mediaTypeEnum).optional(),
});
export type ListRequestsQuery = z.infer<typeof listRequestsDto>;
