import { env } from "../../env";

interface LoggerOptions {
  data?: any;
  depth?: number | null | undefined;
  retainLogs?: boolean;
  msg?: string;
  pointer?: boolean;
}

const isProduction = env.NODE_ENV === "production";

export function logger(
  tag: string,
  {
    data,
    depth = 2,
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

export function loggerTable(
  tag: string,
  {
    data,
    retainLogs = false,
    msg = "",
    pointer = false,
  }: LoggerOptions = {}
) {
  if (!retainLogs && isProduction) return;
  const fullTag = pointer ? `➫ [${tag}]` : `[${tag}]`;
  console.log(fullTag, msg);
  if (data) console.table(data);
}
