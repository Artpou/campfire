import type { ListRequestsQuery, MediaInput } from "@seedarr/contracts";

import { BadRequestError, ConflictError, ForbiddenError } from "@/shared/errors/error";
import { toPaginate } from "@/shared/helpers/pagination.helper";
import type { Paginate } from "@/shared/helpers/pagination.types";
import { AuthenticatedService } from "@/shared/services/authenticated.service";

import { ROLE_LEVELS } from "@/modules/auth/role.guard";
import { mediaRepository } from "@/modules/media/media.repository";
import { type RequestEnriched, requestRepository } from "@/modules/request/request.repository";

export type RequestWithUser = RequestEnriched;

export class RequestService extends AuthenticatedService {
  async create(input: MediaInput): Promise<RequestWithUser> {
    if (!input.id) throw new BadRequestError("Media ID is required");

    if (!(await mediaRepository.exists(input.id))) await mediaRepository.upsert(input);

    const existing = await requestRepository.findByUserAndMedia(this.user.id, input.id);
    if (existing && existing.status === "pending") throw new ConflictError("Request already exists");

    if (existing) return requestRepository.reopenExisting(existing.id);

    return requestRepository.insert(this.user.id, input.id);
  }

  async list(query: ListRequestsQuery): Promise<Paginate<RequestWithUser>> {
    const { page = 1, limit = 20 } = query;
    const rows = await requestRepository.list(query);
    return toPaginate(rows, { page, limit });
  }

  async listByUser(userId: string): Promise<RequestWithUser[]> {
    return requestRepository.listByUser(userId);
  }

  async cancel(requestId: string): Promise<void> {
    if (this.roleLevel < ROLE_LEVELS.admin) throw new ForbiddenError();
    await requestRepository.get(requestId);
    await requestRepository.cancel(requestId);
  }

  async validate(requestId: string): Promise<void> {
    await requestRepository.get(requestId);
    await requestRepository.validate(requestId);
  }

  async validateByMedia(mediaId: number): Promise<void> {
    await requestRepository.validatePendingByMediaId(mediaId);
  }

  async reopen(requestId: string): Promise<void> {
    const request = await requestRepository.get(requestId);
    if (request.status !== "cancelled") throw new BadRequestError("Only cancelled requests can be reopened");
    await requestRepository.reopen(requestId);
  }

  async remove(requestId: string): Promise<void> {
    await requestRepository.get(requestId);
    await requestRepository.remove(requestId);
  }
}
