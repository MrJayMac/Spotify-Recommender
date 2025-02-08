import os
import spotipy
from spotipy.oauth2 import SpotifyOAuth
from dotenv import load_dotenv
import pandas as pd

load_dotenv()

client_id = os.getenv("SPOTIFY_CLIENT_ID")
client_secret = os.getenv("SPOTIFY_CLIENT_SECRET")
redirect_uri = "http://localhost:8888/callback"

# Authenticate Using OAuth (User Login Required)
sp = spotipy.Spotify(auth_manager=SpotifyOAuth(client_id=client_id, 
                                               client_secret=client_secret,
                                               redirect_uri=redirect_uri,
                                               scope="user-read-recently-played"))

# Function to Fetch Recently Played Songs
def get_recently_played_tracks():
    results = sp.current_user_recently_played(limit=10)  
    track_data = []
    
    for item in results["items"]:
        track = item["track"]
        track_data.append({
            "song_id": track["id"], 
            "song_name": track["name"],  
            "artist": track["artists"][0]["name"],  
            "album": track["album"]["name"]  
        })
    
    return track_data

# Save Recently Played Songs to a CSV File
def save_tracks_to_csv(tracks, filename="recent_tracks.csv"):
    df = pd.DataFrame(tracks) 
    df.to_csv(filename, index=False)
    print(f"Data saved to {filename}")

# Run the Script
if __name__ == "__main__":
    print("Fetching recently played tracks...")
    user_tracks = get_recently_played_tracks()
    
    for track in user_tracks:
        print(track)  

    # Save to CSV
    save_tracks_to_csv(user_tracks)
