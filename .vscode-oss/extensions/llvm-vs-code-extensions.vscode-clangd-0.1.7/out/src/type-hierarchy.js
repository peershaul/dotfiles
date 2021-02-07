"use strict";
// This file implements the client side of the proposed type hierarchy
// extension to LSP. The proposal can be found at
// https://github.com/microsoft/vscode-languageserver-node/pull/426.
// Clangd supports the server side of this protocol.
// The feature allows querying the base and derived classes of the
// symbol under the cursor, which are visualized in a tree view.
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
function activate(client, context) {
    new TypeHierarchyProvider(context, client);
}
exports.activate = activate;
var TypeHierarchyDirection;
(function (TypeHierarchyDirection) {
    TypeHierarchyDirection.Children = 0;
    TypeHierarchyDirection.Parents = 1;
    TypeHierarchyDirection.Both = 2;
})(TypeHierarchyDirection = exports.TypeHierarchyDirection || (exports.TypeHierarchyDirection = {}));
var TypeHierarchyRequest;
(function (TypeHierarchyRequest) {
    TypeHierarchyRequest.type = new vscodelc
        .RequestType('textDocument/typeHierarchy');
})(TypeHierarchyRequest || (TypeHierarchyRequest = {}));
var ResolveTypeHierarchyRequest;
(function (ResolveTypeHierarchyRequest) {
    ResolveTypeHierarchyRequest.type = new vscodelc.RequestType('typeHierarchy/resolve');
})(ResolveTypeHierarchyRequest = exports.ResolveTypeHierarchyRequest || (exports.ResolveTypeHierarchyRequest = {}));
class TypeHierarchyTreeItem extends vscode.TreeItem {
    constructor(item) {
        super(item.name);
        if (item.children) {
            if (item.children.length == 0) {
                this.collapsibleState = vscode.TreeItemCollapsibleState.None;
            }
            else {
                this.collapsibleState = vscode.TreeItemCollapsibleState.Expanded;
            }
        }
        else {
            this.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
        }
        // Make the item respond to a single-click by navigating to the
        // definition of the class.
        this.command = {
            arguments: [item],
            command: 'clangd.typeHierarchy.gotoItem',
            title: 'Go to'
        };
    }
}
class TypeHierarchyProvider {
    constructor(context, client) {
        this.client = client;
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        context.subscriptions.push(vscode.window.registerTreeDataProvider('clangd.typeHierarchyView', this));
        context.subscriptions.push(vscode.commands.registerTextEditorCommand('clangd.typeHierarchy', this.reveal, this));
        context.subscriptions.push(vscode.commands.registerCommand('clangd.typeHierarchy.close', this.close, this));
        context.subscriptions.push(vscode.commands.registerCommand('clangd.typeHierarchy.gotoItem', this.gotoItem, this));
        context.subscriptions.push(vscode.commands.registerCommand('clangd.typeHierarchy.viewParents', () => this.setDirection(TypeHierarchyDirection.Parents)));
        context.subscriptions.push(vscode.commands.registerCommand('clangd.typeHierarchy.viewChildren', () => this.setDirection(TypeHierarchyDirection.Children)));
        this.treeView = vscode.window.createTreeView('clangd.typeHierarchyView', { treeDataProvider: this });
        context.subscriptions.push(this.treeView);
        // Show children by default.
        this.direction = TypeHierarchyDirection.Children;
    }
    gotoItem(item) {
        return __awaiter(this, void 0, void 0, function* () {
            const uri = vscode.Uri.parse(item.uri);
            const range = this.client.protocol2CodeConverter.asRange(item.selectionRange);
            const doc = yield vscode.workspace.openTextDocument(uri);
            let editor;
            if (doc) {
                editor = yield vscode.window.showTextDocument(doc, undefined);
            }
            else {
                editor = vscode.window.activeTextEditor;
            }
            if (!editor) {
                return;
            }
            editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
            editor.selection = new vscode.Selection(range.start, range.end);
        });
    }
    setDirection(direction) {
        return __awaiter(this, void 0, void 0, function* () {
            this.direction = direction;
            this._onDidChangeTreeData.fire(null);
        });
    }
    getTreeItem(element) {
        return new TypeHierarchyTreeItem(element);
    }
    getParent(element) {
        // This function is only implemented so that VSCode lets us call
        // this.treeView.reveal(). Since we only ever call reveal() on the root,
        // which has no parent, it's fine to always return null.
        return null;
    }
    getChildren(element) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.root)
                return [];
            if (!element)
                return [this.root];
            if (this.direction == TypeHierarchyDirection.Parents) {
                // Clangd always resolves parents eagerly, so just return them.
                return element.parents;
            }
            // Otherwise, this.direction == Children.
            if (!element.children) {
                // Children are not resolved yet, resolve them now.
                const resolved = yield this.client.sendRequest(ResolveTypeHierarchyRequest.type, {
                    item: element,
                    direction: TypeHierarchyDirection.Children,
                    resolve: 1
                });
                element.children = resolved.children;
            }
            return element.children;
        });
    }
    reveal(editor) {
        return __awaiter(this, void 0, void 0, function* () {
            // This makes the type hierarchy view visible by causing the condition
            // "when": "extension.vscode-clangd.typeHierarchyVisible" from
            // package.json to evaluate to true.
            vscode.commands.executeCommand('setContext', 'extension.vscode-clangd.typeHierarchyVisible', true);
            const item = yield this.client.sendRequest(TypeHierarchyRequest.type, Object.assign(Object.assign({}, this.client.code2ProtocolConverter.asTextDocumentPositionParams(editor.document, editor.selection.active)), { 
                // Resolve up to 5 initial levels. Any additional levels will be resolved
                // on the fly if the user expands the tree item.
                resolve: 5, 
                // Resolve both directions initially. That way, if the user switches
                // to the Parents view, we have the data already. Note that clangd
                // does not support resolving parents via typeHierarchy/resolve,
                // so otherwise we'd have to remember the TextDocumentPositionParams
                // to make another textDocument/typeHierarchy request when switching
                // to Parents view.
                direction: TypeHierarchyDirection.Both }));
            if (item) {
                this.root = item;
                this._onDidChangeTreeData.fire(null);
                // This focuses the "explorer" view container which contains the
                // type hierarchy view.
                vscode.commands.executeCommand('workbench.view.explorer');
                // This expands and focuses the type hierarchy view.
                this.treeView.reveal(this.root, { focus: true });
            }
            else {
                vscode.window.showInformationMessage('No type hierarchy available for selection');
            }
        });
    }
    close() {
        // Hide the type hierarchy view.
        vscode.commands.executeCommand('setContext', 'extension.vscode-clangd.typeHierarchyVisible', false);
        this.root = undefined;
        this._onDidChangeTreeData.fire(null);
    }
}
//# sourceMappingURL=type-hierarchy.js.map