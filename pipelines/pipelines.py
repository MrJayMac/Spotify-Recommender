import pyspark
import os
from pyspark.sql import SparkSession

spark = SparkSession.builder.appName("Spotify Recommender").getOrCreate()

file_path = "sample_data.csv"
df = spark.read.csv(file_path, header=True, inferSchema=True)

df.show()
