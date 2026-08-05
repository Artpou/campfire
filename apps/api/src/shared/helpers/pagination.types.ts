export interface Paginate<T> {
  results: T[];
  page: number;
  hasMore: boolean;
}
