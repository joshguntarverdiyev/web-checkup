# Security Policy

If you find a vulnerability in this repository's scripts (for example, a way for a scanned project to make `scan.mjs` execute code), please report it privately through GitHub's "Report a vulnerability" button on the Security tab rather than opening a public issue.

The scripts only read files (`scan.mjs`), send ordinary GET requests to the URL you pass (`check-url.mjs`), or drive a headless browser to the URL you pass (`visual-check.mjs`). They do not execute code from the scanned project.
