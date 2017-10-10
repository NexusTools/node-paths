declare class Paths {
    _paths: string[];
    _resolve: (input: any) => any;
    constructor(...args: any[]);
    /**
     * Return a path by index.
     */
    at(index: number): string;
    /**
     * Return the number of paths.
     */
    count(): number;
    /**
     * Extend this Paths instance, with args, if any.
     */
    get(...args: any[]): Paths;
    /**
     * Clears this Paths instance.
     */
    clear(): void;
    /**
     * Add args to this Paths.
     */
    add(...args: any[]): void;
    /**
     * Check whether or not args are contained by Paths.
     */
    has(...args: any[]): boolean;
    /**
     * Remove args from paths.
     */
    remove(...args: any[]): void;
    /**
     * Clone this Paths.
     */
    clone(): Paths;
    /**
     * Iterate over the paths.
     */
    forEach(iterator: (path: string) => void): void;
    /**
     * Asynchroniously resolve a file within these Paths.
     */
    resolveAsync(resolver: string | Function, callback: (err: Error, path?: string) => void, _paths?: Paths, lookDeep?: boolean): void;
    /**
     * Resolve a file within these Paths.
     */
    resolve(resolver: string | Function, _paths?: Paths, lookDeep?: boolean): never;
    toString(): string;
    static wrap(other: any, ...more: any[]): Paths;
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
