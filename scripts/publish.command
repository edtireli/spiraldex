#!/bin/zsh
# Run this in your own Terminal after reviewing the prepared repository.
# This uploads existing files only. It performs no compilation or CI build.
set -euo pipefail
cd "${0:A:h:h}"
repo='edtireli/spiraldex'
tag='v0.1.0'
release_dir='dist/0.1.0'

for tool in git gh shasum; do
  command -v "$tool" >/dev/null || { print "Install $tool before publishing."; exit 1; }
done
gh auth status
[[ "$(gh api user --jq .login)" == 'edtireli' ]] || { print 'Switch gh to the edtireli account first.'; exit 1; }
[[ -z "$(git status --porcelain)" ]] || { print 'The repository has uncommitted changes. Review and commit them first.'; exit 1; }
[[ "$(git branch --show-current)" == 'main' ]] || { print 'Publish from main.'; exit 1; }
[[ "$(git rev-parse "$tag^{commit}")" == "$(git rev-parse HEAD)" ]] || { print 'The release tag must match the prepared commit.'; exit 1; }
[[ "$(git remote get-url origin)" == "https://github.com/$repo.git" ]] || { print 'The origin remote does not match the expected repository.'; exit 1; }
[[ -f "$release_dir/SHA256SUMS" ]] || { print 'The prebuilt release files are missing. Run the documented local build first.'; exit 1; }
( cd "$release_dir"; shasum -a 256 -c SHA256SUMS )

print '\nPublishing SpiralDex source and the prebuilt v0.1.0 preview…'
if ! gh repo view "$repo" --json name >/dev/null 2>&1; then
  gh repo create "$repo" --public \
    --description 'Your world, in Japanese. A classic pocket field guide powered by models on your own Mac.' \
    --homepage 'https://edtireli.github.io/spiraldex/'
fi
git -c 'credential.helper=!gh auth git-credential' push -u origin main
git -c 'credential.helper=!gh auth git-credential' push origin "$tag"

if ! gh release view "$tag" --repo "$repo" >/dev/null 2>&1; then
  gh release create "$tag" --repo "$repo" --verify-tag --prerelease \
    --title 'SpiralDex v0.1.0 — Classic Dex preview' \
    --notes-file 'release-notes/v0.1.0.md'
fi

download_dir=$(mktemp -d)
trap 'rm -rf "$download_dir"' EXIT
files=("$release_dir/SpiralDex-0.1.0.apk" "$release_dir/SpiralDex-Mac-Host-0.1.0.zip" "$release_dir/SpiralDex-Demo-0.1.0.zip" "$release_dir/SHA256SUMS")
for file in "${files[@]}"; do
  name="${file:t}"
  existing=$(gh api "repos/$repo/releases/tags/$tag" --jq ".assets[] | select(.name == \"$name\") | .id")
  if [[ -n "$existing" ]]; then
    gh release download "$tag" --repo "$repo" --pattern "$name" --dir "$download_dir"
    cmp -s "$file" "$download_dir/$name" || { print "Existing $name differs. Refusing to replace a published release asset."; exit 1; }
    print "Already uploaded and verified: $name"
  else
    gh release upload "$tag" "$file" --repo "$repo"
  fi
done

if gh api "repos/$repo/pages" >/dev/null 2>&1; then
  gh api --method PUT "repos/$repo/pages" -f build_type=legacy -f 'source[branch]=main' -f 'source[path]=/docs' >/dev/null
else
  gh api --method POST "repos/$repo/pages" -f build_type=legacy -f 'source[branch]=main' -f 'source[path]=/docs' >/dev/null
fi
print '\nSource and release uploaded. GitHub Pages will deploy the prebuilt page shortly.'
print "Repository: https://github.com/$repo"
print "Release:    https://github.com/$repo/releases/tag/$tag"
print 'Demo:       https://edtireli.github.io/spiraldex/'
