#!/usr/bin/env python3
import argparse
import json
import sys

from common import resolve_current_session


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--json", action="store_true")
    parser.add_argument("--source", choices=["claude", "codex"])
    parser.add_argument("--field")
    args = parser.parse_args()

    payload = resolve_current_session(preferred_source=args.source)
    if not payload:
        sys.exit(1)

    if args.field:
        value = payload.get(args.field)
        if value is None:
            sys.exit(1)
        print(value)
        return

    if args.json:
        print(json.dumps(payload, ensure_ascii=True))
        return

    print(payload.get("short_session") or payload.get("source") or "unknown")


if __name__ == "__main__":
    main()
