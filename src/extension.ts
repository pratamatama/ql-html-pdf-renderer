import * as vscode from "vscode";

const createPreview = () => {
  const panel = createPanel("Preview");
  const template = getTemplate();
  panel.webview.html = template;
  panel.webview.options = { ...panel.webview.options, enableScripts: true };
  return panel;
};

const getTemplate = () => {
  return `<!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
        <title>Document</title>
        <style>
          * {
            margin: 0;
            padding: 0;
          }

          .btn {
            outline: none;
            border: none;
            padding: 0.25rem 0.5rem;
            background-color: grey;
            cursor: pointer;
          }

          .navbar {
            padding-top: 4rem;
            padding-bottom: 1rem;
            display: flex;
            justify-content: end;
            align-items: center;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          }

          .render-options__button.active {
            background-color: white;
          }

          .form-control {
            padding: 0.25rem;
          }

          #content {
            width: 100%;
            display: flex;
            justify-content: center;
            align-items: center;
            background-color: white;
            border: none;
            outline: none;
          }
        </style>
      </head>
      <body>
        <header>
          <nav class="navbar">
            <div class="render-config">
              <select
                id="select-orientation"
                name="orientation"
                class="form-control"
              >
                <option value="portrait" selected>Portrait</option>
                <option value="landscape">Landscape</option>
              </select>
              <select
                id="select-size"
                name="size"
                class="form-control"
              >
                <option value="A4" selected>A4</option>
                <option value="A5">A5</option>
                <option value="F4">F4</option>
              </select
              <input
                id="input-size-custom"
                name="input-size-custom"
                type="text"
                class="form-control"
              />
            </div>
          </nav>
        </header>

        <main id="content"></main>

        <script>
          const vscode = acquireVsCodeApi();
          
          let orientation = "portrait";
          let size = "A4";
          let sizeCustom;
          let payload;

          window.addEventListener("message", (e) => {
            switch (e.data.event) {
              case "load":
              case "change":
                payload = e.data.payload
                loadPdf();
                break;
              default:
                break;
            }
          });

          const loadPdf = async (body) => {
            try {
              const content = document.querySelector("#content");
              const existingIframe = document.querySelector("#pdfPreview");
              if (existingIframe) {
                content.removeChild(existingIframe);
              }

              const url = "https://backend.qqltech.com:1962/api/pdf/render";
              await fetch(url, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json;charset=UTF-8",
                },
                body: JSON.stringify({
                  orientation,
                  size,
                  sizeCustom,
                  body: payload,
                }),
              });

              const embed = document.createElement("embed");
              embed.setAttribute("id", "pdfPreview");
              embed.setAttribute("src", "http://docs.google.com/gview?url=https://backend.qqltech.com:1962/storage/public/development/pdf/fly.pdf&embedded=true");
              embed.style.width = "100%";
              embed.style.height = "90vh";
              content.appendChild(embed);
            } catch (e) {
              console.error(e);
              vscode.postMessage({
                event: "fetch-failed",
                payload: "Something went wrong when trying to render PDF.",
              });
            }
          };

          const toggleRenderButtonClasses = (e) => {
            const active = document.querySelector(".render-options__button.active");
            active?.classList.remove("active");
            e.classList.add("active");
          };

          document
            .querySelector("#select-orientation")
            .addEventListener("input", (e) => {
              const timer = setTimeout(() => {
                orientation = e.target.value;
                clearTimeout(timer);
                loadPdf();
                console.log("orientation-changed", e.target.value);
              }, 800);
            });

          document
            .querySelector("#select-size")
            .addEventListener("input", (e) => {
              const timer = setTimeout(() => {
                size = e.target.value;
                clearTimeout(timer);
                loadPdf();
                console.log("size-changed", e.target.value);
              }, 800);
            });

          document.querySelector("#input-size-custom")?.addEventListener("input", (e) => {
            const timer = setTimeout(() => {
              sizeCustom = e.target.value;
              clearTimeout(timer);
              loadPdf();
              console.log("size-custom-changed", e.target.value);
            }, 800);
          });
        </script>
      </body>
    </html>
  `;
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
      const panel = createPreview();

      const activeEditor = vscode.window.activeTextEditor;
      if (activeEditor) {
        const payload = activeEditor.document.getText();
        panel.webview.postMessage({ event: "load", payload });
      }

      vscode.workspace.onDidSaveTextDocument((e) => {
        const payload = e.getText();
        panel.webview.postMessage({ event: "change", payload });
      });

      panel.webview.onDidReceiveMessage((e) => {
        vscode.window.showErrorMessage(e.payload);
      });
    })
  );
}

export function deactivate() {}
