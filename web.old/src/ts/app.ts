import "../scss/main.scss";

let passwd: string = '';
let socket = null;
const R = {
    log: document.querySelector('#log'),
    upload_markdown: document.querySelector<HTMLInputElement>('#upload-markdown'),
}

function readAsBase64(file: File): Promise<string | ArrayBuffer> {
    return new Promise((res, rej) => {
        const fr = new FileReader();
        fr.onload = e => {
            res(e.target.result);
        };
        fr.readAsDataURL(file);
    });
}


fetch('/api/v1/ws/start').then(async res => {
    passwd = (await res.json())['passwd'];
    socket = new WebSocket('ws://localhost:8082');
    socket.addEventListener('open', function (event) {
        socket.send(JSON.stringify({ passwd }));
        R.upload_markdown.disabled = false;
        R.upload_markdown.onchange = async e => {
            fetch('/api/v1/upload/file', {
                method: 'post',
                body: JSON.stringify({
                    data: await readAsBase64((<HTMLInputElement>e.target).files[0]),
                    passwd: passwd,
                    filename:'hoge.png'
                }),
                headers: {
                    'content-type': 'application/json'
                }
            })
        };
    });

    socket.addEventListener('message', function (event) {
        const data = JSON.parse(event.data);
        R.log.textContent += data.body;
        R.log.scrollTop = R.log.scrollHeight;
    });


})
