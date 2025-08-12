
from pymongo.mongo_client import MongoClient
from pymongo.server_api import ServerApi

uri = "mongodb+srv://mico:mico123@cluster0.xciyc.mongodb.net/rescpi_db?retryWrites=true&w=majority&appName=Cluster0"


client = MongoClient(uri, server_api=ServerApi('1'))

db = client.rescpi_db


