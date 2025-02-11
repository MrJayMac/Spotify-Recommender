import os
import spotipy
import pandas as pd
from spotipy.oauth2 import SpotifyClientCredentials
from dotenv import load_dotenv

load_dotenv()

# Fetch Spotify API Credentials (Matching Your .env File)
SPOTIPY_CLIENT_ID = os.getenv("SPOTIFY_CLIENT_ID")  # Changed to match your .env file
SPOTIPY_CLIENT_SECRET = os.getenv("SPOTIFY_CLIENT_SECRET")  # Changed to match your .env file

if not SPOTIPY_CLIENT_ID or not SPOTIPY_CLIENT_SECRET:
    raise ValueError("Missing Spotify API credentials. Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET in .env")

sp = spotipy.Spotify(client_credentials_manager=SpotifyClientCredentials(
    client_id=SPOTIPY_CLIENT_ID,
    client_secret=SPOTIPY_CLIENT_SECRET
))

# Function to fetch top tracks from Spotify Charts
def get_top_tracks():
    playlists = [
        "37i9dQZEVXbMDoHDwVN2tF",  # Global Top 50
        "37i9dQZF1DX0XUsuxWHRQd",  # Viral 50 Global
        "37i9dQZF1DXcBWIGoYBM5M",  # Today's Top Hits
    ]
    
    songs = []
    for playlist_id in playlists:
        results = sp.playlist_tracks(playlist_id, limit=100)
        for track in results["items"]:
            track_info = track["track"]
            songs.append({
                "song_id": track_info["id"],
                "song_name": track_info["name"],
                "artist": track_info["artists"][0]["name"],
                "album": track_info["album"]["name"],
                "popularity": track_info["popularity"],
                "explicit": track_info["explicit"]
            })
    
    return songs

# Function to fetch new releases
def get_new_releases():
    results = sp.new_releases(limit=50)
    songs = []
    for album in results["albums"]["items"]:
        album_id = album["id"]
        album_tracks = sp.album_tracks(album_id)
        for track in album_tracks["items"]:
            songs.append({
                "song_id": track["id"],
                "song_name": track["name"],
                "artist": album["artists"][0]["name"],
                "album": album["name"],
                "popularity": sp.track(track["id"])["popularity"],
                "explicit": track["explicit"]
            })
    return songs

# Fetch data
top_tracks = get_top_tracks()
new_releases = get_new_releases()

# Combine all songs
all_songs = top_tracks + new_releases

# Save to CSV
songs_df = pd.DataFrame(all_songs)
songs_df.to_csv("song_catalog.csv", index=False)

print("✅ Song catalog fetched and saved as song_catalog.csv!")
