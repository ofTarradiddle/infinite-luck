# www.ofnectar.com on GitHub Pages

Keep the existing Squarespace DNS record:

| Type | Host | Target |
| --- | --- | --- |
| CNAME | `www` | `oftarradiddle.github.io.` |

This is the GitHub Pages target for repositories owned by `oftarradiddle`. If you deploy under a different GitHub user or organization, the target must match that account's `<owner>.github.io` hostname. Do not add the repository name to the DNS target.

The root `CNAME` file contains `www.ofnectar.com`. The Pages build copies it into `dist/pages/CNAME`. **When deploying with GitHub Actions, also set the custom domain explicitly in the repository's Pages settings; the CNAME file alone does not configure an Actions deployment.**

1. Push this repository to GitHub.
2. Open **Settings → Pages**, and choose **GitHub Actions** as the build source.
3. Set **Custom domain** to `www.ofnectar.com` and save.
4. Run the included **Deploy GitHub Pages** workflow, or push to `main`.
5. Once GitHub finishes DNS and certificate checks, enable **Enforce HTTPS**.

The existing `oftarradiddle.github.io` DNS target is correct for that GitHub account. The earlier pending custom-domain binding to the Sites preview host has been removed. No registrar DNS records were edited here. The Sites-specific CNAME target and TXT verification records from the earlier draft are not needed for GitHub Pages.

Official references: [GitHub custom-domain setup](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site), [GitHub Pages workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).
