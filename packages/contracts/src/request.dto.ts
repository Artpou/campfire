import { z } from "zod";

import { mediaTypeEnum } from "./enums";
import { paginationDto } from "./pagination.dto";

export const requestStatusEnum = ["pending", "validated", "cancelled"] as const;
export type RequestStatus = (typeof requestStatusEnum)[number];

export const listRequestsDto = paginationDto.extend({
  type: z.enum(mediaTypeEnum).optional(),
  status: z.enum(requestStatusEnum).optional(),
});
export type ListRequestsQuery = z.infer<typeof listRequestsDto>;
