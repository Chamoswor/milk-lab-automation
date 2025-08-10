#!/usr/bin/env python3
"""
Adds a `/docker-entrypoint.d/00-secrets.sh` script and, if necessary, a
wrapper `ENTRYPOINT` to service Dockerfiles. This injects Docker secrets
(e.g., `*_FILE` variables) as regular environment variables before the main
application process starts.

⬆️ **Update (2025-07-10 @ 22:30)**
----------------------------------
* **Bug Fix:** The `00-secrets.sh` script previously used Bash-specific
  *indirect parameter expansion* (`${!var}`), which failed in Alpine/dash.
  It is now fully POSIX-compliant and works in images like `node:*-alpine`.
"""
from __future__ import annotations

import argparse
import json
import re
import shutil
import subprocess
import sys
import textwrap
from pathlib import Path
from typing import Dict, List, TypedDict, Union

# ---------------------------------------------------------------------------
#                        Type Definitions & Aliases
# ---------------------------------------------------------------------------

class ImageSpecDict(TypedDict, total=False):
    image: str           # Base image (required if a dict)
    force_wrapper: bool  # True -> always add wrapper, False -> never add wrapper
    wrapper: bool        # Alias for force_wrapper

ImageMap = Dict[str, Union[str, ImageSpecDict]]

# ---------------------------------------------------------------------------
#                Content Written to Project Directories
# ---------------------------------------------------------------------------

# This script expands `*_FILE` environment variables into their secret content.
SECRETS_SCRIPT = """\
#!/usr/bin/env sh
# Expands any env var ending in `_FILE` to the contents of the file it points to.
set -e
for var in $(env | awk -F= '$1 ~ /_FILE$/ {print $1}'); do
  dest="${var%_FILE}"
  path="$(printenv "$var")"

  if [ -f "$path" ]; then
    export "$dest"="$(cat "$path")"
  fi
done
"""

# This wrapper ensures that all scripts in `/docker-entrypoint.d` are sourced
# before executing the container's `CMD`.
WRAPPER_SCRIPT = """\
#!/usr/bin/env sh
set -e

# Source all executable scripts in /docker-entrypoint.d to set environment variables.
if [ -d /docker-entrypoint.d ]; then
  for f in /docker-entrypoint.d/*; do
    if [ -x "$f" ]; then
      echo "→ Sourcing $f"
      . "$f"
    fi
  done
fi

# If ENTRYPOINT is run without a CMD, mimic the behavior of the base node image.
if [ "$#" -eq 0 ]; then
  set -- node
fi

exec "$@"
"""

# A fallback set of common images that are known to have a 'docker-entrypoint.sh'.
FALLBACK_HAS_ENTRYPOINT = {
    "nginx", "mysql", "mariadb", "postgres", "redis", "rabbitmq", "traefik", "httpd",
}

# Dockerfile instructions for services that already have a `docker-entrypoint.sh`.
BLOCK_COPY_SECRETS_ONLY = textwrap.dedent(
    """\
    # --- secrets handling -----------------------------
    COPY ./docker-entrypoint.d/00-secrets.sh /docker-entrypoint.d/
    RUN chmod +x /docker-entrypoint.d/00-secrets.sh
    """
).splitlines()

# Dockerfile instructions for services that need our custom entrypoint wrapper.
BLOCK_WITH_WRAPPER = textwrap.dedent(
    """\
    # --- secrets & wrapper entrypoint -----------------
    COPY ./docker-entrypoint.d/00-secrets.sh /docker-entrypoint.d/
    COPY ./docker-entrypoint.d/wrapper.sh /usr/local/bin/docker-entrypoint.sh
    RUN chmod +x /usr/local/bin/docker-entrypoint.sh && \\
        chmod +x /docker-entrypoint.d/00-secrets.sh
    ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
    """
).splitlines()

# ---------------------------------------------------------------------------
#                           Helper Functions
# ---------------------------------------------------------------------------

def run(cmd: List[str]) -> subprocess.CompletedProcess[str]:
    """Executes a shell command and captures its output."""
    return subprocess.run(cmd, check=False, capture_output=True, text=True, encoding="utf-8")


def image_has_docker_entrypoint(image: str) -> bool:
    """Checks if a Docker image has a `docker-entrypoint.sh` script."""
    result = run([
        "sudo", "docker", "image", "inspect", "--format", "{{json .Config.Entrypoint}}", image,
    ])
    if result.returncode == 0:
        raw = result.stdout.strip()
        if raw not in ("null", "[]", ""):
            ep_list = raw.strip("[] \n\"").split()
            return any("docker-entrypoint.sh" in p for p in ep_list)
    # Fallback for cases where inspect might fail or be ambiguous
    return image.split(":")[0] in FALLBACK_HAS_ENTRYPOINT


def write_scripts(directory: Path, need_wrapper: bool) -> None:
    """Writes the necessary entrypoint scripts to the service directory."""
    de_dir = directory / "docker-entrypoint.d"
    de_dir.mkdir(exist_ok=True)

    (de_dir / "00-secrets.sh").write_text(SECRETS_SCRIPT, encoding="utf-8")
    (de_dir / "00-secrets.sh").chmod(0o755)

    if need_wrapper:
        (de_dir / "wrapper.sh").write_text(WRAPPER_SCRIPT, encoding="utf-8")
        (de_dir / "wrapper.sh").chmod(0o755)


def ensure_dockerfile(directory: Path, base_image: str) -> Path:
    """Creates a placeholder Dockerfile if one does not exist."""
    df = directory / "Dockerfile"
    if not df.exists():
        df.write_text(textwrap.dedent(f"""\
            FROM {base_image}

            """), encoding="utf-8")
        print(f"  🆕 Created new Dockerfile at {df.relative_to(Path.cwd())}")
    return df


def patch_dockerfile(df: Path, need_wrapper: bool) -> None:
    """Injects the secret handling logic into the Dockerfile."""
    lines = df.read_text(encoding="utf-8").splitlines()

    # Avoid patching a file that already has the logic
    if any("00-secrets.sh" in line or "docker-entrypoint.d" in line for line in lines):
        print(f"  ✓ Dockerfile already patched ({df.name})")
        return

    block = BLOCK_WITH_WRAPPER if need_wrapper else BLOCK_COPY_SECRETS_ONLY

    # Insert the block before the first CMD instruction
    for idx, line in enumerate(lines):
        if re.match(r"^\s*CMD\b", line, re.I):
            lines[idx:idx] = block
            break
    else:
        # If no CMD is found, append to the end
        lines.extend(block)

    df.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"  ✏️ Patched Dockerfile ({df.name})")

# ---------------------------------------------------------------------------
#                        Configuration Loading
# ---------------------------------------------------------------------------

def load_images_file(path: Path) -> ImageMap:
    """Loads image configuration from a JSON file."""
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        if not isinstance(data, dict):
            raise TypeError("JSON root must be an object")
        return data
    except Exception as e:
        sys.exit(f"Error reading {path}: {e}")


def import_config() -> ImageMap:
    """Loads image configuration from a `config.py` file."""
    try:
        from config import DOCKER_IMAGES
        if not isinstance(DOCKER_IMAGES, dict):
            raise TypeError("config.py must define DOCKER_IMAGES = {...}")
        return DOCKER_IMAGES # type: ignore
    except ModuleNotFoundError:
        sys.exit("Could not find config.py. Use --images PATH.json to specify a file.")
    except Exception as e:
        sys.exit(f"Error importing config.py: {e}")

# ---------------------------------------------------------------------------
#                                Main Execution
# ---------------------------------------------------------------------------

def main() -> None:
    """Main script entrypoint."""
    ap = argparse.ArgumentParser(description="Patch Docker projects with a secrets wrapper.")
    ap.add_argument("path", nargs="?", help="Directory to start from (default: find docker-compose root)")
    ap.add_argument("--images", "-i", type=Path, metavar="JSON",
                    help="Use an external JSON file for DOCKER_IMAGES")
    args = ap.parse_args()

    if not shutil.which("sudo"):
        sys.exit("Error: 'sudo' is required to run 'docker inspect'.")

    # Find the project root by looking for a docker-compose.yaml file
    try:
        root = Path(args.path).resolve() if args.path else next(
            p for p in Path.cwd().resolve().parents if (p / "docker-compose.yml").exists() or (p / "docker-compose.yaml").exists())
        print(f"🔍 Working from project root: {root}")
    except StopIteration:
        sys.exit("Error: Could not find a docker-compose.yaml file in this directory or any parent.")


    images: ImageMap = load_images_file(args.images) if args.images else import_config()

    for folder, spec in images.items():
        service_dir = root / folder
        if not service_dir.is_dir():
            print(f"  ⚠️ Skipping '{folder}' - directory not found.")
            continue

        print(f"\n📦 Processing service: {folder}/")

        if isinstance(spec, str):
            base_image = spec
            forced = None
        elif isinstance(spec, dict):
            base_image = spec.get("image")
            if not base_image:
                sys.exit(f"Error: Specification for '{folder}' is missing the 'image' key.")
            forced = spec.get("force_wrapper", spec.get("wrapper"))
        else:
            sys.exit(f"Error: Specification for '{folder}' must be a string or dict, but got {spec!r}")

        dockerfile_path = ensure_dockerfile(service_dir, base_image)

        # Determine the final base image from the Dockerfile's first FROM instruction
        first_from = next((m.group(1) for m in re.finditer(r"^\s*FROM\s+([^\s]+)",
                                                           dockerfile_path.read_text(encoding="utf-8"),
                                                           flags=re.M | re.I)),
                           base_image)

        # Decide if the wrapper is needed based on config or auto-detection
        if forced is True:
            need_wrapper = True
            origin = "forced"
        elif forced is False:
            need_wrapper = False
            origin = "disabled"
        else:
            need_wrapper = not image_has_docker_entrypoint(first_from)
            origin = "auto-detected"

        print(f"   • Base image: {first_from} ({'with' if need_wrapper else 'without'} wrapper, reason: {origin})")

        write_scripts(service_dir, need_wrapper)
        patch_dockerfile(dockerfile_path, need_wrapper)


if __name__ == "__main__":
    main()