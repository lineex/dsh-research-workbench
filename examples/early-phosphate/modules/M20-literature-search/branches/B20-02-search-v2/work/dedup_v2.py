#!/usr/bin/env python3
# 文献去重 v2（B20-02 work，模拟脚本）
# 用法: python dedup_v2.py --input records.json --out dedup_log.csv --verify
import csv
import json
import re
import unicodedata


def norm_doi(raw: str) -> str:
    if not raw:
        return ""
    doi = raw.strip()
    doi = re.sub(r"^(https?://(dx\.)?doi\.org/|doi:\s*)", "", doi, flags=re.I)
    doi = re.sub(r"[\s.,;]+$", "", doi)
    return doi.lower()


def norm_title(raw: str) -> str:
    text = unicodedata.normalize("NFKC", raw or "").lower()
    return re.sub(r"[^a-z0-9]+", " ", text).strip()


def jaro_winkler(a: str, b: str) -> float:
    # 简化实现，仅用于无 DOI 记录的标题相似度判重
    from difflib import SequenceMatcher
    return SequenceMatcher(None, a, b).ratio()


def dedup(records):
    seen_doi, seen_title, kept, removed = {}, {}, [], []
    for rec in records:
        doi = norm_doi(rec.get("doi"))
        title = norm_title(rec.get("title"))
        if doi and doi in seen_doi:
            removed.append((rec["record_id"], f"doi_duplicate_of:{seen_doi[doi]}"))
            continue
        dup_title = next((tid for tt, tid in seen_title.items()
                          if jaro_winkler(tt, title) >= 0.92), None)
        if not doi and dup_title:
            removed.append((rec["record_id"], f"title_duplicate_of:{dup_title}"))
            continue
        if doi:
            seen_doi[doi] = rec["record_id"]
        seen_title[title] = rec["record_id"]
        kept.append(rec)
    return kept, removed


if __name__ == "__main__":
    with open("records.json", encoding="utf-8") as fh:
        records = json.load(fh)
    kept, removed = dedup(records)
    print(f"records={len(records)} kept={len(kept)} removed={len(removed)}")
    print(f"check: {len(records)} - {len(removed)} == {len(kept)}")
    with open("dedup_log.csv", "w", newline="", encoding="utf-8") as fh:
        writer = csv.writer(fh)
        writer.writerow(["record_id", "reason"])
        writer.writerows(removed)
