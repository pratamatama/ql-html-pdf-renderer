import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";

const createPreview = (context: vscode.ExtensionContext) => {
  const panel = createPanel("Preview");
  const template = getTemplate(context);
  panel.webview.html = template;
  panel.webview.options = { ...panel.webview.options, enableScripts: true };
  return panel;
};

const getTemplate = (context: vscode.ExtensionContext) => {
  const uri = path.join(context.extensionPath, "src", "public", "index.html");
  const filePath = vscode.Uri.file(uri);
  return fs.readFileSync(filePath.fsPath, "utf8");
};

const createPanel = (title: string, options?: vscode.ViewColumn) => {
  return vscode.window.createWebviewPanel(
    title.split(" ").join("-"),
    title,
    options ?? { viewColumn: vscode.ViewColumn.Two, preserveFocus: true }
  );
};

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand("ql-html-pdf-renderer.live-preview", () => {
      const panel = createPreview(context);

      const activeEditor = vscode.window.activeTextEditor;
      if (activeEditor) {
        const payload = activeEditor.document.getText();
        panel.webview.postMessage({ event: "load", payload });
      }

      vscode.workspace.onDidSaveTextDocument((e) => {
        const savedText = e.getText();
        panel.webview.postMessage({ event: "change", payload: savedText });
      });

      panel.webview.onDidReceiveMessage((e) => {
        vscode.window.showErrorMessage(e.payload);
      });
    })
  );
}

export function deactivate() {}
