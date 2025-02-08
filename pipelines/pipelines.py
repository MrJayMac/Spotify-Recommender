import os
import pyspark
from pyspark.sql import SparkSession
from pyspark.sql.functions import col, monotonically_increasing_id, hash
from pyspark.ml.recommendation import ALS
from pyspark.ml.evaluation import RegressionEvaluator
from dotenv import load_dotenv

load_dotenv()

spark = SparkSession.builder.appName("Spotify Recommender").getOrCreate()

file_path = "recent_tracks.csv"
df = spark.read.csv(file_path, header=True, inferSchema=True)

df = df.withColumn("user_id", monotonically_increasing_id())
df = df.withColumn("item_id", hash(col("song_id")))
df = df.select("user_id", "item_id", "play_count").withColumnRenamed("play_count", "rating")

df.show()
df.printSchema()

known_items = df.sample(fraction=0.8, seed=42)
new_items = df.subtract(known_items).sample(fraction=0.2, seed=42)
train_df = known_items
test_df = new_items.union(known_items.sample(fraction=0.2, seed=42))

train_items = train_df.select("item_id").distinct()
test_items = test_df.select("item_id").distinct()
common_items = train_items.intersect(test_items)

print(f"Overlapping Songs in Train & Test: {common_items.count()}")
print(f"Unique Songs in Test Only: {test_items.subtract(train_items).count()}")

als = ALS(
    maxIter=10,
    regParam=0.1,
    userCol="user_id",
    itemCol="item_id",
    ratingCol="rating",
    coldStartStrategy="drop")

als_model = als.fit(train_df)
print("ALS Model Training Complete")

predictions = als_model.transform(test_df)
predictions.select("user_id", "item_id", "prediction").show()

if predictions.count() > 0:
    evaluator = RegressionEvaluator(
        metricName="rmse",
        labelCol="rating",
        predictionCol="prediction"
    )
    rmse = evaluator.evaluate(predictions)
    print(f"Root Mean Squared Error (RMSE) on Test Data = {rmse}")
else:
    print("No predictions were generated. The test set may contain only unseen items.")

model_path = "als_model"
als_model.write().overwrite().save(model_path)
print("Model Saved Successfully!")


##############################################
#BUILDING MODEL#

# import pyspark
# import os
# from pyspark.sql import SparkSession
# from pyspark.sql.functions import count, when
# from pyspark.ml.recommendation import ALS
# from pyspark.ml.evaluation import RegressionEvaluator
# from pyspark.ml.recommendation import ALSModel
# from dotenv import load_dotenv

# load_dotenv()

# os.environ["HADOOP_HOME"] = "C:\\hadoop-3.3.6"
# os.environ["hadoop.home.dir"] = "C:\\hadoop-3.3.6"
# os.environ["PATH"] += os.pathsep + "C:\\hadoop-3.3.6\\bin"

# print(f"HADOOP_HOME set to: {os.environ['HADOOP_HOME']}")
# print(f"hadoop.home.dir set to: {os.environ['hadoop.home.dir']}")

# ####################### Starting spark session & checking schema #######################
# spark = SparkSession.builder.appName("Spotify Recommender").getOrCreate()

# file_path = "sample_data.csv"
# df = spark.read.csv(file_path, header=True, inferSchema=True)

# df.show()
# df.printSchema()


# print(f"Number of rows: {df.count()}")

# ####################### Cleaning Data #######################

# missing_values = df.select(
#     [count(when(df[col].isNull(), col)).alias(col) for col in df.columns]
# )
# missing_values.show()

# print(f"Number of duplicate rows: {df.count() - df.dropDuplicates().count()}")


# ####################### Data preparation #######################

# prepared_df = df.selectExpr("user_id", "song_id as item_id", "play_count as rating")
# train_df, test_df = prepared_df.randomSplit([0.85, 0.15], seed=42)


# print("Training Dataset:")
# train_df.show()


# print("Test Dataset:")
# test_df.show()

# ####################### Training Model #######################

# als = ALS(
#     maxIter = 10,
#     regParam=0.1,
#     userCol="user_id",
#     itemCol="item_id",
#     ratingCol="rating",
#     coldStartStrategy="drop"
# )

# als_model = als.fit(train_df)
# print("ALS Complete")

# ####################### Generate Predictions #######################

# predictions = als_model.transform(test_df)
# print("Predictions on Test Data:")
# predictions.select("user_id", "item_id", "prediction").show()

# ####################### Evaluate Predictions #######################

# evaluator = RegressionEvaluator (
#     metricName="rmse",
#     labelCol="rating",
#     predictionCol="prediction"
# )

# rmse = evaluator.evaluate(predictions)
# print(f"Root Mean Squared Error (RMSE) on Test Data = {rmse}")

# ####################### Saving Model #######################
# model_path = "als_model"
# als_model.write().overwrite().save(model_path)

# print("Model Saved Succesfully")

# ####################### Loading Model #######################

# model_path = os.getenv("MODEL_PATH")
# loaded_model = ALSModel.load(model_path)
# recommendations = loaded_model.recommendForAllUsers(3)

# print("Top 3 Song Recommendations per User:")
# recommendations.show(truncate=False)