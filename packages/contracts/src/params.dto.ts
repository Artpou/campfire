import { z } from "zod";

export const stringIdParamDto = z.object({
  id: z.string().min(1),
});

export const mediaIdParamDto = z.object({
  id: z.string().regex(/^\d+$/),
});

export const downloadMediaIdParamDto = z.object({
  mediaId: z.string().regex(/^\d+$/),
});

export const downloadFilePathParamDto = z.object({
  id: z.string().min(1),
  filePath: z.string().min(1),
});
