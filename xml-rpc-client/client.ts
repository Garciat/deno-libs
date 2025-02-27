import { Fault, MethodCall, Value } from "./types.ts";
import { formatMethodCall } from "./format.ts";
import { parseMethodResponse } from "./parse.ts";
import { Schema } from "./schema.ts";
import { methodCall } from "./json.ts";

export type Handler = (req: Request) => Promise<Response>;

export class XmlRpcClient {
  constructor(
    private readonly url: URL,
    private readonly handler: Handler,
  ) {}

  async call(call: MethodCall): Promise<Value> {
    const response = await this.handler(this.toHttpRequest(call));
    if (response.status !== 200) {
      throw new Error("http request failed");
    }

    const body = await response.text();

    const methodResponse = parseMethodResponse(body);
    if (methodResponse.result.kind === "Fault") {
      throw new FaultError(methodResponse.result);
    }

    return methodResponse.result;
  }

  async multicall<CS extends TypedMethodCall<unknown>[]>(
    ...calls: CS
  ): Promise<ResponseTypes<CS>> {
    const response = await this.call(
      methodCall("system.multicall", calls.map((c) => c.call)),
    );
    if (response.kind !== "Array") {
      throw new Error("invalid response");
    }
    return response.elements.map((value, i) =>
      calls[i].schema(value)
    ) as ResponseTypes<CS>;
  }

  bind<TS extends unknown[], R>(
    build: (...args: TS) => MethodCall,
    schema: Schema<R>,
  ): BoundMethod<TS, R> {
    return {
      call: async (...args) => schema(await this.call(build(...args))),
      build: (...args) => ({
        call: build(...args),
        schema,
      }),
    };
  }

  toHttpRequest(call: MethodCall): Request {
    const body = formatMethodCall(call);

    return new Request(this.url, {
      method: "POST",
      headers: {
        "Host": this.url.host,
        "User-Agent": "Deno/2",
        "Content-Type": "text/xml",
        "Content-Length": body.length.toString(),
      },
      body: body,
    });
  }
}

export interface BoundMethod<TS extends unknown[], R> {
  call(...args: TS): Promise<R>;
  build(...args: TS): TypedMethodCall<R>;
}

export interface TypedMethodCall<R> {
  readonly call: MethodCall;
  readonly schema: Schema<R>;
}

export type ResponseTypes<CS extends TypedMethodCall<unknown>[]> = {
  [K in keyof CS]: ReturnType<CS[K]["schema"]>;
};

export class FaultError extends Error {
  constructor(public readonly fault: Fault) {
    super(`Fault code:${fault.faultCode}`, { cause: fault });
  }
}
