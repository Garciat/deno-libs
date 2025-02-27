export function assertNotNull<T>(t: T): NonNullable<T> {
  if (t === null || t === undefined) {
    throw new Error("expected non-null");
  }
  return t;
}

export function sleep(millis: number) {
  return new Promise<void>((resolve) => {
    setTimeout(() => resolve(), millis);
  });
}
