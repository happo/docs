---
id: api
title: API reference
---

The Happo API is a (mostly RESTful) JSON API hosted at happo.io. It can
be used to create deep integrations with Happo. Have a look at the [Native Apps
integration](native.md) for an example of how you can use the API.

## Authentication

> Find your API tokens at https://happo.io/account

All API endpoints are auth protected. To successfully issue a command, you need
to provide an authentication header with your request. There are two ways to
authenticate. JWT authentication is more secure but can be a little tricky to
set up. HTTP Basic authentication is a less secure alternative, but is a good
option if you want a simpler setup.

### Basic authentication

With Basic authentication, you provide an `Authorization: Basic <token>` header
where the token is a base64 encoded string of your `apiKey:apiSecret` tokens.

### JWT authentication

This auth token is a JSON web token generated based on your API key and API
secret. Pass `{ key: <your API key> }` as the payload of the JWT call and the
API secret as the `secret`, and set a `kid` header equal to the API key. Pass
the resulting token as a `Authorization: Bearer <generated token>` header in
all API requests.

An example of how to construct the JWT token can be found in [the source code
for the happo.io
client](https://github.com/happo/happo.io/blob/fc8cece91d811d/src/makeRequest.js#L5).

## Endpoints

> To help ensure that API docs are always up-to-date, we auto-generate and
> publish a full reference at
> [happo.io/docs/api](https://happo.io/docs/api#endpoints)
