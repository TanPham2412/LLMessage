var mongoose = require('mongoose');
var config = require(global.__basedir + "/Config/Setting.json");

class DatabaseConnection {
    url;
    options;

    constructor() {

    }

    static getUrl() {
        this.url = config.mongodb.uri;
        return this.url;
    }

    static async connect() {
        this.url = config.mongodb.uri;
        this.options = {
            useNewUrlParser: true,
            useUnifiedTopology: true
        };

        try {
            await mongoose.connect(this.url, this.options);
            console.log("MongoDB connected successfully");

            mongoose.connection.on('error', function(err) {
                console.error("MongoDB connection error:", err);
            });

            mongoose.connection.on('disconnected', function() {
                console.log("MongoDB disconnected");
            });

            process.on('SIGINT', async function() {
                await mongoose.connection.close();
                console.log("MongoDB connection closed");
                process.exit(0);
            });
        } catch (error) {
            console.error("MongoDB connection failed:", error);
            process.exit(1);
        }
    }

    static getConnection() {
        return mongoose.connection;
    }
}

module.exports = DatabaseConnection;
