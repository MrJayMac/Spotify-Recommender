import React, { useEffect, useState } from 'react';
import axios from 'axios';

const History = ({ userId }) => {
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!userId) {
      setError('User ID not found');
      setLoading(false);
      return;
    }

    const fetchTracks = async () => {
      try {
        const response = await axios.get(`http://localhost:8000/user-tracks/${userId}`);
        setTracks(response.data);
      } catch (err) {
        setError('Failed to fetch listening history');
      } finally {
        setLoading(false);
      }
    };

    fetchTracks();
  }, [userId]);

  if (loading) return <p>Loading...</p>;
  if (error) return <p>{error}</p>;

  return (
    <div>
      <h2>Your Listening History</h2>
      <ul>
        {tracks.map((track, index) => (
          <li key={index}>
            <strong>{track.track_name}</strong> by {track.artist_name}  
            <br />
            <em>Album:</em> {track.album_name}  
            <br />
            <em>Played At:</em> {new Date(track.played_at).toLocaleString()}
            <br />
            <a href={track.spotify_url} target="_blank" rel="noopener noreferrer">Listen on Spotify</a>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default History;
