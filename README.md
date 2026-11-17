# Branch

Branch is an Electron desktop mind mapper. It opens with an editable sample map. Use **New** to start with a single central node.

## What Branch can do

- **Edit the tree with the keyboard.** Create child and sibling nodes, edit labels, move or reattach branches, and undo or redo changes.
- **Style individual nodes.** The **Node properties** sidebar offers color tags, font families, and font sizes. Rich-text nodes have a title and a body with bold, italic, underline, and bulleted or numbered lists.
- **Navigate the canvas.** Drag the background to pan, use the zoom controls, and search visible node labels and rich-text bodies. Switch between balanced, left-to-right, and top-to-bottom layouts.
- **Connect and collapse branches.** Add dotted connectors with optional captions between any two nodes. Collapse a branch to hide its descendants and see one dot per immediate child.
- **Work with local files.** Open and save editable maps, get a brief confirmation after saving, and export the visible map as a PDF. Branch reopens your last map on launch.

## Run from source

With Node.js and npm installed, run these commands from this folder.

```sh
npm install
npm start
```

## Default keyboard shortcuts

| Action | Shortcut |
| --- | --- |
| Create a child | Cmd + Enter on macOS, Ctrl + Enter on Windows/Linux |
| Create a sibling | Enter |
| Create a rich-text child | Shift + Enter |
| Create a symbol child | Cmd/Ctrl + Shift + Enter |
| Edit the selected label | E or double-click |
| Select a nearby node | Arrow keys |
| Move the selected branch | Shift + arrow keys |
| Reattach a branch | R, select the new parent, then R or Enter |
| Connect or disconnect two nodes | C, select the destination, then Enter |
| Collapse or expand children | . (period) |
| Cancel reattachment or connector selection | Esc |
| Delete a branch | Delete or Backspace |
| Find nodes | Cmd/Ctrl + F, then Enter or Shift + Enter to cycle |
| Fit the map | 0 |
| Toggle freehand drawing | D |
| Undo / redo | Cmd/Ctrl + Z / Cmd/Ctrl + Shift + Z |
| New / open / save | Cmd/Ctrl + N / O / S |
| Save As | Cmd/Ctrl + Shift + S |

Choose Balanced, Left to right, or Top to bottom in the sidebar. **Apply layout** resets manual positions using the selected layout. Undo restores the previous positions.

Branch saves editable maps locally as `.branch` files. **Export PDF** creates a single A4 landscape page fitted to the visible map. Maps support up to 500 nodes and labels up to 120 characters.

Open **Settings → Keyboard Preferences**, select a shortcut, and press the key combination you want. **Save settings** applies your changes immediately and remembers them across launches. **Restore defaults** resets your choices after you save. Use **Settings → Appearance → Night mode** to switch the interface theme. Branch remembers your choice. PDF exports use a light background.

Built-in bindings are defined in `keymap.js`. Each action accepts a list of bindings. Use `Mod` for Command on macOS and Ctrl on Windows/Linux, or `Ctrl` for the physical Control key on all platforms.

To add a dotted connector, select a source node and press **C**. Select the destination with the arrow keys or mouse and press **Enter**. Enter an optional caption to display beside the dotted line, then select **Connect**. Repeat the sequence from either endpoint to remove an existing connector. Press **Esc** to cancel. Connectors save with the map and appear in PDF exports.

Press **.** on a node to collapse its descendants. Each dot represents an immediate child. Press **.** again to expand it. Folded branches stay folded when reopened, and search and PDF export use the visible map.

On launch, Branch reopens the last map you successfully opened or saved. If it is unavailable, Branch starts with the sample map.

Press **D** to draw on the canvas. Use the drawing panel to set the color and thickness of the next stroke. Press **D** again, **Esc**, or **Done** to return to the map. Each stroke can be undone. Drawings save with the map and appear in PDFs.

The three child creation shortcuts open one form on their corresponding tab. To convert an existing node, press **E**, choose another tab, and apply the change. The name and branch relationships are preserved. Rich-text content and symbol choices remain saved when another tab is active. Switch back to show them again.

## AI Generator

Add your OpenAI API key under **Settings → AI**. Open **Add child**, choose **AI Generator**, enter a topic, and click **Apply**. You can also press **E** on an existing node and choose **AI Generator** to edit the saved topic. The first time, it defaults to the node’s name. Applying from Edit or regenerating replaces the existing descendants after the new tree is ready. Branch sends the topic to OpenAI and pauses editing while it waits. The generated tree is inserted beneath the selected node, with up to five levels and at most 60 new nodes per request, subject to the map's 500-node limit. Undo removes the whole generated tree in one step.

Prompts and the response schema live in `prompts.js`. The API key uses Electron's encrypted local credential storage. A development `.env` file is ignored by Git and is only used in development tests.

## File format

See [Branch file format](BRANCH-FORMAT.md) for the JSON structure, examples, and validation rules.

## Change log

The numbers below identify development iterations in chronological order. The package version is currently `1.0.0`.

| Iteration | Changes |
| --- | --- |
| 1. Initial Electron app | Added keyboard-driven tree editing, search, undo and redo, three layouts, local map files, and landscape PDF export. |
| 2. Keyboard fixes and panning | Fixed inconsistent child and sibling creation, added background drag-to-pan, and made `0` center and fit the map. |
| 3. Node properties and rich text | Added sidebar color tags and font controls, formatted note nodes, and search inside note bodies. |
| 4. Configurable shortcuts | Moved bindings to `keymap.js`, changed Add Child to Ctrl + Enter, and restored Tab focus navigation. |
| 5. Dotted connectors | Added saved, printable links between nodes without changing their parent relationships. |
| 6. Connector toggling | Made the same shortcut sequence remove an existing connector from either endpoint, with undo and redo. |
| 7. Connector captions | Added an optional caption prompt and included captions on the canvas, in saved maps, and in PDF exports. |
| 8. Mac Add Child shortcut | Switched macOS to Cmd + Enter and kept Ctrl + Enter on Windows and Linux. |
| 9. Edit shortcut and save toast | Switched Edit Node to `E` and added a brief confirmation after a successful save. |
| 10. Collapse and expand | Added the period shortcut, one dot per immediate child, and persistent collapsed state. |
| 11. Reopen last map | Restored the last successfully opened or saved map at launch, with the sample map as a fallback. |
| 12. Local Git repository | Imported the current source into the repository on `main`. |
| 13. Settings | Added a tabbed Settings window and persistent keyboard preferences, with an Appearance tab for future controls. |
| 14. Night mode | Added a persistent Night mode switch under Appearance. |
| 15. Reattach newly created nodes | Clear any earlier node operation on creation and allow Enter to confirm the new parent. |
| 16. Symbol nodes | Added a picker for a Unicode symbol and its color, with a text label and support for editing, saving, and PDF export. |
| 17. Symbol search | Filter the symbol picker by typing part of a symbol name or pasting a glyph. |
| 18. Expanded symbol library | Added symbols for common activities, shapes, directions, weather, science, games, and more, with keyword search and a scrollable picker. |
| 19. Save As | Added a toolbar action to save under a different filename and continue editing that copy. |
| 20. Doodle tool | Added freehand drawing with adjustable color and thickness, undo, and PDF export. |
| 21. Unified node form | Added Simple, Rich Text, and Symbol tabs for creation and conversion. |
| 22. Preserve node fields | Kept rich text, symbol, and symbol color when converting a node between types. |
| 23. Doodle eraser | Added a partial-stroke eraser with undo and redo for each pass. |
| 24. AI Generator | Added topic-to-tree generation with API key settings and a five-level depth limit. |
| 25. AI Generator in Edit node | Generate descendants from the selected node’s name. Added a snowflake icon to the generator tab. |
| 26. Editable AI topics | Saved AI topics on nodes and made regeneration replace existing descendants in an undoable operation. |
| 27. File format reference | Documented the version 1 `.branch` JSON structure in [BRANCH-FORMAT.md](BRANCH-FORMAT.md), including a complete example, validation limits, and the saved AI topic field. |
