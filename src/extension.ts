import * as vscode from "vscode";

const createPreview = (context: vscode.ExtensionContext) => {
  const panel = createPanel("Preview");
  const template = getTemplate(context);
  panel.webview.html = template;
  panel.webview.options = { ...panel.webview.options, enableScripts: true };
  return panel;
};

const getTemplate = (context: vscode.ExtensionContext) => {
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
            justify-content: space-between;
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
            <div class="render-options">
              <button class="btn render-options__button active">TCPDF</button>
              <button class="btn render-options__button">DOMPDF</button>
              <button class="btn render-options__button">NODEPDF</button>
            </div>
            <div class="render-config">
              <select
                id="select-orientation"
                name="orientation"
                class="form-control"
              >
                <option value="P" selected>Portrait</option>
                <option value="L">Landscape</option>
              </select>
              <input
                id="input-size"
                name="input-size"
                type="text"
                value="A4"
                class="form-control"
              />
            </div>
          </nav>
        </header>

        <main id="content"></main>

        <script>
          const vscode = acquireVsCodeApi();

          let renderMode = "TCPDF";
          let orientation = "L";
          let size = "A4";
          let data;

          window.addEventListener("message", (e) => {
            const { event, payload } = (data = e.data);

            switch (event) {
              case "load":
              case "change":
                loadPdf(payload);
                break;
              default:
                break;
            }
          });

          const loadPdf = async (payload) => {
            try {
              const content = document.querySelector("#content");
              const existingIframe = document.querySelector("#pdfPreview");
              if (existingIframe) {
                content.removeChild(existingIframe);
              }

              const modes = {
                TCPDF: "tcpdf",
                DOMPDF: "dom",
                NODEPDF: "node",
              };

              const mode = modes[renderMode];
              const url = "https://backend.qqltech.com/pdfrenderer/" + mode + ".php";
              const response = await fetch(url, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json;charset=UTF-8",
                },
                body: JSON.stringify({
                  orientation,
                  size,
                  plain: "true",
                  data: payload,
                }),
              });

              const blob = await response.blob();
              const blobs = new Blob([blob], { type: "application/pdf" });
              const src = URL.createObjectURL(blobs);

              const iframe = document.createElement("iframe");
              iframe.setAttribute("id", "pdfPreview");
              iframe.setAttribute("src", src);
              iframe.style.width = "100%";
              iframe.style.height = "90vh";
              content.appendChild(iframe);
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
            .querySelectorAll(".render-options__button")
            .forEach((element) => {
              element.addEventListener("click", () => {
                renderMode = element.innerHTML;
                toggleRenderButtonClasses(element);
                loadPdf(data);
              });
            });

          document
            .querySelector("#select-orientation")
            .addEventListener("input", (e) => {
              const timer = setTimeout(() => {
                orientation = e.target.value;
                clearTimeout(timer);
                loadPdf(data);
                console.log("orientation-changed", e.target.value);
              }, 800);
            });

          document.querySelector("#input-size").addEventListener("input", (e) => {
            const timer = setTimeout(() => {
              size = e.target.value;
              clearTimeout(timer);
              loadPdf(data);
              console.log("size-changed", e.target.value);
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
