import * as activityLogSchema from "@/modules/activity-log/activity-log.schema";
import * as authSchema from "@/modules/auth/auth.schema";
import * as downloadSchema from "@/modules/download/download.schema";
import * as indexerManagerSchema from "@/modules/indexer-manager/indexer-manager.schema";
import * as mediaSchema from "@/modules/media/media.schema";
import * as requestSchema from "@/modules/request/request.schema";
import * as settingsSchema from "@/modules/settings/settings.schema";
import * as storageConfigSchema from "@/modules/storage-config/storage-config.schema";
import * as userSchema from "@/modules/user/user.schema";

export const schema = {
  ...activityLogSchema,
  ...authSchema,
  ...downloadSchema,
  ...indexerManagerSchema,
  ...mediaSchema,
  ...settingsSchema,
  ...requestSchema,
  ...storageConfigSchema,
  ...userSchema,
};
