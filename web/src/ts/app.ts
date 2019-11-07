const socket = new WebSocket('ws://localhost:8082');
const R = {
    log: document.querySelector('#log'),
    upload_markdown: document.querySelector<HTMLInputElement>('#upload-markdown'),
}

socket.addEventListener('open', function (event) {
    socket.send('Hello Server!');
    R.upload_markdown.disabled = false;
});

socket.addEventListener('message', function (event) {
    const p = document.createElement('p');
    p.textContent = event.data;
    R.log.appendChild(p);
});