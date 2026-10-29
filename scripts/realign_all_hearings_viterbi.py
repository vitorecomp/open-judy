#!/usr/bin/env python3
"""
Apply the Upgraded Adaptive 20ms RMS Energy Envelope + Viterbi Dynamic Programming (DP)
Acoustic Aligner across all 9 hearings (197 blocks, 17,961 segments) in `open_judy_db`.

For each hearing:
1. Ensures `media_filename` is populated in `tb_hearings`.
2. Decodes the full audio stream in a single sequential 16kHz mono s16le PCM pass via `ffmpeg`.
3. For each block `[start_time_ms, end_time_ms]`:
   - Computes the 20ms Adaptive RMS Energy Envelope (`p15` noise floor, `p90` speech peak, adaptive threshold,
     speech islands, silence intervals, and local energy-valley split points).
   - Runs `GeminiMultimodalClient.align_segments_viterbi_acoustic` to align every segment's
     `start_time_ms` and `end_time_ms` to real vocal onsets/offsets and acoustic pauses.
4. Batch-updates `tb_transcript_segments` in PostgreSQL (`open-judy-alloydb`).
"""

import json
import math
import os
import re
import subprocess
import sys
import time

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
PIPELINE_DIR = os.path.join(REPO_ROOT, "pipelines", "transcription-pipeline")
if PIPELINE_DIR not in sys.path:
    sys.path.insert(0, PIPELINE_DIR)

from gemini_client import GeminiMultimodalClient  # noqa: E402

HEARING_MEDIA_MAP = {
    "7c2812b0-1aa3-46f0-ad9f-d9175c5bb153": "00 - video 1min .mp4",
    "8df0fa79-73cd-4bfb-a9d2-06acdf5d1b46": "Video 1h 183MB.mp4",
    "fcbb4794-487b-4417-a554-535bc9b29fd7": "video 1h30 253MB.mp4",
    "ffb9fc89-2230-4aed-a110-99feef887187": "00 - video 2h 194MB  .mp4",
    "a2a322aa-16ee-423f-a37a-310cee634ecb": "video 3h 437MB.mp4",
    "1232f382-f4ef-4212-a5e7-80cbbde678ce": "video 4h 346 MB.mp4",
    "9c63f77f-9981-4957-a37e-2e55c375cfef": "Video 4h 509MB.mp4",
    "8fecb53a-dd14-4ebe-af1e-44ee6931b483": "Video 4h  554MB  .mp4",
    "98d11d67-1686-421d-a0c7-a8a780f78b67": "Video 10h 1GB.mp4",
}


def build_profile_from_pcm_slice(pcm_mv: memoryview, clip_dur_ms: int, frame_ms: int = 20) -> dict:
    """
    Build the 20ms Adaptive RMS Energy Profile directly from an in-memory 16kHz int16 `memoryview` slice.
    """
    step = (16000 * frame_ms) // 1000  # 320 samples per 20ms frame
    n_frames = len(pcm_mv) // step
    if n_frames <= 0:
        return {}

    raw_db = []
    for i in range(n_frames):
        sl = pcm_mv[i * step : (i + 1) * step : 4]  # 4kHz energy subsample inside 20ms frame for speed
        if not sl:
            raw_db.append(-90.0)
            continue
        msq = sum(x * x for x in sl) / len(sl)
        rms = math.sqrt(msq)
        raw_db.append(20.0 * math.log10(max(1.0, rms) / 32768.0))

    smooth_db = []
    for i in range(n_frames):
        w = raw_db[max(0, i - 1) : min(n_frames, i + 2)]
        smooth_db.append(sum(w) / len(w))

    s_sorted = sorted(smooth_db)
    p15 = s_sorted[int(0.15 * len(s_sorted))]
    p90 = s_sorted[int(0.90 * len(s_sorted))]
    dyn = max(6.0, p90 - p15)
    thresh = max(p15 + 4.2, min(p90 - 8.5, p15 + 0.35 * dyn))

    active = [1 if d >= thresh else 0 for d in smooth_db]

    # 1. Remove isolated micro-clicks <= 5 frames (100ms) surrounded by >= 8 frames (160ms) of silence
    i = 0
    while i < n_frames:
        if active[i] == 1:
            j = i
            while j < n_frames and active[j] == 1:
                j += 1
            left_active = any(active[max(0, i - 8) : i])
            right_active = any(active[j : min(n_frames, j + 8)])
            if (j - i) <= 5 and not left_active and not right_active and max(raw_db[i:j]) < p90 - 3.0:
                for k in range(i, j):
                    active[k] = 0
            i = j
        else:
            i += 1

    # 2. Bridge voiceless stop consonant gaps <= 6 frames (120ms) inside active speech
    i = 0
    while i < n_frames:
        if active[i] == 0:
            j = i
            while j < n_frames and active[j] == 0:
                j += 1
            if i > 0 and j < n_frames and (j - i) <= 6:
                for k in range(i, j):
                    active[k] = 1
            i = j
        else:
            i += 1

    # 3. Remove remaining isolated non-speech rustles < 9 frames (180ms), or <= 11 frames (220ms) with weak peak
    i = 0
    while i < n_frames:
        if active[i] == 1:
            j = i
            while j < n_frames and active[j] == 1:
                j += 1
            if (j - i) < 9 or ((j - i) <= 11 and max(raw_db[i:j]) < p90 - 4.5):
                for k in range(i, j):
                    active[k] = 0
            i = j
        else:
            i += 1

    speech_islands = []
    silences = []
    i = 0
    while i < n_frames:
        v = active[i]
        j = i
        while j < n_frames and active[j] == v:
            j += 1
        st_ms = min(clip_dur_ms, i * frame_ms)
        et_ms = min(clip_dur_ms, j * frame_ms)
        if et_ms > st_ms:
            if v == 1:
                speech_islands.append((st_ms, et_ms))
            else:
                silences.append((st_ms, et_ms))
        i = j

    # Subdivide long continuous speech islands (> 4500ms) at deep local energy valleys (>= 4.5dB drop)
    refined_islands = []
    for st_ms, et_ms in speech_islands:
        if et_ms - st_ms <= 4500:
            refined_islands.append((st_ms, et_ms))
            continue
        fa = st_ms // frame_ms
        fb = et_ms // frame_ms
        split_frames = []
        last_sp = fa
        for f in range(fa + 30, fb - 30):
            if f - last_sp < 30:
                continue
            local_min = min(smooth_db[f - 4 : f + 5])
            if smooth_db[f] == local_min:
                left_pk = max(smooth_db[max(fa, f - 25) : f - 2])
                right_pk = max(smooth_db[f + 3 : min(fb, f + 26)])
                if left_pk - smooth_db[f] >= 4.5 and right_pk - smooth_db[f] >= 4.5:
                    split_frames.append(f)
                    last_sp = f
        if not split_frames:
            refined_islands.append((st_ms, et_ms))
        else:
            cur_f = fa
            for sf in split_frames:
                refined_islands.append((cur_f * frame_ms, (sf - 1) * frame_ms))
                cur_f = sf + 1
            refined_islands.append((cur_f * frame_ms, et_ms))

    vocal_cum = [0] * (n_frames + 1)
    for idx_f in range(n_frames):
        vocal_cum[idx_f + 1] = vocal_cum[idx_f] + (frame_ms if active[idx_f] else 0)

    return {
        "p15": p15,
        "p90": p90,
        "thresh": thresh,
        "speech_islands": refined_islands,
        "raw_speech_islands": speech_islands,
        "silences": silences,
        "active": active,
        "raw_db": raw_db,
        "smooth_db": smooth_db,
        "vocal_cum": vocal_cum,
        "frame_ms": frame_ms,
        "n_frames": n_frames,
    }


def psql_json(sql: str):
    cmd = [
        "podman", "exec", "open-judy-alloydb",
        "psql", "-U", "judy_user", "-d", "open_judy_db", "-t", "-A", "-c", sql
    ]
    res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=True)
    txt = (res.stdout or "").strip()
    return json.loads(txt) if txt else []


def main():
    t0 = time.time()
    media_dir = os.path.join(REPO_ROOT, "frontend", "open-judy-ui", "public", "media", "hearings")
    client = GeminiMultimodalClient()

    total_blocks_aligned = 0
    total_segs_aligned = 0

    for hid, filename in HEARING_MEDIA_MAP.items():
        mp4_path = os.path.join(media_dir, filename)
        if not os.path.isfile(mp4_path):
            print(f"[WARN] Media file not found for {hid}: {mp4_path}")
            continue

        # Ensure media_filename is set in tb_hearings
        esc_fn = filename.replace("'", "''")
        subprocess.run(
            [
                "podman", "exec", "open-judy-alloydb",
                "psql", "-U", "judy_user", "-d", "open_judy_db", "-q", "-c",
                f"UPDATE tb_hearings SET media_filename = '{esc_fn}', audio_filename = '{esc_fn}' WHERE id = '{hid}';",
            ],
            check=True,
        )

        blocks = psql_json(
            f"SELECT COALESCE( json_agg(row_to_json(q)), '[]'::json ) FROM ("
            f"SELECT block_index, start_time_ms, end_time_ms FROM tb_transcript_blocks "
            f"WHERE hearing_id = '{hid}' ORDER BY block_index ASC) q;"
        )
        segs = psql_json(
            f"SELECT COALESCE( json_agg(row_to_json(q)), '[]'::json ) FROM ("
            f"SELECT s.id, s.segment_index, COALESCE(s.block_index, 1) AS block_index, "
            f"s.start_time_ms, s.end_time_ms, s.text "
            f"FROM tb_transcript_segments s JOIN tb_transcripts t ON s.transcript_id = t.id "
            f"WHERE t.hearing_id = '{hid}' ORDER BY s.segment_index ASC) q;"
        )
        if not segs:
            continue

        # Decode full hearing audio in a single sequential pass
        t_dec = time.time()
        res_pcm = subprocess.run(
            [
                "ffmpeg", "-hide_banner", "-nostats", "-v", "error",
                "-i", mp4_path,
                "-vn", "-ac", "1", "-ar", "16000", "-f", "s16le", "-",
            ],
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL,
            timeout=180,
        )
        pcm_bytes = res_pcm.stdout or b""
        pcm_mv = memoryview(pcm_bytes).cast("h")
        total_samples = len(pcm_mv)

        by_block = {}
        for s in segs:
            by_block.setdefault(int(s["block_index"]), []).append({
                "id": s["id"],
                "segmentIndex": int(s["segment_index"]),
                "blockIndex": int(s["block_index"]),
                "startTimeMs": int(s["start_time_ms"]),
                "endTimeMs": int(s["end_time_ms"]),
                "text": s["text"],
            })

        blk_bounds = {int(b["block_index"]): (int(b["start_time_ms"]), int(b["end_time_ms"])) for b in blocks}

        sql_lines = ["BEGIN;"]
        h_blocks = 0
        h_segs = 0
        for b_idx in sorted(by_block.keys()):
            b_segs = by_block[b_idx]
            b_start_ms, b_end_ms = blk_bounds.get(b_idx, ((b_idx - 1) * 600000, b_idx * 600000))
            b_dur_ms = max(1000, b_end_ms - b_start_ms)
            s_sample = min(total_samples, max(0, int((b_start_ms / 1000.0) * 16000)))
            e_sample = min(total_samples, max(s_sample + 1600, int((b_end_ms / 1000.0) * 16000)))
            prof = build_profile_from_pcm_slice(pcm_mv[s_sample:e_sample], b_dur_ms, frame_ms=20)

            aligned = client.align_segments_viterbi_acoustic(
                b_segs,
                core_start_ms=b_start_ms,
                core_end_ms=b_end_ms,
                rms_profile=prof,
                trust_priors=True,
            )
            h_blocks += 1
            for al in aligned:
                h_segs += 1
                sql_lines.append(
                    f"UPDATE tb_transcript_segments SET start_time_ms = {int(al['startTimeMs'])}, "
                    f"end_time_ms = {int(al['endTimeMs'])} WHERE id = '{al['id']}';"
                )
        sql_lines.append("COMMIT;")

        subprocess.run(
            [
                "podman", "exec", "-i", "open-judy-alloydb",
                "psql", "-U", "judy_user", "-d", "open_judy_db", "-q",
            ],
            input="\n".join(sql_lines),
            text=True,
            check=True,
        )
        total_blocks_aligned += h_blocks
        total_segs_aligned += h_segs
        print(
            f"[OK] {hid[:8]} ({filename:26s}) -> aligned {h_blocks:3d} blocks, {h_segs:5d} segments "
            f"in {time.time() - t_dec:.1f}s"
        )

    print(
        f"\nCOMPLETED: Aligned {total_blocks_aligned} blocks and {total_segs_aligned} segments "
        f"across all 9 hearings in {time.time() - t0:.1f}s!"
    )


if __name__ == "__main__":
    main()
