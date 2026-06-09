---
id: mcp
title: MCP server
---

Happo runs an [MCP](https://modelcontextprotocol.io/) server that lets AI
assistants help you manage your visual-regression comparisons. With it,
assistants like Claude, ChatGPT, and Cursor can list comparisons for a commit,
inspect diffs, and approve, reject, or report flake on your behalf.

The server uses the "Streamable HTTP" transport with OAuth 2.1 authentication,
so connecting only requires a single URL. The endpoint is:

```
https://happo.io/api/mcp
```

Clients automatically discover the OAuth endpoints through
`/.well-known/oauth-protected-resource`, so you don't need to configure tokens
manually.

## Available tools

The MCP server exposes the following tools:

- **`list_comparisons_for_sha`** — retrieves all comparisons linked to a
  specific commit SHA.
- **`get_comparison_details`** — returns the complete diffs and snapshot
  information between two reports.
- **`approve_comparison` / `reject_comparison`** — resolves a pending review
  after inspecting the differences.
- **`report_flake`** — marks a spurious diff as a
  [flake](reporting-flake.md) and records attribution.

## Setup

### Claude Code

Run the following command from your terminal:

```sh
claude mcp add --transport http happo https://happo.io/api/mcp
```

Authorization happens during the first tool use.

### Claude Desktop

Go to **Settings → Connectors → "Add custom connector"** and paste the MCP URL:

```
https://happo.io/api/mcp
```

### Cursor

Configure the server in `~/.cursor/mcp.json` (global) or `.cursor/mcp.json`
(project-specific):

```json
{ "mcpServers": { "happo": { "url": "https://happo.io/api/mcp" } } }
```

Then reload Cursor or toggle the server under **Settings → Features → Model
Context Protocol**.

## Permissions

Connected accounts inherit your permissions, and all actions are attributed to
your user. You can revoke access at any time through the **Connected
applications** section on the [API tokens page](https://happo.io/account).
