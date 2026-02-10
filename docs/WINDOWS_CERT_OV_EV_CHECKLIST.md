# Windows Code Signing Certificate Checklist (OV/EV)

This checklist is for the **traditional certificate path** used by this repo's existing Windows signing flow:

- CI/local signing expects:
  - `WIN_CSC_LINK` (path to `.pfx`)
  - `WIN_CSC_KEY_PASSWORD`
- GitHub Actions secrets:
  - `WINDOWS_CERT_PFX_BASE64`
  - `WINDOWS_CERT_PASSWORD`

## 1) Decide certificate type

- **OV Code Signing**:
  - Usually cheaper and faster.
  - Good for most indie/team desktop app distribution.
  - May still trigger SmartScreen warnings initially until reputation builds.
- **EV Code Signing**:
  - Stronger identity validation.
  - Often higher trust with Windows ecosystems.
  - Usually more expensive and may be delivered on hardware token/HSM constraints.

## 2) Confirm delivery format before purchase

For this repo's current CI flow, you need a certificate that can be used as `.pfx` in automation.

Before buying, ask the provider:

1. Can the cert/private key be used in CI as a `.pfx` (exportable)?
2. If not exportable, what are the supported automation options?
3. Are there restrictions on key storage (token-only/HSM-only)?

If provider is token-only for your selected certificate:

- GitHub-hosted runners cannot directly use a USB token.
- Use one of these alternatives:
  - self-hosted Windows runner with token access
  - switch to a cloud signing service
  - choose a certificate/package that supports CI-compatible key usage

## 3) Prepare validation documents

Typical requirements (varies by CA and jurisdiction):

- Government-issued ID for requestor
- Organization registration documents (for OV/EV org certs)
- Verified company phone/address/domain evidence
- Possible legal/op contact verification calls/emails

## 4) Receive and install certificate

Typical outcome:

- `.pfx` file (or process to export/import into Windows cert store)
- certificate password
- intermediate/root cert chain guidance (if needed)

Store securely:

- `.pfx` file in encrypted storage
- password in your password manager

## 5) Local signing smoke check

On Windows:

```bash
cd apps/desktop
set WIN_CSC_LINK=C:\\path\\to\\codesign.pfx
set WIN_CSC_KEY_PASSWORD=your_password_here
npm run package:win
```

Verify resulting binaries/installer are signed (PowerShell):

```powershell
Get-AuthenticodeSignature .\apps\desktop\dist\*.exe | Format-List
```

## 6) Configure GitHub secrets for CI

From repo root:

```bash
node scripts/pfx_to_base64.mjs --in /path/to/codesign.pfx --out output/windows-cert.pfx.base64
gh secret set WINDOWS_CERT_PFX_BASE64 --body-file output/windows-cert.pfx.base64
gh secret set WINDOWS_CERT_PASSWORD --body "your_password_here"
rm -f output/windows-cert.pfx.base64
```

Then trigger CI/release workflow and verify Windows artifacts are signed.

## 7) Operational hygiene

- Rotate certificates before expiry; update secrets proactively.
- Restrict who can read/update signing secrets in GitHub.
- Keep signing password out of plaintext scripts and shell history.
- Keep one dry-run release check after every cert renewal.

