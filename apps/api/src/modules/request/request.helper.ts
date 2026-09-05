import { logger } from "@/shared/helpers/logger.helper";

import { requestRepository } from "@/modules/request/request.repository";

/** Shared auto-validate path for RequestService and download-complete handlers. */
export async function validatePendingRequestsForMedia(mediaId: number): Promise<void> {
  await requestRepository.validatePendingByMediaId(mediaId);
  logger.info("REQUEST", `Auto-validated pending requests for media ${mediaId}`);
}
