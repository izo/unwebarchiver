Unwebarchiver
---

Unwebarchiver is a web extractor for `.webarchive` files. `.webarchive` files are binary `.plist` files saved from Safari when using `File > Save as…` on a web page.

## Plan

1. Read binary `.webarchive` file.
2. Convert from binary to XML.
3. Convert entries from Base64 with `atob()`.

## Ressources

https://alexwlchan.net/til/2024/whats-inside-safari-webarchive/

https://medium.com/@karaiskc/understanding-apples-binary-property-list-format-281e6da00dbd
