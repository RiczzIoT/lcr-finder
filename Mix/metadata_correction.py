import os
import musicbrainzngs
import mutagen
from mutagen.easyid3 import EasyID3
from mutagen.id3 import ID3NoHeaderError
import time

# --- CONFIGURATION ---
MUSIC_FOLDER = r"C:\Users\ricar\Music\Apple Music\Media\Apple Music\Cup of Joe\Multo - Single" 
musicbrainzngs.set_useragent("LRC-Finder-Pro-Tagger", "0.1", "https://github.com/RiczzIoT")

def get_current_tags(filepath):
    """Babasahin ang kasalukuyang Artist at Title tags mula sa isang music file."""
    try:
        audio = EasyID3(filepath)
        artist = audio.get('artist', [None])[0]
        title = audio.get('title', [None])[0]
        return artist, title
    except (ID3NoHeaderError, Exception):
        print(f"  [WARN] Hindi mabasa ang tags para sa {os.path.basename(filepath)}")
        return None, None

def update_tags_and_rename(filepath, new_artist, new_title):
    """I-a-update ang tags ng file at ire-rename ito."""
    try:
        audio = EasyID3(filepath)
        
        print(f"  [UPDATE] Old Artist: {audio.get('artist', ['N/A'])[0]} -> New: {new_artist}")
        print(f"  [UPDATE] Old Title: {audio.get('title', ['N/A'])[0]} -> New: {new_title}")
        
        audio['artist'] = new_artist
        audio['title'] = new_title
        audio.save()

        directory = os.path.dirname(filepath)
        _, file_ext = os.path.splitext(os.path.basename(filepath))
        
        sane_artist = "".join(i for i in new_artist if i not in r'\/:*?"<>|')
        sane_title = "".join(i for i in new_title if i not in r'\/:*?"<>|')
        
        new_filename = f"{sane_title} - {sane_artist}{file_ext}"
        new_filepath = os.path.join(directory, new_filename)

        if filepath.lower() != new_filepath.lower():
            if os.path.exists(new_filepath):
                print(f"  [SKIP RENAME] May file nang nagngangalang '{new_filename}'.")
                return
            os.rename(filepath, new_filepath)
            print(f"  [RENAMED] -> {new_filename}")
        else:
            print("  [INFO] Tamang filename na, tags lang ang in-update.")

    except Exception as e:
        print(f"  [ERROR] Hindi ma-update ang file: {e}")


def correct_music_metadata():
    """Pangunahing function para i-scan at ayusin ang music files."""
    print(f"--- Metadata Corrector (with M4P Skip) ---")
    print(f"Scanning folder: {MUSIC_FOLDER}")
    
    for filename in os.listdir(MUSIC_FOLDER):
        # --- UPDATED LOGIC: Check for .m4p first ---
        if filename.lower().endswith('.m4p'):
            print(f"\n[SKIP] Skipping '{filename}': Protected Apple Music file (.m4p) cannot be processed due to DRM.")
            continue

        # Process only supported, non-protected files
        if not filename.lower().endswith(('.mp3', '.flac', '.m4a')):
            continue

        filepath = os.path.join(MUSIC_FOLDER, filename)
        print(f"\n[PROC] Processing: {filename}")

        current_artist, current_title = get_current_tags(filepath)

        if not current_artist or not current_title:
            continue

        try:
            result = musicbrainzngs.search_recordings(
                query=current_title,
                limit=10
            )
            
            best_match = None
            
            if result['recording-list']:
                for recording in result['recording-list']:
                    if 'artist-credit' in recording and recording['artist-credit']:
                        found_artist_name = recording['artist-credit'][0]['name']
                        
                        if found_artist_name.lower() == current_artist.lower():
                            best_match = recording
                            print(f"  [INFO] Found exact artist match: {found_artist_name}")
                            break

                if not best_match and int(result['recording-list'][0]['ext:score']) > 95:
                    best_match = result['recording-list'][0]
                    print(f"  [INFO] No exact artist match, taking best score > 95%.")

            if best_match:
                correct_title = best_match['title']
                correct_artist = best_match['artist-credit'][0]['name']

                if correct_artist.lower() != current_artist.lower() or correct_title.lower() != current_title.lower():
                    print(f"  [FOUND] May mas tamang data para sa '{current_title}'")
                    update_tags_and_rename(filepath, correct_artist, correct_title)
                else:
                    print("  [OK] ✓ Tamang metadata na.")
            else:
                print("  [SKIP] Walang high-confidence match na nahanap sa MusicBrainz.")

        except musicbrainzngs.WebServiceError as exc:
            print(f"  [ERROR] Hindi maka-connect sa MusicBrainz: {exc}. Naghihintay ng 10 segundo...")
            time.sleep(10)
        except Exception as e:
            print(f"  [ERROR] May naganap na error: {e}")


if __name__ == "__main__":
    correct_music_metadata()
