declare class Paths {
    _paths: string[];
    _resolve: (input: any) => any;
    constructor(...args: any[]);
    at(pos: number): string;
    count(): number;
    get(...args: any[]): Paths;
    clear(): void;
    add(...args: any[]): void;
    has(...args: any[]): boolean;
    remove(...args: any[]): void;
    clone(): Paths;
    forEach(iterator: (path: string) => void): void;
    resolveAsync(resolver: string | Function, callback: (err: Error, path?: string) => void, _paths?: Paths, lookDeep?: boolean): void;
    resolve(resolver: string | Function, _paths?: Paths, lookDeep?: boolean): never;
    toString(): string;
    static wrap: (other: any, ...more: any[]) => Paths;
    static isInstance(obj: any): boolean;
    static _convertArgs(args: any[], converter?: (arg: string | any[] | Paths) => string[]): string[];
    static _convert(arg: string | any[] | Paths): string[];
    static readonly sys: {
        path: typeof Paths;
        node: typeof Paths;
        plugin: typeof Paths;
        _init(env: string, alias: string): void;
    };
}
export = Paths;
