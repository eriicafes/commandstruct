import { RequiredOrOptional } from "./utils/types"

export type ParsedArgs<Args extends Record<string, Arg<any, any>>> = {
    [K in keyof Args]: Args[K] extends Arg<infer R, infer V>
    ? V extends true ? RequiredOrOptional<string[], R> : RequiredOrOptional<string, R>
    : never
}

export class Arg<
    TRequired extends boolean,
    TVariadic extends boolean,
> {
    public constructor(
        private _required: TRequired,
        private _variadic: TVariadic,
    ) { }

    public optional(): Arg<false, TVariadic> {
        this._required = false as TRequired
        return this as Arg<false, TVariadic>
    }

    public variadic(): Arg<TRequired, true> {
        this._variadic = true as TVariadic
        return this as Arg<TRequired, true>
    }

    public static toObject(arg: Arg<any, any>) {
        return {
            required: arg._required as boolean,
            variadic: arg._variadic as boolean,
        }
    }

    public static toString(arg: Arg<any, any>, name: string) {
        if (arg._variadic) name = `...${name}`
        if (arg._required) return `<${name}>`
        else return `[${name}]`
    }
}

export function arg() {
    return new Arg(true, false)
}
