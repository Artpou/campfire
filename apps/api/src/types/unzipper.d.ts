declare module "unzipper" {
  export interface ZipEntry {
    path: string;
    buffer(): Promise<Buffer>;
  }

  export interface OpenDirectory {
    files: ZipEntry[];
  }

  export const Open: {
    buffer(buffer: Buffer): Promise<OpenDirectory>;
  };
}
