"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const vscodelc = require("vscode-languageclient/node");
const config = require("./config");
const fileStatus = require("./file-status");
const install = require("./install");
const semanticHighlighting = require("./semantic-highlighting");
const switchSourceHeader = require("./switch-source-header");
const typeHierarchy = require("./type-hierarchy");
class ClangdLanguageClient extends vscodelc.LanguageClient {
    // Override the default implementation for failed requests. The default
    // behavior is just to log failures in the output panel, however output panel
    // is designed for extension debugging purpose, normal users will not open it,
    // thus when the failure occurs, normal users doesn't know that.
    //
    // For user-interactive operations (e.g. applyFixIt, applyTweaks), we will
    // prompt up the failure to users.
    handleFailedRequest(type, error, defaultValue) {
        if (error instanceof vscodelc.ResponseError &&
            type.method === 'workspace/executeCommand')
            vscode.window.showErrorMessage(error.message);
        return super.handleFailedRequest(type, error, defaultValue);
    }
    activate() {
        this.dispose();
        this.startDisposable = this.start();
    }
    dispose() {
        if (this.startDisposable)
            this.startDisposable.dispose();
    }
}
class EnableEditsNearCursorFeature {
    initialize() { }
    fillClientCapabilities(capabilities) {
        const extendedCompletionCapabilities = capabilities.textDocument.completion;
        extendedCompletionCapabilities.editsNearCursor = true;
    }
}
/**
 *  This method is called when the extension is activated. The extension is
 *  activated the very first time a command is executed.
 */
function activate(context) {
    return __awaiter(this, void 0, void 0, function* () {
        const clangdPath = yield install.activate(context);
        if (!clangdPath)
            return;
        const clangd = {
            command: clangdPath,
            args: config.get('arguments')
        };
        const traceFile = config.get('trace');
        if (!!traceFile) {
            const trace = { CLANGD_TRACE: traceFile };
            clangd.options = { env: Object.assign(Object.assign({}, process.env), trace) };
        }
        const serverOptions = clangd;
        const clientOptions = {
            // Register the server for c-family and cuda files.
            documentSelector: [
                { scheme: 'file', language: 'c' },
                { scheme: 'file', language: 'cpp' },
                // CUDA is not supported by vscode, but our extension does supports it.
                { scheme: 'file', language: 'cuda' },
                { scheme: 'file', language: 'objective-c' },
                { scheme: 'file', language: 'objective-cpp' },
            ],
            initializationOptions: {
                clangdFileStatus: true,
                fallbackFlags: config.get('fallbackFlags')
            },
            // Do not switch to output window when clangd returns output.
            revealOutputChannelOn: vscodelc.RevealOutputChannelOn.Never,
            // We hack up the completion items a bit to prevent VSCode from re-ranking
            // and throwing away all our delicious signals like type information.
            //
            // VSCode sorts by (fuzzymatch(prefix, item.filterText), item.sortText)
            // By adding the prefix to the beginning of the filterText, we get a perfect
            // fuzzymatch score for every item.
            // The sortText (which reflects clangd ranking) breaks the tie.
            // This also prevents VSCode from filtering out any results due to the
            // differences in how fuzzy filtering is applies, e.g. enable dot-to-arrow
            // fixes in completion.
            //
            // We also mark the list as incomplete to force retrieving new rankings.
            // See https://github.com/microsoft/language-server-protocol/issues/898
            middleware: {
                provideCompletionItem: (document, position, context, token, next) => __awaiter(this, void 0, void 0, function* () {
                    let list = yield next(document, position, context, token);
                    let items = (Array.isArray(list) ? list : list.items).map(item => {
                        // Gets the prefix used by VSCode when doing fuzzymatch.
                        let prefix = document.getText(new vscode.Range(item.range.start, position));
                        if (prefix)
                            item.filterText = prefix + '_' + item.filterText;
                        return item;
                    });
                    return new vscode.CompletionList(items, /*isIncomplete=*/ true);
                }),
                // VSCode applies fuzzy match only on the symbol name, thus it throws away
                // all results if query token is a prefix qualified name.
                // By adding the containerName to the symbol name, it prevents VSCode from
                // filtering out any results, e.g. enable workspaceSymbols for qualified
                // symbols.
                provideWorkspaceSymbols: (query, token, next) => __awaiter(this, void 0, void 0, function* () {
                    let symbols = yield next(query, token);
                    return symbols.map(symbol => {
                        if (symbol.containerName)
                            symbol.name = `${symbol.containerName}::${symbol.name}`;
                        // Always clean the containerName to avoid displaying it twice.
                        symbol.containerName = '';
                        return symbol;
                    });
                }),
            },
        };
        const client = new ClangdLanguageClient('Clang Language Server', serverOptions, clientOptions);
        context.subscriptions.push(vscode.Disposable.from(client));
        if (config.get('semanticHighlighting'))
            semanticHighlighting.activate(client, context);
        client.registerFeature(new EnableEditsNearCursorFeature);
        typeHierarchy.activate(client, context);
        client.activate();
        console.log('Clang Language Server is now active!');
        fileStatus.activate(client, context);
        switchSourceHeader.activate(client, context);
        // An empty place holder for the activate command, otherwise we'll get an
        // "command is not registered" error.
        context.subscriptions.push(vscode.commands.registerCommand('clangd.activate', () => __awaiter(this, void 0, void 0, function* () { })));
        context.subscriptions.push(vscode.commands.registerCommand('clangd.restart', () => __awaiter(this, void 0, void 0, function* () {
            yield client.stop();
            client.activate();
        })));
    });
}
exports.activate = activate;
//# sourceMappingURL=extension.js.map