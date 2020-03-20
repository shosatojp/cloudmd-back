import * as Express from 'express';
import * as path from 'path';
import * as BodyParser from 'body-parser';
import * as WebSocket from 'ws';
import * as http from 'http';
import { Passwd } from './auth';
import { Scheduler } from './scheduler';
import * as process from 'process';
import * as fs from 'fs';
import * as ejs from 'ejs';

const app = Express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const scheduler = new Scheduler(100);
scheduler.add(3000, Passwd.removeOld, 3600000);

wss.on('connection', function (ws: WebSocket, request, client) {
    ws.on('message', function (message) {
        try {
            const json = JSON.parse(message);
            let p: Passwd = null;
            if (p = Passwd.verify(json.passwd, false)) {
                p.set_ws(ws);
            }
        } catch (error) { }
    });
    ws.on('close', function (e) {
        try {
            if (e !== 1006) Passwd.finalise(ws);
        } catch (error) { }
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
app.head('/api/v1/download/file/:passwd/:file', async (req, res) => {
    let p: Passwd = null;
    if ((p = Passwd.verify(req.params.passwd))
        && await p.hasfile(req.params.file)) {
        res.status(200);
        res.end();
    } else {
        res.status(400);
        res.end();
    }
});
app.get('/api/v1/download/file/:passwd/:file', async (req, res) => {
    res.setHeader('Content-Type', 'application/force-download');
    res.setHeader('Content-Disposition', `attachment; filename="${req.params.file}"`);
    let p: Passwd = null;
    let data = null;
    if ((p = Passwd.verify(req.params.passwd))
        && (data = await p.downloadfile(req.params.file))) {
        res.write(data);
        res.status(200);
        res.end();
    } else {
        res.status(400);
        res.end();
    }
});


async function template_builder(p: Passwd = undefined, template_path: string, data: object = {}) {
    return new Promise((res, rej) => {
        ejs.renderFile(template_path, data, {}, (err, str: string) => {
            if (!err) {
                const _path = p.get_path('template.tex');
                if (_path) {
                    fs.writeFile(_path, str, () => {
                        res(true);
                    });
                } else {
                    res(false);
                }
            } else {
                res(false);
            }
        });
    });
}

async function command_builder(type: string, p: Passwd = undefined, options = { template: undefined, pdf_minorversion: undefined }) {
    const commands = {
        markdown: `(pandoc  -f markdown-auto_identifiers -t json main.md -M "crossrefYaml=../../../pandoc-crossref-config.yml" | ../../../pandoc-crossref | python3 ../../../../cloudmd-filter/src/main.py | pandoc -s -f json --template="template.tex"  -o main.tex) && platex main.tex && platex main.tex && platex main.tex && dvipdfmx main.dvi`,
        tex: `platex main.tex && platex main.tex && platex main.tex && dvipdfmx main.dvi`,
        clean: `rm -f *.out *.dvi *.aux *.log`
    }
    let command = commands[type || 'markdown'];

    {// template
        if (type === 'markdown') {
            if (!(p && await p.hasfile('template.tex'))) {
                let template = undefined;
                switch (options.template) {
                    case 'english':
                        template = 'templates/english.tex';
                        break;
                    case 'thesis':
                        template = 'templates/thesis.tex';
                        break;
                    case 'report':
                    default:
                        template = 'templates/report.tex';
                        break;
                }
                await template_builder(p, template, {
                    pdf_minorversion: options.pdf_minorversion
                });
            }
            // command = command.replace('{template}', template);
        }
    }
    return command;
}

app.post('/api/v1/exec/compile',
    async (req, res) => {
        let p: Passwd = null;
        let command: string = null;
        if ((p = Passwd.verify(req.body.passwd))
            && (command = await command_builder(req.body.type, p, {
                template: req.body.template,
                pdf_minorversion: req.body.pdf_minorversion || '5'
            }))) {
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
const port = 8080;
server.listen(
    port,
    () => {
        console.log(`server started on port ${port}`);
    });

export default app;