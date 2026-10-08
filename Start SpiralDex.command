#!/bin/zsh
set -eu
cd "${0:A:h}"
if [[ "$(uname -s)" != Darwin ]]; then
  print 'The host requires macOS 14 or later.'
  exit 1
fi
if [[ ! -x .venv/bin/python ]]; then
  python3 -m venv .venv
  .venv/bin/python -m pip install -r requirements.txt
fi
if [[ ! -x host/segment || host/segment.m -nt host/segment ]]; then
  clang -O2 -mmacosx-version-min=14.0 -framework Foundation -framework Vision -framework CoreImage -framework CoreVideo -framework CoreGraphics host/segment.m -o host/segment
fi
.venv/bin/python host/setup.py
print 'Keep this window open. Stop the host with Control-C.'
exec .venv/bin/python host/server.py --phone
