---
id: webhooks
title: Webhooks
---

Webhooks allow you to get notified about certain events that occur in your Happo
account. Use webhooks to create deeper integrations with Happo.

## Usage

You'll find a link to [Webhooks admin](https://happo.io/webhooks) from your
Happo dashboard. Please note that you must be an administrator of the Happo
account to use this feature.

<img
  src="/img/webhooks-new.png"
  alt="Adding a new webhook"
  width="421"
  height="319"
/>

Enter a URL where your server is listening and a secret to use when signing
requests.

Use the checkboxes to select which event types the webhook should receive. At
least one event type must be enabled.

## Event types

### `comparison`

The comparison event is sent when a comparison between two reports have been
made. The payload data for this event is
[a Comparison object](https://happo.io/docs/api#Comparison). Here's an example
payload:

```json
{
  "type": "comparison",
  "data": {
    "diffs": [
      [
        {
          "id": "8d266ae7368477c75c0338afefe2052c",
          "component": "Big canvas",
          "variant": "standalone",
          "target": "electron-1000x660",
          "url": "https://happo.io/a/1/img/happo-io/437df8d769323e9e614c14214caae266",
          "width": 1000,
          "height": 1375
        },
        {
          "id": "438d266ae7368477c75c0338afefe205",
          "component": "Big canvas",
          "variant": "standalone",
          "target": "electron-1000x660",
          "url": "https://happo.io/a/1/img/happo-io/7df8d768c9323e9e614c14214caae266",
          "width": 1000,
          "height": 1375
        }
      ]
    ],
    "ignoredDiffs": [],
    "added": [],
    "unchanged": [
      {
        "id": "8d266ae7368477c75c0338afefe2052c",
        "component": "Big canvas",
        "variant": "default",
        "target": "electron-1000x660",
        "url": "https://happo.io/a/1/img/happo-io/7df8d768c9323e9e614c14214caae266",
        "width": 1000,
        "height": 1375
      }
    ],
    "hash": "7d3fee157f81008b60f48dcfd9de0c3f",
    "summary": "Differences were found.\n\n- 1 diff - 1 unchanged example\n\nView full report at \nhttps://happo.io/a/1/p/1/compare/dev-5b8733872b18c9dcf58c/dev-17c0aafc?t=added\n",
    "statusImageUrl": "https://happo.io/a/1/p/1/compare/dev-5b8733872b18c9dcf58c/dev-17c0aafc/status.svg",
    "compareUrl": "https://happo.io/a/1/p/1/compare/dev-5b8733872b18c9dcf58c/dev-17c0aafc?t=added",
    "equal": false,
    "status": "failure"
  }
}
```

### `flake`

The flake event is sent when a diff is [reported as flaky](reporting-flake.md).
It is also sent when the report is undone.

**Example — flake reported, tied to a comparison**

```json
{
  "type": "flake",
  "text": "Flake report [Acme Web]: Button / primary (chrome) — https://happo.io/a/42/p/7/compare/abc123/def456",
  "data": {
    "action": "reported",
    "link": "https://happo.io/a/42/p/7/compare/abc123/def456",
    "reportedAt": "2026-05-08T14:23:11.482Z",
    "project": {
      "id": 7,
      "name": "Acme Web"
    },
    "comparison": {
      "id": 9182,
      "beforeSha": "abc123",
      "afterSha": "def456"
    },
    "snapshot1": {
      "id": "0f1e2d3c4b5a69788796a5b4c3d2e1f0",
      "component": "Button",
      "variant": "primary",
      "target": "chrome",
      "url": "https://happo.io/a/42/img/happo-io/abc/0f1e2d3c4b5a6978.png",
      "width": 200,
      "height": 48
    },
    "snapshot2": {
      "id": "fedcba9876543210fedcba9876543210",
      "component": "Button",
      "variant": "primary",
      "target": "chrome",
      "url": "https://happo.io/a/42/img/happo-io/def/fedcba9876543210.png",
      "width": 200,
      "height": 48
    }
  }
}
```

**Example — flake report undone, no comparison context**

```json
{
  "type": "flake",
  "text": "Flake report undone [Acme Web]: Badge / default (firefox) — https://happo.io/a/42/p/7/snapshot/0f1e.../compare/fedc...",
  "data": {
    "action": "undone",
    "link": "https://happo.io/a/42/p/7/snapshot/0f1e2d3c4b5a69788796a5b4c3d2e1f0/compare/fedcba9876543210fedcba9876543210",
    "reportedAt": "2026-05-08T14:31:02.117Z",
    "project": {
      "id": 7,
      "name": "Acme Web"
    },
    "comparison": null,
    "snapshot1": {
      "id": "0f1e2d3c4b5a69788796a5b4c3d2e1f0",
      "component": "Badge",
      "variant": "default",
      "target": "firefox",
      "url": "https://happo.io/a/42/img/happo-io/abc/0f1e2d3c4b5a6978.png",
      "width": 64,
      "height": 24
    },
    "snapshot2": {
      "id": "fedcba9876543210fedcba9876543210",
      "component": "Badge",
      "variant": "default",
      "target": "firefox",
      "url": "https://happo.io/a/42/img/happo-io/def/fedcba9876543210.png",
      "width": 64,
      "height": 24
    }
  }
}
```

**Field reference**

| Field                         | Type                       | Notes                                                                                                                                       |
| ----------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `action`                      | `"reported"` \| `"undone"` | Whether a flake was just reported or had its report withdrawn.                                                                              |
| `link`                        | string                     | Best page link to view the diff: comparison page when available, otherwise the snapshot-vs-snapshot page.                                   |
| `reportedAt`                  | ISO 8601 string            | Server-side event timestamp; useful for de-duping retries.                                                                                  |
| `project.id` / `project.name` | number / string            | The project the flake belongs to.                                                                                                           |
| `comparison`                  | object \| `null`           | Most flake reporting happens in the context of a comparison, but it is not guaranteed. Contains `id`, `beforeSha`, `afterSha` when present. |
| `snapshot1` / `snapshot2`     | object                     | The two snapshots being compared. `width`/`height` may be `null` for accessibility snapshots.                                               |

## Verifying signatures

Every webhook call made by Happo will contain a `X-Happo-Signature` header. You
can use the value of this header to verify that the call is in fact made by
Happo. The signature is computed using a SHA-256 HMAC hex digest. Here's how you
can verify the signature using NodeJS with Express:

```js
const crypto = require('crypto');

async function handleHappoWebhook(req, res, next) {
  try {
    const signature = req.get('X-Happo-Signature');
    const hmac = crypto.createHmac('sha256', process.env.HAPPO_WEBHOOK_SECRET);
    const computedSignature = `sha256=${hmac.update(rawBody).digest('hex')}`;
    if (
      !crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(computedSignature),
      )
    ) {
      // The signature is incorrect
      return res.status(401).send();
    }
    // The signature is correct
    await handleHappoEvent(JSON.parse(req.body));
    res.status(204).send();
  } catch (e) {
    next(e);
  }
}
```

## Timeouts

Happo will wait at most 20 seconds for a response from the webhook. Make sure
you handle the event quickly. Ideally you shouldn't keep Happo waiting if you
are doing time-consuming things as a result of an event.

## Re-delivering a webhook

Every webhook that Happo sends is stored with your Happo account. You can
inspect the results of each webhook delivery. This will help when debugging
webhooks. You can also re-deliver an webhook using the admin UI.

<img
  src="/img/webhooks-recent-deliveries.png"
  alt="Recent deliveries for a webhook"
  width="664"
  height="283"
/>

Webhooks are stored a few days on Happo servers, then they are automatically
cleaned out.
