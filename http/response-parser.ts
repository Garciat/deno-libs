import { concat } from "@std/bytes/concat";

const CR = 13; // "\r"
const LF = 10; // "\n"

export async function parseResponseFromStream(
  stream: ReadableStream<Uint8Array>,
): Promise<Response> {
  const decoder = new ResponseDecoder(stream);
  return await decoder.decode();
}

class ResponseDecoder {
  #reader: ReadableStreamDefaultReader<Uint8Array>;
  // INVARIANT: there is always at least one chunk
  #chunks: Uint8Array[] = [new Uint8Array()];
  #pos = 0; // index into the last chunk
  #done = false;

  constructor(
    private readonly stream: ReadableStream<Uint8Array>,
  ) {
    this.#reader = stream.getReader();
  }

  async decode(): Promise<Response> {
    const { status, statusText } = await this.decodeStatusLine();
    const headers = await this.decodeHeaders();

    if (headers.get("transfer-encoding") === "chunked") {
      const stream = this.chunkedBodyStream((trailers) => {
        this.#reader.releaseLock();
        if (Array.from(trailers.keys()).length > 0) {
          // https://github.com/whatwg/fetch/issues/981
          throw new Error("trailers not supported");
        }
      });
      return new Response(stream, { status, statusText, headers });
    } else if (headers.has("content-length")) {
      const contentLength = parseInt(headers.get("content-length")!);
      const body = await this.read(contentLength);
      this.#reader.releaseLock();
      return new Response(body, { status, statusText, headers });
    } else {
      throw new Error("unknown body encoding");
    }
  }

  private async decodeStatusLine(): Promise<
    { status: number; statusText: string }
  > {
    const line = await this.readToCRLF();
    return parseResponseStatusLine(new TextDecoder().decode(line));
  }

  private async decodeHeaders(): Promise<Headers> {
    const headers = new Headers();
    while (true) {
      const line = await this.readToCRLF();
      if (line.length === 0) {
        return headers;
      }
      const [key, value] = parseHeaderLine(line);
      headers.append(key, value);
    }
  }

  private chunkedBodyStream(
    onDone: (trailers: Headers) => void,
  ): ReadableStream<Uint8Array> {
    return new ReadableStream<Uint8Array>({
      pull: async (controller) => {
        const chunkSize = await this.readChunkSize();

        if (chunkSize === 0) {
          const trailers = await this.decodeHeaders();
          controller.close();
          return onDone(trailers);
        }

        const chunk = await this.read(chunkSize);
        await this.consumeValue(CR);
        await this.consumeValue(LF);

        controller.enqueue(chunk);
      },
    });
  }

  private async readChunkSize(): Promise<number> {
    const decoder = new TextDecoder();
    const line = await this.readToCRLF();
    const text = decoder.decode(line);
    const semicolon = text.indexOf(";");
    const hex = semicolon === -1 ? text : text.slice(0, semicolon);
    if (hex.length > 8) {
      throw new Error("invalid chunk size");
    }
    const value = parseInt(hex, 16);
    if (isNaN(value)) {
      throw new Error("invalid chunk size");
    }
    return value;
  }

  // NOTE: consumes the CRLF, but does not include it in the result
  private async readToCRLF(): Promise<Uint8Array> {
    const start = this.tell();

    await this.consumeUntil(CR, { consumeDelimiter: true });
    await this.consumeValue(LF);

    const end = this.tell();

    return this.concat(start, end).slice(0, -2);
  }

  private async read(n: number): Promise<Uint8Array> {
    const start = this.tell();
    await this.consumeN(n);
    const end = this.tell();
    return this.concat(start, end);
  }

  private async consumeN(n: number): Promise<void> {
    while (n > 0) {
      if (this.currentChunkConsumed) {
        await this.loadChunk();
      }
      const m = Math.min(n, this.bytesUnread);
      this.advance(m);
      n -= m;
    }
  }

  private async consumeUntil(
    value: number,
    options?: { consumeDelimiter: boolean },
  ): Promise<void> {
    while (true) {
      if (this.currentChunkConsumed) {
        await this.loadChunk();
      }
      const i = this.currentChunk.indexOf(value, this.#pos);
      if (i === -1) {
        this.seekToEnd();
      } else {
        this.seekTo(i);
        if (options?.consumeDelimiter) {
          this.advance(1);
        }
        return;
      }
    }
  }

  private async consumeValue(value: number): Promise<void> {
    if (this.currentChunkConsumed) {
      await this.loadChunk();
    }
    if (this.currentByte !== value) {
      throw new Error("invalid chunked encoding");
    }
    this.advance(1);
  }

  private async loadChunk(): Promise<void> {
    if (!this.currentChunkConsumed) {
      throw new Error("chunk not fully consumed");
    }
    if (this.#done) {
      throw new Error("no more data");
    }
    const { done, value } = await this.#reader.read();
    this.#done = done;
    if (value) {
      this.#chunks.push(value);
      this.#pos = 0;
    } else {
      throw new Error("no more data");
    }
  }

  private get currentChunk(): Uint8Array {
    return this.#chunks[this.#chunks.length - 1];
  }

  private get currentByte(): number {
    return this.currentChunk[this.#pos];
  }

  private get bytesUnread(): number {
    return this.currentChunk.length - this.#pos;
  }

  private get currentChunkConsumed(): boolean {
    return this.#pos === this.currentChunk.length;
  }

  private advance(n: number): void {
    if (n > this.bytesUnread) {
      throw new Error("not enough bytes");
    }
    this.#pos += n;
  }

  private seekTo(pos: number): void {
    if (pos > this.currentChunk.length) {
      throw new Error("invalid position");
    }
    this.#pos = pos;
  }

  private seekToEnd(): void {
    this.#pos = this.currentChunk.length;
  }

  private tell(): { buf: number; pos: number } {
    return { buf: this.#chunks.length - 1, pos: this.#pos };
  }

  // NOTE: invalidates the `from` and `to` values
  private concat(
    from: { buf: number; pos: number },
    to: { buf: number; pos: number },
  ): Uint8Array {
    if (from.buf !== 0) {
      throw new Error("BUG: should always start from the first chunk");
    }
    if (from.buf > to.buf) {
      throw new Error("BUG: invalid range");
    }

    const parts: Uint8Array[] = [];
    if (from.buf === to.buf) {
      parts.push(this.#chunks[from.buf].subarray(from.pos, to.pos));
    } else {
      parts.push(this.#chunks[from.buf].subarray(from.pos));
      for (let i = from.buf + 1; i < to.buf; i++) {
        parts.push(this.#chunks[i]);
      }
      parts.push(this.#chunks[to.buf].subarray(0, to.pos));
    }

    // dereference consumed chunks
    let freeUntil = to.buf; // since from.buf is always 0
    if (to.pos === this.#chunks[to.buf].length) {
      // include the last chunk if fully consumed
      freeUntil += 1;
    }
    this.#chunks = this.#chunks.slice(freeUntil);

    // INVARIANT: if there are no more chunks, add an empty one
    if (this.#chunks.length === 0) {
      this.#chunks.push(new Uint8Array());
      this.#pos = 0;
    }

    return concat(parts);
  }
}

function parseHeaderLine(input: Uint8Array) {
  const decoder = new TextDecoder();
  const line = decoder.decode(input);
  const separator = line.indexOf(":");
  if (separator === -1) {
    throw new Error("invalid header line");
  }
  const key = line.slice(0, separator);
  const value = line.slice(separator + 1).trim();
  return [key, value];
}

function parseResponseStatusLine(line: string) {
  const match = line.match(/^HTTP\/1.1 ([12345][0-9]{2}) (.+)$/);
  if (!match) {
    throw new Error(`invalid HTTP/1.1 status line: "${line}"`);
  }

  const [, statusCode, statusText] = match;

  return { status: parseInt(statusCode), statusText };
}
