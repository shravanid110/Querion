import * as vscode from 'vscode';
import * as WebSocket from 'ws';

let socket: WebSocket | null = null;
let reconnectTimer: NodeJS.Timeout | null = null;
let buffer: string[] = [];

export function activate(context: vscode.ExtensionContext) {
    console.log('Querion Monitor is now active!');

    const connectCommand = vscode.commands.registerCommand('querion-monitor.connect', async () => {
        const token = await vscode.window.showInputBox({
            prompt: 'Paste your Querion JWT Token',
            password: true,
            ignoreFocusOut: true
        });

        if (token) {
            await vscode.workspace.getConfiguration('querionMonitor').update('jwtToken', token, vscode.ConfigurationTarget.Global);
            vscode.window.showInformationMessage('Querion Token Saved Securely. Connecting...');
            connectToQuerion();
        }
    });

    context.subscriptions.push(connectCommand);

    // Terminal capturing
    vscode.window.onDidWriteTerminalData((event) => {
        const data = event.data;
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({
                type: 'terminal',
                data: data,
                timestamp: new Date().toISOString(),
                terminalId: event.terminal.name
            }));
        } else {
            buffer.push(data);
            if (buffer.length > 1000) buffer.shift(); // Max buffer size
        }
    });

    // File change capturing (simple version using VS Code API)
    vscode.workspace.onDidSaveTextDocument((document) => {
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({
                type: 'file_change',
                file: document.fileName,
                timestamp: new Date().toISOString()
            }));
        }
    });

    connectToQuerion();
}

function connectToQuerion() {
    const config = vscode.workspace.getConfiguration('querionMonitor');
    const url = config.get<string>('backendUrl');
    const token = config.get<string>('jwtToken');

    if (!url || !token) {
        console.log('Querion Monitor: Missing URL or Token');
        return;
    }

    if (socket) {
        socket.close();
    }

    try {
        socket = new WebSocket(url, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        socket.on('open', () => {
            console.log('Connected to Querion Backend');
            vscode.window.showInformationMessage('Querion Connected!');

            // Send buffered data
            if (buffer.length > 0) {
                socket?.send(JSON.stringify({
                    type: 'buffer',
                    data: buffer.join(''),
                    timestamp: new Date().toISOString()
                }));
                buffer = [];
            }
        });

        socket.on('close', () => {
            console.log('Disconnected from Querion. Retrying in 5s...');
            scheduleReconnect();
        });

        socket.on('error', (err) => {
            console.error('WebSocket Error:', err);
            scheduleReconnect();
        });

        socket.on('message', (data) => {
            const message = JSON.parse(data.toString());
            if (message.type === 'notification') {
                vscode.window.showInformationMessage(`Querion: ${message.text}`);
            }
        });

    } catch (err) {
        console.error('Connection failed:', err);
        scheduleReconnect();
    }
}

function scheduleReconnect() {
    if (reconnectTimer) clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(() => connectToQuerion(), 5000);
}

export function deactivate() {
    if (socket) {
        socket.close();
    }
}
