import { writeRequestToStream } from "./request-writer.ts";
import { parseResponseFromStream } from "./response-parser.ts";

export function fetchFor(
  conn: Deno.Conn,
): (req: Request) => Promise<Response> {
  return async (req) => {
    await writeRequestToStream(req, conn.writable);

    const res = await parseResponseFromStream(conn.readable);

    return res;
  };
}
