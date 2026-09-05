import * as activityLogSchema from "@/modules/activity/activity.schema";
import * as authSchema from "@/modules/auth/auth.schema";
import * as downloadSchema from "@/modules/download/download.schema";
import * as mediaRelationsSchema from "@/modules/media/media.relations";
import * as mediaSchema from "@/modules/media/media.schema";
import * as moduleSchema from "@/modules/module/module.schema";
import * as requestSchema from "@/modules/request/request.schema";
import * as userSchema from "@/modules/user/user.schema";

export const schema = {
  ...activityLogSchema,
  ...authSchema,
  ...downloadSchema,
  ...mediaSchema,
  ...mediaRelationsSchema,
  ...moduleSchema,
  ...requestSchema,
  ...userSchema,
};
