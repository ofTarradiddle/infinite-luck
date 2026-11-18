# www.ofnectar.com custom domain

The domain is registered with the Nectar Sites host. DNS verification and TLS activation are pending until the following records are set at the authoritative DNS provider.

| Type | Name (full hostname) | Value |
| --- | --- | --- |
| `CNAME` | `www.ofnectar.com` | `custom-domains.chatgpt.site.` |
| `TXT` | `_openai-site-verification.www.ofnectar.com` | `openai-site-verification=VKA1WnloaQOEPLB1LvguLI863S_I4sgDM7dqEaz4-VE` |
| `TXT` | `_cf-custom-hostname.www.ofnectar.com` | `ed84a4ba-63e6-4667-a142-b3c586aaa8fe` |

If your DNS editor automatically appends `ofnectar.com`, use relative names `www`, `_openai-site-verification.www`, and `_cf-custom-hostname.www`.

The previous public `www` CNAME was `oftarradiddle.github.io.` when checked. Replace that CNAME with the returned Sites target; keep unrelated DNS and email records. A CNAME cannot coexist with another ordinary record at the same `www` name. Use the verification records exactly as returned by the host, then refresh custom-domain validation.

Site project: `appgprj_6afce5b4a30c8191a10e477c51a4ed6f`

Custom domain record: `appgdom_6afced18f2d08191a63d99fedcdc8ef9`

Adding a hostname or committing a CNAME file does not edit registrar DNS or change the Site's visitor access. The Site's current private access is preserved. The apex `ofnectar.com` is not part of this request.

## DNS editor

Public [Verisign RDAP](https://rdap.verisign.com/com/v1/domain/ofnectar.com) identifies Squarespace Domains II LLC as registrar. The authoritative nameservers remain `ns-cloud-c1` through `ns-cloud-c4.googledomains.com`, commonly used by former Google Domains registrations. Confirm the account managing these DNS records; registrar identity alone does not prove the DNS account.

For a Squarespace-managed domain, follow the official [Edit DNS records](https://support.squarespace.com/hc/en-us/articles/360002101888-Edit-your-domain-s-DNS-records) instructions: open the domain, then **DNS → DNS Settings → Custom Records**. Replace the `www` CNAME and add both TXT entries from the table. No DNS account is connected in this workspace, so the registrar records have not been changed here.
