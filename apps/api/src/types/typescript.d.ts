export type ExcludeFunctions<T> = {
  // biome-ignore lint/complexity/noBannedTypes: we want to exclude functions
  [K in keyof T as T[K] extends Function ? never : K]: T[K];
};
