# Add a screen recording

Use a video instead of a GIF. Videos are much smaller and sharper. Record your screen (for example with Cmd+Shift+5 on macOS), then convert the recording:

```bash
pnpm media optimize static/video/my-recording.mov
```

This writes `static/video/my-recording.webm` and `static/video/my-recording.mp4`, small enough to commit, and records them in `src/data/videos.json`. Delete the `.mov`, and show the video on a page with `<Video name="my-recording" label="What the video shows" />`. See [media/README.md](media/README.md) for details, and for how to script screenshots and videos so they can be refreshed later.
