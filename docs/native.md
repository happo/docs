---
id: native
title: Native Apps
---

Happo is mainly targeted at web applications and websites, but its underlying
visual testing system is agnostic about the technologies used. This means that
anything that can produce screenshots can make use of Happo. If you have native
apps (like iOS, Android or other platforms) you can leverage Happo for
screenshot testing with a little bit of custom setup. In this integration
guide, we'll use [the Happo API](api.md) directly.

## Creating a test runner

First, you'll need some way of rendering individual components and variants of
that component. For each component variant, you're going to take a screenshot,
upload that screenshot to an image storage (like Amazon S3 for instance). Put
all component variants together in a JSON array that you upload to Happo (this
is called a "report").

You could build the test runner into your app itself, or you can build a test
runner outside of the app communicating with the app to render and get
screenshots.

## Uploading screenshot images

A key aspect for Happo is the ability to quickly diff two image snapshots
purely based on the URL to the image. If the URLs aren't equal, we assume the
two images are different. If you end up using the Happo API directly, you are
responsible for providing bitmap-unique URLs when you upload reports. If you
use the Happo client, this is automatically taken care of.

### Bitmap hashing

Based on the raw image bitmap, generate a deterministic hash string and use in
the URL to the image. Happo uses the md5 algorithm internally, but you are free
to use any hashing function.

Apart from helping Happo diff images faster, bitmap-unique URLs will help keep
the snapshot-storage size down by not saving duplicates.

### CORS settings

Happo does in-browser diffing of your images. For this to work, the images
uploaded in your report must be served with an Access-Control-Allow-Origin CORS
header, granting access to the happo.io domain (or your custom domain if you
have a different setup).

If you use Amazon S3 storage, this article on CORS is helpful:
https://docs.aws.amazon.com/AmazonS3/latest/dev/cors.html

## Uploading a report

Use the ["Create report" API
endpoint](https://happo.io/docs/api#Create%20report) to upload your report once
the test run is complete.

## Comparing two reports

Use the ["Compare reports" API
endpoint](https://happo.io/docs/api#Compare%20reports) to compare two reports.
This is especially useful in CI. This call will trigger a Happo status to be
posted to your pull request/commit, given that you've enabled [the Happo GitHub
integration](continuous-integration.md##posting-statuses-back-to-prscommits)
correctly.
