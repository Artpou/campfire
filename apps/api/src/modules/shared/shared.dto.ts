import z from "zod";

export const idsSchema = z.array(z.string());
export type Ids = typeof idsSchema._input;
