import pyspark
import os
from pyspark.sql import SparkSession
from pyspark.sql.functions import count, when
from pyspark.ml.recommendation import ALS
from pyspark.ml.evaluation import RegressionEvaluator
from pyspark.ml.recommendation import ALSModel
from dotenv import load_dotenv

load_dotenv()

os.environ["HADOOP_HOME"] = "C:\\hadoop-3.3.6"
os.environ["hadoop.home.dir"] = "C:\\hadoop-3.3.6"
os.environ["PATH"] += os.pathsep + "C:\\hadoop-3.3.6\\bin"

print(f"HADOOP_HOME set to: {os.environ['HADOOP_HOME']}")
print(f"hadoop.home.dir set to: {os.environ['hadoop.home.dir']}")

####################### Starting spark session & checking schema #######################
spark = SparkSession.builder.appName("Spotify Recommender").getOrCreate()

file_path = "sample_data.csv"
df = spark.read.csv(file_path, header=True, inferSchema=True)

df.show()
df.printSchema()


print(f"Number of rows: {df.count()}")

####################### Cleaning Data #######################

missing_values = df.select(
    [count(when(df[col].isNull(), col)).alias(col) for col in df.columns]
)
missing_values.show()

print(f"Number of duplicate rows: {df.count() - df.dropDuplicates().count()}")


####################### Data preparation #######################

prepared_df = df.selectExpr("user_id", "song_id as item_id", "play_count as rating")
train_df, test_df = prepared_df.randomSplit([0.85, 0.15], seed=42)


print("Training Dataset:")
train_df.show()


print("Test Dataset:")
test_df.show()

####################### Training Model #######################

als = ALS(
    maxIter = 10,
    regParam=0.1,
    userCol="user_id",
    itemCol="item_id",
    ratingCol="rating",
    coldStartStrategy="drop"
)

als_model = als.fit(train_df)
print("ALS Complete")

####################### Generate Predictions #######################

predictions = als_model.transform(test_df)
print("Predictions on Test Data:")
predictions.select("user_id", "item_id", "prediction").show()

####################### Evaluate Predictions #######################

evaluator = RegressionEvaluator (
    metricName="rmse",
    labelCol="rating",
    predictionCol="prediction"
)

rmse = evaluator.evaluate(predictions)
print(f"Root Mean Squared Error (RMSE) on Test Data = {rmse}")

####################### Saving Model #######################
model_path = "als_model"
als_model.write().overwrite().save(model_path)

print("Model Saved Succesfully")

####################### Loading Model #######################

model_path = os.getenv("MODEL_PATH")
loaded_model = ALSModel.load(model_path)
recommendations = loaded_model.recommendForAllUsers(3)

print("Top 3 Song Recommendations per User:")
recommendations.show(truncate=False)