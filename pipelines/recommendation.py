import os
import pyspark
from pyspark.sql import SparkSession
from pyspark.ml.recommendation import ALSModel
from flask import Flask, jsonify, request
from flask_cors import CORS
from pyspark.sql.functions import col, explode, hash

app = Flask(__name__)
CORS(app)

# Start Spark Session
spark = SparkSession.builder.appName("Spotify Recommender API").getOrCreate()

# Load Trained ALS Model
model_path = "als_model"
als_model = ALSModel.load(model_path)

# Load Songs Metadata
file_path = "recent_tracks.csv"
df_songs = spark.read.csv(file_path, header=True, inferSchema=True).select("song_id", "song_name", "artist")

# Convert song_id to item_id (to match ALS model)
df_songs = df_songs.withColumn("item_id", hash(col("song_id")))

# Convert to Pandas for faster lookup
songs_map = df_songs.toPandas().set_index("item_id").to_dict(orient="index")

@app.route('/recommend', methods=['GET'])
def recommend():
    user_id = request.args.get("user_id", type=int)
    if user_id is None:
        return jsonify({"error": "Missing user_id parameter"}), 400

    # Generate ALS recommendations for all users
    recs_df = als_model.recommendForAllUsers(10)

    # Filter for the requested user
    user_recs = recs_df.filter(col("user_id") == user_id)

    if user_recs.count() == 0:
        return jsonify({"error": "No recommendations found for this user"}), 404

    # Extract recommendations (Correcting the field names)
    user_recs = (
        user_recs
        .select(explode(col("recommendations")).alias("recommendation"))
        .select(
            col("recommendation.item_id").alias("item_id"),  # FIX: Correct field name
            col("recommendation.rating").alias("score")
        )
    )

    recommendations = []
    for row in user_recs.collect():
        song_info = songs_map.get(row["item_id"], {"song_name": "Unknown", "artist": "Unknown"})
        recommendations.append({
            "song_id": row["item_id"],
            "song_name": song_info["song_name"],
            "artist": song_info["artist"],
            "score": row["score"]
        })

    return jsonify({"user_id": user_id, "recommendations": recommendations})

if __name__ == '__main__':
    app.run(host="0.0.0.0", port=5000, debug=True)
