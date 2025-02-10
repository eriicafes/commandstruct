import { KnownKey, MapUnion } from "./types";

type ArgType = "required" | "optional";

type ArgTypeToValue<T extends ArgType> = MapUnion<
  T,
  {
    required: string;
    optional: string | undefined;
  }
>[T];

export type ParsedArgs<Args extends Record<string, Arg>> = {
  [K in keyof Args as KnownKey<K>]: Args[K] extends Arg<infer T>
    ? ArgTypeToValue<T>
    : never;
};

export class Arg<T extends ArgType = ArgType> {
  public constructor(private _type: T) {}

  public optional(): Arg<"optional"> {
    this._type = "optional" as T;
    return this as Arg<"optional">;
  }

  public static toObject(arg: Arg) {
    return {
      type: arg._type,
    };
  }

  public static toString(arg: Arg, name: string) {
    if (arg._type === "required") return `<${name}>`;
    else return `[${name}]`;
  }
}

export function arg() {
  return new Arg("required");
}
