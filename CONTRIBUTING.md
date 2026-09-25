# Add a screen recording

Use a `.webm` video instead of a GIF. Videos are smaller and sharper. Record
your screen (for example with Cmd+Shift+5 on macOS), then convert the recording:

```bash
pnpm media optimize static/video/my-recording.mov
```

This writes `static/video/my-recording.webm`, re-encoded so it's small enough to
commit. Delete the `.mov`, and embed the video with a `<video>` tag. See
[media/README.md](media/README.md) for details, and for how to script
screenshots and videos so they can be refreshed later.
