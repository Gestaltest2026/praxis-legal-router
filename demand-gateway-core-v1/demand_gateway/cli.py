"""Local CLI. Every record is synthetic; sending is only an audit-log event."""
from __future__ import annotations

import argparse
import json
from pathlib import Path

from .engine import ROOT
from .storage import Ledger

DEFAULT_DB = "state/demo.sqlite3"


def fixtures(path=None):
    file_path = Path(path) if path else ROOT / "examples" / "demo_inquiries.json"
    items = json.loads(file_path.read_text(encoding="utf-8"))
    if not isinstance(items, list):
        raise ValueError("Fixture file must contain a JSON list")
    return items


def run(argv=None):
    parser = argparse.ArgumentParser(
        description="Demand Gateway Core v1 — synthetic-only, NO NETWORK and NO REAL EMAIL"
    )
    parser.add_argument("--db", default=DEFAULT_DB, help="Local SQLite ledger path")
    sub = parser.add_subparsers(dest="command", required=True)
    sub.add_parser("demo", help="Load all three synthetic records into the manual approval queue")
    ing = sub.add_parser("ingest", help="Import synthetic JSON fixtures (requires explicit DEMO markers)")
    ing.add_argument("--file", help="Local JSON file containing demo-only fixture list")
    sub.add_parser("list", help="Show case status")
    for name in ("show", "start", "send", "events"):
        sub.add_parser(name).add_argument("id")
    edit = sub.add_parser("edit")
    edit.add_argument("id"); edit.add_argument("--file", required=True, help="UTF-8 approved draft replacement")
    approve = sub.add_parser("approve")
    approve.add_argument("id"); approve.add_argument("--reviewer", required=True)
    book = sub.add_parser("book")
    book.add_argument("id"); book.add_argument("--reviewer", required=True)
    args = parser.parse_args(argv)

    with Ledger(args.db) as ledger:
        if args.command == "ingest":
            for item in fixtures(args.file):
                ledger.ingest(item)
                print(f"INGESTED {item['id']} — pending human review")
        elif args.command == "demo":
            for item in fixtures():
                if item["id"] in [case["case_id"] for case in ledger.list()]:
                    print(f"SKIPPING existing {item['id']}")
                    continue
                ledger.ingest(item)
                ledger.start(item["id"])
                case = ledger.get(item["id"])
                print(f"{item['id']}: 対応中／承認待ち [DEMO ONLY]")
                print(case["summary_ja"])
                print("返信案:", case["draft"])
                print(f"次: approve {item['id']} --reviewer 'Demo Reviewer' → send {item['id']} → book {item['id']} --reviewer 'Demo Reviewer'")
        elif args.command == "list":
            print(json.dumps(ledger.list(), ensure_ascii=False, indent=2))
        elif args.command == "show":
            print(json.dumps(ledger.get(args.id), ensure_ascii=False, indent=2))
        elif args.command == "events":
            print(json.dumps(ledger.get(args.id)["events"], ensure_ascii=False, indent=2))
        elif args.command == "start":
            ledger.start(args.id); print(f"{args.id}: 対応中")
        elif args.command == "edit":
            ledger.edit(args.id, Path(args.file).read_text(encoding="utf-8")); print(f"{args.id}: edited; approval reset")
        elif args.command == "approve":
            ledger.approve(args.id, args.reviewer); print(f"{args.id}: approved by {args.reviewer}")
        elif args.command == "send":
            print(ledger.simulate_send(args.id))
        elif args.command == "book":
            ledger.confirm_booking(args.id, args.reviewer); print(f"{args.id}: 予約確定 (SIMULATION ONLY)")


if __name__ == "__main__":
    run()
