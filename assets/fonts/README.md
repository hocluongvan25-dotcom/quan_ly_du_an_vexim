# PDF fonts

Tinos Regular, Bold and Italic, unmodified, from `@expo-google-fonts/tinos@0.4.1` (the package's `400Regular`, `700Bold`, `400Regular_Italic` directories).

Tinos is a serif, metrically compatible alternative to Times New Roman with Vietnamese coverage. These fonts are licensed under the Apache License 2.0; see `LICENSE-Tinos.txt`. Original copyright and naming metadata remain embedded in each font.

The PDF generator embeds the full font files so the output needs no remote font service, installed system fonts, or headless browser. Do not enable font subsetting without raster-testing Vietnamese composite glyphs: fontkit/pdf-lib subsetting can produce text that extracts correctly but renders with missing glyphs.
