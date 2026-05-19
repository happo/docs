---
id: github-enterprise
title: GitHub Enterprise (On-premise)
---

If you run a self-hosted GitHub Enterprise Server, you can connect it to Happo
so that Happo can post commit statuses, post check runs, and react to pull
request webhooks just like it does for github.com. This guide walks through
creating the Happo GitHub App on your GHE instance and entering the resulting
credentials into Happo.

If you're using github.com instead, follow
[the regular GitHub instructions](continuous-integration.md#github). If you
can't install a GitHub App on your GHE instance for any reason, there's also a
[token-based fallback](continuous-integration.md#posting-statuses-without-installing-the-happo-github-app)
that posts statuses as a PR comment.

## Prerequisite: Allow traffic from Happo

Because your GHE instance is self-hosted, Happo can only reach it if your
network allows inbound traffic from Happo's servers. Before starting the steps
below, reach out to [support@happo.io](mailto:support@happo.io) and we'll work
with you to figure out the right allowlist (IP ranges, hostnames, or a private
networking setup) for your environment. Without this in place, the **Test
connection** step at the end of this guide will fail.

## Step 1: Find your Happo account ID

You'll need your Happo account ID to construct the webhook URL in the next
step. Open the Happo dashboard and look at the URL in the address bar -- the
account ID is the numeric segment that comes right after `/a/`. For example, in

```
https://happo.io/a/12345/dashboard
```

the account ID is `12345`. The same ID appears in any other account-scoped URL
(projects, integrations, etc.), so you can grab it from there too.

## Step 2: Create the Happo GitHub App in GitHub Enterprise

The Happo GitHub App needs to be created manually on your GHE instance. If the
app should be owned by an organization, use that org's developer settings
instead of your personal ones.

1. On your GHE instance, go to **Settings → Developer settings → GitHub Apps**
   and click **New GitHub App**.
2. **GitHub App name**: `Happo`
3. **Homepage URL**: `https://happo.io`
4. **Callback URL**: `https://happo.io/auth/github/callback`
5. **Webhook URL**:
   `https://happo.io/github/on-premise/<accountId>/hook` -- substitute the
   account ID from step 1. For example, if your account ID is `12345`, the
   webhook URL is `https://happo.io/github/on-premise/12345/hook`.
6. **Webhook secret**: Generate a random string and save it -- you'll paste
   the same value into Happo in step 3. A quick way to generate one:

   ```bash
   openssl rand -hex 32
   ```

7. **Repository permissions**:
   - **Metadata**: Read
   - **Pull requests**: Read
   - **Commit statuses**: Read & Write
   - **Checks**: Read & Write
8. **Subscribe to events**: Pull request, Push.
9. **Where can this app be installed?**: Only on this account (recommended).
10. Click **Create GitHub App**.

Once the app exists, open its settings page on GHE and finish a few more
things:

- Under **Private keys**, click **Generate a private key**. GHE will download
  a `.pem` file -- keep it handy, you'll paste its contents into Happo.
- Under **Client secrets**, generate a client secret and save the value.
- Install the app on the org and/or repositories that Happo should see, using
  the **Install App** tab.

## Step 3: Enter the configuration in Happo

In Happo, go to **Account settings → Integrations → GitHub Enterprise
(On-premise)** and click **Configure GitHub Enterprise**. Fill in the form
with the values from step 2:

- **GitHub Enterprise URL** -- The base URL of your GHE instance, e.g.
  `https://github.example.com`.
- **API base URL** (optional) -- Leave blank to use the default
  `{URL}/api/v3`. Only set this if your GHE instance exposes its API at a
  non-standard path.
- **GitHub App ID** -- The numeric ID shown on the app's settings page in GHE.
- **GitHub App private key** -- Paste the full contents of the `.pem` file you
  downloaded, including the `-----BEGIN RSA PRIVATE KEY-----` and
  `-----END RSA PRIVATE KEY-----` lines.
- **OAuth Client ID** -- Shown on the app's settings page in GHE.
- **OAuth Client Secret** -- The client secret you generated in step 2.
- **Webhook secret** -- The same value you configured as the webhook secret on
  the GHE app.

Click **Test connection** to confirm that Happo can authenticate as the app
against your GHE instance. Once the test passes, click **Save configuration**.

Finally, pick the default repository to connect under **Connected repository**.
The dropdown lists every repository where the Happo app has been installed in
GHE -- if it's empty, go back to GHE, install the app on the repo, and reload
the page.

Once the configuration is saved and a repository is connected, Happo will
start receiving `pull_request` and `push` webhook events from your GHE
instance, and will post commit statuses and check runs back as builds
complete.
