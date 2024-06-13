import { env } from "../../env";
type LoggerDepth = { depth: number } | null | undefined;

interface LoggerOptions {
  data?: any;
  depth?: LoggerDepth;
  retainLogs?: boolean;
  msg?: string;
  pointer?: boolean;
}

const isProduction = env.NODE_ENV === "production";

export function logger(
  tag: string,
  {
    data,
    depth = null,
    retainLogs = false,
    msg = "",
    pointer = false,
  }: LoggerOptions = {}
) {
  if (!retainLogs && isProduction) return;
  const fullTag = pointer ? `➫ [${tag}]` : `[${tag}]`;
  console.log(fullTag, msg);
  if (data) console.dir(data, { depth });
}
