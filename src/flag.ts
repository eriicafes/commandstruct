import { CamelToKebabCaseKey, OmitNegated, RequiredOrOptional } from "./utils/types"

type ParamType = "string" | "number" | "array"
type GetParamType<T extends ParamType> = T extends "string"
    ? string
    : T extends "number"
    ? number
    : T extends "array"
    ? string[]
    : never
type Param<Type extends ParamType, Required extends boolean> = {
    type: Type
    required: Required
    default?: GetParamType<Type>
}
type FlagKey<F extends Record<string, Flag<any, any, any>>, K extends keyof F> = F[K] extends Flag<infer Char, any, infer PreserveCase>
    ? (PreserveCase extends true ? OmitNegated<K> : OmitNegated<CamelToKebabCaseKey<K>>) | (Char extends string ? Char : never)
    : never

export type ParsedFlags<Flags extends Record<string, Flag<any, any, any>>> = {
    [K in keyof Flags as FlagKey<Flags, K>]: Flags[K] extends Flag<any, infer P, any>
    ? P extends Param<infer T, infer R> ? RequiredOrOptional<GetParamType<T>, R> : boolean
    : never
} & { ["_"]: string[] }

export class Flag<
    TChar extends string | undefined,
    TParam extends Param<any, any> | undefined,
    TPreserveCase extends boolean,
> {
    public constructor(
        private _desc: string,
        private _char: TChar,
        private _param: TParam,
        private _preserveCase: TPreserveCase,
        private _negate: string | undefined,
    ) { }

    public char<C extends string>(char: C): Flag<C, TParam, TPreserveCase> {
        this._char = char as unknown as TChar
        return this as unknown as Flag<C, TParam, TPreserveCase>
    }

    public param<T extends ParamType, R extends boolean>(
        options: { type: T, required: R, default?: GetParamType<T> },
    ): Flag<TChar, Param<T, R>, TPreserveCase> {
        this._negate = undefined
        this._param = options as TParam
        return this as Flag<TChar, Param<T, R>, TPreserveCase>
    }

    public negate(description: string): Flag<TChar, undefined, TPreserveCase> {
        this._negate = description
        this._param = undefined as TParam
        return this as Flag<TChar, undefined, TPreserveCase>
    }

    public preserveCase(): Flag<TChar, TParam, true> {
        this._preserveCase = true as TPreserveCase
        return this as Flag<TChar, TParam, true>
    }

    public static toObject(flag: Flag<any, any, any>) {
        return {
            desc: flag._desc,
            char: flag._char as string | undefined,
            param: flag._param as Param<ParamType, boolean> | undefined,
            negate: flag._negate,
            preserveCase: flag._preserveCase as boolean,
        }
    }

    public static toString(flag: Flag<any, any, any>, name: string) {
        let str = `--${flag._preserveCase ? name : Flag.toKebabCase(name)}`
        if (flag._char) str = `-${flag._char}, ${str}`
        return str
    }

    public static toNegatedString(flag: Flag<any, any, any>, name: string) {
        let str = `--no-${flag._preserveCase ? name : Flag.toKebabCase(name)}`
        return str
    }

    public static isNegated(str: string) {
        return str.startsWith("no-")
    }

    public static toKebabCase(str: string) {
        return str.split("").map((char, index) => {
            if (index === 0) return char.toLowerCase()
            return char.toLowerCase() !== char ? `-${char.toLowerCase()}` : char
        }).join("")
    }

    public static toCamelCase(str: string) {
        return str.replace(/-./g, x => x[1].toUpperCase())
    }
}

export function flag(description: string) {
    return new Flag(description, undefined, undefined, false, undefined)
}
