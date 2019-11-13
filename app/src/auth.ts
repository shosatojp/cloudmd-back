import * as fs from 'fs';
import * as path from 'path';
import * as child_process from 'child_process';

export class Passwd {
    static user_root = 'dist/data';
    static hash_table = new Map<string, Passwd>();
    static str = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890';
    static generate_id(n: number = 50): string {
        const len = Passwd.str.length;
        return new Date().getTime().toString(16) + new Array(n).fill(0).map(() => Passwd.str[Math.floor(Math.random() * len)]).join('');
    }

    ws = null;
    passwd = null;

    constructor() {
        this.passwd = Passwd.generate_id();
        Passwd.hash_table[this.passwd] = this;
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
        const self = this;
        const process = child_process.exec(`cd ${path.join(Passwd.user_root, this.passwd)} && ${command}`);
        process.stdout.on('data', function (data) {
            self.send_ws({ type: 'stdout', body: data });
        });
        process.stderr.on('data', data => {
            self.send_ws({ type: 'stderr', body: data });
        });
        process.on('close', (code) => {
            self.send_ws({ type: 'logend', body: '' });
        });
    }

    static verify(passwd: string, ws: boolean = true): Passwd | undefined {
        let p: Passwd = null;
        if (passwd && (p = this.hash_table[passwd])) {
            return (!ws || p.ws) ? p : undefined;
        } else {
            return undefined;
        }
    }


}