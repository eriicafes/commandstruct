import { InitFactory } from "hollywood-di"

export type Spread<T> = { [K in keyof T]: T[K] } & {}

type IsCapitalized<T extends string> = Uncapitalize<T> extends T ? false : true
export type CamelToKebabCaseKey<T extends PropertyKey, A extends string = ""> = T extends string
    ? T extends `${infer P}${infer S}`
    ? Uncapitalize<S extends "" ? `${A}${P}` : IsCapitalized<S> extends true ? `${A}${P}-${CamelToKebabCaseKey<Uncapitalize<S>>}` : CamelToKebabCaseKey<S, `${A}${P}`>>
    : T
    : never
export type OmitNegated<T extends PropertyKey> = T extends `no-${string}` ? never : T
export type RequiredOrOptional<T, Required extends boolean> = Required extends true ? T : (T | undefined)

type Group<T extends Record<number, Record<string, any>>> = {
    parent: T,
    keys: { [K in keyof T as keyof T[K]]: K extends (string | number) ? `${K}` : never },
}
type Flatten<T extends Group<any>> = { [K in keyof T["keys"]]: T["parent"][T["keys"][K]][K] }
type InitFactoryDeps<T extends InitFactory<any, any>[]> = {
    [K in Exclude<keyof T, keyof any[]>]: T[K] extends InitFactory<any, any> ? Parameters<T[K]["init"]>[0] : never
}
export type CombineInitFactoryDeps<T extends InitFactory<any, any>[]> = Flatten<Group<InitFactoryDeps<T>>>
