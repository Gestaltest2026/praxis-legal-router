import json
import tempfile
import unittest
from pathlib import Path

from demand_gateway.cli import fixtures
from demand_gateway.engine import process, safe_reply
from demand_gateway.storage import Ledger


class DemandGatewayTests(unittest.TestCase):
    def test_three_fixtures_end_to_end(self):
        with tempfile.TemporaryDirectory() as tmp:
            with Ledger(str(Path(tmp) / "demo.sqlite3")) as ledger:
                items = fixtures()
                self.assertEqual(len(items), 3)
                for item in items:
                    result = ledger.ingest(item)
                    self.assertTrue(result["summary_ja"].startswith("【デモ】"))
                    self.assertTrue(result["draft"])
                    self.assertTrue(result["structured"]["patient_name_dummy"])
                    self.assertIn("requested_datetime_jst", result["structured"])
                    self.assertEqual(ledger.get(item["id"])["status"], "未対応")
                    ledger.start(item["id"])
                    with self.assertRaises(PermissionError):
                        ledger.simulate_send(item["id"])
                    ledger.approve(item["id"], "Test Reviewer")
                    self.assertIn("NO EXTERNAL MESSAGE", ledger.simulate_send(item["id"]))
                    ledger.confirm_booking(item["id"], "Test Reviewer")
                    record = ledger.get(item["id"])
                    self.assertEqual(record["status"], "予約確定")
                    self.assertTrue(record["sent_simulated"])
                    self.assertEqual(record["events"][-1]["action"], "booking_confirmed_demo")
                self.assertEqual([x["language"] for x in ledger.list()], ["en", "zh-Hans", "mixed"])

    def test_appointment_rules_and_escalation(self):
        cases = {x["id"]: process(x) for x in fixtures()}
        self.assertTrue(cases["D001"]["structured"]["tentative_slot_matches_demo_hours"])
        self.assertTrue(cases["D002"]["structured"]["requires_staff_escalation"])
        self.assertFalse(cases["D003"]["structured"]["tentative_slot_matches_demo_hours"])
        self.assertTrue(cases["D003"]["structured"]["requires_staff_escalation"])
        self.assertIn("qualified staff", cases["D003"]["draft"])
        self.assertNotIn("Your appointment is confirmed", cases["D001"]["draft"])

    def test_draft_edit_revokes_approval(self):
        with tempfile.TemporaryDirectory() as tmp:
            with Ledger(str(Path(tmp) / "test.sqlite")) as ledger:
                ledger.ingest(fixtures()[0]); ledger.start("D001")
                ledger.approve("D001", "Test Reviewer")
                ledger.edit("D001", "We have received the DEMO request. Staff will check it.")
                self.assertEqual(ledger.get("D001")["approval"], "pending")
                with self.assertRaises(PermissionError):
                    ledger.simulate_send("D001")

    def test_prohibited_claims_blocked(self):
        for text in ["You need a root canal.", "The price is ¥200000.", "您必须治疗。", "あなたは治療が必要です。"]:
            with self.subTest(text=text), self.assertRaises(ValueError):
                safe_reply(text)

    def test_deny_real_identity_and_real_email(self):
        case = fixtures()[0].copy()
        case["text"] = case["text"].replace("alex@example.com", "alice@gmail.com")
        with self.assertRaises(ValueError):
            process(case)
        case = fixtures()[0].copy(); case["synthetic"] = False
        with self.assertRaises(ValueError):
            process(case)
        case = fixtures()[0].copy(); case["clinic_id"] = "real_clinic"
        with self.assertRaises(ValueError):
            process(case)

    def test_can_only_confirm_after_approval_and_send(self):
        with tempfile.TemporaryDirectory() as tmp:
            with Ledger(str(Path(tmp)/"x.db")) as ledger:
                ledger.ingest(fixtures()[0]); ledger.start("D001")
                with self.assertRaises(PermissionError):
                    ledger.confirm_booking("D001", "Test Reviewer")
                ledger.approve("D001", "Test Reviewer")
                with self.assertRaises(PermissionError):
                    ledger.confirm_booking("D001", "Test Reviewer")


if __name__ == "__main__":
    unittest.main()
