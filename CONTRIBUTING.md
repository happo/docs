# Generate a gif from a screen recording

```bash
ffmpeg -i input.mov -filter:v "fps=30,scale=1024:-1" -f gif output.gif
```

The first filter will set the output frame rate at 30 fps. The second filter
will scale down the size (maintaining aspect ratio).
