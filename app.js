
/**
 * Module dependencies.
 */

var express = require('express'),
    routes = require('./routes'),
    http = require('http'),
    url = require('url'),
    fs = require('fs'),
    zipstream = require('zipstream'),
    mongoose = require('mongoose'),
    path = require('path');



var app = module.exports = express.createServer();


// Configuration

app.configure(function(){
    app.set('views', __dirname + '/views');
    app.set('view engine', 'ejs');
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    app.use(app.router);
    app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
    app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
    app.use(express.errorHandler());
});

// Routes

app.get('/', routes.index);

var io = require('socket.io').listen(app);

io.sockets.on('connection', function (socket) {
    socket.on('msg', function (data) {
        var file_url = data;
        download(file_url, num);
    });

    var insertDatabase = function(url, ip, bytes, fileName)
    {
        var Schema = mongoose.Schema
            , ObjectId = Schema.ObjectId;

        var BlogPost = new Schema({
            id    : ObjectId
            , url       : String
            , ip        : String
            , bytes     : Number
            , fileName  : String
            , date      : Date
        });

        mongoose.model('BlogPost', BlogPost);
        //If I want to add an one comment into the BlogPost collection at the end I do something like this:
        mongoose.connect('mongodb://localhost/dbzget');
// retrieve my model
        var BlogPost = mongoose.model('BlogPost');

// create a blog post
        var post = new BlogPost();

// create a comment
        post.url = url;
        post.ip = ip;
        post.bytes = bytes;
        post.fileName = fileName;
        post.date = new Date();

        post.save(function (err) {
            if (!err) console.log('Success!');
        });
    }

    var num = 0;
    var message = {Size:0, Url: "", Progress: 0, Message: ""};

    var download = function(address, num){

        var regex = "((((ht|f)tp(s?))\://)+)";
        var result = address.match(regex);
        if(!result)
        {
            address = "http://" + address;
            console.log(address);
        }

        if(address.length == 0){
            return;
        }
        if(num > 5)
        {
            message.Message = "too many redirects...";
            socket.emit("err", message);
            return;
        }
        var options = {
            host: url.parse(address).host,
            port: 80,
            path: url.parse(address).pathname
        };

        process.on('uncaughtException', function (exception) {
            console.log("Uncaught exception!", exception);

            message.Message = exception.code;
            socket.emit("err", message);
            return;
        });

        http.get(options, function(res) {

            console.log(res.statusCode);

            if(res.statusCode == 404)
            {
                message.Message = "404 not found.";
                socket.emit("err", message);
                return;
            }

            if(res.statusCode == 400)
            {
                message.Message = "bad gateway.. it doesn't seem a valid url.";
                socket.emit("status", message);
                return;
            }

            if(res.statusCode != 200)
            {
                download(res.headers.location, num++);
                return;
            }

            var DOWNLOAD_DIR = __dirname + "/public/downloads/";//'E:\\websites\\public\\zget.kotuadam\\public\\downloads\\';
            //var DOWNLOAD_DIR = 'C:\\Users\\murat.zengin\\WebstormProjects\\Zget2\\public\\downloads';

            var file_name = url.parse(address).pathname.split('/').pop();
            var file = fs.createWriteStream(DOWNLOAD_DIR + file_name);

            var fileBytes = res.headers['content-length'];
            var uploadedBytes = 0;

            console.log('status code is '+ res.statusCode);
            

            res.on('data', function(data) {
                uploadedBytes += data.length;
                var progress = parseInt((uploadedBytes / fileBytes) * 100,10);
                message.progress = progress;
                message.Size = parseInt(fileBytes);
                if(res.statusCode == 200){
                    socket.emit("progress", message.progress + "%");
                }
                file.write(data);
            }).on('end', function() {
                    file.end();
                    
                    var out = fs.createWriteStream(DOWNLOAD_DIR + file_name + ".zip");
                    var zip = zipstream.createZip({ level: 1 });

                    zip.pipe(out);

                    zip.addFile(fs.createReadStream(DOWNLOAD_DIR + file_name), { name: file_name }, function() {
                        zip.finalize(function(written) {
                            fs.unlink(DOWNLOAD_DIR + file_name);
                        });
                    });

                    zip.on('data', function(){
                        message.Message = "Archiving the file.";
                        socket.emit("archive", message);
                    })

                    zip.on('end', function(){
                        message.Url = "/downloads/" + file_name + ".zip";
                        if(res.statusCode != 301){
                            socket.emit("complete", message);
                        }
                    })

                    console.log(message.Url);
                    console.log(file_name + ' downloaded.' + DOWNLOAD_DIR);
					insertDatabase(address, socket.handshake.address.address.toString(), fileBytes,file_name);
					
                    setTimeout(function(){
                        message.Message = "expired..";
                        socket.emit("status", message);
                        fs.unlink(DOWNLOAD_DIR + file_name + ".zip");

                    }, 900000);
                });
        });

    }
});




app.listen(80, function(){
    console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
});



