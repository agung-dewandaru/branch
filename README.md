# Branch

Branch is an Electron desktop mind mapper. It opens with an editable sample map. Use **New** to start with a single central node.

## Run from source

With Node.js and npm installed, run these commands from this folder.

```sh
npm install
npm start
```

## Keyboard shortcuts

| Action | Shortcut |
| --- | --- |
| Create a child | Cmd + Enter on macOS, Ctrl + Enter on Windows/Linux |
| Create a sibling | Enter |
| Create a rich-text child | Shift + Enter |
| Edit the selected label | E or double-click |
| Select a nearby node | Arrow keys |
| Move the selected branch | Shift + arrow keys |
| Reattach a branch | R, select the new parent, then R again |
| Cancel reattachment | Esc |
| Delete a branch | Delete or Backspace |
| Find nodes | Cmd/Ctrl + F, then Enter or Shift + Enter to cycle |
| Fit the map | 0 |
| Undo / redo | Cmd/Ctrl + Z / Cmd/Ctrl + Shift + Z |
| New / open / save | Cmd/Ctrl + N / O / S |
| Save a copy | Cmd/Ctrl + Shift + S |

Choose Balanced, Left to right, or Top to bottom in the sidebar. **Apply layout** resets manual positions using the selected layout. Undo restores the previous positions.

Branch saves editable maps locally as `.branch` files. **Export PDF** creates a single A4 landscape page fitted to the entire map. Maps support up to 500 nodes and labels up to 120 characters.

Edit `keymap.js` to change the shortcut bindings, then restart Branch. Each action accepts a list of bindings. Use `Mod` for Command on macOS and Ctrl on Windows/Linux, or `Ctrl` for the physical Control key on all platforms.

To add a dotted connector, select a source node and press **C**. Select the destination with the arrow keys or mouse and press **Enter**. Enter an optional caption to display beside the dotted line, then select **Connect**. Repeat the sequence from either endpoint to remove an existing connector. Press **Esc** to cancel. Connectors save with the map and appear in PDF exports.

Press **.** on a node to collapse its descendants. Each dot represents an immediate child. Press **.** again to expand it. Folded branches stay folded when reopened, and search and PDF export use the visible map.

On launch, Branch reopens the last map you successfully opened or saved. If it is unavailable, Branch starts with the sample map.
