"""Rule-based demonstration engine. No language model, real clinic, or network use."""
from __future__ import annotations

import json
import re
from datetime import datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parent.parent
PACK_DIR = ROOT / "packs"


def load_pack(name: str) -> dict:
    if name not in ("languages", "industries"):
        raise ValueError("Unsupported pack")
    with (PACK_DIR / f"{name}.json").open(encoding="utf-8") as file:
        return json.load(file)


def validate_demo(item: dict) -> None:
    """Hard gate: this v1 accepts explicitly synthetic fixtures only."""
    if not item.get("synthetic") or item.get("clinic_id") != "DEMO_SHINJUKU_DENTAL":
        raise ValueError("DEMO ONLY: synthetic=true and DEMO_SHINJUKU_DENTAL required")
    if not re.fullmatch(r"D\d{3,}", str(item.get("id", ""))):
        raise ValueError("DEMO ONLY: ID must be D001, D002, ...")
    content = item.get("text")
    if not isinstance(content, str) or not content.startswith("DEMO | ") or len(content) > 8000:
        raise ValueError("DEMO ONLY: text must start with 'DEMO | ' (max 8,000 characters)")
    emails = re.findall(r"[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}", content)
    if any(not email.lower().endswith(("@example.com", "@example.org", "@example.net", "@example.test")) for email in emails):
        raise ValueError("DEMO ONLY: contact email must use a reserved example domain")
    if re.search(r"\+\d{7,}|\b0\d{9,10}\b", content):
        raise ValueError("DEMO ONLY: plausible phone numbers are prohibited")
    if not re.search(r"Demo\s|测试|演示", content, re.I):
        raise ValueError("DEMO ONLY: clearly fictional person name required")


def detect_language(text: str) -> str:
    han = len(re.findall(r"[\u3400-\u9fff]", text))
    latin = len(re.findall(r"[a-zA-Z]", text))
    if han >= 5 and latin >= 40:
        return "mixed"
    if han >= 5:
        return "zh-Hans"
    if latin >= 10:
        return "en"
    return "other"


def extract_datetime(text: str) -> str | None:
    pattern = r"(20\d{2})[-年/](\d{1,2})[-月/](\d{1,2})日?\s*(?:at\s*)?(\d{1,2}):(\d{2})"
    m = re.search(pattern, text, flags=re.I)
    if not m:
        return None
    try:
        parsed = datetime(*map(int, m.groups()), tzinfo=ZoneInfo("Asia/Tokyo"))
    except ValueError:
        return None
    return parsed.isoformat(timespec="minutes")


def check_tentative_slot(iso: str | None, visit_type: str, industry: dict) -> bool:
    if not iso:
        return False
    dt = datetime.fromisoformat(iso)
    if dt.weekday() not in industry["hours"]["weekdays"]:
        return False
    start = datetime.strptime(industry["hours"]["open"], "%H:%M").time()
    end = datetime.strptime(industry["hours"]["close"], "%H:%M").time()
    duration = industry["appointment_minutes"][visit_type]
    return dt.time() >= start and (dt + timedelta(minutes=duration)).time() <= end and (dt + timedelta(minutes=duration)).date() == dt.date()


def process(item: dict) -> dict:
    validate_demo(item)
    lang_pack = load_pack("languages")
    industry = load_pack("industries")["dental"]
    text = item["text"]
    detected = detect_language(text)
    reply_language = "zh-Hans" if detected == "zh-Hans" else "en"
    template = lang_pack[reply_language]
    first = bool(re.search(r"first visit|first-time|初诊|初診", text, re.I))
    followup = bool(re.search(r"follow.?up|复诊|再診", text, re.I))
    visit_type = "first" if first else "followup" if followup else "unknown"
    is_sensitive = any(term.lower() in text.lower() for term in industry["medical_escalation_terms"])
    # 'implant' alone is a topic, not a treatment recommendation.
    contact = next(iter(re.findall(r"[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}", text)), None)
    m_name = re.search(r"(?:Patient|患者)\s*[:：]\s*([^.,。\n]+)", text, re.I)
    name = m_name.group(1).strip() if m_name else "未抽出（ダミー）"
    # A demo-only dictionary; unknown topics remain 'other' to avoid hallucination.
    topics = []
    for key, words in {
        "implant": ["implant", "种植牙", "インプラント"],
        "orthodontics": ["orthodontics", "矫正", "矯正"],
        "appointment": ["appointment", "预约", "予約", "request"]
    }.items():
        if any(w in text.lower() for w in words):
            topics.append(key)
    if not topics:
        topics = ["other"]
    appointment = extract_datetime(text)
    candidate = check_tentative_slot(appointment, visit_type, industry) if visit_type != "unknown" else False
    urgency = "要スタッフ確認" if is_sensitive else "通常（仮判定）"
    data = {
        "purpose": topics,
        "requested_datetime_jst": appointment,
        "urgency": urgency,
        "contact": contact,
        "patient_name_dummy": name,
        "visit_type": visit_type,
        "tentative_slot_matches_demo_hours": candidate,
        "requires_staff_escalation": is_sensitive,
    }
    draft_parts = [template["acknowledge"].format(clinic=industry["clinic_name"][reply_language])]
    if not appointment or visit_type == "unknown":
        draft_parts.append(template["request_details"])
    if candidate:
        draft_parts.append(template["candidate"])
    elif appointment:
        draft_parts.append(template["request_details"])
    if is_sensitive:
        draft_parts.append(template["needs_staff"])
    draft = "\n\n".join(draft_parts)
    summary = (
        f"【デモ】用件: {'・'.join(topics)}／初再診: {visit_type}／"
        f"希望日時: {appointment or '未抽出'}／緊急度: {urgency}／"
        f"連絡先: {contact or '未抽出'}／患者名: {name}／"
        f"予約候補: {'営業時間内の仮候補（空き枠未照合）' if candidate else '未提示・医院確認待ち'}"
    )
    return {
        "case_id": item["id"], "clinic_id": item["clinic_id"], "source": item["source"],
        "synthetic": True, "original_text": text, "language": detected,
        "reply_language": reply_language, "summary_ja": summary,
        "structured": data, "draft": draft,
    }


def safe_reply(text: str) -> None:
    """Fail closed on prohibited clinical claims even if a reviewer edits a draft."""
    clinical = [
        r"\b(?:you (?:have|need)|we (?:diagnose|prescribe)|will cure|must take)\b",
        r"\b(?:costs?|prices?|fee)\s*(?:is|are|will be)\s*[$¥€]?\s*\d",
        r"(?:確定(?:料金|費用)|あなたは.{0,10}(?:病気|治療が必要)|治ります)",
        r"(?:确诊|必须治疗|费用(?:是|为)\s*[¥$]?\d+)"
    ]
    if any(re.search(p, text, re.I) for p in clinical):
        raise ValueError("Reply blocked: possible medical/price determination")
    if not text.strip():
        raise ValueError("Reply may not be empty")
