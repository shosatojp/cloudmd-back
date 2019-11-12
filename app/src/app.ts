import * as Express from 'express';
import * as path from 'path';
import * as ChildProcess from 'child_process';
import * as fs from 'fs';
import * as BodyParser from 'body-parser';
import * as WebSocket from 'ws';
import * as http from 'http';
import { Passwd } from './auth';

const app = Express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

wss.on('connection', function (ws: WebSocket, request, client) {
    ws.on('message', function (message) {
        const json = JSON.parse(message);
        let p: Passwd = null;
        if (p = Passwd.verify(json.passwd, false)) {
            p.set_ws(ws);
        }
    });
});


app.get(
    '/api',
    (req: Express.Request, res: Express.Response) => {
        return res.send('Hello world.');
    });
app.get('/api/v1/ws/start',
    (req, res) => {
        const passwd = new Passwd().passwd;
        res.json({ passwd });
    }
)
app.use(BodyParser.json({ limit: '50mb' }));
app.post('/api/v1/upload/file', async (req, res) => {
    let p: Passwd = null;
    if ((p = Passwd.verify(req.body.passwd))
        && await p.uploadfile(req.body.filename, req.body.data)) {
        res.status(200);
        res.end();
    } else {
        res.status(400);
        res.end();
    }
});

app.use(BodyParser.json());
app.post('/api/v1/upload/markdown',
    async (req, res) => {
        let p: Passwd = null;
        if ((p = Passwd.verify(req.body.passwd))
            && await p.uploadfile(path.join(), req.body.data)) {
            const process = ChildProcess.exec('du / -hd 1');
            process.stdout.on('data', function (data) {
                p.send_ws({
                    type: 'stdout',
                    body: data + '\n'
                });
            });
            process.stderr.on('data', data => {
                p.send_ws({
                    type: 'stderr',
                    body: data + '\n'
                });
            });
            res.status(200);
            res.end();
        } else {
            res.status(400);
            res.end();
        }
    }
)
app.use(Express.static(path.resolve(__dirname, '../../../cloudmd-front/dist/cloudmd-front')))

server.listen(
    8082,
    () => {
        console.log('Example app listening on port!');
    });

export default app;