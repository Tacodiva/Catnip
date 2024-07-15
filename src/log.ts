
export function createLogger(name: string): Logger {
    return new Logger(name);
}

export class Logger {
    public readonly name: string;

    public constructor(name: string) {
        this.name = name;
    }

    public assert(condition: boolean, error: boolean = true, message?: string) {
        if (!condition) { 
            message ??= "Assertion failed.";
            const throwable = new Error(message);
            if (error) {
                this.error(`${message} \n${(throwable.stack)}`);
                throw throwable;
            } else {
                this.warn(`${message} \n${throwable.stack}`);
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