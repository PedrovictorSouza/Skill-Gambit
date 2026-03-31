import type { VercelConfig } from '@vercel/config/v1';

export const config: VercelConfig = {
	ignoreCommand:
		"git rev-parse --verify HEAD^ >/dev/null 2>&1 || exit 1; git diff HEAD^ HEAD --name-only | grep -qEv '(\.md$|LICENSE$|\.env\.example$|^\.github/|^\.vscode/)' && exit 1 || exit 0",
	trailingSlash: false,
};
