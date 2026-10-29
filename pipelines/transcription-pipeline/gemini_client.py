import base64
import json
import math
import os
import random
import re
import subprocess
import tempfile
import time
import requests
from config import (
    GEMINI_API_KEY,
    GEMINI_MODEL,
    GEMINI_API_URL,
    logger,
)

CANDIDATE_KEY_PATHS = [
    os.getenv("GOOGLE_APPLICATION_CREDENTIALS", ""),
    "/keys/service-account.json",
    "/app/.keys/service-account.json",
    "keys/service-account.json",
    ".keys/service-account.json",
]

# Chunking & Contextual Continuity Constants:
# - Every video > 10 min is split into N equal-sized parts where each part's new core duration is between 5 and 10 minutes
#   (num_parts = ceil(total_dur / 600), core_step = total_dur / num_parts -> guarantees balanced parts & no tiny final part).
# - Part k (k > 1) includes a 2-minute (120s) media padding from the end of Part k-1.
# - Part k (k > 1) receives the last 5 minutes (300s) of transcript from Part k-1 as prompt context.
MAX_PART_CORE_SECONDS = 600.0          # 10 minutes max per part (balanced 5-10 min parts)
MEDIA_PADDING_SECONDS = 120.0          # 2 minutes of media overlap from the end of previous part
PREV_TRANSCRIPT_CONTEXT_SECONDS = 300.0  # 5 minutes of previous transcript context


def _b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


class GeminiMultimodalClient:
    """
    Client for Gemini 3.8 Flash Multimodal Audio and Video Transcription on Vertex AI
    with sequential 5-10 minute chunking, 2-minute media overlap padding, and 5-minute transcript context propagation.
    """

    def __init__(self):
        self.api_key = GEMINI_API_KEY
        self.model = GEMINI_MODEL
        self.api_url = GEMINI_API_URL
        self._cached_token = None
        self._token_exp = 0
        self._project_id = "study-deploys"

    def _resolve_sa_key_path(self) -> str:
        for p in CANDIDATE_KEY_PATHS:
            if p and os.path.isfile(p):
                return p
        return ""

    def _get_vertex_access_token(self, key_path: str) -> str:
        now = int(time.time())
        if self._cached_token and now < self._token_exp - 120:
            return self._cached_token

        with open(key_path, "r", encoding="utf-8") as f:
            sa = json.load(f)

        self._project_id = sa.get("project_id", "study-deploys")
        token_uri = sa.get("token_uri", "https://oauth2.googleapis.com/token")
        header = _b64url(json.dumps({"alg": "RS256", "typ": "JWT"}).encode("utf-8"))
        claims = _b64url(
            json.dumps(
                {
                    "iss": sa["client_email"],
                    "scope": "https://www.googleapis.com/auth/cloud-platform",
                    "aud": token_uri,
                    "iat": now,
                    "exp": now + 3600,
                }
            ).encode("utf-8")
        )
        signing_input = f"{header}.{claims}".encode("utf-8")

        with tempfile.NamedTemporaryFile("w", suffix=".pem", delete=True) as pem_f:
            pem_f.write(sa["private_key"])
            pem_f.flush()
            res = subprocess.run(
                ["openssl", "dgst", "-sha256", "-sign", pem_f.name],
                input=signing_input,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                check=True,
            )
            sig = _b64url(res.stdout)

        jwt_assertion = f"{header}.{claims}.{sig}"
        resp = requests.post(
            token_uri,
            data={
                "grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer",
                "assertion": jwt_assertion,
            },
            timeout=15,
        )
        resp.raise_for_status()
        tok_data = resp.json()
        self._cached_token = tok_data["access_token"]
        self._token_exp = now + int(tok_data.get("expires_in", 3600))
        return self._cached_token

    def transcribe(
        self,
        case_number: str,
        media_type: str = "VIDEO",
        filename: str = "",
        hearing_id: str = "",
        on_part_progress=None,
        force_reprocess: bool = False,
    ) -> dict:
        """
        Transcribe court recording with speaker diarization and legal segmentation using Vertex AI Gemini 3.8 Flash.
        Videos longer than 10 minutes are split into equal-sized 5-10 minute parts and transcribed sequentially
        with 2-minute media padding and 5-minute previous transcript context.
        """
        sa_key = self._resolve_sa_key_path()
        last_err = None
        if sa_key:
            try:
                return self._call_vertex_gemini_api(
                    sa_key,
                    case_number,
                    media_type,
                    filename,
                    hearing_id,
                    on_part_progress=on_part_progress,
                    force_reprocess=force_reprocess,
                )
            except Exception as e:
                last_err = e
                logger.warning(f"Vertex AI Gemini 3.8 Flash call failed ({e}), trying Gemini API fallback.")

        if self.api_key and not self.api_key.startswith("mock") and len(self.api_key.strip()) > 5:
            return self._call_gemini_api(case_number, media_type, filename)

        if last_err:
            raise RuntimeError(f"Vertex AI Gemini 3.8 Flash transcription failed for process {case_number}: {last_err}") from last_err
        raise RuntimeError(f"No valid Vertex AI service account or Gemini API key configured for process {case_number}")

    @staticmethod
    def _format_hms(ms: int) -> str:
        total_sec = max(0, int(ms) // 1000)
        hours = total_sec // 3600
        minutes = (total_sec % 3600) // 60
        seconds = total_sec % 60
        if hours > 0:
            return f"{hours:02d}:{minutes:02d}:{seconds:02d}"
        return f"{minutes:02d}:{seconds:02d}"

    @staticmethod
    def _parse_clip_time_to_ms(raw_val, clip_duration_ms: int) -> int:
        """
        Parse a timestamp returned by Gemini ('MM:SS', 'MM:SS.d', 'HH:MM:SS', 'HH:MM:SS.d', or numeric ms/seconds)
        into exact milliseconds within [0, clip_duration_ms], automatically correcting base-100 MMSS values.
        """
        if raw_val is None:
            return -1

        if isinstance(raw_val, str):
            s = raw_val.strip().rstrip("sS").replace(",", ".")
            if ":" in s:
                parts = s.split(":")
                try:
                    if len(parts) == 2:
                        mm = int(float(parts[0]))
                        ss = float(parts[1])
                        return int(round((mm * 60.0 + ss) * 1000.0))
                    if len(parts) == 3:
                        hh = int(float(parts[0]))
                        mm = int(float(parts[1]))
                        ss = float(parts[2])
                        return int(round((hh * 3600.0 + mm * 60.0 + ss) * 1000.0))
                except ValueError:
                    return -1
            try:
                raw_val = float(s)
            except ValueError:
                return -1

        if isinstance(raw_val, (int, float)):
            val = float(raw_val)
            if val < 0:
                return -1
            ms = int(round(val * 1000.0)) if (0 < val < 900 and clip_duration_ms > 5000) else int(round(val))
            sec = ms // 1000
            rem_ms = ms % 1000
            if sec >= 100 and (sec % 100) < 60:
                mmss_ms = ((sec // 100) * 60 + (sec % 100)) * 1000 + rem_ms
                if ms > clip_duration_ms or mmss_ms <= clip_duration_ms:
                    return mmss_ms
            return ms

        return -1

    @staticmethod
    def _locate_media_file(filename: str) -> str:
        if not filename:
            return ""
        search_dirs = [
            "/app/.media/hearings",
            "pipelines/transcription-pipeline/.media/hearings",
            "frontend/open-judy-ui/public/media/hearings",
            "data/hearings",
        ]
        for d in search_dirs:
            candidate = os.path.join(d, filename)
            if os.path.isfile(candidate):
                return candidate
        return ""

    @staticmethod
    def _parse_mp4_mvhd_duration_seconds(media_path: str) -> float:
        """Pure-Python MP4/MOV `mvhd` box parser fallback when `ffprobe` is unavailable."""
        import struct
        try:
            fsize = os.path.getsize(media_path)
            with open(media_path, "rb") as f:
                chunks = [f.read(min(fsize, 4 * 1024 * 1024))]
                if fsize > 4 * 1024 * 1024:
                    f.seek(max(0, fsize - 4 * 1024 * 1024))
                    chunks.append(f.read(4 * 1024 * 1024))
            for data in chunks:
                pos = 0
                while True:
                    idx = data.find(b"mvhd", pos)
                    if idx < 0 or idx + 36 > len(data):
                        break
                    ver = data[idx + 4]
                    if ver == 0:
                        timescale = struct.unpack(">I", data[idx + 16 : idx + 20])[0]
                        duration = struct.unpack(">I", data[idx + 20 : idx + 24])[0]
                    elif ver == 1:
                        timescale = struct.unpack(">I", data[idx + 24 : idx + 28])[0]
                        duration = struct.unpack(">Q", data[idx + 28 : idx + 36])[0]
                    else:
                        pos = idx + 4
                        continue
                    if timescale > 0 and duration > 0:
                        dur_sec = duration / float(timescale)
                        if 1.0 < dur_sec < 360000.0:
                            return round(dur_sec, 2)
                    pos = idx + 4
        except Exception:
            pass
        return 0.0

    @classmethod
    def _probe_duration_seconds(cls, media_path: str, fallback_sec: float) -> float:
        if media_path and os.path.isfile(media_path):
            try:
                res = subprocess.run(
                    [
                        "ffprobe",
                        "-v",
                        "error",
                        "-show_entries",
                        "format=duration",
                        "-of",
                        "default=noprint_wrappers=1:nokey=1",
                        media_path,
                    ],
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    timeout=10,
                )
                if res.returncode == 0:
                    probed = float(res.stdout.decode("utf-8").strip())
                    if probed > 1.0:
                        return round(probed, 2)
            except Exception as e:
                logger.warning(f"ffprobe duration check failed for {media_path}: {e}")
            mvhd_sec = cls._parse_mp4_mvhd_duration_seconds(media_path)
            if mvhd_sec > 1.0:
                return mvhd_sec
        return max(5.0, float(fallback_sec))

    @classmethod
    def _compute_balanced_parts(cls, total_dur_sec: float) -> list:
        """
        Split a video of duration `total_dur_sec` into N balanced parts so that:
        1. Every part's core (non-overlapping) duration is identical (`core_step = total_dur_sec / num_parts`),
           strictly between 5 minutes (300s) and 10 minutes (600s) whenever total_dur_sec > 600s,
           avoiding any tiny remainder part at the end.
        2. Part k (for k > 1) starts `MEDIA_PADDING_SECONDS` (120s = 2 minutes) before `core_start_sec`,
           so it includes the final 2 minutes of Part k-1 as acoustic/visual context padding.
        """
        if total_dur_sec <= MAX_PART_CORE_SECONDS:
            num_parts = 1
        else:
            num_parts = int(math.ceil(total_dur_sec / MAX_PART_CORE_SECONDS))

        core_step = total_dur_sec / float(num_parts)
        parts = []
        for idx in range(num_parts):
            part_num = idx + 1
            core_start = round(idx * core_step, 2)
            core_end = round(total_dur_sec if part_num == num_parts else (idx + 1) * core_step, 2)
            core_dur = round(max(1.0, core_end - core_start), 2)

            if part_num == 1:
                clip_start = 0.0
                padding_sec = 0.0
            else:
                clip_start = round(max(0.0, core_start - MEDIA_PADDING_SECONDS), 2)
                padding_sec = round(core_start - clip_start, 2)

            clip_end = core_end
            clip_dur = round(max(1.0, clip_end - clip_start), 2)

            start_hms = cls._format_hms(int(round(core_start * 1000)))
            end_hms = cls._format_hms(int(round(core_end * 1000)))
            parts.append({
                "blockIndex": part_num,
                "totalParts": num_parts,
                "title": f"Parte {part_num}/{num_parts} ({start_hms} – {end_hms})",
                "coreStartSeconds": core_start,
                "coreEndSeconds": core_end,
                "coreDurationSeconds": core_dur,
                "clipStartSeconds": clip_start,
                "clipEndSeconds": clip_end,
                "clipDurationSeconds": clip_dur,
                "paddingSeconds": padding_sec,
            })
        return parts

    @staticmethod
    def _extract_part_media_bytes(media_path: str, part: dict, hearing_id: str) -> tuple:
        """
        Extract the media slice `[clipStartSeconds, clipEndSeconds]` for a single part.
        Uses sample-accurate AAC re-encoding with `-avoid_negative_ts make_zero` whenever slicing
        to eliminate MP4 packet-copy / edit-list start_pts clock drift.
        Returns (mime_type, raw_bytes).
        """
        if not media_path or not os.path.isfile(media_path):
            return "audio/mp4", b""

        clip_start = float(part.get("clipStartSeconds", 0.0))
        clip_dur = float(part.get("clipDurationSeconds", 0.0))

        # If there is only 1 part starting at 0.0 and the original file is small enough (<= 14 MB), send it directly
        if int(part.get("totalParts", 1)) == 1 and clip_start <= 0.0 and os.path.getsize(media_path) <= 14 * 1024 * 1024:
            mime = "video/mp4" if media_path.lower().endswith((".mp4", ".mov", ".mkv", ".webm")) else "audio/mpeg"
            with open(media_path, "rb") as f:
                return mime, f.read()

        tmp_dir = "/tmp/openjudy_media_parts"
        os.makedirs(tmp_dir, exist_ok=True)
        safe_hid = (hearing_id or "hearing").replace("/", "_")
        tmp_chunk = os.path.join(tmp_dir, f"{safe_hid}_part_{part['blockIndex']}.m4a")

        try:
            # Sample-accurate zero-indexed mono 16kHz 48kbps AAC extraction (avoids -c:a copy packet/edit-list skew)
            subprocess.run(
                [
                    "ffmpeg",
                    "-y",
                    "-v",
                    "error",
                    "-ss",
                    f"{clip_start:.3f}",
                    "-i",
                    media_path,
                    "-t",
                    f"{clip_dur:.3f}",
                    "-vn",
                    "-ac",
                    "1",
                    "-ar",
                    "16000",
                    "-c:a",
                    "aac",
                    "-b:a",
                    "48k",
                    "-avoid_negative_ts",
                    "make_zero",
                    tmp_chunk,
                ],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                timeout=90,
            )

            if os.path.isfile(tmp_chunk) and os.path.getsize(tmp_chunk) > 0:
                with open(tmp_chunk, "rb") as f:
                    return "audio/mp4", f.read()
        except Exception as e:
            logger.error(f"Failed to extract media part {part['blockIndex']} from {media_path}: {e}")
        finally:
            try:
                if os.path.isfile(tmp_chunk):
                    os.remove(tmp_chunk)
            except OSError:
                pass

        return "audio/mp4", b""

    @staticmethod
    def _spoken_text_weight(text: str) -> float:
        """
        Estimate relative spoken duration weight of a Portuguese utterance by combining
        vowel-nucleus syllable count, alphanumeric character count, word count, and clause pauses.
        """
        t = (text or "").lower().strip()
        if not t:
            return 4.0
        alnum = len(re.sub(r"[\W_]+", "", t))
        syllables = len(re.findall(r"[aeiouáéíóúàâêôãõü]+", t))
        words = len(t.split())
        punct_pauses = len(re.findall(r"[.,;?!:]", t))
        return max(3.5, syllables * 1.45 + alnum * 0.45 + words * 0.35 + punct_pauses * 1.2)

    @classmethod
    def _extract_rms_energy_profile(
        cls,
        media_bytes_or_path,
        clip_dur_ms: int,
        clip_start_sec: float = 0.0,
        sub_offset_sec: float = 0.0,
        frame_ms: int = 20,
    ) -> dict:
        """
        Decode mono 16kHz s16le PCM via ffmpeg and compute a 20ms-resolution RMS dBFS energy envelope,
        adaptive noise floor (`p15`), speech peak (`p90`), adaptive speech threshold (`thresh`),
        confirmed speech/silence islands, local energy-valley sub-islands, and cumulative vocal clock.
        """
        empty_prof = {
            "p15": -55.0,
            "p90": -20.0,
            "thresh": -38.0,
            "speech_islands": [],
            "raw_speech_islands": [],
            "silences": [],
            "active": [],
            "raw_db": [],
            "smooth_db": [],
            "vocal_cum": [0],
            "frame_ms": frame_ms,
            "n_frames": 0,
        }
        if not media_bytes_or_path or clip_dur_ms <= 0:
            return empty_prof

        tmp_path = None
        input_path = None
        try:
            if isinstance(media_bytes_or_path, (bytes, bytearray)):
                if len(media_bytes_or_path) == 0:
                    return empty_prof
                with tempfile.NamedTemporaryFile(prefix="oj_rms_", suffix=".mp4", delete=False) as tf:
                    tf.write(media_bytes_or_path)
                    tmp_path = tf.name
                input_path = tmp_path
            elif isinstance(media_bytes_or_path, str) and os.path.isfile(media_bytes_or_path):
                input_path = media_bytes_or_path
            else:
                return empty_prof

            seek_sec = sub_offset_sec if tmp_path is not None else (clip_start_sec + sub_offset_sec)
            cmd = ["ffmpeg", "-hide_banner", "-nostats"]
            if seek_sec > 0.0:
                cmd.extend(["-ss", f"{seek_sec:.3f}"])
            cmd.extend([
                "-t",
                f"{max(1.0, clip_dur_ms / 1000.0):.3f}",
                "-i",
                input_path,
                "-vn",
                "-ac",
                "1",
                "-ar",
                "16000",
                "-f",
                "s16le",
                "-",
            ])
            res = subprocess.run(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.DEVNULL,
                timeout=45,
            )
            pcm = res.stdout or b""
            if len(pcm) < 640:
                return empty_prof

            mv = memoryview(pcm).cast("h")
            step = (16000 * frame_ms) // 1000
            n_frames = len(mv) // step
            if n_frames <= 0:
                return empty_prof

            raw_db = []
            for i in range(n_frames):
                sl = mv[i * step : (i + 1) * step : 2]
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
        except Exception as e:
            logger.warning(f"Adaptive RMS energy extraction failed: {e}")
            return empty_prof
        finally:
            if tmp_path and os.path.isfile(tmp_path):
                try:
                    os.remove(tmp_path)
                except OSError:
                    pass

    @classmethod
    def align_segments_viterbi_acoustic(
        cls,
        segments: list,
        media_bytes_or_path=None,
        core_start_ms: int = 0,
        core_end_ms: int = 0,
        clip_start_sec: float = 0.0,
        sub_offset_sec: float = 0.0,
        rms_profile: dict = None,
        trust_priors: bool = True,
    ) -> list:
        """
        Align `segments` to the 20ms Adaptive RMS Energy Envelope over `[core_start_ms, core_end_ms]`
        using Viterbi Dynamic Programming (DP) so that every segment starts at an exact vocal onset
        and ends at an exact vocal offset or acoustic energy valley.
        """
        if not segments:
            return []
        n_segs = len(segments)
        if core_end_ms <= core_start_ms:
            core_end_ms = max((int(s.get("endTimeMs", 0)) for s in segments), default=core_start_ms + n_segs * 2000)
        dur_ms = max(1000, core_end_ms - core_start_ms)

        prof = rms_profile
        if prof is None and media_bytes_or_path:
            prof = cls._extract_rms_energy_profile(
                media_bytes_or_path,
                dur_ms,
                clip_start_sec=clip_start_sec,
                sub_offset_sec=sub_offset_sec,
            )
        if not prof or not prof.get("speech_islands"):
            return segments

        frame_ms = prof["frame_ms"]
        n_frames = prof["n_frames"]
        smooth_db = prof["smooth_db"]
        raw_db = prof["raw_db"]
        vocal_cum = prof["vocal_cum"]
        thresh = prof["thresh"]
        p15 = prof["p15"]
        sp = list(prof["speech_islands"])

        # If there are fewer islands than segments, iteratively split the longest island at its deepest energy minimum
        while len(sp) < n_segs:
            best_idx = -1
            best_len = 0
            for idx_isl, (s_i, e_i) in enumerate(sp):
                if e_i - s_i > best_len:
                    best_len = e_i - s_i
                    best_idx = idx_isl
            if best_idx < 0 or best_len < 600:
                break
            s_i, e_i = sp[best_idx]
            fa = s_i // frame_ms
            fb = e_i // frame_ms
            margin = max(6, min(16, (fb - fa) // 4))
            if fb - fa <= 2 * margin:
                mid_ms = (s_i + e_i) // 2
                sp[best_idx : best_idx + 1] = [(s_i, mid_ms - 20), (mid_ms + 20, e_i)]
            else:
                min_f = min(range(fa + margin, fb - margin), key=lambda f: smooth_db[f])
                sp[best_idx : best_idx + 1] = [
                    (s_i, max(s_i + 120, (min_f - 1) * frame_ms)),
                    (min(e_i - 120, (min_f + 1) * frame_ms), e_i),
                ]

        m_isl = len(sp)
        if m_isl < n_segs:
            return segments

        # Check whether existing segment timestamps are non-collapsed and usable as soft priors
        starts = [int(s.get("startTimeMs", core_start_ms)) - core_start_ms for s in segments]
        ends = [int(s.get("endTimeMs", core_start_ms + 1000)) - core_start_ms for s in segments]
        distinct_st = len(set(starts))
        is_collapsed = (
            not trust_priors
            or (n_segs >= 3 and distinct_st <= max(2, int(n_segs * 0.65)))
            or any(et <= st for st, et in zip(starts, ends))
        )
        # Also detect if segment timestamps were generated by uniform linear interpolation (constant 80ms or 100ms gaps)
        if not is_collapsed and n_segs >= 5:
            gaps = [starts[i + 1] - ends[i] for i in range(n_segs - 1)]
            const_gaps = sum(1 for g in gaps if g in (0, 80, 100))
            if const_gaps >= int((n_segs - 1) * 0.75):
                is_collapsed = True

        anchor_priors = None if is_collapsed else list(zip(starts, ends))

        weights = [cls._spoken_text_weight(s.get("text", "")) for s in segments]
        total_w = float(sum(weights) or n_segs)
        total_vocal = float(vocal_cum[-1] or 1.0)
        total_major_sil = sum(
            (sp[idx + 1][0] - sp[idx][1])
            for idx in range(m_isl - 1)
            if (sp[idx + 1][0] - sp[idx][1]) >= 1200
        )
        total_utterance_span = max(total_vocal, float((sp[-1][1] - sp[0][0]) - total_major_sil))

        def vocal_between(ms_a: int, ms_b: int) -> float:
            fa = max(0, min(n_frames, ms_a // frame_ms))
            fb = max(fa, min(n_frames, ms_b // frame_ms))
            return float(vocal_cum[fb] - vocal_cum[fa])

        def gap_quietness_bonus(ms_a: int, ms_b: int) -> float:
            gap_ms = ms_b - ms_a
            if gap_ms < 220:
                return 0.0
            fa = max(0, min(n_frames - 1, (ms_a + 20) // frame_ms))
            fb = max(fa + 1, min(n_frames, (ms_b - 20) // frame_ms))
            gap_frames = sorted(raw_db[fa:fb])
            p75_gap = gap_frames[min(len(gap_frames) - 1, int(0.75 * len(gap_frames)))]
            depth_below_thresh = max(0.0, thresh - p75_gap)
            norm_depth = min(1.5, depth_below_thresh / max(4.0, thresh - p15))
            dur_score = min(1.6, math.log1p(max(0.0, gap_ms - 180.0) / 140.0))
            return -0.26 * dur_score * (0.5 + 0.5 * norm_depth)

        INF = 1e18
        dp = [[INF] * (m_isl + 1) for _ in range(n_segs + 1)]
        parent = [[0] * (m_isl + 1) for _ in range(n_segs + 1)]
        dp[0][0] = 0.0
        for i0 in range(1, min(3, m_isl - n_segs + 1)):
            skipped_v = vocal_between(sp[0][0], sp[i0 - 1][1])
            dp[0][i0] = 0.4 * (skipped_v / 1000.0)

        # Banded Viterbi search when m_isl is large so complexity stays fast O(N * B^2)
        max_band = max(18, (m_isl // max(1, n_segs)) * 4 + 8)
        for k in range(1, n_segs + 1):
            w_frac = weights[k - 1] / total_w
            exp_v = max(450.0, total_vocal * w_frac)
            exp_span = max(550.0, total_utterance_span * w_frac)
            prior_st, prior_et = anchor_priors[k - 1] if anchor_priors else (-1, -1)
            j_min = k
            j_max = m_isl - (n_segs - k)
            for j in range(j_min, j_max + 1):
                gap_bonus = gap_quietness_bonus(sp[j - 1][1], sp[j][0]) if j < m_isl else 0.0
                i_start = max(k - 1, j - max_band)
                for i in range(i_start, j):
                    if dp[k - 1][i] >= INF:
                        continue
                    st_ms = sp[i][0]
                    et_ms = sp[j - 1][1]
                    act_v = max(100.0, vocal_between(st_ms, et_ms))
                    span_ms = float(et_ms - st_ms)
                    rel_v_err = abs(act_v - exp_v) / max(500.0, exp_v)
                    rel_span_err = abs(span_ms - exp_span) / max(600.0, exp_span)
                    internal_sil_ms = max(0.0, span_ms - act_v)
                    sil_pen = 0.45 * (internal_sil_ms / max(800.0, exp_span))
                    prior_cost = 0.0
                    if prior_st >= 0 and prior_et > prior_st:
                        prior_dist = abs(st_ms - prior_st) + abs(et_ms - prior_et)
                        if prior_dist <= 2400:
                            prior_cost = 0.10 * (prior_dist / 2400.0)
                        else:
                            prior_cost = 0.10
                    cost = (
                        dp[k - 1][i]
                        + 0.85 * (rel_v_err ** 1.8)
                        + 1.55 * (rel_span_err ** 2.0)
                        + sil_pen
                        + gap_bonus
                        + prior_cost
                    )
                    if cost < dp[k][j]:
                        dp[k][j] = cost
                        parent[k][j] = i

        best_j_end = m_isl
        best_total_cost = dp[n_segs][m_isl]
        for j_end in range(max(n_segs, m_isl - 3), m_isl):
            skipped_v = vocal_between(sp[j_end][0], sp[m_isl - 1][1])
            c = dp[n_segs][j_end] + 0.25 * (skipped_v / 1000.0)
            if c < best_total_cost:
                best_total_cost = c
                best_j_end = j_end

        if best_total_cost >= INF:
            return segments

        aligned_rel = [None] * n_segs
        cur_j = best_j_end
        for k in range(n_segs, 0, -1):
            prev_i = parent[k][cur_j]
            aligned_rel[k - 1] = (sp[prev_i][0], sp[cur_j - 1][1])
            cur_j = prev_i

        out = []
        for idx_s, (seg, (rel_st, rel_et)) in enumerate(zip(segments, aligned_rel)):
            s_copy = dict(seg)
            abs_st = core_start_ms + max(0, int(rel_st))
            abs_et = core_start_ms + max(int(rel_st) + 320, int(rel_et))
            if out and abs_st < out[-1]["endTimeMs"]:
                abs_st = out[-1]["endTimeMs"]
            abs_et = min(core_end_ms, max(abs_st + 320, abs_et))
            s_copy["startTimeMs"] = abs_st
            s_copy["endTimeMs"] = abs_et
            out.append(s_copy)
        return out

    @classmethod
    def _detect_speech_and_silence_intervals_ms(
        cls,
        media_bytes_or_path,
        clip_dur_ms: int,
        noise_db: int = -35,
        min_silence_sec: float = 0.35,
        clip_start_sec: float = 0.0,
        adaptive: bool = True,
    ) -> tuple:
        """
        Detect `(speech_intervals, silence_intervals)` in clip-relative milliseconds `[0, clip_dur_ms]`.
        When `adaptive=True` (default), uses the 20ms Adaptive RMS Energy Envelope detector so that both
        clean recordings (-46dB floor) and noisy courtroom recordings (-28dB HVAC noise floor) have
        accurate speech and pause boundaries. Falls back to `ffmpeg silencedetect` if requested or needed.
        """
        if not media_bytes_or_path or clip_dur_ms <= 0:
            return [], []

        if adaptive:
            prof = cls._extract_rms_energy_profile(
                media_bytes_or_path,
                clip_dur_ms,
                clip_start_sec=clip_start_sec,
            )
            if prof.get("speech_islands"):
                return prof["speech_islands"], prof["silences"]

        tmp_path = None
        input_path = None
        try:
            if isinstance(media_bytes_or_path, (bytes, bytearray)):
                if len(media_bytes_or_path) == 0:
                    return [], []
                with tempfile.NamedTemporaryFile(prefix="oj_vad_", suffix=".mp4", delete=False) as tf:
                    tf.write(media_bytes_or_path)
                    tmp_path = tf.name
                input_path = tmp_path
            elif isinstance(media_bytes_or_path, str) and os.path.isfile(media_bytes_or_path):
                input_path = media_bytes_or_path
            else:
                return [], []

            cmd = ["ffmpeg", "-hide_banner", "-nostats"]
            if tmp_path is None and clip_start_sec > 0.0:
                cmd.extend(["-ss", f"{clip_start_sec:.3f}"])
            cmd.extend([
                "-t",
                f"{max(1.0, clip_dur_ms / 1000.0):.3f}",
                "-i",
                input_path,
                "-vn",
                "-af",
                f"silencedetect=noise={int(noise_db)}dB:d={min_silence_sec:.2f}",
                "-f",
                "null",
                "-",
            ])
            res = subprocess.run(
                cmd,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.PIPE,
                text=True,
                timeout=30,
            )

            raw_silences = []
            cur_s = None
            for line in (res.stderr or "").splitlines():
                m_st = re.search(r"silence_start:\s*([0-9.]+)", line)
                if m_st:
                    cur_s = int(round(float(m_st.group(1)) * 1000.0))
                m_et = re.search(r"silence_end:\s*([0-9.]+)", line)
                if m_et and cur_s is not None:
                    et = int(round(float(m_et.group(1)) * 1000.0))
                    s_clamped = max(0, min(clip_dur_ms, cur_s))
                    e_clamped = max(s_clamped, min(clip_dur_ms, et))
                    if e_clamped > s_clamped:
                        raw_silences.append((s_clamped, e_clamped))
                    cur_s = None
            if cur_s is not None:
                s_clamped = max(0, min(clip_dur_ms, cur_s))
                if clip_dur_ms > s_clamped:
                    raw_silences.append((s_clamped, clip_dur_ms))

            # Merge adjacent silence intervals separated by < 120ms transient clicks
            silence_intervals = []
            for s, e in sorted(raw_silences):
                if silence_intervals and s - silence_intervals[-1][1] < 120:
                    silence_intervals[-1] = (silence_intervals[-1][0], max(silence_intervals[-1][1], e))
                else:
                    silence_intervals.append((s, e))

            # Complement of silence_intervals yields vocal speech islands (>= 150ms)
            speech_intervals = []
            cursor = 0
            for s, e in silence_intervals:
                if s - cursor >= 150:
                    speech_intervals.append((cursor, s))
                cursor = max(cursor, e)
            if clip_dur_ms - cursor >= 150:
                speech_intervals.append((cursor, clip_dur_ms))

            return speech_intervals, silence_intervals
        except Exception as e:
            logger.warning(f"silencedetect VAD check failed: {e}")
            return [], []
        finally:
            if tmp_path and os.path.isfile(tmp_path):
                try:
                    os.remove(tmp_path)
                except OSError:
                    pass

    @classmethod
    def _detect_speech_intervals_ms(
        cls,
        media_bytes_or_path,
        clip_dur_ms: int,
        noise_db: int = -35,
        min_silence_sec: float = 0.35,
        clip_start_sec: float = 0.0,
    ) -> list:
        """
        Return acoustic speech intervals `[(speech_start_ms, speech_end_ms), ...]` detected via
        `ffmpeg -af silencedetect=noise=-35dB:d=0.35 -f null -` on the extracted audio/video.
        """
        speech_intervals, _ = cls._detect_speech_and_silence_intervals_ms(
            media_bytes_or_path,
            clip_dur_ms,
            noise_db=noise_db,
            min_silence_sec=min_silence_sec,
            clip_start_sec=clip_start_sec,
        )
        return speech_intervals

    @staticmethod
    def _derive_silence_intervals_from_speech(speech_intervals: list, min_ms: int, max_ms: int) -> list:
        if not speech_intervals:
            return []
        silences = []
        cursor = min_ms
        for sp_s, sp_e in sorted(speech_intervals):
            s = max(min_ms, sp_s)
            e = min(max_ms, sp_e)
            if s - cursor >= 300:
                silences.append((cursor, s))
            cursor = max(cursor, e)
        if max_ms - cursor >= 300:
            silences.append((cursor, max_ms))
        return silences

    @classmethod
    def _snap_segments_to_speech_intervals(
        cls,
        segments: list,
        speech_intervals: list,
        silence_intervals: list = None,
        min_ms: int = 0,
        max_ms: int = 0,
    ) -> list:
        """
        Snap segment `startTimeMs` and `endTimeMs` to confirmed acoustic speech onset/offset islands
        so subtitles never appear during silence before someone speaks or linger during silence after speech ends.
        Preserves monotonic non-overlapping order by trimming previous `endTimeMs` rather than pushing `startTimeMs` forward.
        """
        if not segments or not speech_intervals:
            return segments

        if min_ms > 0 and max_ms == 0 and all(int(s.get("startTimeMs", 0)) < min_ms for s in segments):
            max_ms = min_ms
            min_ms = 0
        if max_ms <= min_ms:
            max_ms = max((int(s.get("endTimeMs", 0)) for s in segments), default=min_ms + 5000)

        silences = (
            list(silence_intervals)
            if silence_intervals is not None
            else cls._derive_silence_intervals_from_speech(speech_intervals, min_ms, max_ms)
        )

        out = [dict(s) for s in segments]
        n = len(out)

        # 1. If the first segment starts shortly after the first speech onset in this part (within 800ms),
        #    snap it back to the true vocal onset so initial words ("Vamos lá") are not clipped.
        first_sp_st = speech_intervals[0][0]
        if 0 < out[0]["startTimeMs"] - first_sp_st <= 800:
            out[0]["startTimeMs"] = first_sp_st

        for i in range(n):
            st = int(out[i]["startTimeMs"])
            et = max(st + 450, int(out[i]["endTimeMs"]))
            orig_dur = et - st
            text = str(out[i].get("text") or "")
            alnum_len = len(re.sub(r"[\W_]+", "", text))

            # A. Snap startTimeMs out of confirmed silence (or align contiguous clause boundary to nearby pause)
            snapped_start = False
            for sil_st, sil_et in silences:
                tol_before = 350 if (i > 0 and out[i - 1]["endTimeMs"] >= st - 150) else 0
                if sil_st - tol_before <= st < sil_et and (sil_et - st) <= 2600:
                    if i > 0 and out[i - 1]["endTimeMs"] > sil_st + 50:
                        out[i - 1]["endTimeMs"] = max(out[i - 1]["startTimeMs"] + 450, min(sil_et, sil_st + 50))
                    st = sil_et
                    snapped_start = True
                    if et <= st + 450:
                        # Entire segment was placed inside silence; move it onto the speech island starting at sil_et
                        sp_end = st + max(550, min(2500, orig_dur))
                        for sp_s, sp_e in speech_intervals:
                            if abs(sp_s - sil_et) <= 150:
                                sp_end = min(sp_e + 50, st + max(550, orig_dur))
                                break
                        et = max(st + 450, sp_end)
                        if i + 1 < n and out[i + 1]["startTimeMs"] < et:
                            out[i + 1]["startTimeMs"] = et
                    break
                if sil_et < st <= sil_et + 650 and (i == 0 or out[i - 1]["endTimeMs"] >= sil_st - 350):
                    if i > 0 and out[i - 1]["endTimeMs"] > sil_st + 50:
                        out[i - 1]["endTimeMs"] = max(out[i - 1]["startTimeMs"] + 450, min(sil_et, sil_st + 50))
                    st = sil_et
                    snapped_start = True
                    break

            # If this is a contiguous boundary inside speech and there is a distinct pause (>= 550ms) within 1750ms,
            # align the boundary between seg[i-1] and seg[i] with that acoustic pause.
            if not snapped_start and i > 0 and abs(st - out[i - 1]["endTimeMs"]) <= 200:
                prev_st = out[i - 1]["startTimeMs"]
                for sil_st, sil_et in silences:
                    if (sil_et - sil_st) >= 550 and abs(sil_st - st) <= 1750:
                        if (sil_st - prev_st) >= 2000 and (et - sil_et) >= 2000:
                            out[i - 1]["endTimeMs"] = min(sil_et, sil_st + 50)
                            st = sil_et
                            break

            # B. Snap endTimeMs out of confirmed silence
            for sil_st, sil_et in silences:
                if sil_st < et <= sil_et and sil_st >= st + 400 and (et - sil_st) <= 3800:
                    et = min(sil_et, sil_st + 50)
                    break
                if sil_st - 350 <= et < sil_st and (i == n - 1 or out[i + 1]["startTimeMs"] >= sil_st - 350):
                    et = min(sil_et, sil_st + 50)
                    break

            # C. Trim trailing silence + non-speech room noise at the end of short/final segments
            for sil_st, sil_et in silences:
                if st + 450 <= sil_st < et and (sil_et - sil_st) >= 450:
                    spoken_dur = sil_st - st
                    expected_max_dur = max(1100, alnum_len * 85)
                    if (
                        spoken_dur >= max(450, alnum_len * 45)
                        and (i == n - 1 or et - sil_st <= 2500)
                        and spoken_dur <= expected_max_dur
                    ):
                        if i == n - 1 or alnum_len <= 25:
                            et = min(sil_et, sil_st + 50)
                            break

            out[i]["startTimeMs"] = min(max_ms - 450, max(min_ms, st))
            out[i]["endTimeMs"] = min(max_ms, max(out[i]["startTimeMs"] + 450, et))

            # D. Ensure non-overlapping monotonicity by trimming previous segment's endTimeMs, never pushing startTimeMs
            if i > 0 and out[i - 1]["endTimeMs"] > out[i]["startTimeMs"]:
                if out[i]["startTimeMs"] >= out[i - 1]["startTimeMs"] + 450:
                    out[i - 1]["endTimeMs"] = out[i]["startTimeMs"]

        try:
            from db import _repair_and_normalize_block_segments
            out = _repair_and_normalize_block_segments(out, min_ms, max_ms, speech_intervals=speech_intervals)
        except Exception:
            pass
        return out

    @classmethod
    def _split_into_subtitle_cues(
        cls,
        segments: list,
        total_duration_ms: int,
        speech_intervals: list = None,
        silence_intervals: list = None,
    ) -> list:
        """
        Ensure every diarized segment has crisp cinema/streaming subtitle granularity
        (1-2 lines, ~4-8 seconds, max ~125 characters per cue), subdividing longer multi-clause
        utterances using spoken alphanumeric character density and aligning internal split points
        with real acoustic micro-pauses when present.
        """
        cues = []
        silences = (
            list(silence_intervals)
            if silence_intervals is not None
            else (
                cls._derive_silence_intervals_from_speech(speech_intervals, 0, total_duration_ms)
                if speech_intervals
                else []
            )
        )

        for seg in segments:
            text = str(seg.get("text") or "").strip()
            if not text:
                continue
            st_ms = int(seg["startTimeMs"])
            et_ms = max(st_ms + 450, int(seg["endTimeMs"]))
            dur_ms = et_ms - st_ms

            if len(text) <= 125 and dur_ms <= 10000:
                cues.append(seg)
                continue

            # Split on sentence boundaries first, then on clauses if any sentence is still > 125 chars
            raw_sentences = [p.strip() for p in re.split(r"(?<=[.?!;])\s+", text) if p.strip()]
            chunks = []
            for sent in raw_sentences:
                if len(sent) <= 125:
                    chunks.append(sent)
                else:
                    sub_parts = [p.strip() for p in re.split(r"(?<=[,:])\s+", sent) if p.strip()]
                    buf = ""
                    for sp in sub_parts:
                        cand = f"{buf}, {sp}" if buf and not buf.endswith((",", ":")) else (f"{buf} {sp}".strip() if buf else sp)
                        if len(cand) <= 120 or not buf:
                            buf = cand
                        else:
                            chunks.append(buf)
                            buf = sp
                    if buf:
                        chunks.append(buf)

            # Merge tiny trailing fragments (< 25 chars) with neighbor
            merged_chunks = []
            for ch in chunks:
                if merged_chunks and len(ch) < 25 and len(merged_chunks[-1]) + 1 + len(ch) <= 135:
                    merged_chunks[-1] = f"{merged_chunks[-1]} {ch}"
                else:
                    merged_chunks.append(ch)

            if len(merged_chunks) <= 1:
                cues.append(seg)
                continue

            # Weight by spoken alphanumeric character count (excluding punctuation/spaces)
            weights = [max(6, len(re.sub(r"[\W_]+", "", c))) for c in merged_chunks]
            total_w = sum(weights) or 1

            # Determine active speech sub-intervals within [st_ms, et_ms] so pauses do not skew proportional split
            seg_speech = []
            if speech_intervals:
                for sp_s, sp_e in speech_intervals:
                    ov_s = max(st_ms, sp_s)
                    ov_e = min(et_ms, sp_e)
                    if ov_e - ov_s >= 100:
                        seg_speech.append((ov_s, ov_e))
            total_active_ms = sum(ov_e - ov_s for ov_s, ov_e in seg_speech)

            def _map_active_fraction_to_ms(frac: float) -> int:
                if not seg_speech or total_active_ms < 600:
                    return st_ms + int(round(frac * dur_ms))
                target_active = frac * total_active_ms
                acc = 0.0
                for ov_s, ov_e in seg_speech:
                    island_dur = ov_e - ov_s
                    if acc + island_dur >= target_active:
                        return ov_s + int(round(target_active - acc))
                    acc += island_dur
                return seg_speech[-1][1]

            cur_st = st_ms
            cum_w = 0
            n_chunks = len(merged_chunks)
            for idx_c, ch_text in enumerate(merged_chunks):
                cum_w += weights[idx_c]
                if idx_c == n_chunks - 1:
                    cur_et = et_ms
                    next_st = et_ms
                else:
                    rem_chunks = n_chunks - 1 - idx_c
                    ideal_et = _map_active_fraction_to_ms(cum_w / float(total_w))
                    min_et = cur_st + 800
                    max_et = max(min_et, et_ms - rem_chunks * 800)
                    cur_et = max(min_et, min(max_et, ideal_et))
                    next_st = cur_et

                    # Snap split boundary to the nearest internal acoustic pause within 1500ms if available
                    best_pause = None
                    best_dist = 1501
                    for sil_st, sil_et in silences:
                        if sil_st >= cur_st + 700 and sil_et <= et_ms - rem_chunks * 700:
                            dist = min(abs(ideal_et - sil_st), abs(ideal_et - sil_et))
                            if sil_st <= ideal_et <= sil_et:
                                dist = 0
                            if dist < best_dist:
                                best_dist = dist
                                best_pause = (sil_st, sil_et)
                    if best_pause is not None:
                        p_st, p_et = best_pause
                        cur_et = min(p_et, p_st + 50)
                        next_st = p_et

                cues.append({
                    **seg,
                    "startTimeMs": min(total_duration_ms - 450, cur_st),
                    "endTimeMs": min(total_duration_ms, max(cur_st + 450, cur_et)),
                    "text": ch_text,
                })
                cur_st = next_st

        return cues

    def _normalize_part_segments(
        self,
        raw_segments: list,
        part: dict,
        total_duration_ms: int,
        media_bytes_or_path=None,
        speech_intervals: list = None,
    ) -> list:
        """
        Convert relative clip timestamps in Part `k` to monotonically increasing, non-overlapping
        absolute speech timestamps strictly inside `[coreStartMs, coreEndMs]`, stripping out any duplicate
        segments from the 2-minute leading padding `[0, paddingMs)`, avoiding destructive time-stretching
        or forward domino pushes, and anchoring timestamps to real acoustic `silencedetect` speech intervals.
        """
        if not raw_segments:
            return []

        b_idx = int(part.get("blockIndex", 1))
        core_start_ms = max(0, int(round(float(part.get("coreStartSeconds", 0.0)) * 1000)))
        core_end_ms = min(total_duration_ms, int(round(float(part.get("coreEndSeconds", total_duration_ms / 1000.0)) * 1000)))
        core_dur_ms = max(1000, core_end_ms - core_start_ms)
        padding_ms = max(0, int(round(float(part.get("paddingSeconds", 0.0)) * 1000)))
        clip_start_ms = max(0, core_start_ms - padding_ms)
        clip_dur_ms = padding_ms + core_dur_ms

        parsed_list = []
        for s in raw_segments:
            raw_st = s.get("clipStartTime") if s.get("clipStartTime") is not None else s.get("startTime", s.get("startTimeMs"))
            raw_et = s.get("clipEndTime") if s.get("clipEndTime") is not None else s.get("endTime", s.get("endTimeMs"))
            st_ms = self._parse_clip_time_to_ms(raw_st, clip_dur_ms)
            et_ms = self._parse_clip_time_to_ms(raw_et, clip_dur_ms)
            parsed_list.append((st_ms, et_ms, s))

        # 1. If ALL timestamps in this part were given as absolute video clock [clip_start_ms, core_end_ms], convert to clip-relative
        if clip_start_ms > 0 and parsed_list:
            raw_starts = [st for st, _, _ in parsed_list if st >= 0]
            raw_ends = [max(st, et) for st, et, _ in parsed_list if max(st, et) >= 0]
            min_raw_st = min(raw_starts, default=0)
            max_raw_et = max(raw_ends, default=0)
            if min_raw_st >= clip_start_ms - 5000 and max_raw_et > clip_dur_ms + 15000:
                parsed_list = [
                    (
                        max(0, st - clip_start_ms) if st >= 0 else st,
                        max(0, et - clip_start_ms) if et >= 0 else et,
                        s,
                    )
                    for st, et, s in parsed_list
                ]

        # 2. Handle the 2-minute padding offset when b_idx > 1 and padding_ms > 0
        #    Determine whether Gemini returned timestamps relative to 00:00 of the full extracted clip
        #    (where new content starts at padding_ms, e.g. 02:00) vs relative to 00:00 of the unpadded core,
        #    without erasing genuine initial pauses (never subtract first_valid_st!).
        if b_idx > 1 and padding_ms > 0 and parsed_list:
            valid_starts = [st for st, _, _ in parsed_list if st >= 0]
            valid_ends = [max(st, et) for st, et, _ in parsed_list if max(st, et) >= 0]
            min_st = min(valid_starts, default=0)
            max_et = max(valid_ends, default=0)

            has_pre_padding_segs = any(0 <= st < padding_ms - 10000 for st in valid_starts)
            has_post_padding_segs = any(st >= padding_ms - 5000 for st in valid_starts)
            uses_full_clip_clock = (
                (min_st >= padding_ms - 15000)
                or (max_et > core_dur_ms + 10000)
                or (has_pre_padding_segs and has_post_padding_segs and max_et > padding_ms + 30000)
            )
            if uses_full_clip_clock:
                # Filter out segments that belong to the 2-minute leading padding [0, padding_ms) already transcribed in Part k-1
                after_padding = []
                for st, et, s in parsed_list:
                    if st < 0 and et < 0:
                        after_padding.append((st, et, s))
                        continue
                    eff_st = st if st >= 0 else et
                    eff_et = max(eff_st, et)
                    # Drop segments that end before padding_ms (or where >60% of the segment lies inside the padding)
                    if eff_et <= padding_ms + 400:
                        continue
                    if eff_st < padding_ms and (padding_ms - eff_st) > (eff_et - padding_ms):
                        continue
                    after_padding.append((
                        max(0, st - padding_ms) if st >= 0 else st,
                        max(0, et - padding_ms) if et >= 0 else et,
                        s,
                    ))
                if after_padding:
                    parsed_list = after_padding
                else:
                    parsed_list = [
                        (
                            max(0, st - padding_ms) if st >= 0 else st,
                            max(0, et - padding_ms) if et >= 0 else et,
                            s,
                        )
                        for st, et, s in parsed_list
                    ]

        # 3. Only scale down if Gemini hallucinated timestamps beyond clip_dur_ms * 1.05 (never stretch when max_seen < core_dur_ms!)
        max_seen = max((max(st, et) for st, et, _ in parsed_list), default=0)
        scale = 1.0
        if max_seen > clip_dur_ms * 1.05 and max_seen > 0:
            scale = core_dur_ms / float(max_seen)
        elif max_seen > core_dur_ms * 1.05 and max_seen > 0:
            scale = core_dur_ms / float(max_seen)

        # 4. Build initial absolute segments without forward domino pushing:
        #    If segment i's endTimeMs overlaps segment i+1's startTimeMs, trim segment i's endTimeMs!
        min_seg_dur_ms = 450
        normalized = []
        n = len(parsed_list)
        for i, (st_ms, et_ms, s) in enumerate(parsed_list):
            text = str(s.get("text") or "").strip()
            alnum_len = max(4, len(re.sub(r"[\W_]+", "", text)))

            if st_ms >= 0:
                clip_st = max(0, min(core_dur_ms - min_seg_dur_ms, int(round(st_ms * scale))))
            else:
                prev_rel_et = (normalized[-1]["endTimeMs"] - core_start_ms) if normalized else 0
                clip_st = max(0, min(core_dur_ms - min_seg_dur_ms, prev_rel_et))

            if et_ms > st_ms >= 0:
                clip_et = max(clip_st + min_seg_dur_ms, min(core_dur_ms, int(round(et_ms * scale))))
            else:
                est_dur = max(800, min(6000, alnum_len * 65))
                if i + 1 < n and parsed_list[i + 1][0] > st_ms >= 0:
                    next_st_scaled = int(round(parsed_list[i + 1][0] * scale))
                    est_dur = min(est_dur, max(min_seg_dur_ms, next_st_scaled - clip_st))
                clip_et = min(core_dur_ms, clip_st + est_dur)

            abs_start_ms = min(total_duration_ms - min_seg_dur_ms, core_start_ms + clip_st)
            abs_end_ms = min(total_duration_ms, max(abs_start_ms + min_seg_dur_ms, core_start_ms + clip_et))

            # If previous segment's endTimeMs overlaps this segment's accurate startTimeMs, trim previous endTimeMs!
            if normalized and normalized[-1]["endTimeMs"] > abs_start_ms:
                prev_seg = normalized[-1]
                if abs_start_ms >= prev_seg["startTimeMs"] + min_seg_dur_ms:
                    prev_seg["endTimeMs"] = abs_start_ms

            normalized.append({
                "blockIndex": b_idx,
                "startTimeMs": abs_start_ms,
                "endTimeMs": abs_end_ms,
                "speakerRole": s.get("speakerRole", "OUTRO"),
                "speakerName": s.get("speakerName", "Interlocutor"),
                "text": text,
                "confidence": float(s.get("confidence", s.get("confidenceScore", 0.98))),
                "isKeyStatement": bool(s.get("isKeyStatement", False)),
                "topicTag": str(s.get("topicTag") or "Audiência").strip(),
            })

        valid_segs = [seg for seg in normalized if seg["text"]]
        if not valid_segs:
            return []

        # 5. Detect acoustic speech/silence intervals via ffmpeg silencedetect and anchor segments
        abs_speech = []
        abs_silence = []
        if speech_intervals:
            for sp_s, sp_e in speech_intervals:
                # If speech_intervals were provided in clip-relative [0, clip_dur_ms], shift by clip_start_ms
                offset = clip_start_ms if (clip_start_ms > 0 and max((e for _, e in speech_intervals), default=0) <= clip_dur_ms + 1000) else 0
                s_abs = max(core_start_ms, sp_s + offset)
                e_abs = min(core_end_ms, sp_e + offset)
                if e_abs - s_abs >= 120:
                    abs_speech.append((s_abs, e_abs))
            abs_silence = self._derive_silence_intervals_from_speech(abs_speech, core_start_ms, core_end_ms)
        elif media_bytes_or_path:
            clip_sp, clip_sil = self._detect_speech_and_silence_intervals_ms(
                media_bytes_or_path,
                clip_dur_ms,
                clip_start_sec=float(part.get("clipStartSeconds", 0.0)),
            )
            for sp_s, sp_e in clip_sp:
                s_abs = max(core_start_ms, clip_start_ms + sp_s)
                e_abs = min(core_end_ms, clip_start_ms + sp_e)
                if e_abs - s_abs >= 120:
                    abs_speech.append((s_abs, e_abs))
            for sil_s, sil_e in clip_sil:
                s_abs = max(core_start_ms, clip_start_ms + sil_s)
                e_abs = min(core_end_ms, clip_start_ms + sil_e)
                if e_abs - s_abs >= 300:
                    abs_silence.append((s_abs, e_abs))

        try:
            from db import _repair_and_normalize_block_segments
            valid_segs = _repair_and_normalize_block_segments(
                valid_segs,
                core_start_ms,
                core_end_ms,
                speech_intervals=abs_speech,
            )
        except Exception:
            pass

        if abs_speech:
            valid_segs = self._snap_segments_to_speech_intervals(
                valid_segs,
                abs_speech,
                abs_silence,
                min_ms=core_start_ms,
                max_ms=core_end_ms,
            )

        cues = self._split_into_subtitle_cues(
            valid_segs,
            total_duration_ms,
            speech_intervals=abs_speech,
            silence_intervals=abs_silence,
        )

        if media_bytes_or_path:
            cues = self.align_segments_viterbi_acoustic(
                cues,
                media_bytes_or_path=media_bytes_or_path,
                core_start_ms=core_start_ms,
                core_end_ms=core_end_ms,
                clip_start_sec=float(part.get("clipStartSeconds", 0.0)),
                sub_offset_sec=padding_ms / 1000.0,
            )
        elif abs_speech:
            cues = self._snap_segments_to_speech_intervals(
                cues,
                abs_speech,
                abs_silence,
                min_ms=core_start_ms,
                max_ms=core_end_ms,
            )

        try:
            from db import _repair_and_normalize_block_segments
            cues = _repair_and_normalize_block_segments(
                cues,
                core_start_ms,
                core_end_ms,
                speech_intervals=abs_speech,
            )
        except Exception:
            pass

        return cues

    @staticmethod
    def _clean_json_text(raw_text: str) -> str:
        t = (raw_text or "").strip()
        if t.startswith("```"):
            nl = t.find("\n")
            if nl > 0:
                t = t[nl + 1:]
            if t.endswith("```"):
                t = t[:-3]
        return t.strip()

    def _transcribe_single_part(
        self,
        sa_key: str,
        url: str,
        case_number: str,
        filename: str,
        part: dict,
        media_mime: str,
        media_bytes: bytes,
        prev_5min_segments: list,
        known_participants: list,
        detected_hearing_type: str,
        hearing_id: str = "",
    ) -> dict:
        b_idx = part["blockIndex"]
        num_parts = part["totalParts"]
        clip_dur_mmss = self._format_hms(int(round(part["clipDurationSeconds"] * 1000)))
        padding_mmss = self._format_hms(int(round(part["paddingSeconds"] * 1000)))
        core_start_hms = self._format_hms(int(round(part["coreStartSeconds"] * 1000)))
        core_end_hms = self._format_hms(int(round(part["coreEndSeconds"] * 1000)))
        clip_start_hms = self._format_hms(int(round(part["clipStartSeconds"] * 1000)))

        context_section = ""
        if b_idx > 1:
            prev_lines = []
            for ps in prev_5min_segments:
                st_f = self._format_hms(ps["startTimeMs"])
                et_f = self._format_hms(ps["endTimeMs"])
                prev_lines.append(f"[{st_f} - {et_f}] {ps['speakerRole']} ({ps['speakerName']}): {ps['text']}")
            prev_transcript_str = "\n".join(prev_lines) if prev_lines else "(Sem falas registradas nos últimos 5 minutos da parte anterior)"

            part_list_str = ", ".join(
                f"{p['name']} ({p['role']})" for p in known_participants
            ) if known_participants else "Identificar conforme áudio/vídeo"

            context_section = f"""
        === CONTEXTO DE CONTINUIDADE DA PARTE ANTERIOR (PARTE {b_idx - 1}/{num_parts}) ===
        1. PADDING DE MÍDIA (2 MINUTOS FINAIS DA PARTE {b_idx - 1}):
           - Este clipe de mídia inicia em {clip_start_hms} do vídeo completo e possui duração total de {clip_dur_mmss}.
           - Os primeiros {padding_mmss} deste clipe (de 00:00 até {padding_mmss}) correspondem aos 2 minutos finais da Parte {b_idx - 1} ({clip_start_hms} até {core_start_hms}), incluídos para que você mantenha total contexto acústico e semântico na transição entre partes.
           - O trecho INÉDITO desta Parte {b_idx}/{num_parts} começa exatamente em {padding_mmss} deste clipe (que corresponde a {core_start_hms} da gravação original) e vai até {clip_dur_mmss} ({core_end_hms} da gravação original).
        2. PARTICIPANTES JÁ IDENTIFICADOS NAS PARTES ANTERIORES (mantenha exatamente a mesma grafia em `speakerName` e `speakerRole`):
           {part_list_str}
        3. TRANSCRIÇÃO DOS ÚLTIMOS 5 MINUTOS DA PARTE {b_idx - 1} (para continuidade de contexto do que estava sendo falado):
{prev_transcript_str}
        ====================================================================
            """

        user_parts = []
        if media_bytes:
            user_parts.append({
                "text": (
                    f"=== MÍDIA DA PARTE {b_idx}/{num_parts} ({part['title']}) | "
                    f"Duração do clipe: 00:00 até {clip_dur_mmss} "
                    f"(Padding inicial: 00:00 a {padding_mmss}; Trecho inédito da Parte {b_idx}: {padding_mmss} a {clip_dur_mmss}) ==="
                )
            })
            user_parts.append({
                "inlineData": {
                    "mimeType": media_mime,
                    "data": base64.b64encode(media_bytes).decode("ascii"),
                }
            })

        target_range_instruction = (
            f"de `{padding_mmss}` até `{clip_dur_mmss}` deste clipe (não repita as falas do padding inicial `00:00`–`{padding_mmss}` que já constam na transcrição da Parte {b_idx - 1} acima)"
            if b_idx > 1 and part["paddingSeconds"] > 0
            else f"de `00:00` até `{clip_dur_mmss}` deste clipe"
        )

        from db import render_transcription_prompt, mark_part_retrying_429

        rendered_prompt = render_transcription_prompt(
            {
                "case_number": case_number,
                "media_filename": filename,
                "block_index": b_idx,
                "total_parts": num_parts,
                "core_start_hms": core_start_hms,
                "core_end_hms": core_end_hms,
                "padding_mmss": padding_mmss,
                "clip_dur_mmss": clip_dur_mmss,
                "target_range_instruction": target_range_instruction,
                "context_section": context_section,
                "detected_hearing_type": detected_hearing_type or "INSTRUCAO_E_JULGAMENTO",
            }
        )

        prompt_instruction = rendered_prompt["renderedUserPrompt"]
        system_instruction_text = rendered_prompt.get("renderedSystemInstruction") or ""
        prompt_ver_label = (
            f"{rendered_prompt.get('code', 'PROMPT_AUDIO_VIDEO_TRANSCRIPTION')} "
            f"v{int(rendered_prompt.get('version', 3))} (OPT_V1_DIARIZATION_SURGICAL)"
        )
        user_parts.append({"text": prompt_instruction})

        payload = {
            "contents": [{"role": "user", "parts": user_parts}],
            "generationConfig": {
                "temperature": float(rendered_prompt.get("defaultTemperature", 0.0)),
                "maxOutputTokens": max(16384, int(rendered_prompt.get("defaultMaxTokens", 32768))),
                "responseMimeType": "application/json",
            },
        }
        if system_instruction_text:
            payload["systemInstruction"] = {"parts": [{"text": system_instruction_text}]}

        # Anti-429 (RESOURCE_EXHAUSTED) strategy: up to 8 attempts with Truncated Exponential Backoff + Full Jitter
        # and automatic GA model fallback (gemini-3.8-flash -> gemini-3.7-flash -> gemini-2.5-flash) on persistent 429s.
        max_attempts = 8
        fallback_models = [self.model, "gemini-3.7-flash", "gemini-2.5-flash"]
        last_exc = None
        had_rate_limit = False

        for attempt in range(1, max_attempts + 1):
            if attempt <= 4 or not had_rate_limit:
                active_model = fallback_models[0]
            elif attempt <= 6:
                active_model = fallback_models[1]
            else:
                active_model = fallback_models[2]

            active_url = (
                f"https://aiplatform.googleapis.com/v1/projects/{self._project_id}"
                f"/locations/global/publishers/google/models/{active_model}:generateContent"
                if "/models/" in url
                else url
            )

            try:
                token = self._get_vertex_access_token(sa_key)
                resp = requests.post(
                    active_url,
                    headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
                    json=payload,
                    timeout=240,
                )
                if resp.status_code == 429 or resp.status_code in (500, 502, 503, 504):
                    had_rate_limit = had_rate_limit or (resp.status_code == 429)
                    retry_after_hdr = resp.headers.get("Retry-After")
                    try:
                        wait_sec = float(retry_after_hdr) + random.uniform(0.5, 2.5) if retry_after_hdr else 0.0
                    except ValueError:
                        wait_sec = 0.0
                    if wait_sec <= 0.0:
                        wait_sec = min(90.0, (2 ** attempt) * 3.0) + random.uniform(0.5, 3.5)
                    logger.warning(
                        f"[Anti-429] Part {b_idx}/{num_parts} of '{filename}' received HTTP {resp.status_code} on {active_model} "
                        f"(attempt {attempt}/{max_attempts}). Backing off {wait_sec:.1f}s with jitter..."
                    )
                    if hearing_id:
                        mark_part_retrying_429(hearing_id, b_idx, attempt, max_attempts, wait_sec, active_model)
                    last_exc = RuntimeError(f"HTTP {resp.status_code}: {resp.text[:240]}")
                    time.sleep(wait_sec)
                    continue

                resp.raise_for_status()
                data = resp.json()
                parts_resp = data["candidates"][0]["content"]["parts"]
                raw_text = "".join(p.get("text", "") for p in parts_resp if not p.get("thought"))
                parsed = json.loads(self._clean_json_text(raw_text))
                if isinstance(parsed, dict):
                    parsed["_promptVersion"] = prompt_ver_label
                    parsed["_pipelineVersion"] = f"v3.2-VAD-SYNC ({active_model})"
                return parsed
            except Exception as e:
                last_exc = e
                err_str = str(e).upper()
                is_429 = any(k in err_str for k in ("429", "RESOURCE_EXHAUSTED", "QUOTA", "RATE_LIMIT", "TOO MANY REQUESTS"))
                if is_429:
                    had_rate_limit = True
                    wait_sec = min(90.0, (2 ** attempt) * 3.0) + random.uniform(0.5, 3.5)
                    if hearing_id:
                        mark_part_retrying_429(hearing_id, b_idx, attempt, max_attempts, wait_sec, active_model)
                else:
                    wait_sec = min(30.0, 2.5 * attempt + random.uniform(0.5, 2.0))
                logger.warning(
                    f"Part {b_idx}/{num_parts} of '{filename}' attempt {attempt}/{max_attempts} ({active_model}) failed: {e}. "
                    f"Waiting {wait_sec:.1f}s..."
                )
                time.sleep(wait_sec)

        raise RuntimeError(f"Failed to transcribe Part {b_idx}/{num_parts} of '{filename}' after {max_attempts} attempts: {last_exc}") from last_exc

    def _call_vertex_gemini_api(
        self,
        sa_key: str,
        case_number: str,
        media_type: str,
        filename: str,
        hearing_id: str = "",
        on_part_progress=None,
        force_reprocess: bool = False,
    ) -> dict:
        self._get_vertex_access_token(sa_key)
        url = (
            f"https://aiplatform.googleapis.com/v1/projects/{self._project_id}"
            f"/locations/global/publishers/google/models/{self.model}:generateContent"
        )

        default_dur_sec = 180.0
        if hearing_id:
            try:
                from db import get_hearing_duration_ms
                default_dur_sec = max(5.0, get_hearing_duration_ms(hearing_id) / 1000.0)
            except Exception:
                pass

        media_path = self._locate_media_file(filename)
        total_dur_sec = self._probe_duration_seconds(media_path, default_dur_sec)
        total_dur_ms = max(5000, int(round(total_dur_sec * 1000)))

        parts = self._compute_balanced_parts(total_dur_sec)
        num_parts = len(parts)
        logger.info(
            f"Video '{filename}' (total={total_dur_sec:.1f}s = {self._format_hms(total_dur_ms)}) split into "
            f"{num_parts} balanced sequential part(s) (~{total_dur_sec / num_parts / 60.0:.2f} min each, "
            f"with {int(MEDIA_PADDING_SECONDS)}s media padding & {int(PREV_TRANSCRIPT_CONTEXT_SECONDS)}s transcript context)."
        )

        all_segments = []
        blocks_out = []
        participants_by_key = {}
        detected_hearing_type = None
        detected_language = "pt-BR"
        conf_scores = []

        completed_part_indices = set()
        if hearing_id:
            try:
                from db import get_existing_progress, initialize_hearing_parts, reset_hearing_for_reprocessing
                if force_reprocess:
                    reset_hearing_for_reprocessing(hearing_id)
                initialize_hearing_parts(hearing_id, parts)
                existing = get_existing_progress(hearing_id)
                ex_blocks = existing.get("blocks") or []
                ex_segs = existing.get("segments") or []
                if not force_reprocess and len(ex_blocks) >= num_parts and ex_segs:
                    logger.info(
                        f"Hearing '{filename}' [{hearing_id}] already has all {len(ex_blocks)}/{num_parts} "
                        f"parts COMPLETED ({len(ex_segs)} segments) and force_reprocess=False; preserving existing transcript."
                    )
                    return {
                        "language": detected_language,
                        "averageConfidence": 0.98,
                        "engineUsed": "GEMINI-3.8-FLASH-PIPELINE",
                        "hearingType": detected_hearing_type,
                        "durationSeconds": round(total_dur_sec, 2),
                        "durationMs": total_dur_ms,
                        "participants": existing.get("participants") or [],
                        "segments": list(ex_segs),
                        "blocks": list(ex_blocks),
                    }
                if 0 < len(ex_blocks) < num_parts and ex_segs:
                    parts_by_idx = {int(p["blockIndex"]): p for p in parts}
                    blocks_out = []
                    for eb in ex_blocks:
                        bi = int(eb["blockIndex"])
                        p_ref = parts_by_idx.get(bi)
                        if p_ref:
                            eb["startTimeMs"] = int(round(p_ref["coreStartSeconds"] * 1000))
                            eb["endTimeMs"] = int(round(p_ref["coreEndSeconds"] * 1000))
                            eb["startTimeFormatted"] = self._format_hms(eb["startTimeMs"])
                            eb["endTimeFormatted"] = self._format_hms(eb["endTimeMs"])
                        blocks_out.append(eb)

                    all_segments = list(ex_segs)
                    completed_part_indices = {int(b["blockIndex"]) for b in blocks_out}
                    for p in existing.get("participants") or []:
                        p_name = str(p.get("name") or "").strip()
                        p_role = str(p.get("role") or "OUTRO").strip().upper()
                        if p_name:
                            participants_by_key[p_name.lower()] = {"name": p_name, "role": p_role}
                    logger.info(
                        f"Resuming '{filename}' [{hearing_id}] from Part {len(blocks_out) + 1}/{num_parts} "
                        f"({len(blocks_out)} part(s) and {len(all_segments)} segments already saved)."
                    )
            except Exception as resume_err:
                logger.warning(f"Could not resume existing progress for {hearing_id}: {resume_err}")

        for part in parts:
            part_t0 = time.time()
            b_idx = part["blockIndex"]
            if b_idx in completed_part_indices:
                continue
            core_start_sec = part["coreStartSeconds"]
            core_end_sec = part["coreEndSeconds"]

            # Collect last 5 minutes (300 seconds) of transcript from previous part(s)
            ctx_start_ms = max(0, int(round((core_start_sec - PREV_TRANSCRIPT_CONTEXT_SECONDS) * 1000)))
            ctx_end_ms = int(round(core_start_sec * 1000))
            prev_5min_segments = [
                s for s in all_segments
                if s["endTimeMs"] > ctx_start_ms and s["startTimeMs"] <= ctx_end_ms
            ]

            if hearing_id:
                try:
                    from db import mark_part_processing
                    mark_part_processing(
                        hearing_id,
                        b_idx,
                        padding_seconds=int(round(part.get("paddingSeconds", 0))),
                        context_segments_count=len(prev_5min_segments),
                    )
                except Exception:
                    pass

            media_mime, media_bytes = self._extract_part_media_bytes(media_path, part, hearing_id)
            logger.info(
                f"[Part {b_idx}/{num_parts}] Submitting '{filename}' "
                f"(clip={self._format_hms(int(part['clipStartSeconds'] * 1000))}–{self._format_hms(int(part['clipEndSeconds'] * 1000))}, "
                f"padding={int(part['paddingSeconds'])}s, core={self._format_hms(int(core_start_sec * 1000))}–{self._format_hms(int(core_end_sec * 1000))}, "
                f"prev_5min_ctx={len(prev_5min_segments)} segs, bytes={len(media_bytes)}) to Vertex AI {self.model}..."
            )

            try:
                parsed_part = self._transcribe_single_part(
                    sa_key=sa_key,
                    url=url,
                    case_number=case_number,
                    filename=filename,
                    part=part,
                    media_mime=media_mime,
                    media_bytes=media_bytes,
                    prev_5min_segments=prev_5min_segments,
                    known_participants=list(participants_by_key.values()),
                    detected_hearing_type=detected_hearing_type,
                    hearing_id=hearing_id,
                )
            except Exception as part_err:
                if hearing_id:
                    try:
                        from db import mark_part_failed
                        mark_part_failed(hearing_id, b_idx, str(part_err))
                    except Exception:
                        pass
                raise

            if parsed_part.get("language"):
                detected_language = parsed_part["language"]
            if parsed_part.get("averageConfidence"):
                conf_scores.append(float(parsed_part["averageConfidence"]))
            if parsed_part.get("hearingType") and not detected_hearing_type:
                detected_hearing_type = str(parsed_part["hearingType"]).strip().upper()

            for p in parsed_part.get("participants") or []:
                p_name = str(p.get("name") or "").strip()
                p_role = str(p.get("role") or "OUTRO").strip().upper()
                if p_name and p_name.lower() not in ("interlocutor", "participante", "orador"):
                    key = p_name.lower()
                    if key not in participants_by_key:
                        participants_by_key[key] = {"name": p_name, "role": p_role}

            raw_segs = list(parsed_part.get("segments") or [])
            norm_segs = self._normalize_part_segments(
                raw_segs,
                part,
                total_dur_ms,
                media_bytes_or_path=media_bytes or media_path,
            )
            for ns in norm_segs:
                ns["segmentIndex"] = len(all_segments) + 1
                all_segments.append(ns)
                s_name = ns["speakerName"].strip()
                s_role = ns["speakerRole"].strip().upper()
                if s_name and s_name.lower() not in ("interlocutor", "participante", "orador"):
                    if s_name.lower() not in participants_by_key:
                        participants_by_key[s_name.lower()] = {"name": s_name, "role": s_role}

            b_start_ms = int(round(core_start_sec * 1000))
            b_end_ms = int(round(core_end_sec * 1000))
            block_title = str(parsed_part.get("blockTitle") or part["title"]).strip()
            block_summary = str(
                parsed_part.get("blockSummary")
                or f"{block_title} ({self._format_hms(b_start_ms)} - {self._format_hms(b_end_ms)})."
            ).strip()

            part_processing_ms = max(1000, int(round((time.time() - part_t0) * 1000)))
            blocks_out.append({
                "blockIndex": b_idx,
                "title": block_title,
                "startTimeMs": b_start_ms,
                "endTimeMs": b_end_ms,
                "startTimeFormatted": self._format_hms(b_start_ms),
                "endTimeFormatted": self._format_hms(b_end_ms),
                "estimatedTokens": 256000,
                "segmentCount": len(norm_segs),
                "summary": block_summary,
                "processingDurationMs": part_processing_ms,
                "paddingSeconds": int(round(part.get("paddingSeconds", 0))),
                "contextSegmentsCount": len(prev_5min_segments),
                "promptVersion": parsed_part.get("_promptVersion") or "PROMPT_AUDIO_VIDEO_TRANSCRIPTION v3 (OPT_V1_DIARIZATION_SURGICAL)",
                "pipelineVersion": parsed_part.get("_pipelineVersion") or f"v3.2-VAD-SYNC ({self.model})",
                "status": "COMPLETED",
            })

            avg_conf_now = sum(conf_scores) / len(conf_scores) if conf_scores else 0.98
            partial_result = {
                "language": detected_language,
                "averageConfidence": round(avg_conf_now, 4),
                "engineUsed": "GEMINI-3.8-FLASH-PIPELINE",
                "hearingType": detected_hearing_type,
                "durationSeconds": round(total_dur_sec, 2),
                "durationMs": total_dur_ms,
                "participants": list(participants_by_key.values()),
                "segments": list(all_segments),
                "blocks": list(blocks_out),
            }

            if callable(on_part_progress):
                try:
                    on_part_progress(partial_result, b_idx, num_parts)
                except Exception as cb_err:
                    logger.warning(f"on_part_progress callback error at part {b_idx}/{num_parts}: {cb_err}")

        avg_conf = sum(conf_scores) / len(conf_scores) if conf_scores else 0.98
        return {
            "language": detected_language,
            "averageConfidence": round(avg_conf, 4),
            "engineUsed": "GEMINI-3.8-FLASH-PIPELINE",
            "hearingType": detected_hearing_type,
            "durationSeconds": round(total_dur_sec, 2),
            "durationMs": total_dur_ms,
            "participants": list(participants_by_key.values()),
            "segments": all_segments,
            "blocks": blocks_out,
        }

    def _call_gemini_api(self, case_number: str, media_type: str, filename: str) -> dict:
        from db import render_transcription_prompt

        rendered_prompt = render_transcription_prompt(
            {
                "case_number": case_number,
                "media_filename": filename,
                "block_index": 1,
                "total_parts": 1,
                "core_start_hms": "00:00",
                "core_end_hms": "10:00",
                "padding_mmss": "00:00",
                "clip_dur_mmss": "10:00",
                "target_range_instruction": "de `00:00` até `10:00` deste clipe",
                "context_section": "",
                "detected_hearing_type": "INSTRUCAO_E_JULGAMENTO",
            }
        )
        prompt_instruction = rendered_prompt["renderedUserPrompt"]
        system_instruction_text = rendered_prompt.get("renderedSystemInstruction") or ""

        url = f"{self.api_url}/models/{self.model}:generateContent?key={self.api_key}"
        payload = {
            "contents": [{"parts": [{"text": prompt_instruction}]}],
            "generationConfig": {
                "temperature": float(rendered_prompt.get("defaultTemperature", 0.0)),
                "maxOutputTokens": max(16384, int(rendered_prompt.get("defaultMaxTokens", 32768))),
                "responseMimeType": "application/json",
            },
        }
        if system_instruction_text:
            payload["systemInstruction"] = {"parts": [{"text": system_instruction_text}]}

        resp = requests.post(url, json=payload, timeout=60)
        if resp.status_code == 200:
            data = resp.json()
            raw_text = data["candidates"][0]["content"]["parts"][0]["text"]
            return json.loads(raw_text)

        raise RuntimeError(f"Gemini API returned HTTP {resp.status_code}: {resp.text}")


def _detect_speech_intervals_ms(
    media_bytes_or_path,
    clip_dur_ms: int,
    noise_db: int = -35,
    min_silence_sec: float = 0.35,
    clip_start_sec: float = 0.0,
) -> list:
    return GeminiMultimodalClient._detect_speech_intervals_ms(
        media_bytes_or_path,
        clip_dur_ms,
        noise_db=noise_db,
        min_silence_sec=min_silence_sec,
        clip_start_sec=clip_start_sec,
    )
