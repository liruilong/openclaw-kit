#!/usr/bin/env python3
"""
Native Messaging host for OpenClaw file drop.
Receives filenames from the Chrome extension, finds their full paths
from recent Finder drag events via the macOS pasteboard / FSEvents.

Fallback: search common directories for matching filenames.
"""

import json
import struct
import sys
import os
import subprocess


SEARCH_DIRS = [
    os.path.expanduser("~/workspace"),
    os.path.expanduser("~/Downloads"),
    os.path.expanduser("~/Documents"),
    os.path.expanduser("~/Desktop"),
    os.path.expanduser("~/agent-workspace"),
]

MAX_DEPTH = 5


def read_message():
    raw_length = sys.stdin.buffer.read(4)
    if len(raw_length) < 4:
        return None
    length = struct.unpack("=I", raw_length)[0]
    data = sys.stdin.buffer.read(length)
    return json.loads(data.decode("utf-8"))


def send_message(obj):
    encoded = json.dumps(obj).encode("utf-8")
    sys.stdout.buffer.write(struct.pack("=I", len(encoded)))
    sys.stdout.buffer.write(encoded)
    sys.stdout.buffer.flush()


def find_via_mdfind(filename):
    """Use macOS Spotlight to find the file."""
    try:
        result = subprocess.run(
            ["mdfind", "-name", filename, "-onlyin", os.path.expanduser("~")],
            capture_output=True, text=True, timeout=3
        )
        paths = [
            p.strip() for p in result.stdout.strip().split("\n")
            if p.strip() and os.path.basename(p.strip()) == filename
        ]
        if paths:
            return paths[0]
    except Exception:
        pass
    return None


def find_in_dirs(filename):
    """Walk common directories to find the file."""
    for base in SEARCH_DIRS:
        if not os.path.isdir(base):
            continue
        for root, dirs, files in os.walk(base):
            depth = root[len(base):].count(os.sep)
            if depth >= MAX_DEPTH:
                dirs.clear()
                continue
            if filename in files or filename in dirs:
                return os.path.join(root, filename)
            full_match = [f for f in files if f == filename]
            if full_match:
                return os.path.join(root, full_match[0])
            dir_match = [d for d in dirs if d == filename]
            if dir_match:
                return os.path.join(root, dir_match[0])
    return None


def resolve(filename):
    path = find_via_mdfind(filename)
    if path:
        return path
    path = find_in_dirs(filename)
    if path:
        return path
    return filename


def main():
    msg = read_message()
    if not msg:
        return

    filenames = msg.get("filenames", [])
    paths = [resolve(f) for f in filenames]
    send_message({"paths": paths})


if __name__ == "__main__":
    main()
