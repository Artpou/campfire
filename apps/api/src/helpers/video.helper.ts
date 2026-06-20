import ffmpeg from "fluent-ffmpeg";

import { logger } from "@/helpers/logger.helper";
import { PassThrough, Readable } from "node:stream";

export function convertMkvToMp4Stream(inputStream: NodeJS.ReadableStream): NodeJS.ReadableStream {
  const outputStream = new PassThrough();

  const command = ffmpeg(inputStream as Readable)
    .outputFormat("mp4")
    .outputOptions(["-c:v copy", "-c:a copy", "-movflags frag_keyframe+empty_moov+default_base_moof", "-f mp4"])
    .on("error", (err) => {
      logger.error("VIDEO", `Error converting MKV to MP4: ${err}`);
      outputStream.destroy(err);
    });

  command.pipe(outputStream, { end: true });
  return outputStream;
}
