import * as fs from 'fs';
import * as path from 'path';
import * as child_process from 'child_process';
import * as process from 'process';

export class Passwd {
    static user_root = 'dist/data';
    static archive_root = 'archive';
    static hash_table = new Map<string, Passwd>();
    static str = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890';
    static generate_id(n: number = 50): string {
        const len = Passwd.str.length;
        return new Date().getTime().toString(16) + new Array(n).fill(0).map(() => Passwd.str[Math.floor(Math.random() * len)]).join('');
    }

    static removeOld(expires_in: number = 600) {
        const now = Date.now();
        const keys = Passwd.hash_table.keys();
        let key = null;
        while (key = keys.next().value) {
            const value: Passwd = Passwd.hash_table.get(key);
            if (value.created + expires_in < now) {
                value.finalize();
            }
        }
    }

    static async finalise(ws) {
        const keys = Passwd.hash_table.keys();
        let key = null;
        while (key = keys.next().value) {
            const value: Passwd = Passwd.hash_table.get(key);
            if (value.ws === ws) {
                value.finalize();
                return;
            }
        }
    }


    count = 0;
    ws = null;
    passwd = null;
    closed = false;
    created = Date.now();
    processes: child_process.ChildProcess[] = [];

    finalize() {
        console.log('finarize', this.passwd);
        this.close_ws();
        this.removeWorkingDirectory();
        this.processes.forEach(e => e.kill());
        Passwd.hash_table.delete(this.passwd);
    }

    close_ws() {
        this.ws.terminate();
    }

    constructor() {
        this.passwd = Passwd.generate_id();
        Passwd.hash_table.set(this.passwd, this);
    }

    removeWorkingDirectory() {
        return new Promise((res, rej) => {
            fs.rmdir(`${Passwd.user_root}/${this.passwd}`, { recursive: true }, () => {
                res();
            });
        });
    }

    send_ws(data: Object) {
        this.ws.send(JSON.stringify(data));
    }

    set_ws(ws) {
        if (!this.ws) {
            this.ws = ws;
        }
    }

    uploadfile(relative_path: string, base64: string): Promise<boolean> {
        base64 = base64.replace(/^[^:]+:[^:/]+\/[^;/]+;base64,/, '');
        return new Promise((res, rej) => {
            const dir = path.join(Passwd.user_root, this.passwd);
            fs.mkdir(dir, { recursive: true }, () => {
                fs.writeFile(path.join(dir, relative_path), Buffer.from(base64, 'base64'), () => {
                    res(true);
                });
            });
        });
    }

    copyFile(filename: string) {
        return new Promise((res, rej) => {
            fs.copyFile(filename, `${path.join(Passwd.user_root, this.passwd, filename)}`, () => {
                res();
            });
        });
    }

    async execCommand(command: string) {
        this.count++;
        const self = this;
        const p = child_process.exec(`cd ${path.join(Passwd.user_root, this.passwd)} && ${command}`, { env: { 'PATH': process.env['PATH'] } });
        p.stdout.on('data', function (data) {
            self.send_ws({ type: 'stdout', body: data });
        });
        p.stderr.on('data', data => {
            self.send_ws({ type: 'stderr', body: data });
        });
        p.on('close', async (code) => {
            self.send_ws({ type: 'logend', body: code });
            await self.archive();
        });
        this.processes.push(p);
    }

    archive() {
        return new Promise((res, rej) => {
            fs.mkdir(Passwd.archive_root, { recursive: true }, () => {
                const process = child_process.exec(`tar cfz ${Passwd.archive_root}/${this.passwd}.${('000' + this.count.toString()).slice(-4)}.tar.gz ${Passwd.user_root}/${this.passwd}`);
                process.on('close', () => {
                    res();
                });
            });
        });
    }

    static verify(passwd: string, ws: boolean = true): Passwd | undefined {
        let p: Passwd = null;
        if (passwd && (p = this.hash_table.get(passwd))) {
            return (!ws || p.ws) ? p : undefined;
        } else {
            return undefined;
        }
    }


}