import * as Express from 'express';
import * as Path from 'path';
import * as ChildProcess from 'child_process';
import * as fs from 'fs';
import * as BodyParser from 'body-parser';
import * as WebSocket from 'ws';
import * as http from 'http';

const app = Express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const ws_connections = [];
wss.on('connection', function (ws, request, client) {
    // console.log(request,client);
    ws_connections.push(ws);
    ws.on('message', function (message) {
        console.log('received: %s', message);
    });

    ws.send('something');
});

interface IUploadContent {
    body: string,
    version: number,
    filename: string,
    type: string,
}


app.get(
    '/api',
    (req: Express.Request, res: Express.Response) => {
        return res.send('Hello world.');
    });
app.use(BodyParser.json());
app.post(
    '/api/v1/upload/markdown',
    (req, res) => {
        const content: IUploadContent = req.body.content;
        fs.writeFile('hoge.md', content.body, () => {
            const process = ChildProcess.exec('stat hoge.md');
            // const process = ChildProcess.exec('du / -d 1');
            process.stdout.on('data', function (data) {
                console.log(data);
                // res.send(data);
            });
            process.stderr.on('data', data => {
                // res.send(data);
                console.log('>>>', data);
            });
            res.send('hoge');
        });
    }
)
app.use(Express.static(Path.resolve(__dirname, '../../web/dist')))

server.listen(
    8082,
    () => {
        console.log('Example app listening on port!');
    });

export default app;