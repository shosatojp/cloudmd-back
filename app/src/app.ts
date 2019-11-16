import * as Express from 'express';
import * as path from 'path';
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


app.get('/api/v1/ws/start',
    (req, res) => {
        const passwd = new Passwd().passwd;
        res.json({ passwd });
    }
)
app.use(BodyParser.json({ limit: '50mb' }));
app.post('/api/v1/upload/file', async (req, res) => {
    let p: Passwd = null;
    if (path.extname(req.body.filename) === '.md')
        req.body.filename = 'main.md';
    if (req.body.filename !== 'template.tex' && path.extname(req.body.filename) === '.tex')
        req.body.filename = 'main.tex';
    if ((p = Passwd.verify(req.body.passwd))
        && await p.uploadfile(req.body.filename, req.body.data)) {
        res.status(200);
        res.end();
    } else {
        res.status(400);
        res.end();
    }
});


async function command_builder(type: string, p: Passwd = undefined, options = { template: undefined }) {
    const commands = {
        markdown: `(pandoc  -f markdown-auto_identifiers -t json main.md -M "crossrefYaml=../../../pandoc-crossref-config.yml" | ../../../pandoc-crossref | python3 ../../../../cloudmd-filter/src/main.py | pandoc -s -f json --template="{template}"  -o main.tex) && platex main.tex && platex main.tex && platex main.tex && dvipdfmx main.dvi`,
        tex: `platex main.tex && platex main.tex && platex main.tex && dvipdfmx main.dvi`,
        clean: `rm -f *.out *.dvi *.aux *.log`
    }
    let command = commands[type || 'markdown'];

    {// template
        if (type === 'markdown') {
            let template = undefined;
            if (p && await p.hasfile('template.tex')) {
                template = 'template.tex';
            } else {
                switch (options.template) {
                    case 'english':
                        template = '../../../templates/english.tex';
                        break;
                    case 'report':
                    default:
                        template = '../../../templates/report.tex';
                        break;
                }
            }
            command = command.replace('{template}', template);
        }
    }
    return command;
}

app.post('/api/v1/exec/compile',
    async (req, res) => {
        let p: Passwd = null;
        let command: string = null;
        if ((p = Passwd.verify(req.body.passwd))
            && (command = await command_builder(req.body.type, p, { template: req.body.template }))) {
            await p.execCommand(command + ' && ' + await command_builder('clean'));
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