# PaperDock Native Helper

Chrome/Edge extensions cannot silently read arbitrary local files. This helper lets PaperDock read local Codex/Claude config paths such as:

- `~/.codex/config.toml`
- `~/.codex/auth.json`
- `~/.claude/settings.json`

Windows install:

```powershell
powershell -ExecutionPolicy Bypass -File .\native-host\install-windows.ps1
```

If your extension id is different, pass it explicitly:

```powershell
powershell -ExecutionPolicy Bypass -File .\native-host\install-windows.ps1 -ExtensionId your_extension_id
```

The helper only reads small `.toml`, `.json`, `.env`, and `.txt` files requested by the extension.
