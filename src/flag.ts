import {
  CamelToKebabCaseKey,
  KnownKey,
  MapUnion,
  Spread,
  StripNegated,
} from "./types";

type ParamType = "string" | "number" | "array";
type ParamTypeToValue<T extends ParamType> = MapUnion<
  T,
  {
    string: string;
    number: number;
    array: string[];
  }
>[T];

type OptionalParam<
  T extends ParamType,
  D extends ParamTypeToValue<T> | undefined
> = { _type: "optional"; type: T; defaultValue: D };
type RequiredParam<T extends ParamType> = { _type: "required"; type: T };

type FlagKey<
  F extends Record<string, Flag>,
  K extends keyof F
> = F[K] extends Flag<infer TFlag>
  ? // ? (TFlag["preserveCase"] extends true ? OmitNegated<K> : OmitNegated<CamelToKebabCaseKey<K>>) | (TFlag["char"] extends string ? TFlag["char"] : never)
    | (TFlag["preserveCase"] extends true
          ? StripNegated<K>
          : StripNegated<CamelToKebabCaseKey<K>>)
      | (TFlag["char"] extends string ? TFlag["char"] : never)
  : never;

type TFlag = {
  char?: string;
  param?: OptionalParam<any, any> | RequiredParam<any>;
  preserveCase?: boolean;
};
type Replace<T, K extends keyof T, N extends T[K]> = Spread<
  Omit<T, K> & { [k in K]: N }
>;
type Remove<T, K extends keyof T> = Spread<Omit<T, K>>;

export type ParsedFlags<Flags extends Record<string, Flag>> = {
  [K in keyof Flags as KnownKey<FlagKey<Flags, K>>]: Flags[K] extends Flag<
    infer T
  >
    ? T["param"] extends RequiredParam<infer Type>
      ? ParamTypeToValue<Type>
      : T["param"] extends OptionalParam<infer Type, infer D>
      ? undefined extends D
        ? ParamTypeToValue<Type> | undefined
        : ParamTypeToValue<Type>
      : T["param"] extends undefined
      ? boolean
      : unknown extends T["param"]
      ? boolean
      : boolean | number | string | string[]
    : never;
};

export class Flag<T extends TFlag = TFlag> {
  public constructor(
    private _desc: string,
    private _char: T["char"],
    private _param: T["param"],
    private _preserveCase: T["preserveCase"],
    private _negate: string | undefined
  ) {}

  public char<C extends string>(char: C): Flag<Replace<T, "char", C>> {
    this._char = char as unknown as T["char"];
    return this as unknown as Flag<Replace<T, "char", C>>;
  }

  public requiredParam<U extends ParamType>(
    type: U
  ): Flag<Replace<T, "param", RequiredParam<U>>> {
    this._param = { _type: "required", type };
    return this as Flag<Replace<T, "param", RequiredParam<U>>>;
  }

  public optionalParam<
    U extends ParamType,
    D extends ParamTypeToValue<U> | undefined = undefined
  >(type: U, defaultValue?: D): Flag<Replace<T, "param", OptionalParam<U, D>>> {
    this._param = { _type: "optional", type, defaultValue };
    return this as Flag<Replace<T, "param", OptionalParam<U, D>>>;
  }

  public withNegated(description: string): Flag<Remove<T, "param">> {
    this._negate = description;
    return this;
  }

  public preserveCase(): Flag<Replace<T, "preserveCase", true>> {
    this._preserveCase = true as T["preserveCase"];
    return this as Flag<Replace<T, "preserveCase", true>>;
  }

  public static toObject(flag: Flag) {
    return {
      desc: flag._desc,
      char: flag._char,
      param: flag._param,
      negate: flag._negate,
      preserveCase: flag._preserveCase,
    };
  }

  public static toString(flag: Flag, name: string) {
    let str = `--${flag._preserveCase ? name : Flag.toKebabCase(name)}`;
    if (flag._char) str = `-${flag._char}, ${str}`;
    return str;
  }

  public static toNegatedString(flag: Flag, name: string) {
    let str = `--no-${flag._preserveCase ? name : Flag.toKebabCase(name)}`;
    return str;
  }

  public static isNegated(str: string) {
    return str.startsWith("no-");
  }

  public static toKebabCase(str: string) {
    return str
      .split("")
      .map((char, index) => {
        if (index === 0) return char.toLowerCase();
        return char.toLowerCase() !== char ? `-${char.toLowerCase()}` : char;
      })
      .join("");
  }

  public static toCamelCase(str: string) {
    return str.replace(/-./g, (x) => x[1].toUpperCase());
  }
}

export function flag(description: string) {
  return new Flag<{}>(description, undefined, undefined, false, undefined);
}
