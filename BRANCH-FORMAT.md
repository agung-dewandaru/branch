# Branch file format

A `.branch` file is a UTF-8 JSON document containing one mind map. The current format version is the integer `1`, independent of the app's package version. Branch opens files up to 40,000,000 bytes.

## Complete example

```json
{
  "version": 1,
  "layout": "balanced",
  "nodes": [
    {
      "id": "root",
      "parent": null,
      "label": "Launch plan",
      "dx": 0,
      "dy": 0
    },
    {
      "id": "design",
      "parent": "root",
      "label": "Design",
      "dx": 0,
      "dy": 0,
      "type": "rich",
      "rich": "<p>Review the <strong>first draft</strong>.</p>",
      "tag": "blue",
      "fontSize": 16
    },
    {
      "id": "review",
      "parent": "root",
      "label": "Review",
      "dx": 12,
      "dy": -8,
      "type": "symbol",
      "symbol": "check",
      "symbolColor": "green"
    }
  ],
  "connectors": [
    ["design", "review", "Ready for"]
  ],
  "doodles": [
    {
      "color": "#bf4f73",
      "width": 4,
      "points": [[-85, 50], [-70, 42], [-55, 50]]
    }
  ]
}
```

## Top-level fields

| Field | Required | Description |
| --- | --- | --- |
| `version` | Yes | The integer `1`. |
| `layout` | Yes | `balanced` branches to both sides, `right` lays out left to right, and `down` lays out top to bottom. |
| `nodes` | Yes | Array of 1–500 nodes. The root must be first. Among children of the same parent, array order determines layout order. |
| `connectors` | No | Array of dotted cross-links between nodes. |
| `doodles` | No | Array of freehand strokes, rendered in array order. |

## Nodes

| Field | Required | Description |
| --- | --- | --- |
| `id` | Yes | Unique nonempty string, up to 120 UTF-16 code units. It serves as the reference from parents and connectors. |
| `parent` | Yes | `null` for the root. Every other node references its parent's ID. Following parents must reach the root without cycles. |
| `label` | Yes | Node name, up to 120 UTF-16 code units and nonempty after trimming. |
| `dx`, `dy` | Yes | Finite horizontal and vertical offsets from the automatic layout, each from −10,000 to 10,000. Positive offsets move right and down. Descendants inherit ancestor offsets. |
| `type` | No | Active display type. One of `simple`, `rich`, `symbol`, or `image`. |
| `image` | For active image nodes | Object with `data` as a base64 PNG, JPEG, or WebP data URL, and integer `width` and `height` from 1 to 200. Decoded image payload is at most 50,000 bytes. Retained across type changes. |
| `rich` | No | Rich-text body as an HTML fragment, up to 3,000 UTF-16 code units before and after sanitization. An empty body is allowed. |
| `symbol` | For active symbol nodes | Symbol catalog ID, such as `star`, `check`, or `target`. The full list is defined by `symbols` in [app.js](app.js). |
| `symbolColor` | No | Requires a `symbol`. IDs are `default`, `green`, `blue`, `amber`, `rose`, `violet`, `teal`, or `gray`. Omit for automatic color. |
| `tag` | No | Node color tag. IDs are `default`, `green`, `amber`, `blue`, `rose`, `violet`, `teal`, or `gray`. Omit for automatic branch coloring. |
| `font` | No | Font family ID. Options are `default`, `arial`, `georgia`, `verdana`, `times`, or `courier`. |
| `fontSize` | No | Integer from 12 to 32 pixels. Defaults to 14. |
| `aiTopic` | No | Last successfully applied AI Generator topic for the node, up to 500 UTF-16 code units. |
| `collapsed` | No | Boolean. When true, the node stays visible and its descendants are hidden. |

For older maps without `type`, Branch infers `rich` if `rich` is present, then `symbol` if `symbol` is present, and otherwise `simple`. Include an explicit `type` when storing fields for multiple types. A node can retain both its rich-text body and symbol settings while displaying only its active type.

Branch sanitizes rich text when loading. It keeps `b`, `strong`, `i`, `em`, `u`, `br`, `div`, `p`, `ul`, `ol`, and `li` elements. It preserves only left, right, and justify text alignment on div, p, and li elements and strips other attributes. Script, style, and template contents are discarded.

## Connectors

Each entry is `[sourceId, destinationId]` or `[sourceId, destinationId, caption]`. Both IDs must refer to existing, distinct nodes. A pair can appear only once in either order. Captions are plain text strings up to 120 UTF-16 code units. Connectors are hidden when either endpoint is collapsed out of view.

## Doodles

Each stroke contains:

- `color` as a six-digit RGB hex string with a leading `#`.
- `width` as an integer from 1 to 24, in unzoomed canvas pixels.
- `points` as a nonempty array of `[x, y]` pairs relative to the center of the root node, in unzoomed canvas pixels. Positive values go right and down. Each coordinate must be finite and between −10,000,000 and 10,000,000.

Branch connects consecutive points with straight segments and renders a single-point stroke as a dot. A map supports up to 20,000 points across all strokes. Partial erasure can split one stroke into multiple entries.

## App-local state

Keyboard preferences, night mode, and the last-opened file path live in separate local app settings. The map stores the tree, layout, styling, collapse state, connectors, and doodles. Selection, viewport position, zoom, and undo history are session state.
