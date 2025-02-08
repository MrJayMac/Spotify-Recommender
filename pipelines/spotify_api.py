import os
import spotipy
from spotipy.oauth2 import SpotifyOAuth
import pandas as pd
from dotenv import load_dotenv

load_dotenv()

sp = spotipy.Spotify(auth_manager=SpotifyOAuth(
    client_id=os.getenv("SPOTIFY_CLIENT_ID"),
    client_secret=os.getenv("SPOTIFY_CLIENT_SECRET"),
    redirect_uri="http://localhost:8888/callback",
    scope="user-top-read user-read-recently-played"
))

def fetch_top_tracks(time_ranges=["short_term", "medium_term", "long_term"], limit=50):
    all_tracks = []
    track_counts = {}

    for time_range in time_ranges:
        response = sp.current_user_top_tracks(limit=limit, time_range=time_range)
        items = response.get("items", [])

        for item in items:
            track_id = item["id"]
            if track_id in track_counts:
                track_counts[track_id]["play_count"] += 1
            else:
                track_counts[track_id] = {
                    "song_id": track_id,
                    "song_name": item["name"],
                    "artist": item["artists"][0]["name"],
                    "album": item["album"]["name"],
                    "play_count": 1
                }

    return list(track_counts.values())

def fetch_recent_tracks(limit=50, max_tracks=500):
    all_tracks = []
    track_counts = {}
    next_page = None

    while len(all_tracks) < max_tracks:
        response = sp.current_user_recently_played(limit=limit, after=next_page)
        items = response.get("items", [])
        
        if not items:
            break  

        for item in items:
            track = item["track"]
            track_id = track["id"]
            if track_id in track_counts:
                track_counts[track_id]["play_count"] += 1
            else:
                track_counts[track_id] = {
                    "song_id": track_id,
                    "song_name": track["name"],
                    "artist": track["artists"][0]["name"],
                    "album": track["album"]["name"],
                    "play_count": 1
                }

        next_page = response.get("cursors", {}).get("after")
        if not next_page:
            break  
    
    return list(track_counts.values())

top_tracks = fetch_top_tracks(limit=50)
recent_tracks = fetch_recent_tracks(limit=50, max_tracks=500)

df_top = pd.DataFrame(top_tracks)
df_recent = pd.DataFrame(recent_tracks)

df_merged = pd.concat([df_top, df_recent]).groupby("song_id").agg({
    "song_name": "first",
    "artist": "first",
    "album": "first",
    "play_count": "sum"
}).reset_index()

df_merged.to_csv("recent_tracks.csv", index=False)
print(f"✅ Saved {len(df_merged)} tracks to recent_tracks.csv with play counts!")
