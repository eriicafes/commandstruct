export type Spread<T> = { [K in keyof T]: T[K] } & {};
export type Merge<T, U> = Omit<T, keyof U> & U;

type IsCapitalized<T extends string> = Uncapitalize<T> extends T ? false : true;
export type CamelToKebabCaseKey<
  T extends PropertyKey,
  A extends string = ""
> = T extends string
  ? T extends `${infer P}${infer S}`
    ? Uncapitalize<
        S extends ""
          ? `${A}${P}`
          : IsCapitalized<S> extends true
          ? `${A}${P}-${CamelToKebabCaseKey<Uncapitalize<S>>}`
          : CamelToKebabCaseKey<S, `${A}${P}`>
      >
    : T
  : never;
export type OmitNegated<T extends PropertyKey> = T extends `no-${string}`
  ? never
  : T;
export type StripNegated<T extends PropertyKey> = T extends `no-${infer U}`
  ? U
  : T;

export type MapUnion<
  T extends string,
  U extends Record<T, any>
> = U extends Record<T, any> ? U : never;

export type KnownKey<T> = string extends T
  ? never
  : number extends T
  ? never
  : symbol extends T
  ? never
  : T;
export type KnownMappedKeys<T> = { [K in keyof T as KnownKey<K>]: T[K] } & {};

export type Invalid<Message extends string> = never
