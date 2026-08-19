import * as activityLogSchema from "@/modules/activity/activity.schema";
import * as authSchema from "@/modules/auth/auth.schema";
import * as downloadSchema from "@/modules/download/download.schema";
import * as mediaSchema from "@/modules/media/media.schema";
import * as moduleSchema from "@/modules/module/module.schema";
import * as requestSchema from "@/modules/request/request.schema";
import * as userSchema from "@/modules/user/user.schema";

export const schema = {
  ...activityLogSchema,
  ...authSchema,
  ...downloadSchema,
  ...mediaSchema,
  ...moduleSchema,
  ...requestSchema,
  ...userSchema,
};
