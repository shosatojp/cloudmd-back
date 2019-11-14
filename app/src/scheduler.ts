export class Scheduler {
    tick_ms = null;
    tasks: {
        next: number,
        interval: number,
        fn: Function,
        args: any[]
    }[] = [];

    constructor(tick_ms: number = 100) {
        this.tick_ms = tick_ms;
        this.loop();
    }

    async wait(ms: number) {
        return new Promise((res, rej) => {
            setTimeout(() => {
                res();
            }, ms);
        });
    }

    async loop() {
        while (1) {
            this.check();
            await this.wait(this.tick_ms);
        }
    }

    check() {
        const now = Date.now();
        for (const task of this.tasks) {
            if (task.next < now) {
                task.fn(...task.args);
                task.next += task.interval;
            }
        }
    }

    add(interval: number, fn: Function, ...args: any[]) {
        this.tasks.push({
            interval, fn, args, next: Date.now()
        });
    }

}