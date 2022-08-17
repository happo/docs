---
id: image-api
title: Image API
---

If you are doing a custom integration where you take your own screenshots, you
can use the Happo Image API to store them. This API uses the same authentication
mechanism as the regular API, so make sure to check out the [Authentication
docs](https://happo.io/docs/api#authentication) first before you start making
requests.

## Step 1: Generate a hash

The Image API expects PNG images. The first thing you should do once you have
made a screenshot is to generate a hash based on the contents of the screenshot
file. You can use pretty much any hashing algorithm, e.g. md5. It's important
that this hash stays the same if the pixels in the image stays the same. Once
you have a hash, it's time to move on to the next step in the process.

## Step 2: Request upload url

The first call you make to the API only has the hash, it doesn't have the
screenshot itself.

```
GET /api/images/:hash/upload-url
```
There are two possible responses to this request. If no image with the provided
hash has been saved before, the response will have an `uploadUrl` in its
response:

```
GET /api/images/6a204bd89f3c8348afd5c77c717a097a/upload-url
RESPONSE:
{
  uploadUrl: 'https://happo.io/api/images/upload/08afd6f9ae0c6017d105b4ce580de885',
  url: 'https://happo.io/a/8/img/happo-lcs/6a204bd89f3c8348afd5c77c717a097a',
}
```

If an image with the same hash has already been saved, you get a slightly
different response (without the `uploadUrl`):

```
GET /api/images/6a204bd89f3c8348afd5c77c717a097a/upload-url
RESPONSE:
{
  message: 'This image has already been uploaded',
  uploadUrl: null,
  url: 'https://happo.io/a/8/img/happo-lcs/6a204bd89f3c8348afd5c77c717a097a',
}
```

If the `uploadUrl` is present in the response, move on to the last step in the
process. If there is no `uploadUrl` in the response, you can use the `url`
directly, when you e.g. are creating a report in a [Native app
integration](native.md).

## Step 3: Upload image

When you have an `uploadUrl`, make another request to it with a PNG file set as
the `file` field in a
[FormData](https://developer.mozilla.org/en-US/docs/Web/API/FormData) request.

```
POST https://happo.io/api/images/upload/08afd6f9ae0c6017d105b4ce580de885
file: <png file buffer>
```

The response will have a `url` in the JSON response. This URL can be used when
you are creating reports in e.g. a [Native app integration](native.md). If you
didn't get an `uploadUrl` in step 2, you can use the `url` in the first
response.
