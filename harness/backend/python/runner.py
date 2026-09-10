#!/usr/bin/env python3
"""
runner.py — Rulează Claude Code CLI pentru o sesiune Libra Maker.
Apelat de server.js prin child_process.spawn.

Utilizare:
  python3 runner.py --skill-id pagina-informare --description "..." --workspace ./workspaces/uid/sid

Iesire JSON pe stdout (un singur rand):
  {"status": "done", "duration_sec": 42, "files": ["index.html", "style.css"]}
  {"status": "failed", "error": "..."}

Sectiunea 5 si 6 din documentul de implementare:
  - `claude -p` in mod non-interactiv (--output-format json)
  - Allowlist de tool-uri: Read, Write, Edit
  - workspace montat izolat
"""

import argparse
import json
import os
import subprocess
import sys
import time

# Prefixele skill-urilor pentru promptul catre claude -p
# Corespund cu tabelul din sectiunea 7 a documentului de implementare.
SKILL_PREFIXES = {
    "dashboard":  "/dashboard",
    "chart":      "/chart",
    "report":     "/report",
    "data-table": "/data-table",
    "info-page":  "/info-page",
    "form-page":  "/form-page",
    "slides":     "/slides",
}


def run(skill_id: str, description: str, workspace: str) -> dict:
    """Ruleaza Claude Code CLI si returneaza rezultatul ca dict."""
    os.makedirs(workspace, exist_ok=True)

    prefix = SKILL_PREFIXES.get(skill_id, "")
    prompt = f"{prefix} {description}".strip() if prefix else description

    cmd = [
        "claude",
        "-p", prompt,
        "--allowedTools", "Read,Write,Edit",
        "--permission-mode", "acceptEdits",
        "--output-format", "json",
    ]

    start = time.time()

    try:
        result = subprocess.run(
            cmd,
            cwd=workspace,
            capture_output=True,
            text=True,
            timeout=300,  # 5 minute timeout per sesiune
        )
        elapsed = max(1, round(time.time() - start))

        if result.returncode != 0:
            return {
                "status": "failed",
                "error":  result.stderr.strip() or f"claude a iesit cu cod {result.returncode}",
            }

        return {
            "status":       "done",
            "duration_sec": elapsed,
            "files":        ["index.html", "style.css"],
        }

    except FileNotFoundError:
        # Claude CLI nu e instalat — simulare pentru mediul de dezvoltare
        time.sleep(2.5)
        return {
            "status":       "done",
            "duration_sec": 3,
            "files":        ["index.html", "style.css"],
            "simulated":    True,
        }

    except subprocess.TimeoutExpired:
        return {"status": "failed", "error": "timeout dupa 300 de secunde"}

    except Exception as exc:  # noqa: BLE001
        return {"status": "failed", "error": str(exc)}


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Libra Maker — Python runner pentru Claude Code CLI"
    )
    parser.add_argument("--skill-id",    required=True, help="ID-ul skill-ului (ex: formular)")
    parser.add_argument("--description", required=True, help="Descrierea proiectului")
    parser.add_argument("--workspace",   required=True, help="Calea catre workspace-ul sesiunii")
    args = parser.parse_args()

    result = run(args.skill_id, args.description, args.workspace)

    # Scriem JSON pe stdout — server.js il citeste si actualizeaza statusul
    print(json.dumps(result, ensure_ascii=False))
    sys.exit(0 if result.get("status") == "done" else 1)


if __name__ == "__main__":
    main()
