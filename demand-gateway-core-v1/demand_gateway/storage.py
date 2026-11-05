"""Local-only SQLite audit ledger; synthetic fixtures only, no network adapters."""
import json
import sqlite3
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

from .engine import process, safe_reply


def now() -> str:
    return datetime.now(ZoneInfo("Asia/Tokyo")).isoformat(timespec="seconds")


class Ledger:
    def __init__(self, path: str):
        self.path = str(path)
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        self.db = sqlite3.connect(self.path)
        self.db.row_factory = sqlite3.Row
        self.db.execute("PRAGMA foreign_keys = ON")
        self.db.executescript("""
        CREATE TABLE IF NOT EXISTS cases (
          case_id TEXT PRIMARY KEY, created_at TEXT NOT NULL, clinic_id TEXT NOT NULL,
          language TEXT NOT NULL, reply_language TEXT NOT NULL,
          original_text TEXT NOT NULL, summary_ja TEXT NOT NULL, structured_json TEXT NOT NULL,
          draft TEXT NOT NULL, status TEXT NOT NULL DEFAULT '未対応',
          approval TEXT NOT NULL DEFAULT 'pending', reviewer TEXT,
          sent_simulated INTEGER NOT NULL DEFAULT 0,
          synthetic INTEGER NOT NULL CHECK (synthetic = 1)
        );
        CREATE TABLE IF NOT EXISTS events (
          event_id INTEGER PRIMARY KEY AUTOINCREMENT, case_id TEXT NOT NULL,
          occurred_at TEXT NOT NULL, action TEXT NOT NULL, details TEXT NOT NULL,
          FOREIGN KEY(case_id) REFERENCES cases(case_id)
        );
        """)
        self.db.commit()

    def close(self):
        self.db.close()

    def __enter__(self):
        return self

    def __exit__(self, *_):
        self.close()

    def _event(self, case_id, action, details=""):
        self.db.execute(
            "INSERT INTO events (case_id, occurred_at, action, details) VALUES (?, ?, ?, ?)",
            (case_id, now(), action, details)
        )

    def ingest(self, item):
        out = process(item)
        self.db.execute(
            """INSERT INTO cases (case_id, created_at, clinic_id, language, reply_language,
                 original_text, summary_ja, structured_json, draft, synthetic)
                 VALUES (?,?,?,?,?,?,?,?,?,1)""",
            (out["case_id"], now(), out["clinic_id"], out["language"],
             out["reply_language"], out["original_text"], out["summary_ja"],
             json.dumps(out["structured"], ensure_ascii=False), out["draft"])
        )
        self._event(out["case_id"], "ingested", "Synthetic fixture only; draft pending human review")
        self.db.commit()
        return out

    def get(self, case_id):
        row = self.db.execute("SELECT * FROM cases WHERE case_id=?", (case_id,)).fetchone()
        if row is None:
            raise KeyError(f"Unknown case: {case_id}")
        result = dict(row)
        result["structured"] = json.loads(result.pop("structured_json"))
        result["events"] = [dict(r) for r in self.db.execute(
            "SELECT event_id, occurred_at, action, details FROM events WHERE case_id=? ORDER BY event_id", (case_id,)
        )]
        return result

    def list(self):
        return [dict(r) for r in self.db.execute(
            "SELECT case_id, language, status, approval, reviewer, sent_simulated, created_at FROM cases ORDER BY case_id"
        )]

    def start(self, case_id):
        row = self.get(case_id)
        if row["status"] != "未対応":
            raise ValueError("Start allowed only from 未対応")
        self.db.execute("UPDATE cases SET status='対応中' WHERE case_id=?", (case_id,))
        self._event(case_id, "started", "Draft ready for review")
        self.db.commit()

    def edit(self, case_id, new_text):
        row = self.get(case_id)
        if row["status"] != "対応中" or row["sent_simulated"]:
            raise ValueError("Editing allowed only before simulated sending")
        safe_reply(new_text)
        self.db.execute(
            "UPDATE cases SET draft=?, approval='pending', reviewer=NULL WHERE case_id=?",
            (new_text, case_id)
        )
        self._event(case_id, "edited", "Approval invalidated; content not retained in event log")
        self.db.commit()

    def approve(self, case_id, reviewer):
        row = self.get(case_id)
        if row["status"] != "対応中" or row["sent_simulated"]:
            raise ValueError("Approval allowed only for unsent, 対応中 cases")
        if not reviewer or not reviewer.strip():
            raise ValueError("Explicit human reviewer name required")
        safe_reply(row["draft"])
        self.db.execute(
            "UPDATE cases SET approval='approved', reviewer=? WHERE case_id=?",
            (reviewer.strip(), case_id)
        )
        self._event(case_id, "approved", f"Reviewer: {reviewer.strip()}; simulated dispatch only")
        self.db.commit()

    def simulate_send(self, case_id):
        row = self.get(case_id)
        if row["status"] != "対応中" or row["approval"] != "approved" or not row["reviewer"]:
            raise PermissionError("BLOCKED: explicit human approval required before simulated sending")
        if row["sent_simulated"]:
            raise ValueError("Already simulated-sent")
        safe_reply(row["draft"])
        self.db.execute("UPDATE cases SET sent_simulated=1 WHERE case_id=?", (case_id,))
        self._event(case_id, "sent_simulated", "NO EMAIL SENT; local audit event only")
        self.db.commit()
        return f"[SIMULATED ONLY] {case_id}: NO EXTERNAL MESSAGE SENT"

    def confirm_booking(self, case_id, reviewer):
        row = self.get(case_id)
        if row["status"] != "対応中" or not row["sent_simulated"]:
            raise PermissionError("BLOCKED: review + simulated send required")
        if not reviewer or not reviewer.strip():
            raise ValueError("Explicit human operator required")
        self.db.execute("UPDATE cases SET status='予約確定' WHERE case_id=?", (case_id,))
        self._event(case_id, "booking_confirmed_demo", f"Operator: {reviewer.strip()}; NO REAL BOOKING")
        self.db.commit()
