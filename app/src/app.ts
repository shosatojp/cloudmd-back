import * as Express from 'express';
import * as path from 'path';
import * as ChildProcess from 'child_process';
import * as fs from 'fs';
import * as BodyParser from 'body-parser';
import * as WebSocket from 'ws';
import * as http from 'http';
import { Passwd } from './auth';
import { Scheduler } from './scheduler';
import * as process from 'process';

const app = Express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const scheduler = new Scheduler(100);
scheduler.add(3000, Passwd.removeOld, 3600000);

wss.on('connection', function (ws: WebSocket, request, client) {
    ws.on('message', function (message) {
        const json = JSON.parse(message);
        let p: Passwd = null;
        if (p = Passwd.verify(json.passwd, false)) {
            p.set_ws(ws);
        }
    });
    ws.on('close', function () {
        Passwd.finalise(ws);
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
    if (path.extname(req.body.filename) === '.md') req.body.filename = 'main.md';
    if ((p = Passwd.verify(req.body.passwd))
        && await p.uploadfile(req.body.filename, req.body.data)) {
        res.status(200);
        res.end();
    } else {
        res.status(400);
        res.end();
    }
});

const commands = {
    markdown: `pandoc -s -F ../../../pandoc-crossref main.md -f markdown-auto_identifiers -M "../../../crossrefYaml=pandoc-crossref-config.yml" --template="../../../template.tex"  -o main.tex && platex main.tex && dvipdfmx main.dvi`,
    tex: `platex main.tex && dvipdfmx main.dvi`,
    clean: `rm *.out *.dvi *.aux *.log`
}

app.post('/api/v1/exec/compile',
    async (req, res) => {
        let p: Passwd = null;
        let command: string = null;
        if ((p = Passwd.verify(req.body.passwd)) && (command = commands[req.body.type || 'markdown'])) {
            await p.execCommand(command + ' && ' + commands.clean);
            res.status(200);
            res.end();
        } else {
            res.status(400);
            res.end();
        }
    }
)
app.use(Express.static(path.resolve(__dirname, '../../dist')));
const port = process.argv[2] || 8000;
server.listen(
    port,
    () => {
        console.log(`server started on port ${port}`);
    });

export default app;