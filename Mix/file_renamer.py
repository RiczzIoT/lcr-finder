import os
import re
from mutagen.easyid3 import EasyID3
from mutagen.flac import FLAC
from mutagen.mp4 import MP4

# ===> DITO MO ILALAGAY ANG FOLDER NG MUSIC MO <===
MUSIC_FOLDER = r"C:\Users\ricar\Music\Music byclick\OPM Rock Bands Playlist wlyrics" # Palitan mo ito ng tamang path

def get_tags(filepath):
    # ... Walang pagbabago dito ...
    try:
        artist = None
        title = None
        if filepath.lower().endswith('.mp3'):
            audio = EasyID3(filepath)
            artist = audio.get('artist', [None])[0] or \
                     audio.get('performer', [None])[0] or \
                     audio.get('albumartist', [None])[0]
            title = audio.get('title', [None])[0]
        elif filepath.lower().endswith('.flac'):
            audio = FLAC(filepath)
            artist = audio.get('artist', [None])[0] or audio.get('albumartist', [None])[0]
            title = audio.get('title', [None])[0]
        elif filepath.lower().endswith(('.m4a', '.mp4')):
            audio = MP4(filepath)
            artist = audio.get('\xa9ART', [None])[0] or audio.get('aART', [None])[0]
            title = audio.get('\xa9nam', [None])[0]
        return artist, title
    except Exception:
        return None, None

def ultimate_clean(text):
    """
    Ang pinaka-agresibong cleaning function. (Pamatay-Peste Version)
    """
    if not text:
        return ''

    cleaned = text

    # Step 1: Alisin ang brackets at parentheses (kasama na ang Unicode look-alikes)
    cleaned = re.sub(r'[\[［【].*?[\]］】]', '', cleaned).strip()
    cleaned = re.sub(r'[\(（].*?[\)）]', '', cleaned).strip()
    cleaned = re.sub(r'[\{｛].*?[\}｝]', '', cleaned).strip()

    # Step 2: Alisin ang mga patterns tulad ng "feat." etc.
    cleaned = re.sub(r'\s+(ft|feat|featuring)\.?\s+.*', '', cleaned, flags=re.IGNORECASE)

    # ===> ITO ANG BAGONG UPGRADE! <===
    # Step 3: Agresibong pagtanggal ng junk words na may kasamang special characters
    junk_words = [
        'official', 'music', 'video', 'audio', 'lyric', 'lyrics', 'hd', 'hq', 
        'live', 'remastered', 'explicit', 'original', 'visualizer', 'soundtrack',
        'acoustic', 'remix', 'promo', 'en vivo', 'vivo', 'listening',
        'theme song', 'color coded', 'on screen', 'sub', 'español', 'ingles',
        'download', 'link', 'included', 'quality', 'with', 'full', 'album',
    ]
    # Ang pattern na ito ay hahanapin ang junk word na posibleng may -, _, o space sa paligid
    for word in junk_words:
        # Pattern: (optional space)(optional - or _)(optional space)JUNK_WORD(optional space)(optional - or _)(optional space)
        pattern = r'(\s*[-_]?\s*)' + re.escape(word) + r'(\s*[-_]?\s*)'
        cleaned = re.sub(pattern, ' ', cleaned, flags=re.IGNORECASE)

    # Step 4: Alisin ang mga natitirang symbols at emojis
    cleaned = re.sub(r'//|\\/|\|', '', cleaned)
    emoji_pattern = re.compile(
        "["
        u"\U0001F600-\U0001F64F" u"\U0001F300-\U0001F5FF" u"\U0001F680-\U0001F6FF"
        u"\U0001F1E0-\U0001F1FF" u"\U00002702-\U000027B0" u"\U000024C2-\U0001F251"
        "]+", 
        flags=re.UNICODE
    )
    cleaned = emoji_pattern.sub(r'', cleaned)
    cleaned = re.sub(r'[^\w\s-]', '', cleaned, flags=re.UNICODE)

    # Step 5: Final cleanup para sa whitespace at hyphens
    cleaned = re.sub(r'\s*-\s*', ' - ', cleaned) 
    cleaned = re.sub(r'\s+', ' ', cleaned).strip()
    cleaned = cleaned.strip('-').strip()

    return cleaned

def sanitize_for_filename(name):
    """Final check para sa mga bawal na character sa filename."""
    return re.sub(r'[\\/:*?"<>|]', '_', name)

# --- MAIN SCRIPT ---
if __name__ == "__main__":
    if not os.path.isdir(MUSIC_FOLDER):
        print(f"[ERROR] Hindi mahanap ang folder: '{MUSIC_FOLDER}'")
        print("Pakipalitan ang value ng MUSIC_FOLDER sa script.")
    else:
        print(f"Starting FINAL File Renamer (Pamatay-Peste Version) for folder: {MUSIC_FOLDER}")
        print("--- WARNING: This will permanently rename files! Test on a copy first! ---")
        renamed_count = 0
        skipped_count = 0

        # ... (Walang pagbabago sa main loop, kopyahin lang mula sa huling version) ...
        for current_filename in os.listdir(MUSIC_FOLDER):
            try:
                filename_base, file_ext = os.path.splitext(current_filename)
                file_ext = file_ext.lower()
            except: continue
            if file_ext not in ['.mp3', '.flac', '.m4a', '.mp4']: continue
            print(f"\n[PROC] Processing: {current_filename}")
            old_filepath = os.path.join(MUSIC_FOLDER, current_filename)
            artist, title = get_tags(old_filepath)
            if not artist or not title:
                print("  [INFO] Walang tags. Susubukang i-parse ang filename...")
                parts = filename_base.split(' - ')
                if len(parts) >= 2:
                    potential_artist = parts[0]
                    potential_title = " - ".join(parts[1:])
                    if potential_artist.count('x') + potential_artist.count('&') >= potential_title.count('x') + potential_title.count('&'):
                        artist = potential_artist
                        title = potential_title
                    else:
                        artist = potential_title
                        title = potential_artist
                    print(f"    [GUESS] Artist: '{artist}', Title: '{title}'")
                else:
                    print("  [SKIP] Hindi ma-parse ang filename. Walang ' - ' separator.")
                    skipped_count += 1
                    continue
            clean_artist = ultimate_clean(artist)
            clean_title = ultimate_clean(title)
            if not clean_title or not clean_artist:
                print("  [SKIP] Naging blangko ang Title o Artist pagkatapos maglinis.")
                skipped_count += 1
                continue
            sane_artist = sanitize_for_filename(clean_artist)
            sane_title = sanitize_for_filename(clean_title)
            new_filename = f"{sane_title} - {sane_artist}{file_ext}"
            new_filepath = os.path.join(MUSIC_FOLDER, new_filename)
            if old_filepath.lower() == new_filepath.lower():
                print("  [SKIP] ✓ Tamang format na.")
                skipped_count += 1
                continue
            if os.path.exists(new_filepath):
                print(f"  [SKIP] ✗ May file nang nagngangalang '{new_filename}'.")
                skipped_count += 1
                continue
            try:
                os.rename(old_filepath, new_filepath)
                print(f"  [DONE] -> Renamed to: {new_filename}")
                renamed_count += 1
            except OSError as e:
                print(f"  [ERROR] Hindi ma-rename ang file: {e}")
                skipped_count += 1
        print(f"\nProseso Kumpleto! {renamed_count} files na-rename, {skipped_count} files na-skip.")