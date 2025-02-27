export abstract class XmlRpcType {
  abstract readonly kind: Value["kind"];
}

export class Int32 extends XmlRpcType {
  constructor(public readonly value: bigint) {
    if (value < -2147483648n || value > 2147483647) {
      throw new Error("overflow");
    }
    super();
  }

  get kind() {
    return "Int32" as const;
  }

  static is(v: Value): v is Int32 {
    return v.kind === "Int32";
  }
}

export class Boolean extends XmlRpcType {
  constructor(public readonly value: boolean) {
    super();
  }

  get kind() {
    return "Boolean" as const;
  }
}

export class String extends XmlRpcType {
  constructor(public readonly value: string) {
    super();
  }

  get kind() {
    return "String" as const;
  }
}

export class Double extends XmlRpcType {
  constructor(public readonly value: number) {
    super();
  }

  get kind() {
    return "Double" as const;
  }
}

export class DateTime extends XmlRpcType {
  constructor(public readonly value: Date) {
    super();
  }

  get kind() {
    return "DateTime" as const;
  }
}

export class Bytes extends XmlRpcType {
  constructor(public readonly value: Uint8Array) {
    super();
  }

  get kind() {
    return "Bytes" as const;
  }
}

export type Scalar =
  | Int32
  | Boolean
  | String
  | Double
  | DateTime
  | Bytes;

export class Struct extends XmlRpcType {
  constructor(
    public readonly members: Readonly<Record<string, Value>>,
  ) {
    super();
  }

  get kind() {
    return "Struct" as const;
  }
}

export class Array extends XmlRpcType {
  constructor(public readonly elements: ReadonlyArray<Value>) {
    super();
  }

  get kind() {
    return "Array" as const;
  }
}

export type Value =
  | Scalar
  | Struct
  | Array;

export class MethodCall {
  constructor(
    public readonly methodName: string,
    public readonly params: ReadonlyArray<Value>,
  ) {}
}

export class MethodResponse {
  constructor(
    public readonly result: Value | Fault,
  ) {}
}

export class Fault {
  constructor(
    public readonly faultCode: bigint,
    public readonly faultString: string,
  ) {}

  // NOTE: not a proper type but useful for type-checking
  get kind() {
    return "Fault" as const;
  }
}
