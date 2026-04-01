var mongoose = require('mongoose');
var config = require(global.__basedir + "/Config/config");

class DatabaseConnection {
    url;
    options;

    constructor() {
        this.url = config.mongodb.uri;
        this.options = {
            useNewUrlParser: true,
            useUnifiedTopology: true
        };
    }

    getUrl() {
        return this.url;
    }

    async connect() {
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

    getConnection() {
        return mongoose.connection;
    }
}

module.exports = DatabaseConnection;
