
export function createLogger(name: string): Logger {
    return new Logger(name);
}

export class Logger {
    public readonly name: string;

    public constructor(name: string) {
        this.name = name;
    }

    public assert(condition: boolean, error: boolean = true, message?: string): asserts condition {
        if (!condition) { 
            message ??= "Assertion failed.";
            const throwable = new Error(message);
            const stack = throwable.stack?.replace(/^[^\(]+?[\n$]/gm, '')
                 ?? "{undefined stack trace}";
            if (error) {
                this.error(`${message} \n${(stack)}`);
                throw throwable;
            } else {
                this.warn(`${message} \n${stack}`);
            }
        }
    }

    public log(msg: any) {
        console.log(`[${this.name}] ${msg}`);
    }

    public warn(msg: any) {
        console.warn(`[${this.name}] ${msg}`);
    }

    public error(msg: any) {
        console.error(`[${this.name}] ${msg}`);
    }

    public debug(msg: any) {
        console.debug(`[${this.name}] ${msg}`);
    }
}